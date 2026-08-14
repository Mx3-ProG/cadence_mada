-- Le lien de réservation public est désormais réservé au plan Pro : la page publique
-- se comporte comme désactivée pour un propriétaire au plan Gratuit, même si
-- booking_settings.enabled = true (ex: rétrogradation après résiliation).

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
         bs.enabled AND public.current_plan(bs.owner_id) = 'pro' AS enabled,
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
