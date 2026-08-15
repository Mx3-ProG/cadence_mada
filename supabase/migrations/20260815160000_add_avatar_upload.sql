-- Photo de profil : bucket de stockage public (les avatars doivent être lisibles sans auth,
-- pour s'afficher dans les emails envoyés à des tiers) + policies limitant l'écriture au
-- propriétaire du dossier `{user_id}/...`, et un RPC pour lire l'avatar d'un autre utilisateur
-- (ex: contact parrain/filleul lié à un vrai compte) sans lui donner accès à tout son profil.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update their own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.get_avatar_urls(_ids uuid[])
RETURNS TABLE(id uuid, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.avatar_url FROM public.profiles p WHERE p.id = ANY(_ids);
$$;

REVOKE ALL ON FUNCTION public.get_avatar_urls(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_avatar_urls(uuid[]) TO authenticated;
