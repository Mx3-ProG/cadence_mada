import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/$locale/cgu")({
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
    links: [{ rel: "canonical", href: "/cgu" }],
  }),
  component: Cgu,
});

function Cgu() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente">
      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent l'accès et l'utilisation de Cadence, application de
          gestion de rendez-vous permettant de créer des créneaux, d'y associer des contacts et
          d'envoyer des liens de confirmation. Créer un compte vaut acceptation sans réserve des
          présentes.
        </p>
      </section>

      <section>
        <h2>2. Compte</h2>
        <p>
          Le compte est personnel. Tu es responsable de la confidentialité de tes identifiants et de
          toute activité réalisée depuis ton compte. Les informations fournies doivent être exactes
          et tenues à jour.
        </p>
      </section>

      <section>
        <h2>3. Offres et tarifs</h2>
        <ul>
          <li>
            <strong>Free-mium — 0 € TTC</strong> : jusqu'à 10 contacts et 15 rendez-vous envoyés par
            mois calendaire.
          </li>
          <li>
            <strong>Basique — 19,99 € TTC par mois</strong> : jusqu'à 30 contacts et 50 rendez-vous
            par mois.
          </li>
          <li>
            <strong>Standard — 69,99 € TTC par mois</strong> : jusqu'à 50 contacts et 100
            rendez-vous par mois, agenda complet (vue semaine/mois) et réservation en libre-service.
          </li>
          <li>
            <strong>Economic — 139,99 € TTC par mois</strong> : jusqu'à 250 contacts et 500
            rendez-vous par mois, avec en plus la tendance du mois.
          </li>
          <li>
            <strong>Business — 199,99 € TTC par mois</strong> : contacts et rendez-vous illimités,
            personnalisation du lien d'invitation (marque, message, avis Google, site web), sans
            engagement de durée.
          </li>
        </ul>
        <p>
          Le paiement est mensuel, par carte bancaire, via notre prestataire de paiement. L'accès au
          palier choisi est activé dès confirmation du paiement et renouvelé automatiquement à
          chaque échéance jusqu'à résiliation.
        </p>
        <p>
          <strong>Programme de parrainage</strong> : accessible dès le plan Free-mium. Chaque
          utilisateur dispose d'un lien de parrainage unique. Si la personne parrainée souscrit à un
          plan payant, le parrain perçoit 30 % du montant payé chaque mois, tant que le filleul
          reste abonné. Retrait possible à partir de 25 € de solde disponible, traité manuellement.
        </p>
      </section>

      <section>
        <h2>4. Résiliation et remboursement</h2>
        <p>
          L'abonnement peut être résilié à tout moment depuis l'espace de facturation. L'accès au
          palier payant reste actif jusqu'à la fin de la période déjà réglée, puis le compte repasse
          en offre gratuite. Conformément à l'article L221-28 du Code de la consommation,
          l'exécution immédiate du service numérique avec accord exprès entraîne la renonciation au
          droit de rétractation de 14 jours pour la période en cours.
        </p>
      </section>

      <section>
        <h2>5. Usages interdits</h2>
        <ul>
          <li>
            Envoi de sollicitations non désirées ou de contenus illicites via les liens
            d'invitation.
          </li>
          <li>
            Ajout de données personnelles de tiers sans base légale ni information de la personne.
          </li>
          <li>
            Tentatives d'accès non autorisé, rétro-ingénierie, surcharge volontaire du service.
          </li>
        </ul>
        <p>
          Tout manquement peut entraîner la suspension ou la suppression du compte, sans
          remboursement des sommes dues à la période en cours.
        </p>
      </section>

      <section>
        <h2>6. Disponibilité et responsabilité</h2>
        <p>
          Le Service est fourni en l'état, avec une obligation de moyens. L'éditeur ne saurait être
          tenu responsable des rendez-vous manqués, des pertes d'opportunité ou des dommages
          indirects résultant d'une indisponibilité, d'un email non délivré ou d'une erreur de
          saisie.
        </p>
      </section>

      <section>
        <h2>7. Données personnelles</h2>
        <p>
          Le traitement des données est décrit dans la politique de confidentialité. En saisissant
          les données de tes contacts, tu garantis disposer d'une base légale pour le faire et
          informer les personnes concernées.
        </p>
      </section>

      <section>
        <h2>8. Modification et droit applicable</h2>
        <p>
          Les présentes conditions peuvent être modifiées ; les utilisateurs sont informés des
          changements substantiels avant leur entrée en vigueur. Le droit français est applicable. À
          défaut d'accord amiable, les tribunaux français sont compétents.
        </p>
      </section>
    </LegalPage>
  );
}
