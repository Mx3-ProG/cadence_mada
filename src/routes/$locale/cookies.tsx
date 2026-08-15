import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LegalPage } from "@/components/legal/legal-page";
import { openCookieSettings } from "@/components/legal/cookie-consent";

export const Route = createFileRoute("/$locale/cookies")({
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
  head: () => ({
    meta: [
      { title: "Politique cookies — Cadence" },
      {
        name: "description",
        content:
          "Liste des cookies et traceurs utilisés par Cadence, leur finalité, leur durée, et comment modifier ton consentement à tout moment.",
      },
      { property: "og:title", content: "Politique cookies — Cadence" },
      {
        property: "og:description",
        content: "Cookies nécessaires, mesure d'audience et marketing : finalités et gestion.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/cookies" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: Cookies,
});

type CookieRow = { name: string; type: string; purpose: string; duration: string };

function Cookies() {
  const { t } = useTranslation("legal");
  const rows = t("cookies.rows", { returnObjects: true }) as CookieRow[];

  return (
    <LegalPage title={t("cookies.page.title")} currentDocPath="/$locale/cookies">
      <section>
        <h2>{t("cookies.s1.heading")}</h2>
        <p>{t("cookies.s1.p")}</p>
      </section>

      <section>
        <h2>{t("cookies.s2.heading")}</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("cookies.table.name")}</th>
                <th className="px-4 py-3 font-semibold">{t("cookies.table.type")}</th>
                <th className="px-4 py-3 font-semibold">{t("cookies.table.purpose")}</th>
                <th className="px-4 py-3 font-semibold">{t("cookies.table.duration")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">{r.purpose}</td>
                  <td className="px-4 py-3">{r.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>{t("cookies.s3.heading")}</h2>
        <p>{t("cookies.s3.p")}</p>
        <Button className="mt-4 rounded-full" onClick={() => openCookieSettings()}>
          {t("cookies.s3.button")}
        </Button>
      </section>

      <section>
        <h2>{t("cookies.s4.heading")}</h2>
        <p>{t("cookies.s4.p")}</p>
      </section>
    </LegalPage>
  );
}
