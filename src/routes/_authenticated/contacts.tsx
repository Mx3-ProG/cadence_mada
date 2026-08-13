import { ContactsSkeleton } from "@/components/loading/page-skeletons";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarPlus,
  Cake,
  Check,
  Copy,
  Globe,
  Heart,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Settings,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/agenda/app-header";
import { ContactDialog } from "@/components/agenda/contact-dialog";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { Reveal } from "@/components/reveal";
import { bookingUrl, generateBookingSlug, type Contact } from "@/lib/agenda";
import { PlanBanner } from "@/components/agenda/plan-banner";
import {
  FREE_CONTACT_LIMIT,
  isContactLimitReached,
  planUsageQueryKey,
  usePlanUsage,
} from "@/lib/plan";

const GENDER_LABEL: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  other: "Autre",
};

function formatBirthday(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export const Route = createFileRoute("/_authenticated/contacts")({
  pendingComponent: ContactsSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Contacts — Cadence" },
      {
        name: "description",
        content: "Ton carnet de contacts : coordonnées, société et notes pour chaque rendez-vous.",
      },
      { property: "og:title", content: "Contacts — Cadence" },
      {
        property: "og:description",
        content: "Garde le contexte de chaque personne que tu rencontres cette semaine.",
      },
    ],
  }),
  component: ContactsPage,
});

function BookingLinkCard() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["booking-settings"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("booking_settings")
        .select("slug, enabled")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const activate = async () => {
    setActivating(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      setActivating(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const seed = profile?.full_name || profile?.email?.split("@")[0] || "agenda";
    const slug = generateBookingSlug(seed);

    const { error } = await supabase
      .from("booking_settings")
      .upsert({ owner_id: userId, slug, enabled: true }, { onConflict: "owner_id" });
    setActivating(false);
    if (error) {
      toast.error("Impossible d'activer le lien, réessaie.");
      return;
    }
    toast.success("Lien de réservation activé");
    void queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
  };

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(bookingUrl(slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const settings = settingsQuery.data;

  return (
    <div className="glass-panel mt-6 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-bold">Lien de réservation</h2>
      </div>

      {!settingsQuery.isLoading && !settings?.enabled && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Partage un lien public pour que tes contacts réservent eux-mêmes un créneau libre dans
            ton agenda.
          </p>
          <Button size="sm" disabled={activating} onClick={activate} className="shrink-0 gap-2">
            <Link2 className="h-4 w-4" />
            Activer mon lien
          </Button>
        </div>
      )}

      {settings?.enabled && settings.slug && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <code className="truncate rounded-lg bg-surface/70 px-3 py-1.5 text-xs">
            {bookingUrl(settings.slug)}
          </code>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => copyLink(settings.slug!)}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié" : "Copier"}
            </Button>
            <Button asChild size="sm" variant="ghost" className="gap-2">
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                Horaires
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [apptContactId, setApptContactId] = useState<string | null>(null);

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = contactsQuery.data ?? [];
  const planQuery = usePlanUsage();

  if (contactsQuery.isLoading && !contactsQuery.data) return <ContactsSkeleton />;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact supprimé");
    refresh();
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Contacts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {contacts.length} personne{contacts.length > 1 ? "s" : ""} dans ton carnet
            </p>
          </div>
          <Button
            className="shrink-0 gap-2"
            onClick={() => {
              if (isContactLimitReached(planQuery.data)) {
                toast.error(
                  `Plan Gratuit : ${FREE_CONTACT_LIMIT} contacts maximum. Passe en Pro pour l'illimité.`,
                );
                return;
              }
              setEditing(null);
              setOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau contact</span>
          </Button>
        </div>

        <PlanBanner usage={planQuery.data} />
        <BookingLinkCard />

        {contacts.length === 0 ? (
          <div className="glass-panel mt-8 rounded-2xl px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun contact pour l'instant. Ajoute les personnes que tu rencontres pour retrouver
              leurs infos avant chaque rendez-vous.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {contacts.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04}>
                <article className="glass-panel h-full rounded-2xl p-5 transition-shadow hover:shadow-glow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-bold">{c.name}</h2>
                      {c.role_title && (
                        <p className="truncate text-xs text-muted-foreground">{c.role_title}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {c.company && (
                      <p className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.company}</span>
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </p>
                    )}
                    {(c.city || c.country || c.address) && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[c.address, c.city, c.country].filter(Boolean).join(", ")}
                        </span>
                      </p>
                    )}
                    {c.birthday && (
                      <p className="flex items-center gap-2">
                        <Cake className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {formatBirthday(c.birthday)}
                          {c.gender && GENDER_LABEL[c.gender] ? ` · ${GENDER_LABEL[c.gender]}` : ""}
                        </span>
                      </p>
                    )}
                    {!c.birthday && c.gender && GENDER_LABEL[c.gender] && (
                      <p className="flex items-center gap-2">
                        <Cake className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{GENDER_LABEL[c.gender]}</span>
                      </p>
                    )}
                    {c.languages && c.languages.length > 0 && (
                      <p className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.languages.join(", ")}</span>
                      </p>
                    )}
                    {c.hobbies && c.hobbies.length > 0 && (
                      <p className="flex items-center gap-2">
                        <Heart className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.hobbies.join(", ")}</span>
                      </p>
                    )}
                    {(c.family_situation || c.children_count !== null) && (
                      <p className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[
                            c.family_situation,
                            c.children_count !== null
                              ? `${c.children_count} enfant${(c.children_count ?? 0) > 1 ? "s" : ""}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </p>
                    )}
                  </div>

                  {c.notes && (
                    <p className="mt-4 rounded-xl bg-surface/70 p-3 text-xs text-muted-foreground">
                      {c.notes}
                    </p>
                  )}

                  <Button
                    variant="secondary"
                    className="mt-4 w-full gap-2"
                    onClick={() => {
                      setApptContactId(c.id);
                      setApptOpen(true);
                    }}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Fixer un rendez-vous
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      <ContactDialog open={open} onOpenChange={setOpen} contact={editing} onSaved={refresh} />
      <AppointmentDialog
        open={apptOpen}
        onOpenChange={setApptOpen}
        appointment={null}
        contacts={contacts}
        defaultDate={null}
        presetContactId={apptContactId}
        onSaved={refresh}
      />
    </div>
  );
}
