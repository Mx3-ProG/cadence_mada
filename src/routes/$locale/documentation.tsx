import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/$locale/documentation")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Documentation Cadence — emails, invitations & flux serveur" },
      {
        name: "description",
        content:
          "Documentation Cadence : contenu des emails d'invitation, écrans de confirmation, variables dynamiques, scénarios d'acceptation ou de refus, flux serveur et règles d'autorisation.",
      },
      { property: "og:title", content: "Documentation Cadence" },
      {
        property: "og:description",
        content:
          "Comment ça marche : emails d'invitation, page de réponse, statuts des rendez-vous et logique d'autorisation.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/documentation" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Documentation,
});

const VARIABLE_NAMES = [
  { key: "guestName", name: "{{guestName}}", source: "contacts.name" },
  { key: "title", name: "{{title}}", source: "appointments.title" },
  { key: "dateRange", name: "{{dateRange}}", source: "appointments.starts_at / ends_at" },
  { key: "location", name: "{{location}}", source: "appointments.location" },
  { key: "description", name: "{{description}}", source: "appointments.description" },
  {
    key: "inviteLink",
    name: "{{inviteLink}}",
    source: "origin + /invite/ + appointments.invite_token",
  },
  {
    key: "inviteMessage",
    name: "{{inviteMessage}}",
    source: "profiles.invite_message (Business)",
  },
  {
    key: "googleBlock",
    name: "{{businessName}} / {{googleRating}} / {{googleReviewUrl}} / {{googleMapsUrl}}",
    source: "profiles.* (Business)",
  },
] as const;

const STATUS_KEYS = ["pending", "accepted", "declined", "cancelled"] as const;

function Documentation() {
  const { t } = useTranslation("documentation");

  return (
    <LegalPage title={t("page.title")}>
      <section>
        <h2>{t("s1.heading")}</h2>
        <p>{t("s1.p1")}</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-surface/50 p-4 text-xs leading-relaxed text-foreground">
          {t("s1.diagram")}
        </pre>
      </section>

      <section>
        <h2>{t("s2.heading")}</h2>
        <p>
          {t("s2.p1_prefix")}
          <strong>sendInviteEmail</strong>
          {t("s2.p1_mid1")}
          <strong>RESEND_FROM</strong>
          {t("s2.p1_mid2")}
          <strong>{t("s2.p1_subject")}</strong>.
        </p>
        <p>{t("s2.p2")}</p>
        <ul>
          {(t("s2.list", { returnObjects: true }) as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("s2.p3")}</p>

        <h3 className="mt-6">{t("s2.vars_heading")}</h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("s2.vars_table.variable")}</th>
                <th className="px-4 py-3 font-semibold">{t("s2.vars_table.source")}</th>
                <th className="px-4 py-3 font-semibold">{t("s2.vars_table.usage")}</th>
              </tr>
            </thead>
            <tbody>
              {VARIABLE_NAMES.map((v) => (
                <tr key={v.name} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-3">{v.source}</td>
                  <td className="px-4 py-3">{t(`vars.${v.key}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6">{t("s2.fail_heading")}</h3>
        <ul>
          <li>
            <strong>no_email</strong> : {t("s2.fail.no_email")}
          </li>
          <li>
            <strong>no_api_key</strong> : {t("s2.fail.no_api_key")}
          </li>
          <li>
            <strong>provider_error</strong> : {t("s2.fail.provider_error")}
          </li>
          <li>
            {t("s2.fail.success_prefix")}
            <strong>invite_sent_at</strong>
            {t("s2.fail.success_suffix")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("s3.heading")}</h2>
        <p>
          {t("s3.p1_prefix")}
          <strong>get_invite</strong>
          {t("s3.p1_suffix")}
        </p>
        <ul>
          <li>
            <strong>{t("s3.loading_label")}</strong> : {t("s3.loading_text")}
          </li>
          <li>
            <strong>{t("s3.invalid_label")}</strong> : {t("s3.invalid_text")}
          </li>
          <li>
            <strong>{t("s3.pending_label")}</strong> : {t("s3.pending_text")}
          </li>
          <li>
            <strong>{t("s3.accepted_label")}</strong> : {t("s3.accepted_text")}
          </li>
          <li>
            <strong>{t("s3.declined_label")}</strong> : {t("s3.declined_text")}
          </li>
          <li>
            <strong>{t("s3.cancelled_label")}</strong> : {t("s3.cancelled_text")}
          </li>
        </ul>
        <p>{t("s3.p2")}</p>
      </section>

      <section>
        <h2>{t("s4.heading")}</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("s4.table.status")}</th>
                <th className="px-4 py-3 font-semibold">{t("s4.table.label")}</th>
                <th className="px-4 py-3 font-semibold">{t("s4.table.trigger")}</th>
                <th className="px-4 py-3 font-semibold">{t("s4.table.effect")}</th>
              </tr>
            </thead>
            <tbody>
              {STATUS_KEYS.map((key) => (
                <tr key={key} className="border-t border-border/50">
                  <td className="px-4 py-3 font-mono text-foreground">{key}</td>
                  <td className="px-4 py-3">{t(`statuses.${key}.label`)}</td>
                  <td className="px-4 py-3">{t(`statuses.${key}.set`)}</td>
                  <td className="px-4 py-3">{t(`statuses.${key}.effect`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>{t("s5.heading")}</h2>
        <ul>
          <li>
            <strong>{t("s5.create_label")}</strong> : {t("s5.create_text")}
          </li>
          <li>
            <strong>sendInviteEmail</strong>
            {t("s5.send_text_suffix")}
          </li>
          <li>
            <strong>get_invite(_token)</strong>
            {t("s5.get_invite_suffix")}
          </li>
          <li>
            <strong>respond_to_invite(_token, _accept, _message)</strong>
            {t("s5.respond_suffix")}
          </li>
          <li>
            <strong>get_plan_usage()</strong>
            {t("s5.usage_suffix")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("s6.heading")}</h2>
        <ul>
          <li>
            <strong>{t("s6.organizer_label")}</strong> : {t("s6.organizer_text")}
          </li>
          <li>
            <strong>{t("s6.guest_label")}</strong> : {t("s6.guest_text")}
          </li>
          <li>
            <strong>{t("s6.roles_label")}</strong> : {t("s6.roles_text")}
          </li>
          <li>
            <strong>{t("s6.admin_label")}</strong> : {t("s6.admin_text")}
          </li>
          <li>
            <strong>{t("s6.plan_label")}</strong> : {t("s6.plan_text")}
          </li>
          <li>
            <strong>{t("s6.quotas_label")}</strong> : {t("s6.quotas_text")}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t("s7.heading")}</h2>
        <ul>
          {(t("s7.list", { returnObjects: true }) as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </LegalPage>
  );
}
