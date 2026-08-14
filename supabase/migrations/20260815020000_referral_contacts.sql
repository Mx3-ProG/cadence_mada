-- Parrainage v2 : ouvert à tous les paliers (y compris Gratuit), commission de 30%
-- (au lieu d'1€ fixe, géré côté application dans recordReferralCommission), et lien
-- automatique en tant que contact des deux côtés (parrain <-> filleul) pour pouvoir se
-- fixer un rendez-vous directement.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS relationship text CHECK (relationship IN ('parrain', 'filleul')),
  ADD COLUMN IF NOT EXISTS linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Les contacts générés automatiquement par le parrainage ne comptent pas dans le quota
-- de contacts du plan (sinon un compte Gratuit déjà plein ne pourrait plus parrainer).
CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
  _limit int;
BEGIN
  IF public.has_role(NEW.owner_id, 'admin') OR NEW.relationship IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _limit := CASE public.current_plan(NEW.owner_id)
    WHEN 'free' THEN 10
    WHEN 'basic' THEN 30
    WHEN 'standard' THEN 50
    WHEN 'economic' THEN 250
    ELSE NULL -- business : illimité
  END;

  IF _limit IS NOT NULL THEN
    SELECT count(*) INTO _count FROM public.contacts WHERE owner_id = NEW.owner_id;
    IF _count >= _limit THEN
      RAISE EXCEPTION 'FREE_PLAN_CONTACT_LIMIT: ce plan est limité à % contacts.', _limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- Au moment où le parrainage est confirmé (claim_referral, appelé uniquement côté
-- serveur après confirmation du compte), on crée un contact de chaque côté :
--   - chez le filleul : contact "parrain" pointant vers le parrain
--   - chez le parrain : contact "filleul" pointant vers le nouveau filleul
-- Ça permet à chacun de proposer un rendez-vous à l'autre depuis sa page Contacts,
-- avec le bouton "Fixer un rendez-vous" déjà existant sur chaque fiche contact.
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
  _referrer_name text;
  _referrer_email text;
  _referred_name text;
  _referred_email text;
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
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT COALESCE(full_name, email), email INTO _referrer_name, _referrer_email
  FROM public.profiles WHERE id = _referrer_id;
  SELECT COALESCE(full_name, email), email INTO _referred_name, _referred_email
  FROM public.profiles WHERE id = _user_id;

  INSERT INTO public.contacts (owner_id, name, email, relationship, linked_user_id)
  VALUES (_user_id, COALESCE(_referrer_name, 'Parrain'), _referrer_email, 'parrain', _referrer_id);

  INSERT INTO public.contacts (owner_id, name, email, relationship, linked_user_id)
  VALUES (_referrer_id, COALESCE(_referred_name, 'Filleul'), _referred_email, 'filleul', _user_id);

  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.claim_referral(uuid, text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(uuid, text) TO service_role;
