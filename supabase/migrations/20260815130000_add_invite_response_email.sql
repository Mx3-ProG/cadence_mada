-- Capture l'email de l'invité (sans compte Cadence) au moment où il répond à une invitation,
-- pour pouvoir le recontacter/tracer la réponse.
ALTER TABLE public.appointment_invites ADD COLUMN response_email text;
ALTER TABLE public.appointments ADD COLUMN response_email text;

DROP FUNCTION IF EXISTS public.respond_to_invite(text, boolean, text);

CREATE OR REPLACE FUNCTION public.respond_to_invite(_token text, _accept boolean, _message text DEFAULT NULL, _email text DEFAULT NULL)
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
      responded_at = now(), owner_notified_at = NULL
  WHERE invite_token = _token
    AND status IN ('pending', 'accepted', 'declined');
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END; $$;

REVOKE ALL ON FUNCTION public.respond_to_invite(text, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_invite(text, boolean, text, text) TO anon, authenticated, service_role;
