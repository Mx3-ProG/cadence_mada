ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS invite_message text,
  ADD COLUMN IF NOT EXISTS google_review_url text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS google_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS google_reviews_count integer,
  ADD COLUMN IF NOT EXISTS review_prompt_enabled boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS public.get_invite(text);

CREATE OR REPLACE FUNCTION public.get_invite(_token text)
 RETURNS TABLE(title text, description text, location text, starts_at timestamp with time zone, ends_at timestamp with time zone, status appointment_status, response_message text, responded_at timestamp with time zone, host_name text, guest_name text, host_is_pro boolean, business_name text, invite_message text, google_review_url text, google_maps_url text, google_rating numeric, google_reviews_count integer, review_prompt_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.title, a.description, a.location, a.starts_at, a.ends_at, a.status,
         a.response_message, a.responded_at,
         COALESCE(p.full_name, p.email) AS host_name,
         c.name AS guest_name,
         (public.current_plan(a.owner_id) = 'pro') AS host_is_pro,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.business_name END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.invite_message END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.google_review_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.google_maps_url END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.google_rating END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN p.google_reviews_count END,
         CASE WHEN public.current_plan(a.owner_id) = 'pro' THEN COALESCE(p.review_prompt_enabled, true) ELSE false END
  FROM public.appointments a
  LEFT JOIN public.profiles p ON p.id = a.owner_id
  LEFT JOIN public.contacts c ON c.id = a.contact_id
  WHERE a.invite_token = _token
$function$;

REVOKE ALL ON FUNCTION public.get_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated;