-- L'offre Standard (69,99 €) passe de 50 contacts / 100 rdv-mois à 100 contacts à vie / 250 rdv par mois.
-- Les limites sont recalculées à chaque insertion depuis le palier courant (pas de valeur stockée
-- par utilisateur), donc les abonnés Standard existants bénéficient immédiatement du changement.

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
    WHEN 'standard' THEN 100
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

CREATE OR REPLACE FUNCTION public.enforce_appointment_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count int;
  _limit int;
BEGIN
  IF public.has_role(NEW.owner_id, 'admin') THEN
    RETURN NEW;
  END IF;

  _limit := CASE public.current_plan(NEW.owner_id)
    WHEN 'free' THEN 15
    WHEN 'basic' THEN 50
    WHEN 'standard' THEN 250
    WHEN 'economic' THEN 500
    ELSE NULL -- business : illimité
  END;

  IF _limit IS NOT NULL THEN
    SELECT count(*) INTO _count
    FROM public.appointments
    WHERE owner_id = NEW.owner_id
      AND created_at >= date_trunc('month', now());
    IF _count >= _limit THEN
      RAISE EXCEPTION 'FREE_PLAN_APPOINTMENT_LIMIT: ce plan est limité à % rendez-vous par mois.', _limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;
