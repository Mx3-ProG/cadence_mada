-- Programme de parrainage : lien unique par utilisateur, commission fixe de 1€
-- par filleul abonné Pro et par mois payé, demandes de retrait traitées manuellement.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- COMMISSIONS -----------------------------------------------------------

CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  amount_cents integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referral_commissions_referrer_idx ON public.referral_commissions (referrer_id);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;

CREATE POLICY "Referrers view their own commissions" ON public.referral_commissions
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR public.has_role(auth.uid(), 'admin'));

-- DEMANDES DE RETRAIT -----------------------------------------------------

CREATE TABLE public.referral_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  admin_note text
);
CREATE INDEX referral_payout_requests_user_idx ON public.referral_payout_requests (user_id);

ALTER TABLE public.referral_payout_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.referral_payout_requests TO authenticated;
GRANT ALL ON public.referral_payout_requests TO service_role;

CREATE POLICY "Users view their own payout requests" ON public.referral_payout_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own payout requests" ON public.referral_payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update payout requests" ON public.referral_payout_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SOLDE + GARDE-FOU DE RETRAIT --------------------------------------------

CREATE OR REPLACE FUNCTION public.referral_balance_cents(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT sum(amount_cents) FROM public.referral_commissions WHERE referrer_id = _user_id), 0)
    - COALESCE(
        (SELECT sum(amount_cents) FROM public.referral_payout_requests
           WHERE user_id = _user_id AND status IN ('pending', 'paid')),
        0
      )
$$;

CREATE OR REPLACE FUNCTION public.enforce_payout_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.referral_payout_requests
    WHERE user_id = NEW.user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'REFERRAL_PAYOUT_ALREADY_PENDING: une demande de retrait est déjà en cours.'
      USING ERRCODE = 'check_violation';
  END IF;

  _balance := public.referral_balance_cents(NEW.user_id);
  IF _balance < 2500 THEN
    RAISE EXCEPTION 'REFERRAL_BALANCE_TOO_LOW: solde insuffisant (minimum 25€).'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.amount_cents := _balance;
  RETURN NEW;
END; $$;

CREATE TRIGGER enforce_payout_request_trigger
  BEFORE INSERT ON public.referral_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payout_request();

-- RPC PUBLIQUES (côté utilisateur connecté) --------------------------------

CREATE OR REPLACE FUNCTION public.get_referral_summary()
RETURNS TABLE(
  referral_code text,
  total_referrals integer,
  pro_referrals integer,
  balance_cents integer,
  lifetime_earned_cents integer,
  has_pending_payout boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid()),
    (SELECT count(*)::int FROM public.profiles r WHERE r.referred_by = auth.uid()),
    (SELECT count(*)::int FROM public.profiles r WHERE r.referred_by = auth.uid() AND r.plan = 'pro'),
    public.referral_balance_cents(auth.uid()),
    (SELECT COALESCE(sum(amount_cents), 0)::int FROM public.referral_commissions WHERE referrer_id = auth.uid()),
    EXISTS (
      SELECT 1 FROM public.referral_payout_requests
      WHERE user_id = auth.uid() AND status = 'pending'
    )
$$;

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(
  id uuid,
  display_name text,
  plan public.plan_tier,
  appointments_this_month integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    COALESCE(r.full_name, r.email) AS display_name,
    r.plan,
    (SELECT count(*)::int FROM public.appointments a
       WHERE a.owner_id = r.id AND a.created_at >= date_trunc('month', now())),
    r.created_at
  FROM public.profiles r
  WHERE r.referred_by = auth.uid()
  ORDER BY r.created_at DESC
$$;

-- Appelée uniquement côté serveur (supabaseAdmin, service_role) depuis
-- completeLoginChallenge — c'est le seul point où la connexion/inscription est
-- définitivement confirmée (flux 2FA par email). _user_id vient du contexte
-- serveur authentifié, jamais d'un paramètre client non vérifié.
CREATE OR REPLACE FUNCTION public.claim_referral(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _already_referred uuid;
  _created_at timestamptz;
BEGIN
  SELECT referred_by, created_at INTO _already_referred, _created_at
  FROM public.profiles WHERE id = _user_id;

  IF _already_referred IS NOT NULL OR _created_at IS NULL OR _created_at < now() - interval '30 minutes' THEN
    RETURN false;
  END IF;

  SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = _code;
  IF _referrer_id IS NULL OR _referrer_id = _user_id THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET referred_by = _referrer_id WHERE id = _user_id AND referred_by IS NULL;
  RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.referral_balance_cents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_referral_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_referral(uuid, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_referral(uuid, text) TO service_role;
