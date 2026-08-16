import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/$locale/mentions-legales")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Mentions légales — Cadence" },
      {
        name: "description",
        content:
          "Éditeur, hébergeur, propriété intellectuelle et contact de Cadence, l'agenda de rendez-vous avec confirmation par lien.",
      },
      { property: "og:title", content: "Mentions légales — Cadence" },
      {
        property: "og:description",
        content: "Éditeur, hébergeur et contact du service Cadence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/mentions-legales" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentionsLegales,
});

const EDITOR_INFO = [
  { key: "name", value: "Wayne-Web" },
  {
    key: "address",
    value: "3 Allée du Docteur Lejzer Ludwik Zamenhof, 31100 Toulouse, France",
  },
  { key: "email", value: "contact@wayne-web.com" },
  { key: "director", value: "Wayne-Web" },
] as const;

function MentionsLegales() {
  const { t } = useTranslation("legal");

  return (
    <LegalPage title={t("mentions.page.title")} currentDocPath="/$locale/mentions-legales">
      <section>
        <h2>{t("mentions.s1.heading")}</h2>
        <p>
          {t("mentions.s1.p1_prefix")}
          <strong>Cadence</strong>
          {t("mentions.s1.p1_mid")}
          <a href="https://www.wayne-web.com" target="_blank" rel="noopener noreferrer">
            Wayne-Web
          </a>
          {t("mentions.s1.p1_suffix")} <br />
          {t("mentions.s1.p2")}
        </p>
        <ul>
          {EDITOR_INFO.map((item) => (
            <li key={item.key}>
              {t(`mentions.s1.list_labels.${item.key}`)} : {item.value}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("mentions.s2.heading")}</h2>
        <p>{t("mentions.s2.p")}</p>
      </section>

      <section>
        <h2>{t("mentions.s3.heading")}</h2>
        <p>{t("mentions.s3.p")}</p>
      </section>

      <section>
        <h2>{t("mentions.s4.heading")}</h2>
        <p>{t("mentions.s4.p")}</p>
      </section>

      <section>
        <h2>{t("mentions.s5.heading")}</h2>
        <p>{t("mentions.s5.p")}</p>
      </section>
    </LegalPage>
  );
}
