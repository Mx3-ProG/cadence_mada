import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/$locale/confidentialite")({
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
    links: [{ rel: "canonical", href: "/confidentialite" }],
  }),
  component: Confidentialite,
});

function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité (RGPD)">
      <section>
        <h2>1. Responsable de traitement</h2>
        <p>
          L'éditeur de Cadence est responsable du traitement des données liées à la création de
          compte et au fonctionnement du Service. Pour les données que tu saisis sur tes contacts et
          tes rendez-vous, tu agis en tant que responsable de traitement et Cadence intervient comme
          sous-traitant au sens de l'article 28 du RGPD.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <ul>
          <li>
            <strong>Compte</strong> : email, nom affiché, mot de passe chiffré ou identifiant du
            fournisseur d'authentification (Google), date de création.
          </li>
          <li>
            <strong>Profil pro</strong> : nom d'établissement, message d'invitation, liens Google
            Business / Maps, note et nombre d'avis affichés.
          </li>
          <li>
            <strong>Contacts</strong> : nom, email, téléphone, notes, date d'anniversaire, ville,
            adresse, pays, langues, loisirs, situation familiale, nombre d'enfants, genre.
          </li>
          <li>
            <strong>Rendez-vous</strong> : titre, date, heure, durée, lieu, notes, statut, jeton
            d'invitation et horodatage de la réponse de l'invité.
          </li>
          <li>
            <strong>Facturation</strong> : identifiants client et abonnement du prestataire de
            paiement, statut d'abonnement. Aucune donnée de carte bancaire n'est stockée par
            Cadence.
          </li>
          <li>
            <strong>Techniques</strong> : journaux de connexion et de sécurité, préférence de thème,
            choix de consentement aux cookies.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <ul>
          <li>
            Fourniture du Service (agenda, contacts, liens de confirmation) —{" "}
            <strong>exécution du contrat</strong>.
          </li>
          <li>
            Envoi des emails d'invitation et de confirmation — <strong>exécution du contrat</strong>
            et intérêt légitime de l'organisateur du rendez-vous.
          </li>
          <li>
            Gestion de l'abonnement Pro et facturation — <strong>exécution du contrat</strong> et{" "}
            <strong>obligation légale</strong> comptable.
          </li>
          <li>
            Sécurité, prévention des abus et journalisation — <strong>intérêt légitime</strong>.
          </li>
          <li>
            Mesure d'audience et communications marketing — <strong>consentement</strong>, révocable
            à tout moment.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Destinataires et sous-traitants</h2>
        <p>
          Les données sont accessibles à l'éditeur et à ses sous-traitants techniques, uniquement
          dans la mesure nécessaire à leurs prestations : hébergement applicatif et base de données
          managée, service d'envoi d'emails transactionnels, prestataire de paiement pour les
          abonnements. Aucune donnée n'est vendue ni cédée à des tiers à des fins publicitaires.
        </p>
      </section>

      <section>
        <h2>5. Transferts hors UE</h2>
        <p>
          Les données sont hébergées dans l'Union européenne. Lorsqu'un sous-traitant traite des
          données en dehors de l'UE, le transfert est encadré par les clauses contractuelles types
          de la Commission européenne ou une décision d'adéquation.
        </p>
      </section>

      <section>
        <h2>6. Durées de conservation</h2>
        <ul>
          <li>Compte et contenus associés : pendant toute la vie du compte.</li>
          <li>
            Après suppression du compte : effacement sous 30 jours, hors sauvegardes chiffrées
            purgées sous 90 jours.
          </li>
          <li>Factures et pièces comptables : 10 ans (obligation légale).</li>
          <li>Journaux techniques et de sécurité : 12 mois maximum.</li>
          <li>Preuve du consentement cookies : 6 mois.</li>
        </ul>
      </section>

      <section>
        <h2>7. Personnes invitées à un rendez-vous</h2>
        <p>
          Une personne recevant un lien d'invitation accède à une page publique limitée : titre,
          date, heure, lieu du rendez-vous et informations de l'organisateur. Sa réponse
          (acceptation ou refus) est enregistrée avec sa date. Elle peut demander la suppression de
          ses données directement auprès de l'organisateur qui l'a ajoutée comme contact, ou nous
          écrire pour être orientée.
        </p>
      </section>

      <section>
        <h2>8. Tes droits</h2>
        <p>
          Conformément aux articles 15 à 22 du RGPD, tu disposes d'un droit d'accès, de
          rectification, d'effacement, de limitation, d'opposition et de portabilité, ainsi que du
          droit de retirer ton consentement à tout moment. Ces droits s'exercent depuis ton compte
          ou par email à l'adresse de contact. Une réclamation peut être déposée auprès de la CNIL
          (cnil.fr).
        </p>
      </section>

      <section>
        <h2>9. Sécurité</h2>
        <p>
          Les échanges sont chiffrés en transit (TLS), les mots de passe sont hachés, l'accès aux
          données est cloisonné par utilisateur au niveau de la base grâce à des règles de sécurité
          par ligne, et les jetons d'invitation sont aléatoires et à usage limité.
        </p>
      </section>

      <section>
        <h2>10. Cookies</h2>
        <p>
          Le détail des traceurs utilisés et la gestion de tes préférences se trouvent sur la page
          Cookies.
        </p>
      </section>
    </LegalPage>
  );
}
