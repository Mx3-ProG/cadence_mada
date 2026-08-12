import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type AdminContact = Tables<"contacts">;
export type AdminAppointment = Tables<"appointments">;
export type UserRole = Tables<"user_roles">;

export const isAdminQueryKey = ["is-admin"] as const;
export const adminOverviewQueryKey = ["admin-overview"] as const;

export function useIsAdmin() {
  return useQuery({
    queryKey: isAdminQueryKey,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (error) return false;
      return Boolean(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type AdminUserRow = {
  profile: Profile;
  roles: string[];
  contacts: AdminContact[];
  appointments: AdminAppointment[];
};

export type AdminOverview = {
  users: AdminUserRow[];
  totals: {
    users: number;
    contacts: number;
    appointments: number;
    pro: number;
    pending: number;
    accepted: number;
    declined: number;
    cancelled: number;
    invitesSent: number;
  };
};

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [profilesRes, contactsRes, apptRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("created_at", { ascending: false }),
    supabase.from("appointments").select("*").order("starts_at", { ascending: false }),
    supabase.from("user_roles").select("*"),
  ]);

  const err = profilesRes.error ?? contactsRes.error ?? apptRes.error ?? rolesRes.error;
  if (err) throw err;

  const profiles = profilesRes.data ?? [];
  const contacts = contactsRes.data ?? [];
  const appointments = apptRes.data ?? [];
  const roles = rolesRes.data ?? [];

  const users: AdminUserRow[] = profiles.map((profile) => ({
    profile,
    roles: roles.filter((r) => r.user_id === profile.id).map((r) => r.role as string),
    contacts: contacts.filter((c) => c.owner_id === profile.id),
    appointments: appointments.filter((a) => a.owner_id === profile.id),
  }));

  return {
    users,
    totals: {
      users: profiles.length,
      contacts: contacts.length,
      appointments: appointments.length,
      pro: profiles.filter((p) => p.plan === "pro").length,
      pending: appointments.filter((a) => a.status === "pending").length,
      accepted: appointments.filter((a) => a.status === "accepted").length,
      declined: appointments.filter((a) => a.status === "declined").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      invitesSent: appointments.filter((a) => Boolean(a.invite_sent_at)).length,
    },
  };
}

export function useAdminOverview(enabled: boolean) {
  return useQuery({ queryKey: adminOverviewQueryKey, queryFn: fetchAdminOverview, enabled });
}
