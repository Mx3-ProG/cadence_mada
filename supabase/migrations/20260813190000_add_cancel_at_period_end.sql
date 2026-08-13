ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_plan_usage();

CREATE FUNCTION public.get_plan_usage()
 RETURNS TABLE(plan plan_tier, plan_renews_at timestamp with time zone, contacts_count integer, appointments_this_month integer, subscription_status text, is_admin boolean, cancel_at_period_end boolean)
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
    public.has_role(auth.uid(), 'admin'),
    (SELECT p.cancel_at_period_end FROM public.profiles p WHERE p.id = auth.uid())
$function$;

REVOKE ALL ON FUNCTION public.get_plan_usage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_plan_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_plan_usage() TO authenticated;
