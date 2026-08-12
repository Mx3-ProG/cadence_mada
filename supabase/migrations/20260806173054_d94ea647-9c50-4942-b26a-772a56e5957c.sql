CREATE TABLE public.user_weekly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  appointments_total integer NOT NULL DEFAULT 0,
  accepted_count integer NOT NULL DEFAULT 0,
  declined_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  cancelled_count integer NOT NULL DEFAULT 0,
  invites_sent integer NOT NULL DEFAULT 0,
  contacts_created integer NOT NULL DEFAULT 0,
  acceptance_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_weekly_stats TO authenticated;
GRANT ALL ON public.user_weekly_stats TO service_role;

ALTER TABLE public.user_weekly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their weekly stats"
ON public.user_weekly_stats FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_weekly_stats_updated_at
BEFORE UPDATE ON public.user_weekly_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.rebuild_weekly_stats()
RETURNS TABLE(
  week_start date,
  appointments_total integer,
  accepted_count integer,
  declined_count integer,
  pending_count integer,
  cancelled_count integer,
  invites_sent integer,
  contacts_created integer,
  acceptance_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  DELETE FROM public.user_weekly_stats s WHERE s.user_id = _uid;

  INSERT INTO public.user_weekly_stats (
    user_id, week_start, appointments_total, accepted_count, declined_count,
    pending_count, cancelled_count, invites_sent, contacts_created, acceptance_rate
  )
  SELECT
    _uid,
    w.wk,
    COALESCE(a.total, 0),
    COALESCE(a.accepted, 0),
    COALESCE(a.declined, 0),
    COALESCE(a.pending, 0),
    COALESCE(a.cancelled, 0),
    COALESCE(a.invites, 0),
    COALESCE(c.created, 0),
    CASE WHEN COALESCE(a.total, 0) = 0 THEN 0
         ELSE round((COALESCE(a.accepted, 0)::numeric * 100) / a.total, 1) END
  FROM (
    SELECT generate_series(
      date_trunc('week', LEAST(
        COALESCE((SELECT min(created_at) FROM public.appointments WHERE owner_id = _uid), now()),
        COALESCE((SELECT min(created_at) FROM public.contacts WHERE owner_id = _uid), now()),
        COALESCE((SELECT min(created_at) FROM public.profiles WHERE id = _uid), now())
      )),
      date_trunc('week', now()),
      interval '1 week'
    )::date AS wk
  ) w
  LEFT JOIN (
    SELECT date_trunc('week', created_at)::date AS wk,
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
           count(*) FILTER (WHERE status = 'declined')::int AS declined,
           count(*) FILTER (WHERE status = 'pending')::int AS pending,
           count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
           count(*) FILTER (WHERE invite_sent_at IS NOT NULL)::int AS invites
    FROM public.appointments WHERE owner_id = _uid
    GROUP BY 1
  ) a ON a.wk = w.wk
  LEFT JOIN (
    SELECT date_trunc('week', created_at)::date AS wk, count(*)::int AS created
    FROM public.contacts WHERE owner_id = _uid
    GROUP BY 1
  ) c ON c.wk = w.wk;

  RETURN QUERY
  SELECT s.week_start, s.appointments_total, s.accepted_count, s.declined_count,
         s.pending_count, s.cancelled_count, s.invites_sent, s.contacts_created,
         s.acceptance_rate
  FROM public.user_weekly_stats s
  WHERE s.user_id = _uid
  ORDER BY s.week_start ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  DELETE FROM public.user_weekly_stats WHERE user_id = _uid;
  DELETE FROM public.appointments WHERE owner_id = _uid;
  DELETE FROM public.contacts WHERE owner_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE id = _uid;
  RETURN true;
END;
$$;