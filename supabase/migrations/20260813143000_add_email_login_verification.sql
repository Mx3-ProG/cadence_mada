-- Validation de connexion par code email et expiration après 10 h d'inactivité.
-- Les codes ne sont jamais stockés en clair : seul leur HMAC est conservé.

CREATE TABLE public.login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  completion_hash text,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_challenges_user_created_idx
  ON public.login_challenges (user_id, created_at DESC);

ALTER TABLE public.login_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.login_challenges TO service_role;

CREATE TABLE public.login_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_sessions_user_idx ON public.login_sessions (user_id);

ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.login_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.consume_login_challenge(
  _challenge_id uuid,
  _code_hash text
)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _challenge public.login_challenges%ROWTYPE;
BEGIN
  UPDATE public.login_challenges AS challenge
  SET attempts = challenge.attempts + 1,
      consumed_at = CASE
        WHEN challenge.code_hash = _code_hash THEN now()
        ELSE challenge.consumed_at
      END
  WHERE challenge.id = _challenge_id
    AND challenge.consumed_at IS NULL
    AND challenge.completed_at IS NULL
    AND challenge.expires_at > now()
    AND challenge.attempts < 5
  RETURNING challenge.* INTO _challenge;

  IF FOUND AND _challenge.code_hash = _code_hash THEN
    RETURN QUERY SELECT _challenge.user_id, _challenge.email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_login_challenge(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_challenge(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.has_active_login_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.login_sessions AS session
    WHERE session.session_id = NULLIF(auth.jwt()->>'session_id', '')::uuid
      AND session.user_id = auth.uid()
      AND session.last_active_at > now() - interval '10 hours'
  )
$$;

REVOKE ALL ON FUNCTION public.has_active_login_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_login_session() TO authenticated, service_role;

-- Ces politiques restrictives s'ajoutent aux politiques propriétaires existantes.
-- Une session authentifiée mais sans code email validé ne peut pas lire les données métier.
CREATE POLICY "Require verified login" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_active_login_session())
  WITH CHECK (public.has_active_login_session());

CREATE POLICY "Require verified login" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_active_login_session())
  WITH CHECK (public.has_active_login_session());

CREATE POLICY "Require verified login" ON public.contacts
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_active_login_session())
  WITH CHECK (public.has_active_login_session());

CREATE POLICY "Require verified login" ON public.appointments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_active_login_session())
  WITH CHECK (public.has_active_login_session());

CREATE POLICY "Require verified login" ON public.user_weekly_stats
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_active_login_session())
  WITH CHECK (public.has_active_login_session());
