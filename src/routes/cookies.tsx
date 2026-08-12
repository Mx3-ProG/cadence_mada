import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LegalPage } from "@/components/legal/legal-page";
import { openCookieSettings } from "@/components/legal/cookie-consent";

export const Route = createFileRoute("/cookies")({
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

const rows = [
  {
    name: "Session d'authentification",
    type: "Strictement nécessaire",
    purpose: "Maintenir ta connexion et sécuriser tes requêtes.",
    duration: "Jusqu'à la déconnexion (max. 1 an)",
  },
  {
    name: "Préférence de thème",
    type: "Strictement nécessaire",
    purpose: "Mémoriser le mode clair ou sombre choisi.",
    duration: "1 an",
  },
  {
    name: "Consentement cookies",
    type: "Strictement nécessaire",
    purpose: "Conserver tes choix pour ne plus afficher le bandeau.",
    duration: "6 mois",
  },
  {
    name: "Mesure d'audience",
    type: "Soumis au consentement",
    purpose: "Statistiques d'usage agrégées pour améliorer le produit.",
    duration: "13 mois maximum",
  },
  {
    name: "Marketing",
    type: "Soumis au consentement",
    purpose: "Personnalisation des contenus et mesure des campagnes.",
    duration: "13 mois maximum",
  },
];

function Cookies() {
  return (
    <LegalPage title="Politique de gestion des cookies">
      <section>
        <h2>Qu'est-ce qu'un cookie ?</h2>
        <p>
          Un cookie est un petit fichier déposé sur ton terminal lors de la visite d'un site.
          Cadence utilise également le stockage local du navigateur, soumis aux mêmes règles. Les
          traceurs non essentiels ne sont déposés qu'après ton accord explicite, conformément au
          RGPD et aux recommandations de la CNIL.
        </p>
      </section>

      <section>
        <h2>Traceurs utilisés</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Traceur</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 font-semibold">Finalité</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
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
        <h2>Gérer ton consentement</h2>
        <p>
          Tu peux modifier ou retirer ton choix à tout moment. Le refus des traceurs optionnels
          n'empêche pas l'utilisation du Service.
        </p>
        <Button className="mt-4 rounded-full" onClick={() => openCookieSettings()}>
          Modifier mes préférences cookies
        </Button>
      </section>

      <section>
        <h2>Paramétrage du navigateur</h2>
        <p>
          Les principaux navigateurs permettent également de bloquer ou supprimer les cookies depuis
          leurs réglages de confidentialité. Ce blocage global peut dégrader certaines
          fonctionnalités, notamment le maintien de la session.
        </p>
      </section>
    </LegalPage>
  );
}
