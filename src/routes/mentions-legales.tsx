import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/mentions-legales")({
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
    links: [{ rel: "canonical", href: "/mentions-legales" }],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le service <strong>Cadence</strong> (ci-après « le Service ») est édité par l'exploitant
          du site. Les coordonnées complètes de l'éditeur (dénomination sociale, forme juridique,
          capital social, numéro RCS et numéro de TVA intracommunautaire) doivent être renseignées
          ici avant toute mise en ligne publique.
        </p>
        <ul>
          <li>Nom / raison sociale : à compléter</li>
          <li>Adresse du siège : à compléter</li>
          <li>Email de contact : à compléter</li>
          <li>Directeur de la publication : à compléter</li>
        </ul>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          L'application et sa base de données sont hébergées sur une infrastructure cloud européenne
          opérée par nos prestataires techniques (hébergement applicatif et base de données
          managée). Les coordonnées précises de l'hébergeur sont communiquées sur simple demande à
          l'adresse de contact ci-dessus.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du Service (marque, logo, interface, textes, graphismes, code
          source) est protégé par le droit de la propriété intellectuelle. Toute reproduction,
          représentation ou adaptation, totale ou partielle, sans autorisation écrite préalable est
          interdite.
        </p>
      </section>

      <section>
        <h2>Responsabilité</h2>
        <p>
          L'éditeur met tout en œuvre pour assurer l'exactitude des informations diffusées et la
          disponibilité du Service, sans pouvoir garantir une absence totale d'interruption ou
          d'erreur. Les contenus saisis par les utilisateurs (contacts, notes, rendez-vous) relèvent
          de leur seule responsabilité.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question relative au Service, à ses conditions d'utilisation ou à la protection
          des données, une demande peut être adressée à l'adresse email de contact indiquée
          ci-dessus.
        </p>
      </section>
    </LegalPage>
  );
}
