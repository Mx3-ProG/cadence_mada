import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/legal/legal-page";
import { TIER_LABELS, TIER_LIMITS, TIER_PRICES, TIER_ORDER } from "@/lib/plan";

export const Route = createFileRoute("/$locale/cgu")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — Cadence" },
      {
        name: "description",
        content:
          "Règles d'accès et d'usage de Cadence : compte, offre gratuite et abonnements payants, obligations et résiliation.",
      },
      { property: "og:title", content: "Conditions générales d'utilisation — Cadence" },
      {
        property: "og:description",
        content: "Compte, offres, paiement, obligations et résiliation du service Cadence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/cgu" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cgu,
});

function Cgu() {
  const { t } = useTranslation("legal");

  return (
    <LegalPage title={t("cgu.page.title")} currentDocPath="/$locale/cgu">
      <section>
        <h2>{t("cgu.s1.heading")}</h2>
        <p>{t("cgu.s1.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s2.heading")}</h2>
        <p>{t("cgu.s2.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s3.heading")}</h2>
        <ul>
          {TIER_ORDER.map((tier) => (
            <li key={tier}>
              <strong>
                {TIER_LABELS[tier]} — {TIER_PRICES[tier]}
                {tier === "free" ? t("cgu.s3.price_suffix_free") : t("cgu.s3.price_suffix_monthly")}
              </strong>{" "}
              :{" "}
              {t(`cgu.s3.plans.${tier}`, {
                contacts: TIER_LIMITS[tier].contacts,
                appointments: TIER_LIMITS[tier].appointments,
              })}
            </li>
          ))}
        </ul>
        <p>{t("cgu.s3.payment_p")}</p>
        <p>
          <strong>{t("cgu.s3.referral_label")}</strong>
          {t("cgu.s3.referral_p")}
        </p>
      </section>

      <section>
        <h2>{t("cgu.s4.heading")}</h2>
        <p>{t("cgu.s4.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s5.heading")}</h2>
        <ul>
          {(t("cgu.s5.list", { returnObjects: true }) as string[]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{t("cgu.s5.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s6.heading")}</h2>
        <p>{t("cgu.s6.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s7.heading")}</h2>
        <p>{t("cgu.s7.p")}</p>
      </section>

      <section>
        <h2>{t("cgu.s8.heading")}</h2>
        <p>{t("cgu.s8.p")}</p>
      </section>
    </LegalPage>
  );
}
