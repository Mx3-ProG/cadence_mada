import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/$locale/confidentialite")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Politique de confidentialité (RGPD) — Cadence" },
      {
        name: "description",
        content:
          "Données collectées, finalités, bases légales, durées de conservation et droits RGPD des utilisateurs et invités de Cadence.",
      },
      { property: "og:title", content: "Politique de confidentialité (RGPD) — Cadence" },
      {
        property: "og:description",
        content: "Comment Cadence traite les données personnelles et comment exercer tes droits.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/confidentialite" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Confidentialite,
});

type LabeledItem = { label: string; text: string };

function Confidentialite() {
  const { t } = useTranslation("legal");
  const dataItems = t("confidentialite.s2.list", { returnObjects: true }) as LabeledItem[];
  const purposeItems = t("confidentialite.s3.list", { returnObjects: true }) as string[];
  const retentionItems = t("confidentialite.s6.list", { returnObjects: true }) as string[];

  return (
    <LegalPage title={t("confidentialite.page.title")} currentDocPath="/$locale/confidentialite">
      <section>
        <h2>{t("confidentialite.s1.heading")}</h2>
        <p>{t("confidentialite.s1.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s2.heading")}</h2>
        <ul>
          {dataItems.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong> : {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("confidentialite.s3.heading")}</h2>
        <ul>
          {purposeItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("confidentialite.s4.heading")}</h2>
        <p>{t("confidentialite.s4.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s5.heading")}</h2>
        <p>{t("confidentialite.s5.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s6.heading")}</h2>
        <ul>
          {retentionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t("confidentialite.s7.heading")}</h2>
        <p>{t("confidentialite.s7.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s8.heading")}</h2>
        <p>{t("confidentialite.s8.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s9.heading")}</h2>
        <p>{t("confidentialite.s9.p")}</p>
      </section>

      <section>
        <h2>{t("confidentialite.s10.heading")}</h2>
        <p>{t("confidentialite.s10.p")}</p>
      </section>
    </LegalPage>
  );
}
