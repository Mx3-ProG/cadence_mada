CREATE TYPE public.plan_tier AS ENUM ('free', 'pro');

ALTER TABLE public.profiles
  ADD COLUMN plan public.plan_tier NOT NULL DEFAULT 'free',
  ADD COLUMN plan_renews_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.plan := OLD.plan;
    NEW.plan_renews_at := OLD.plan_renews_at;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_guard_plan
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_plan_change();

CREATE OR REPLACE FUNCTION public.current_plan(_user_id uuid)
RETURNS public.plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT plan FROM public.profiles WHERE id = _user_id), 'free'::public.plan_tier)
$$;

REVOKE ALL ON FUNCTION public.current_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_plan(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF public.current_plan(NEW.owner_id) = 'free' THEN
    SELECT count(*) INTO _count FROM public.contacts WHERE owner_id = NEW.owner_id;
    IF _count >= 30 THEN
      RAISE EXCEPTION 'FREE_PLAN_CONTACT_LIMIT: le plan Gratuit est limité à 30 contacts.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER contacts_free_limit
BEFORE INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_limit();

CREATE OR REPLACE FUNCTION public.enforce_appointment_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  IF public.current_plan(NEW.owner_id) = 'free' THEN
    SELECT count(*) INTO _count
    FROM public.appointments
    WHERE owner_id = NEW.owner_id
      AND created_at >= date_trunc('month', now());
    IF _count >= 50 THEN
      RAISE EXCEPTION 'FREE_PLAN_APPOINTMENT_LIMIT: le plan Gratuit est limité à 50 rendez-vous par mois.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER appointments_free_limit
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_limit();

CREATE OR REPLACE FUNCTION public.get_plan_usage()
RETURNS TABLE(plan public.plan_tier, plan_renews_at timestamptz, contacts_count int, appointments_this_month int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_plan(auth.uid()),
    (SELECT p.plan_renews_at FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT count(*)::int FROM public.contacts c WHERE c.owner_id = auth.uid()),
    (SELECT count(*)::int FROM public.appointments a
       WHERE a.owner_id = auth.uid() AND a.created_at >= date_trunc('month', now()))
$$;

REVOKE ALL ON FUNCTION public.get_plan_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_usage() TO authenticated;