# Guide utilisateur — Agenda & invitations de rendez-vous

Ce document explique comment fonctionne l'application côté utilisateur (vous, l'organisateur)
et comment vos invités reçoivent et répondent à un rendez-vous **sans avoir de compte**.

---

## 1. Créer son compte

1. Depuis la page d'accueil, cliquez sur **Commencer / Se connecter** (`/auth`).
2. Inscription par email + mot de passe, ou connexion **Google** en un clic.
3. À la première connexion, un profil est créé automatiquement (nom, email, plan `free`).

Rôles disponibles : `user` (par défaut), `moderator`, `admin` (accès à l'espace `/admin`).

---

## 2. Le tableau de bord (`/dashboard`)

Il s'organise du plus urgent au plus analytique :

| Section                     | Ce qu'elle affiche                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Aujourd'hui**             | Les rendez-vous du jour, horaires, prochain RDV mis en avant. Si vide, un bouton propose d'en créer un. |
| **Semaine**                 | Vue des 7 jours, chaque RDV avec son statut (en attente / accepté / refusé).                            |
| **Répartition par jour**    | Volume de RDV par jour et par statut.                                                                   |
| **Tendance du mois**        | Courbe (area) des RDV demandés vs confirmés, comparaison hier / aujourd'hui.                            |
| **Top contacts & créneaux** | Qui vous sollicite le plus, quels créneaux (matin / après-midi / soir) reviennent.                      |
| **Suivi des invitations**   | Taux de réponse, liens envoyés, réponses en attente.                                                    |

---

## 3. Les contacts (`/contacts`)

Chaque fiche contact peut contenir : nom, email, téléphone, société, **date d'anniversaire,
ville, adresse, pays, langues parlées, hobbies, situation familiale, nombre d'enfants, genre**
et des notes libres (de quoi parler lors du rendez-vous).

Depuis la liste, le bouton **Fixer un rendez-vous** ouvre directement la création d'un RDV
avec ce contact pré-sélectionné.

---

## 4. Créer un rendez-vous

Trois entrées possibles :

- Bouton **Ajouter** (barre du bas sur mobile/tablette, header en desktop) → choix
  « contact existant » / « nouveau contact » / « créneau sans contact », puis création du RDV.
- Depuis une case du calendrier de la semaine.
- Depuis la fiche d'un contact.

Champs : titre, contact, date, heure de début, durée, lieu, notes internes.

---

## 5. Envoyer l'invitation et suivre la réponse

À la création, l'application génère pour chaque rendez-vous un **jeton unique** et donc un
**lien public** de la forme :

```
https://votre-domaine/invite/<token>
```

Deux façons de le transmettre :

1. **Envoi email automatique** (via Resend) : l'invité reçoit un email contenant le récapitulatif
   du rendez-vous et le bouton de confirmation.
2. **Copie du lien** : vous collez le lien dans WhatsApp, SMS, LinkedIn, etc.

Le statut du rendez-vous évolue automatiquement sur votre dashboard :

```text
en attente  ──▶  accepté      (l'invité a confirmé)
            └─▶  refusé       (l'invité a décliné)
```

Vous voyez la date/heure de la réponse, et les relances à faire dans « Suivi des invitations ».

---

## 6. Côté invité : personne qui n'utilise pas l'application

**Aucun compte, aucune installation, aucun mot de passe.** L'invité :

1. Reçoit l'email (ou le lien que vous lui avez envoyé).
2. Clique sur le lien `/invite/<token>` — la page s'ouvre dans n'importe quel navigateur,
   mobile ou ordinateur.
3. Voit : l'objet du rendez-vous, la date et l'heure (formatées en français), la durée,
   le lieu, le nom de l'organisateur, et le message personnalisé si vous en avez configuré un.
4. Choisit **Accepter** ou **Refuser**. La réponse est enregistrée immédiatement.
5. Une page de confirmation s'affiche ; le lien reste consultable pour retrouver les détails.

Le lien est **unique et non devinable** : seule la personne qui le possède peut répondre.
Il ne donne accès à rien d'autre qu'à ce rendez-vous précis (aucune donnée de vos autres
contacts ou rendez-vous n'est visible).

### Bonus formule Pro

Si vous êtes en Pro, la page d'invitation affiche en plus votre **bloc entreprise** :
nom de la société, message personnalisé, et boutons **Voir sur Google Maps** /
**Laisser un avis Google** — configurables dans `/settings` (« Lien Pro »).

---

## 7. Formules

|                                                      | Gratuit   | Pro — 10 €/mois |
| ---------------------------------------------------- | --------- | --------------- |
| Contacts                                             | 30 max    | Illimités       |
| Rendez-vous                                          | 50 / mois | Illimités       |
| Statistiques                                         | Oui       | Oui             |
| Lien d'invitation personnalisé (marque, avis Google) | Non       | Oui             |

Le passage en Pro se fait par paiement en ligne ; la gestion de l'abonnement (facture,
résiliation) se fait depuis le portail client accessible dans `/settings`.

Les limites du plan gratuit sont vérifiées côté serveur : au-delà, la création est bloquée
avec un message explicite, et une barre de consommation s'affiche sur le dashboard.

---

## 8. Confidentialité et cookies

- Pages légales : `/mentions-legales`, `/confidentialite`, `/cgu`, `/cookies`.
- Bandeau de consentement au premier passage : cookies nécessaires uniquement, ou
  audience / marketing acceptés. Choix modifiable à tout moment via
  **Préférences cookies** dans le pied de page.
- Vos données et celles de vos contacts sont isolées par compte : personne d'autre
  (hors administrateur technique) ne peut y accéder.

---

## 9. Questions fréquentes

**L'invité peut-il changer d'avis ?** Oui, tant que le rendez-vous n'est pas passé, il peut
rouvrir le lien et modifier sa réponse.

**Que se passe-t-il si l'email n'arrive pas ?** Copiez le lien depuis le rendez-vous et
envoyez-le par un autre canal ; le suivi des invitations indique les envois sans réponse.

**Puis-je créer un rendez-vous sans contact ?** Oui : « créneau sans contact » depuis le
bouton Ajouter. Vous pourrez y associer un contact plus tard.

**L'application fonctionne-t-elle sur mobile ?** Oui, entièrement responsive, avec une barre
de navigation fixe en bas de l'écran sur mobile et tablette, et un mode clair / sombre.
