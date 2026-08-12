ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hobbies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS family_situation text,
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS gender text;