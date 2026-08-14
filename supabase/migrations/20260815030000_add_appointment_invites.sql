-- Un rendez-vous reste un créneau unique, mais peut désormais avoir plusieurs invités.
-- Chaque invité dispose de son propre lien et de sa propre réponse.
CREATE TABLE public.appointment_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  invite_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  status public.appointment_status NOT NULL DEFAULT 'pending',
  invite_sent_at timestamptz,
  responded_at timestamptz,
  response_message text,
  owner_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, contact_id),
  UNIQUE (invite_token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_invites TO authenticated;
GRANT ALL ON public.appointment_invites TO service_role;
ALTER TABLE public.appointment_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage appointment invites" ON public.appointment_invites
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_invites.appointment_id
        AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.contacts c ON c.id = appointment_invites.contact_id AND c.owner_id = a.owner_id
      WHERE a.id = appointment_invites.appointment_id
        AND (a.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE TRIGGER appointment_invites_updated_at
  BEFORE UPDATE ON public.appointment_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_appointment_invite_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _appointment_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _appointment_id := OLD.appointment_id;
  ELSE
    _appointment_id := NEW.appointment_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.appointment_invites WHERE appointment_id = _appointment_id) THEN
    UPDATE public.appointments a
    SET status = CASE
      WHEN NOT EXISTS (SELECT 1 FROM public.appointment_invites i WHERE i.appointment_id = a.id AND i.status <> 'accepted') THEN 'accepted'::public.appointment_status
      WHEN NOT EXISTS (SELECT 1 FROM public.appointment_invites i WHERE i.appointment_id = a.id AND i.status <> 'declined') THEN 'declined'::public.appointment_status
      ELSE 'pending'::public.appointment_status
    END
    WHERE a.id = _appointment_id AND a.status <> 'cancelled';
  ELSE
    UPDATE public.appointments
    SET status = 'pending'::public.appointment_status
    WHERE id = _appointment_id AND status <> 'cancelled' AND source <> 'public_booking';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_appointment_invite_status() FROM PUBLIC;

CREATE TRIGGER refresh_appointment_status_from_invites
  AFTER INSERT OR DELETE OR UPDATE OF status ON public.appointment_invites
  FOR EACH ROW EXECUTE FUNCTION public.refresh_appointment_invite_status();

-- Transforme les invitations historiques en participants, sans invalider leur lien.
INSERT INTO public.appointment_invites (
  appointment_id, contact_id, invite_token, status, invite_sent_at,
  responded_at, response_message, owner_notified_at, created_at, updated_at
)
SELECT id, contact_id, invite_token, status, invite_sent_at,
       responded_at, response_message, owner_notified_at, created_at, updated_at
FROM public.appointments
WHERE contact_id IS NOT NULL
ON CONFLICT (appointment_id, contact_id) DO NOTHING;

DROP FUNCTION IF EXISTS public.get_invite(text);

CREATE OR REPLACE FUNCTION public.get_invite(_token text)
 RETURNS TABLE(title text, description text, location text, starts_at timestamp with time zone, ends_at timestamp with time zone, status appointment_status, response_message text, responded_at timestamp with time zone, host_name text, guest_name text, host_has_branding boolean, business_name text, invite_message text, google_review_url text, google_maps_url text, google_rating numeric, google_reviews_count integer, review_prompt_enabled boolean, website_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.title, a.description, a.location, a.starts_at, a.ends_at,
         CASE WHEN a.status = 'cancelled' THEN a.status ELSE i.status END,
         i.response_message, i.responded_at,
         COALESCE(p.full_name, p.email), c.name,
         (public.current_plan(a.owner_id) = 'business'),
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.business_name END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.invite_message END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_review_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_maps_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_rating END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_reviews_count END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN COALESCE(p.review_prompt_enabled, true) ELSE false END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.website_url END
  FROM public.appointment_invites i
  JOIN public.appointments a ON a.id = i.appointment_id
  LEFT JOIN public.profiles p ON p.id = a.owner_id
  LEFT JOIN public.contacts c ON c.id = i.contact_id
  WHERE i.invite_token = _token

  UNION ALL

  SELECT a.title, a.description, a.location, a.starts_at, a.ends_at, a.status,
         a.response_message, a.responded_at,
         COALESCE(p.full_name, p.email), c.name,
         (public.current_plan(a.owner_id) = 'business'),
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.business_name END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.invite_message END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_review_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_maps_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_rating END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.google_reviews_count END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN COALESCE(p.review_prompt_enabled, true) ELSE false END,
         CASE WHEN public.current_plan(a.owner_id) = 'business' THEN p.website_url END
  FROM public.appointments a
  LEFT JOIN public.profiles p ON p.id = a.owner_id
  LEFT JOIN public.contacts c ON c.id = a.contact_id
  WHERE a.invite_token = _token
    AND NOT EXISTS (SELECT 1 FROM public.appointment_invites i WHERE i.invite_token = _token)
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_invite(_token text, _accept boolean, _message text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.appointment_invites
  SET status = CASE WHEN _accept THEN 'accepted'::public.appointment_status ELSE 'declined'::public.appointment_status END,
      response_message = NULLIF(left(COALESCE(_message, ''), 1000), ''),
      responded_at = now(),
      owner_notified_at = NULL
  WHERE invite_token = _token
    AND status IN ('pending', 'accepted', 'declined');
  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated > 0 THEN
    RETURN true;
  END IF;

  UPDATE public.appointments
  SET status = CASE WHEN _accept THEN 'accepted'::public.appointment_status ELSE 'declined'::public.appointment_status END,
      response_message = NULLIF(left(COALESCE(_message, ''), 1000), ''),
      responded_at = now(), owner_notified_at = NULL
  WHERE invite_token = _token
    AND status IN ('pending', 'accepted', 'declined');
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END; $$;

REVOKE ALL ON FUNCTION public.get_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_invite(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_invite(text, boolean, text) TO anon, authenticated, service_role;
