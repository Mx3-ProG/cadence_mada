REVOKE ALL ON FUNCTION public.guard_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_contact_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_appointment_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_plan(uuid) FROM PUBLIC, anon;