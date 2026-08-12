-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CONTACTS
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  role_title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- APPOINTMENTS
CREATE TYPE public.appointment_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  prep_notes text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  invite_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  invite_sent_at timestamptz,
  responded_at timestamptz,
  response_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_token)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their appointments" ON public.appointments
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- new user handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PUBLIC INVITE ACCESS (no account required, token-scoped)
CREATE OR REPLACE FUNCTION public.get_invite(_token text)
RETURNS TABLE (
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  response_message text,
  responded_at timestamptz,
  host_name text,
  guest_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.title, a.description, a.location, a.starts_at, a.ends_at, a.status,
         a.response_message, a.responded_at,
         COALESCE(p.full_name, p.email) AS host_name,
         c.name AS guest_name
  FROM public.appointments a
  LEFT JOIN public.profiles p ON p.id = a.owner_id
  LEFT JOIN public.contacts c ON c.id = a.contact_id
  WHERE a.invite_token = _token
$$;

CREATE OR REPLACE FUNCTION public.respond_to_invite(_token text, _accept boolean, _message text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  UPDATE public.appointments
  SET status = CASE WHEN _accept THEN 'accepted'::public.appointment_status ELSE 'declined'::public.appointment_status END,
      response_message = NULLIF(left(COALESCE(_message, ''), 1000), ''),
      responded_at = now()
  WHERE invite_token = _token
    AND status IN ('pending', 'accepted', 'declined');
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END; $$;

REVOKE ALL ON FUNCTION public.get_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_to_invite(text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_invite(text, boolean, text) TO anon, authenticated, service_role;