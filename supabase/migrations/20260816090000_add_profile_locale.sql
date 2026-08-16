-- Langue du compte du pro : détermine la langue des emails envoyés depuis ce compte
-- (l'invité/le contact n'a pas de compte, donc pas de préférence stockée côté client).
-- Synchronisée automatiquement avec le sélecteur de langue de l'appli connectée.
ALTER TABLE public.profiles
  ADD COLUMN locale text NOT NULL DEFAULT 'fr'
  CHECK (locale IN ('fr','en','de','ru','ar','es','it','pt','zh','hi'));
