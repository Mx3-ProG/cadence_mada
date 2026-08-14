-- Suite de la migration vers 5 paliers (free/basic/standard/economic/business) :
-- limites par palier, accès aux fonctionnalités par palier, nouveau champ website_url.

-- Nettoyage des éventuelles lignes de test/dev encore en 'pro' (pas de client payant
-- réel actuellement) : on les fait atterrir sur le palier le plus complet.
UPDATE public.profiles SET plan = 'business' WHERE plan = 'pro';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url text;

-- LIMITES PAR PALIER ---------------------------------------------------------

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
  IF public.has_role(NEW.owner_id, 'admin') THEN
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
    WHEN 'standard' THEN 100
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

-- RÉSERVATION PUBLIQUE : disponible dès standard, branding (nom d'entreprise) dès business

CREATE OR REPLACE FUNCTION public.get_booking_page(_slug text)
RETURNS TABLE (
  owner_id uuid,
  host_name text,
  business_name text,
  enabled boolean,
  slot_duration_minutes integer,
  min_notice_hours integer,
  booking_window_days integer,
  timezone text,
  hours jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs.owner_id,
         COALESCE(p.full_name, p.email) AS host_name,
         CASE WHEN public.current_plan(bs.owner_id) = 'business' THEN p.business_name END,
         bs.enabled AND public.current_plan(bs.owner_id) IN ('standard', 'economic', 'business') AS enabled,
         bs.slot_duration_minutes,
         bs.min_notice_hours,
         bs.booking_window_days,
         bs.timezone,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object(
              'weekday', h.weekday,
              'start_time', h.start_time,
              'end_time', h.end_time
            ) ORDER BY h.weekday, h.start_time)
            FROM public.booking_hours h
            WHERE h.owner_id = bs.owner_id),
           '[]'::jsonb
         ) AS hours
  FROM public.booking_settings bs
  LEFT JOIN public.profiles p ON p.id = bs.owner_id
  WHERE bs.slug = _slug
$$;

REVOKE ALL ON FUNCTION public.get_booking_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_page(text) TO anon, authenticated, service_role;

-- INVITATION PAR EMAIL : branding complet (business_name, message, avis Google, site
-- web) réservé au palier business. `host_is_pro` renommé `host_has_branding` (plus
-- juste maintenant qu'il n'y a plus de palier "pro").

DROP FUNCTION IF EXISTS public.get_invite(text);

CREATE OR REPLACE FUNCTION public.get_invite(_token text)
 RETURNS TABLE(title text, description text, location text, starts_at timestamp with time zone, ends_at timestamp with time zone, status appointment_status, response_message text, responded_at timestamp with time zone, host_name text, guest_name text, host_has_branding boolean, business_name text, invite_message text, google_review_url text, google_maps_url text, google_rating numeric, google_reviews_count integer, review_prompt_enabled boolean, website_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.title, a.description, a.location, a.starts_at, a.ends_at, a.status,
         a.response_message, a.responded_at,
         COALESCE(p.full_name, p.email) AS host_name,
         c.name AS guest_name,
         (public.current_plan(a.owner_id) = 'business') AS host_has_branding,
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
$function$;

REVOKE ALL ON FUNCTION public.get_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated;
