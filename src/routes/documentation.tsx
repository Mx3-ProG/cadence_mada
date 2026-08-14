import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/documentation")({
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
    links: [{ rel: "canonical", href: "/documentation" }],
  }),
  component: Documentation,
});

const variables = [
  {
    name: "{{guestName}}",
    source: "contacts.name",
    usage: "Ligne d'accroche « Bonjour {{guestName}}, ». Vide si aucun contact n'est rattaché.",
  },
  {
    name: "{{title}}",
    source: "appointments.title",
    usage: "Objet de l'email « Rendez-vous : {{title}} » et titre en gras dans le corps.",
  },
  {
    name: "{{dateRange}}",
    source: "appointments.starts_at / ends_at",
    usage: "Formaté en français : « mardi 12 août, 15:00 → 15:30 » (Intl.DateTimeFormat fr-FR).",
  },
  {
    name: "{{location}}",
    source: "appointments.location",
    usage: "Ligne « Lieu : … ». Le bloc entier est omis si le champ est vide.",
  },
  {
    name: "{{description}}",
    source: "appointments.description",
    usage: "Paragraphe libre affiché sous la date. Omis si vide.",
  },
  {
    name: "{{inviteLink}}",
    source: "origin + /invite/ + appointments.invite_token",
    usage:
      "Bouton « Confirmer ou refuser » + rappel du lien en clair en bas de l'email (copier/coller).",
  },
  {
    name: "{{inviteMessage}}",
    source: "profiles.invite_message (Business)",
    usage: "Encart vert de message personnalisé, affiché uniquement pour un organisateur Business.",
  },
  {
    name: "{{businessName}} / {{googleRating}} / {{googleReviewUrl}} / {{googleMapsUrl}}",
    source: "profiles.* (Business)",
    usage:
      "Bloc « Avis Google » en pied d'email et sur la page d'invitation, si l'option est activée.",
  },
];

const statuses = [
  {
    key: "pending",
    label: "En attente",
    set: "À la création du rendez-vous (valeur par défaut en base).",
    effect: "Le lien est actif, l'invité peut répondre. Compté dans « réponses attendues ».",
  },
  {
    key: "accepted",
    label: "Accepté",
    set: "L'invité clique sur « J'accepte » — appel de respond_to_invite(_accept = true).",
    effect: "responded_at et response_message sont renseignés ; badge vert sur le dashboard.",
  },
  {
    key: "declined",
    label: "Refusé",
    set: "L'invité clique sur « Je refuse » — respond_to_invite(_accept = false).",
    effect:
      "Même enregistrement que l'acceptation, badge rouge. Le créneau reste visible pour relance.",
  },
  {
    key: "cancelled",
    label: "Annulé",
    set: "Action de l'organisateur depuis son dashboard.",
    effect:
      "Le lien n'accepte plus de réponse (respond_to_invite ne met à jour que les autres statuts).",
  },
];

function Documentation() {
  return (
    <LegalPage title="Documentation — Comment ça marche">
      <section>
        <h2>1. Vue d'ensemble du flux</h2>
        <p>
          Un rendez-vous est créé par un organisateur connecté, puis transmis à un invité via un
          lien public unique. L'invité n'a besoin d'aucun compte : il répond depuis une page
          publique, et la réponse remonte immédiatement sur le dashboard de l'organisateur.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-surface/50 p-4 text-xs leading-relaxed text-foreground">
          {`Organisateur (connecté)
  └─ crée un rendez-vous  ──▶  appointments (status = pending, invite_token généré)
        ├─ « Envoyer par email »  ──▶  server fn sendInviteEmail  ──▶  Resend
        └─ « Copier le lien »     ──▶  /invite/<token>

Invité (sans compte)
  └─ ouvre /invite/<token>  ──▶  RPC get_invite(_token)   (lecture publique filtrée)
        └─ Accepter / Refuser ──▶  RPC respond_to_invite(_token, _accept, _message)
              └─ status = accepted | declined, responded_at = now()

Organisateur
  └─ dashboard : badge de statut, date de réponse, message de l'invité, statistiques`}
        </pre>
      </section>

      <section>
        <h2>2. Contenu de l'email d'invitation</h2>
        <p>
          L'email est composé côté serveur dans la fonction <strong>sendInviteEmail</strong> et
          envoyé via Resend. Expéditeur : valeur de <strong>RESEND_FROM</strong> (par défaut «
          Cadence &lt;onboarding@resend.dev&gt; »). Objet :{" "}
          <strong>« Rendez-vous : {"{{title}}"} »</strong>.
        </p>
        <p>Structure du corps, dans l'ordre :</p>
        <ul>
          <li>Titre « Proposition de rendez-vous ».</li>
          <li>Salutation « Bonjour {"{{guestName}}"}, ».</li>
          <li>Encart message personnalisé (organisateurs Business uniquement).</li>
          <li>Titre du rendez-vous en gras, puis date et créneau formatés en français.</li>
          <li>Lieu et description, chacun affiché seulement s'il est renseigné.</li>
          <li>Bouton d'action vert « Confirmer ou refuser » pointant vers le lien d'invitation.</li>
          <li>Rappel du lien en texte brut, pour les clients mail qui bloquent les boutons.</li>
          <li>
            Bloc « Avis Google » (Business) : nom de l'entreprise, note, lien avis, lien Maps.
          </li>
        </ul>
        <p>
          Toutes les valeurs dynamiques sont échappées en HTML avant insertion : aucun contenu saisi
          par l'organisateur ne peut injecter de balise dans l'email.
        </p>

        <h3 className="mt-6">Variables disponibles</h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Variable</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.name} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-3">{v.source}</td>
                  <td className="px-4 py-3">{v.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6">Cas d'envoi non aboutis</h3>
        <ul>
          <li>
            <strong>no_email</strong> : le contact n'a pas d'adresse email. L'organisateur doit
            copier le lien et l'envoyer par un autre canal.
          </li>
          <li>
            <strong>no_api_key</strong> : la clé d'envoi n'est pas configurée. Le lien d'invitation
            est tout de même renvoyé à l'interface pour copie manuelle.
          </li>
          <li>
            <strong>provider_error</strong> : refus du fournisseur d'email (adresse invalide,
            domaine non vérifié…). Le statut du rendez-vous reste inchangé.
          </li>
          <li>
            En cas de succès, <strong>invite_sent_at</strong> est horodaté : c'est ce champ qui
            alimente le suivi « liens envoyés » des statistiques.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Écrans de confirmation (page /invite/&lt;token&gt;)</h2>
        <p>
          Page publique, sans authentification, rendue à partir de la fonction sécurisée{" "}
          <strong>get_invite</strong> qui ne renvoie que les champs nécessaires à l'affichage.
        </p>
        <ul>
          <li>
            <strong>Chargement</strong> : squelette animé (calendrier) tant que la réponse n'est pas
            arrivée.
          </li>
          <li>
            <strong>Lien invalide ou expiré</strong> : message d'erreur, aucune information sur
            l'organisateur ni sur le rendez-vous n'est divulguée.
          </li>
          <li>
            <strong>État « en attente »</strong> : objet, date et créneau, durée, lieu, nom de
            l'organisateur, message personnalisé (Business), champ libre facultatif (500 caractères
            max), puis deux boutons « J'accepte » et « Je refuse ».
          </li>
          <li>
            <strong>Après acceptation</strong> : badge vert « Accepté », confirmation à l'écran,
            rappel des informations pratiques et bloc avis Google si l'organisateur est Business.
          </li>
          <li>
            <strong>Après refus</strong> : badge rouge « Refusé », message indiquant que
            l'organisateur est prévenu ; l'invité peut rouvrir le lien et changer sa réponse tant
            que le rendez-vous n'est pas annulé.
          </li>
          <li>
            <strong>Rendez-vous annulé</strong> : les boutons de réponse n'ont plus d'effet, le
            statut affiché reste « Annulé ».
          </li>
        </ul>
        <p>
          Le message libre saisi par l'invité est tronqué à 500 caractères côté client et 1 000 côté
          base, puis affiché à l'organisateur sur la fiche du rendez-vous.
        </p>
      </section>

      <section>
        <h2>4. Statuts des rendez-vous</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-surface/60 text-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Libellé</th>
                <th className="px-4 py-3 font-semibold">Déclencheur</th>
                <th className="px-4 py-3 font-semibold">Effet</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.key} className="border-t border-border/50">
                  <td className="px-4 py-3 font-mono text-foreground">{s.key}</td>
                  <td className="px-4 py-3">{s.label}</td>
                  <td className="px-4 py-3">{s.set}</td>
                  <td className="px-4 py-3">{s.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>5. Flux côté serveur</h2>
        <ul>
          <li>
            <strong>Création / modification / suppression</strong> : effectuées par le client
            authentifié ; l'isolement des données est garanti par les règles d'accès en base.
          </li>
          <li>
            <strong>sendInviteEmail</strong> : fonction serveur protégée. Elle recharge le
            rendez-vous en le filtrant sur l'identifiant du demandeur, refuse si le rendez-vous ne
            lui appartient pas, compose l'email, appelle Resend puis horodate l'envoi.
          </li>
          <li>
            <strong>get_invite(_token)</strong> : fonction en base à privilèges élevés, seule voie
            de lecture publique. Elle renvoie uniquement les champs d'affichage, et masque les
            informations de marque pour un organisateur non Business.
          </li>
          <li>
            <strong>respond_to_invite(_token, _accept, _message)</strong> : met à jour le statut, le
            message et l'horodatage de réponse. Elle n'agit que sur la ligne correspondant au jeton
            et ignore les rendez-vous annulés.
          </li>
          <li>
            <strong>get_plan_usage()</strong> : renvoie le plan, la consommation du mois et
            l'indicateur administrateur pour l'affichage des quotas.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Logique d'autorisation</h2>
        <ul>
          <li>
            <strong>Organisateur</strong> : accès complet en lecture et écriture à ses propres
            contacts et rendez-vous, et à eux seuls.
          </li>
          <li>
            <strong>Invité non connecté</strong> : aucun accès direct aux tables. Il ne peut que
            lire un rendez-vous via son jeton et y répondre. Le jeton est aléatoire (36 caractères
            hexadécimaux) et ne donne accès à rien d'autre.
          </li>
          <li>
            <strong>Rôles</strong> : stockés dans une table dédiée (utilisateur, modérateur,
            administrateur) et vérifiés côté serveur ; ils ne sont jamais lus depuis le navigateur
            pour accorder un droit.
          </li>
          <li>
            <strong>Administrateur</strong> : accès à l'espace /admin (tous les comptes, contacts et
            rendez-vous) et exemption des quotas du plan Gratuit.
          </li>
          <li>
            <strong>Plan</strong> : le changement de palier ne peut pas être forcé depuis le client
            ; seul le processus de paiement Stripe ou un administrateur peut le modifier.
          </li>
          <li>
            <strong>Quotas</strong> : appliqués en base avant chaque création — 10/15 (Gratuit),
            30/50 (Basic), 50/100 (Standard), 250/500 (Éco) contacts/rendez-vous par mois
            calendaire, illimité en Business et pour les administrateurs.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Check-list pour l'équipe d'édition</h2>
        <ul>
          <li>
            Modifier un texte d'email : agir sur le gabarit HTML de la fonction d'envoi, pas sur la
            page d'invitation.
          </li>
          <li>Modifier un écran de confirmation : agir sur la page publique d'invitation.</li>
          <li>
            Toute nouvelle variable doit provenir d'un champ déjà exposé par la fonction de lecture
            publique.
          </li>
          <li>
            Ne jamais afficher sur la page publique une donnée d'un autre rendez-vous ou d'un autre
            contact.
          </li>
          <li>Tester systématiquement les trois états : en attente, accepté, refusé.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
