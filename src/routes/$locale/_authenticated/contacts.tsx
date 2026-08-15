import { ContactsSkeleton } from "@/components/loading/page-skeletons";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarPlus,
  Cake,
  Check,
  Copy,
  Gift,
  Globe,
  Heart,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/agenda/app-header";
import { ContactDialog } from "@/components/agenda/contact-dialog";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { ContactSearchDialog } from "@/components/agenda/contact-search-dialog";
import { ContactImportDialog } from "@/components/agenda/contact-import-dialog";
import { FeatureTeaser } from "@/components/agenda/locked-feature-card";
import { Reveal } from "@/components/reveal";
import { bookingUrl, defaultBookingHours, generateBookingSlug, type Contact } from "@/lib/agenda";
import { PlanBanner } from "@/components/agenda/plan-banner";
import { useLocale } from "@/i18n/use-locale";
import { formatLongDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import {
  hasFeatureAccess,
  isContactLimitReached,
  nextTier,
  planUsageQueryKey,
  TIER_LABELS,
  TIER_LIMITS,
  usePlanUsage,
} from "@/lib/plan";
import {
  activeContactFilterCount,
  buildContactAppointmentDates,
  EMPTY_CONTACT_SEARCH_FILTERS,
  filterAndSortContacts,
  type ContactAppointmentLink,
} from "@/lib/contact-search";

function formatBirthday(value: string, locale: Locale) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return formatLongDate(d, locale);
}

const KNOWN_GENDERS = ["female", "male", "other"];

function genderLabel(gender: string, t: (key: string) => string) {
  return KNOWN_GENDERS.includes(gender) ? t(`gender.${gender}`) : gender;
}

export const Route = createFileRoute("/$locale/_authenticated/contacts")({
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
  const locale = useLocale();
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const planQuery = usePlanUsage();
  const isPro = hasFeatureAccess(planQuery.data, "standard");
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
    if (error) {
      setActivating(false);
      toast.error(t("booking.activate_error"));
      return;
    }

    const { count } = await supabase
      .from("booking_hours")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId);
    if (!count) {
      await supabase
        .from("booking_hours")
        .insert(defaultBookingHours().map((h) => ({ ...h, owner_id: userId })));
      void queryClient.invalidateQueries({ queryKey: ["booking-hours"] });
    }

    setActivating(false);
    toast.success(t("booking.activated"));
    void queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
  };

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(bookingUrl(slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const settings = settingsQuery.data;

  const bookingBody =
    !settingsQuery.isLoading && !settings?.enabled ? (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("booking.share_text")}</p>
        <Button size="sm" disabled={activating} onClick={activate} className="shrink-0 gap-2">
          <Link2 className="h-4 w-4" />
          {t("booking.activate")}
        </Button>
      </div>
    ) : settings?.enabled && settings.slug ? (
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <code className="min-w-0 max-w-full truncate rounded-lg bg-surface/70 px-3 py-1.5 text-xs">
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
            {copied ? t("booking.copied") : t("booking.copy")}
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-2">
            <Link to="/$locale/settings" params={{ locale }}>
              <Settings className="h-4 w-4" />
              {t("booking.hours")}
            </Link>
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="glass-panel mt-6 min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h2 className="font-display text-base font-bold">{t("booking.title")}</h2>
      </div>

      {isPro ? (
        bookingBody
      ) : (
        <FeatureTeaser title={t("booking.title")} minTier="standard">
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("booking.share_text")}</p>
            <Button size="sm" className="shrink-0 gap-2">
              <Link2 className="h-4 w-4" />
              {t("booking.activate")}
            </Button>
          </div>
        </FeatureTeaser>
      )}
    </div>
  );
}

function ContactsPage() {
  const locale = useLocale();
  const { t } = useTranslation("contacts");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [apptContactId, setApptContactId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({ ...EMPTY_CONTACT_SEARCH_FILTERS });

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);
  const contactAppointmentsQuery = useQuery({
    queryKey: ["contact-appointments"],
    enabled: contacts.length > 0,
    queryFn: async (): Promise<ContactAppointmentLink[]> => {
      const [appointmentsResult, invitationsResult] = await Promise.all([
        supabase.from("appointments").select("id, contact_id, starts_at, status"),
        supabase.from("appointment_invites").select("appointment_id, contact_id"),
      ]);
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (invitationsResult.error) throw invitationsResult.error;

      const activeAppointments = (appointmentsResult.data ?? []).filter(
        (appointment) => appointment.status !== "cancelled",
      );
      const startsAtByAppointment = new Map(
        activeAppointments.map((appointment) => [appointment.id, appointment.starts_at]),
      );
      const links = new Map<string, ContactAppointmentLink>();

      for (const appointment of activeAppointments) {
        if (!appointment.contact_id) continue;
        const link = {
          appointmentId: appointment.id,
          contactId: appointment.contact_id,
          startsAt: appointment.starts_at,
        };
        links.set(`${link.appointmentId}:${link.contactId}`, link);
      }
      for (const invitation of invitationsResult.data ?? []) {
        const startsAt = startsAtByAppointment.get(invitation.appointment_id);
        if (!startsAt) continue;
        const link = {
          appointmentId: invitation.appointment_id,
          contactId: invitation.contact_id,
          startsAt,
        };
        links.set(`${link.appointmentId}:${link.contactId}`, link);
      }
      return [...links.values()];
    },
  });

  const appointmentDates = useMemo(
    () => buildContactAppointmentDates(contactAppointmentsQuery.data ?? []),
    [contactAppointmentsQuery.data],
  );
  const visibleContacts = useMemo(
    () => filterAndSortContacts(contacts, searchFilters, appointmentDates),
    [contacts, searchFilters, appointmentDates],
  );
  const activeFilters = activeContactFilterCount(searchFilters);
  const planQuery = usePlanUsage();

  if (contactsQuery.isLoading && !contactsQuery.data) return <ContactsSkeleton />;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: ["contact-appointments"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("delete.success"));
    refresh();
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("page.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeFilters > 0
                ? t("page.results_count", { count: visibleContacts.length, total: contacts.length })
                : t("page.count", { count: contacts.length })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-full"
              aria-label={t("search_aria")}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              {activeFilters > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t("import")}</span>
            </Button>
            <Button
              className="shrink-0 gap-2"
              onClick={() => {
                if (isContactLimitReached(planQuery.data)) {
                  const plan = planQuery.data?.plan ?? "free";
                  const limit = TIER_LIMITS[plan].contacts;
                  const upsell = nextTier(plan);
                  toast.error(
                    t("plan_limit_error", { plan: TIER_LABELS[plan], limit }) +
                      (upsell ? t("plan_limit_upsell", { plan: TIER_LABELS[upsell] }) : ""),
                  );
                  return;
                }
                setEditing(null);
                setOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("new_contact")}</span>
            </Button>
          </div>
        </div>

        <PlanBanner usage={planQuery.data} />
        <BookingLinkCard />

        {contacts.length === 0 ? (
          <div className="glass-panel mt-8 rounded-2xl px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("empty.title")}</p>
          </div>
        ) : visibleContacts.length === 0 ? (
          <div className="glass-panel mt-8 rounded-2xl px-6 py-16 text-center">
            <p className="text-sm font-medium">{t("empty_filtered.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("empty_filtered.subtitle")}</p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setSearchFilters({ ...EMPTY_CONTACT_SEARCH_FILTERS })}
            >
              {t("empty_filtered.reset")}
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleContacts.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04}>
                <article className="glass-panel h-full min-w-0 overflow-hidden rounded-2xl p-4 transition-shadow hover:shadow-glow sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-display text-lg font-bold">{c.name}</h2>
                        {c.relationship && (
                          <Badge variant="secondary" className="shrink-0 gap-1">
                            <Gift className="h-3 w-3" />
                            {c.relationship === "parrain"
                              ? t("card.relationship.parrain")
                              : t("card.relationship.filleul")}
                          </Badge>
                        )}
                      </div>
                      {c.role_title && (
                        <p className="truncate text-xs text-muted-foreground">{c.role_title}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("card.edit_aria")}
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
                        aria-label={t("card.delete_aria")}
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {c.company && (
                      <p className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.company}</span>
                      </p>
                    )}
                    {c.email && (
                      <p className="flex min-w-0 items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                    {c.phone && (
                      <p className="flex min-w-0 items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </p>
                    )}
                    {(c.city || c.country || c.address) && (
                      <p className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[c.address, c.city, c.country].filter(Boolean).join(", ")}
                        </span>
                      </p>
                    )}
                    {c.birthday && (
                      <p className="flex min-w-0 items-center gap-2">
                        <Cake className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {formatBirthday(c.birthday, locale)}
                          {c.gender ? ` · ${genderLabel(c.gender, t)}` : ""}
                        </span>
                      </p>
                    )}
                    {!c.birthday && c.gender && (
                      <p className="flex items-center gap-2">
                        <Cake className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{genderLabel(c.gender, t)}</span>
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
                              ? t("card.children_count", { count: c.children_count })
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
                    {t("card.schedule")}
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      <ContactSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        filters={searchFilters}
        onFiltersChange={setSearchFilters}
        resultsCount={visibleContacts.length}
      />
      <ContactImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingContacts={contacts}
        usage={planQuery.data}
        onImported={refresh}
      />
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
