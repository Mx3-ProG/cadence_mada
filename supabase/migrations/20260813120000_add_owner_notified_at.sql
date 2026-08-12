ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz;
