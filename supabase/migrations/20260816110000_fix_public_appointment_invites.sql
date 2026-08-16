-- Re-publie les RPC d'invitation après le passage aux invitations multi-contacts.
-- Les liens envoyés utilisent appointment_invites.invite_token, tandis que les anciens
-- rendez-vous peuvent encore utiliser appointments.invite_token.
DROP FUNCTION IF EXISTS public.get_invite(text);

CREATE OR REPLACE FUNCTION public.get_invite(_token text)
RETURNS TABLE (
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  response_message text,
  responded_at timestamptz,
  host_name text,
  guest_name text,
  host_has_branding boolean,
  business_name text,
  invite_message text,
  google_review_url text,
  google_maps_url text,
  google_rating numeric,
  google_reviews_count integer,
  review_prompt_enabled boolean,
  website_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND NOT EXISTS (
      SELECT 1 FROM public.appointment_invites i WHERE i.invite_token = _token
    )
$$;

REVOKE ALL ON FUNCTION public.get_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.respond_to_invite(text, boolean, text);
DROP FUNCTION IF EXISTS public.respond_to_invite(text, boolean, text, text);

CREATE OR REPLACE FUNCTION public.respond_to_invite(
  _token text,
  _accept boolean,
  _message text DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated integer;
BEGIN
  UPDATE public.appointment_invites
  SET status = CASE WHEN _accept THEN 'accepted'::public.appointment_status ELSE 'declined'::public.appointment_status END,
      response_message = NULLIF(left(COALESCE(_message, ''), 1000), ''),
      response_email = NULLIF(left(COALESCE(_email, ''), 320), ''),
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
      response_email = NULLIF(left(COALESCE(_email, ''), 320), ''),
      responded_at = now(),
      owner_notified_at = NULL
  WHERE invite_token = _token
    AND status IN ('pending', 'accepted', 'declined');
  GET DIAGNOSTICS _updated = ROW_COUNT;

  RETURN _updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_invite(text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_invite(text, boolean, text, text) TO anon, authenticated, service_role;
