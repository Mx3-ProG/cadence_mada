ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      NEW.plan := OLD.plan;
      NEW.plan_renews_at := OLD.plan_renews_at;
    END IF;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_status := OLD.subscription_status;
  END IF;
  RETURN NEW;
END; $function$;

DROP FUNCTION IF EXISTS public.get_plan_usage();

CREATE FUNCTION public.get_plan_usage()
RETURNS TABLE(plan plan_tier, plan_renews_at timestamp with time zone, contacts_count integer, appointments_this_month integer, subscription_status text)
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
    (SELECT p.subscription_status FROM public.profiles p WHERE p.id = auth.uid())
$function$;

REVOKE ALL ON FUNCTION public.get_plan_usage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_plan_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_plan_usage() TO authenticated;