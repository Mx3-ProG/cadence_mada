CREATE OR REPLACE FUNCTION public.enforce_appointment_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
BEGIN
  IF public.current_plan(NEW.owner_id) = 'free'
     AND NOT public.has_role(NEW.owner_id, 'admin') THEN
    SELECT count(*) INTO _count
    FROM public.appointments
    WHERE owner_id = NEW.owner_id
      AND created_at >= date_trunc('month', now());
    IF _count >= 30 THEN
      RAISE EXCEPTION 'FREE_PLAN_APPOINTMENT_LIMIT: le plan Gratuit est limité à 30 rendez-vous par mois.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
BEGIN
  IF public.current_plan(NEW.owner_id) = 'free'
     AND NOT public.has_role(NEW.owner_id, 'admin') THEN
    SELECT count(*) INTO _count FROM public.contacts WHERE owner_id = NEW.owner_id;
    IF _count >= 30 THEN
      RAISE EXCEPTION 'FREE_PLAN_CONTACT_LIMIT: le plan Gratuit est limité à 30 contacts.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

DROP FUNCTION IF EXISTS public.get_plan_usage();

CREATE OR REPLACE FUNCTION public.get_plan_usage()
 RETURNS TABLE(plan plan_tier, plan_renews_at timestamp with time zone, contacts_count integer, appointments_this_month integer, subscription_status text, is_admin boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.current_plan(auth.uid()),
    (SELECT p.plan_renews_at FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT count(*)::int FROM public.contacts c WHERE c.owner_id = auth.uid()),
    (SELECT count(*)::int FROM public.appointments a
       WHERE a.owner_id = auth.uid() AND a.created_at >= date_trunc('month', now())),
    (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid()),
    public.has_role(auth.uid(), 'admin')
$function$;