import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Gift, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/agenda/app-header";
import { Reveal } from "@/components/reveal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { statusLabel } from "@/lib/agenda";
import {
  useAdminOverview,
  useAdminPayoutRequests,
  useIsAdmin,
  useSetPayoutStatus,
  type AdminUserRow,
} from "@/lib/admin";
import { formatCents } from "@/lib/referral";
import { hasTierAtLeast, TIER_LABELS } from "@/lib/plan";
import { AdminSkeleton } from "@/components/loading/page-skeletons";
import { CalendarLoader } from "@/components/loading/calendar-loader";

export const Route = createFileRoute("/$locale/_authenticated/admin")({
  pendingComponent: AdminSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Console admin — Cadence" },
      {
        name: "description",
        content:
          "Console développeur : tous les comptes Cadence, leurs contacts et leurs rendez-vous au même endroit.",
      },
      { property: "og:title", content: "Console admin — Cadence" },
      {
        property: "og:description",
        content: "Inspection complète des comptes, contacts et rendez-vous de Cadence.",
      },
    ],
  }),
  component: AdminPage,
});

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy HH:mm", { locale: fr });
}

function UserPanel({ row }: { row: AdminUserRow }) {
  const p = row.profile;
  return (
    <AccordionItem value={p.id} className="rounded-2xl border border-border/60 bg-surface/50 px-4">
      <AccordionTrigger className="gap-3 py-4 hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
          <span className="truncate font-medium">{p.full_name || p.email || p.id}</span>
          <span className="truncate text-xs text-muted-foreground">{p.email}</span>
          <Badge variant={hasTierAtLeast(p.plan, "basic") ? "default" : "secondary"}>
            {TIER_LABELS[p.plan]}
          </Badge>
          {row.roles.map((r) => (
            <Badge key={r} variant="outline">
              {r}
            </Badge>
          ))}
          <span className="ms-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {row.contacts.length}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {row.appointments.length}
            </span>
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pb-5">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <p>ID : {p.id}</p>
          <p>Inscrit le : {fmt(p.created_at)}</p>
          <p>Abonnement : {p.subscription_status ?? "—"}</p>
          <p>Renouvellement : {fmt(p.plan_renews_at)}</p>
          <p>Entreprise : {p.business_name ?? "—"}</p>
          <p>Client Stripe : {p.stripe_customer_id ?? "—"}</p>
          <p>Note Google : {p.google_rating ?? "—"}</p>
          <p>Avis Google : {p.google_reviews_count ?? "—"}</p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Contacts ({row.contacts.length})</h4>
          {row.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Nom</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Téléphone</th>
                    <th className="px-3 py-2 text-left">Société</th>
                    <th className="px-3 py-2 text-left">Ville</th>
                    <th className="px-3 py-2 text-left">Créé</th>
                  </tr>
                </thead>
                <tbody>
                  {row.contacts.map((c) => (
                    <tr key={c.id} className="border-t border-border/50">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.email ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.phone ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.company ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.city ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmt(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Rendez-vous ({row.appointments.length})</h4>
          {row.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rendez-vous.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Titre</th>
                    <th className="px-3 py-2 text-left">Invité</th>
                    <th className="px-3 py-2 text-left">Début</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-left">Lien envoyé</th>
                    <th className="px-3 py-2 text-left">Réponse</th>
                  </tr>
                </thead>
                <tbody>
                  {row.appointments.map((a) => {
                    const guest = row.contacts.find((c) => c.id === a.contact_id);
                    return (
                      <tr key={a.id} className="border-t border-border/50">
                        <td className="px-3 py-2">{a.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{guest?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{fmt(a.starts_at)}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{statusLabel[a.status]}</Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{fmt(a.invite_sent_at)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{fmt(a.responded_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function PayoutRequests({ isAdmin }: { isAdmin: boolean }) {
  const { data: requests, isPending } = useAdminPayoutRequests(isAdmin);
  const setStatus = useSetPayoutStatus();

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const paidTotal = (requests ?? [])
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount_cents, 0);

  const act = (id: string, status: "paid" | "rejected") => {
    setStatus.mutate(
      { id, status },
      {
        onSuccess: () =>
          toast.success(status === "paid" ? "Marqué comme payé." : "Demande rejetée."),
        onError: () => toast.error("Action impossible."),
      },
    );
  };

  return (
    <Reveal>
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Gift className="h-4 w-4 text-primary" /> Demandes de retrait — parrainage
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label="En attente" value={pending.length} />
          <Stat label="Total déjà versé" value={formatCents(paidTotal)} />
        </div>

        <div className="mt-4">
          {isPending ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : !requests || requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande de retrait.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Parrain</th>
                    <th className="px-3 py-2 text-left">Montant</th>
                    <th className="px-3 py-2 text-left">Demandé le</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="px-3 py-2">
                        <span className="block">{r.requester?.fullName || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.requester?.email ?? r.user_id}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCents(r.amount_cents)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmt(r.requested_at)}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            r.status === "paid"
                              ? "default"
                              : r.status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {r.status === "paid"
                            ? "Payé"
                            : r.status === "rejected"
                              ? "Rejeté"
                              : "En attente"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {r.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => act(r.id, "paid")}>
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act(r.id, "rejected")}
                            >
                              Rejeter
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {fmt(r.processed_at)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function AdminPage() {
  const { data: isAdmin, isPending: checking } = useIsAdmin();
  const { data, isPending, error } = useAdminOverview(Boolean(isAdmin));
  const [q, setQ] = useState("");

  const users = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.users;
    return data.users.filter((u) => {
      const hay = [
        u.profile.full_name,
        u.profile.email,
        u.profile.business_name,
        u.profile.id,
        ...u.contacts.map((c) => c.name),
        ...u.appointments.map((a) => a.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [data, q]);

  if (checking) return <AdminSkeleton />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-20 sm:px-6">
          <div className="rounded-3xl border border-border/60 bg-surface/60 p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold">Accès réservé</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Cet espace est réservé au développeur. Ton compte n'a pas le rôle administrateur.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto w-full min-w-0 max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Console admin
              </h1>
              <p className="text-sm text-muted-foreground">
                Toutes les données de Cadence : comptes, contacts et rendez-vous.
              </p>
            </div>
          </div>
        </Reveal>

        {error ? (
          <p className="text-sm text-destructive">
            Impossible de charger les données : {(error as Error).message}
          </p>
        ) : null}

        {isPending || !data ? (
          <div className="py-8">
            <CalendarLoader label="Chargement des données…" />
          </div>
        ) : (
          <>
            <Reveal>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Utilisateurs"
                  value={data.totals.users}
                  hint={`${data.totals.paying} sur un plan payant`}
                />
                <Stat label="Contacts" value={data.totals.contacts} />
                <Stat
                  label="Rendez-vous"
                  value={data.totals.appointments}
                  hint={`${data.totals.invitesSent} liens envoyés`}
                />
                <Stat
                  label="Statuts"
                  value={`${data.totals.accepted} / ${data.totals.pending} / ${data.totals.declined}`}
                  hint="acceptés / en attente / refusés"
                />
              </div>
            </Reveal>

            <Reveal>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher un utilisateur, contact ou rendez-vous…"
                  className="ps-9"
                />
              </div>
            </Reveal>

            <Reveal>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun résultat.</p>
              ) : (
                <Accordion type="multiple" className="space-y-3">
                  {users.map((u) => (
                    <UserPanel key={u.profile.id} row={u} />
                  ))}
                </Accordion>
              )}
            </Reveal>

            <PayoutRequests isAdmin={Boolean(isAdmin)} />
          </>
        )}
      </main>
    </div>
  );
}
