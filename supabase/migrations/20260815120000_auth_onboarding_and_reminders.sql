-- Onboarding explicite du nom/pseudo et automatisation idempotente des rappels.

ALTER TABLE public.profiles
  ADD COLUMN onboarding_completed_at timestamptz,
  ADD COLUMN automatic_reminders_enabled boolean NOT NULL DEFAULT true;

-- Les profils existants ont déjà tous un nom enregistré : ne pas les renvoyer dans
-- le parcours de première inscription.
UPDATE public.profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, now());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    onboarding_completed_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.raw_user_meta_data->>'cadence_onboarding_completed' = 'true' THEN now()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TYPE public.email_delivery_kind AS ENUM (
  'pending_invite_reminder',
  'upcoming_appointment_reminder',
  'owner_daily_summary'
);

CREATE TYPE public.email_delivery_status AS ENUM (
  'processing',
  'sent',
  'failed',
  'skipped'
);

CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  kind public.email_delivery_kind NOT NULL,
  status public.email_delivery_status NOT NULL DEFAULT 'processing',
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  appointment_invite_id uuid REFERENCES public.appointment_invites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  scheduled_for timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_deliveries_due_idx
  ON public.email_deliveries (status, scheduled_for);
CREATE INDEX email_deliveries_owner_created_idx
  ON public.email_deliveries (owner_id, created_at DESC);

ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.email_deliveries TO service_role;

CREATE TRIGGER email_deliveries_updated_at
  BEFORE UPDATE ON public.email_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Le cron appelle cette fonction toutes les heures. Les deux secrets sont stockés
-- dans Supabase Vault, jamais dans Git : reminder_edge_url et reminder_cron_secret.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.invoke_reminder_edge()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  edge_url text;
  cron_secret text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO edge_url
  FROM vault.decrypted_secrets
  WHERE name = 'reminder_edge_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets
  WHERE name = 'reminder_cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF edge_url IS NULL OR cron_secret IS NULL THEN
    RAISE WARNING 'Reminder Edge secrets are not configured in Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := jsonb_build_object('triggered_at', now())
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_reminder_edge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_reminder_edge() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cadence-hourly-reminders') THEN
    PERFORM cron.unschedule('cadence-hourly-reminders');
  END IF;
  PERFORM cron.schedule(
    'cadence-hourly-reminders',
    '7 * * * *',
    'SELECT public.invoke_reminder_edge();'
  );
END;
$$;
