-- Passage du modèle binaire free/pro à 5 paliers : free, basic, standard, economic, business.
-- Séparé dans son propre fichier car Postgres n'autorise pas d'utiliser une valeur d'enum
-- tout juste ajoutée dans des objets DDL de la même transaction/migration.

ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'standard';
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'economic';
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'business';
