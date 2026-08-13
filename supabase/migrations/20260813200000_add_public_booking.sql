-- PUBLIC BOOKING: horaires hebdo configurables + lien public de réservation
-- Un visiteur externe (sans compte) propose un créneau libre dans l'agenda du
-- propriétaire ; le rendez-vous est créé en statut 'pending' et le propriétaire
-- l'accepte/refuse depuis son dashboard (voir appointments.status existant).

CREATE TABLE public.booking_settings (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  slot_duration_minutes integer NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  min_notice_hours integer NOT NULL DEFAULT 24 CHECK (min_notice_hours >= 0),
  booking_window_days integer NOT NULL DEFAULT 30 CHECK (booking_window_days > 0),
  timezone text NOT NULL DEFAULT 'Indian/Antananarivo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_settings TO authenticated;
GRANT ALL ON public.booking_settings TO service_role;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their booking settings" ON public.booking_settings
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER booking_settings_updated_at BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Horaires hebdomadaires récurrents (plusieurs plages possibles par jour).
-- weekday : 0 = dimanche … 6 = samedi (aligné sur Date.getDay() côté client).
CREATE TABLE public.booking_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_hours TO authenticated;
GRANT ALL ON public.booking_hours TO service_role;
ALTER TABLE public.booking_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their booking hours" ON public.booking_hours
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX booking_hours_owner_weekday_idx ON public.booking_hours (owner_id, weekday);

-- Distingue les RDV créés manuellement de ceux venus du lien public.
ALTER TABLE public.appointments
  ADD COLUMN source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'public_booking'));

-- PUBLIC BOOKING PAGE ACCESS (no account required, slug-scoped)

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
         CASE WHEN public.current_plan(bs.owner_id) = 'pro' THEN p.business_name END,
         bs.enabled,
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

CREATE OR REPLACE FUNCTION public.get_booked_intervals(_slug text, _from timestamptz, _to timestamptz)
RETURNS TABLE (
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.starts_at, a.ends_at
  FROM public.appointments a
  JOIN public.booking_settings bs ON bs.owner_id = a.owner_id
  WHERE bs.slug = _slug
    AND a.status IN ('pending', 'accepted')
    AND a.starts_at < _to
    AND a.ends_at > _from
$$;

REVOKE ALL ON FUNCTION public.get_booking_page(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_booked_intervals(text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_page(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_booked_intervals(text, timestamptz, timestamptz) TO anon, authenticated, service_role;
