import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation, I18nextProvider } from "react-i18next";
import { format } from "date-fns";
import { AlertCircle, Check, Clock, MapPin, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyInviteResponse } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge } from "@/components/agenda/status-badge";
import { GoogleReviewCard } from "@/components/agenda/google-review-card";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { BrandMark } from "@/components/brand-logo";
import { GuestLanguageSwitcher } from "@/components/guest-language-switcher";
import { GuestCompletionRedirect } from "@/components/guest-completion-redirect";
import { detectLocaleFromCurrentRequest } from "@/i18n/detect-locale";
import { loadNamespacesWithFallback } from "@/i18n/resources";
import { createI18nInstance } from "@/i18n/i18n-instance";
import { dateFnsLocale } from "@/i18n/date-fns-locales";

const INVITE_NS = ["invite", "agenda"] as const;

export const Route = createFileRoute("/invite/$token")({
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  loader: async () => {
    const locale = await detectLocaleFromCurrentRequest();
    const i18nResources = await loadNamespacesWithFallback(locale, INVITE_NS);
    return { locale, i18nResources };
  },
  head: ({ loaderData }) => {
    const invite = loaderData?.i18nResources[loaderData.locale]?.["invite"] ?? {};
    return {
      meta: [
        { title: invite["seo.title"] ?? "Confirmer un rendez-vous — Cadence" },
        { name: "description", content: invite["seo.description"] ?? "" },
        { property: "og:title", content: invite["seo.og_title"] ?? "" },
        { property: "og:description", content: invite["seo.og_description"] ?? "" },
      ],
    };
  },
  component: InviteRoot,
});

function InviteRoot() {
  const { locale, i18nResources } = Route.useLoaderData();
  const i18n = useMemo(() => createI18nInstance(locale, i18nResources), [locale, i18nResources]);

  return (
    <I18nextProvider i18n={i18n}>
      <InvitePage />
    </I18nextProvider>
  );
}

const INVITE_EMAIL_STORAGE_KEY = "cadence:invite-email";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InvitePage() {
  const { token } = Route.useParams();
  const { t, i18n } = useTranslation("invite");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(INVITE_EMAIL_STORAGE_KEY) ?? "";
  });
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<"accepted" | "declined" | null>(null);
  const isEmailValid = EMAIL_PATTERN.test(email.trim());

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const respond = async (accept: boolean) => {
    if (!isEmailValid) {
      toast.error(t("email.error_invalid"));
      return;
    }
    setBusy(true);
    const trimmedEmail = email.trim();
    const { error } = await supabase.rpc("respond_to_invite", {
      _token: token,
      _accept: accept,
      _message: message.trim().slice(0, 500),
      _email: trimmedEmail,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.localStorage.setItem(INVITE_EMAIL_STORAGE_KEY, trimmedEmail);
    setResponse(accept ? "accepted" : "declined");
    notifyInviteResponse({ data: { token, origin: window.location.origin } }).catch(() => {
      // L'organisateur verra quand même la réponse dans son tableau de bord.
    });
  };

  const invite = inviteQuery.data;
  const fnsLocale = dateFnsLocale(i18n.language as Parameters<typeof dateFnsLocale>[0]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <GuestLanguageSwitcher ariaLabel={t("language_aria")} />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          {inviteQuery.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
          )}

          {!inviteQuery.isLoading && inviteQuery.isError && (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </span>
              <p className="mt-4 font-medium">{t("error.title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("error.subtitle")}</p>
              <Button
                variant="outline"
                className="mt-5 min-h-11 gap-2 rounded-full"
                onClick={() => void inviteQuery.refetch()}
              >
                <RefreshCw className="h-4 w-4" /> {t("error.retry")}
              </Button>
            </div>
          )}

          {!inviteQuery.isLoading && !inviteQuery.isError && !invite && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("invalid")}</p>
          )}

          {response && (
            <GuestCompletionRedirect
              title={t(`completion.${response}.title`)}
              body={t("completion.body")}
              redirectLabel={t("completion.redirect")}
              locale={i18n.language}
            />
          )}

          {invite && !response && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("proposed_by", { host: invite.host_name ?? t("default_host") })}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    {invite.title}
                  </h1>
                </div>
                <StatusBadge status={invite.status} />
              </div>

              <div className="mt-6 space-y-2 rounded-2xl bg-surface/70 p-4 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {format(new Date(invite.starts_at), "EEEE d MMMM 'à' HH:mm", {
                      locale: fnsLocale,
                    })}{" "}
                    — {format(new Date(invite.ends_at), "HH:mm")}
                  </span>
                </p>
                {invite.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{invite.location}</span>
                  </p>
                )}
              </div>

              {invite.description && (
                <p className="mt-4 text-sm text-muted-foreground">{invite.description}</p>
              )}

              {invite.host_has_branding && invite.invite_message && (
                <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  {invite.invite_message}
                </p>
              )}

              {invite.status === "pending" ? (
                <div className="mt-6 grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="invite-email">{t("email.label")}</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder={t("email.placeholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t("email.hint")}</p>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder={t("message.placeholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      disabled={busy || !isEmailValid}
                      className="gap-2"
                      onClick={() => respond(true)}
                    >
                      <Check className="h-4 w-4" /> {t("accept")}
                    </Button>
                    <Button
                      disabled={busy || !isEmailValid}
                      variant="outline"
                      className="gap-2"
                      onClick={() => respond(false)}
                    >
                      <X className="h-4 w-4" /> {t("decline")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-border/70 px-4 py-3 text-center text-sm text-muted-foreground">
                  {invite.responded_at
                    ? t("responded.with_date", {
                        date: format(new Date(invite.responded_at), "d MMMM 'à' HH:mm", {
                          locale: fnsLocale,
                        }),
                      })
                    : t("responded.without_date")}
                </p>
              )}

              {invite.host_has_branding && invite.review_prompt_enabled && (
                <GoogleReviewCard
                  branding={{
                    businessName: invite.business_name,
                    googleReviewUrl: invite.google_review_url,
                    googleMapsUrl: invite.google_maps_url,
                    googleRating: invite.google_rating,
                    googleReviewsCount: invite.google_reviews_count,
                    websiteUrl: invite.website_url,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
