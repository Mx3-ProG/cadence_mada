# Cadence Mada

Application web de gestion d'agenda de rendez-vous : contacts riches, tableau de bord (jour /
semaine / tendances), invitations de rendez-vous par lien public (l'invité confirme ou refuse un
créneau **sans créer de compte**), facturation via abonnement (plan gratuit / pro), et back-office
admin.

Le guide fonctionnel complet (parcours utilisateur, tableau de bord, invitations) se trouve dans
[`docs/GUIDE-UTILISATEUR.md`](./docs/GUIDE-UTILISATEUR.md).

## Stack technique

- **[TanStack Start](https://tanstack.com/start)** — framework full-stack React (SSR, routing par
  fichiers, server functions) au-dessus de Vite.
- **[React 19](https://react.dev)** + TypeScript strict.
- **[TanStack Router](https://tanstack.com/router)** / **[TanStack Query](https://tanstack.com/query)**
  — routing et cache de données.
- **[Tailwind CSS v4](https://tailwindcss.com)** + **[shadcn/ui](https://ui.shadcn.com)** (Radix UI)
  — composants d'interface.
- **[Supabase](https://supabase.com)** — base de données Postgres, authentification (email/mot de
  passe + OAuth Google), API générée.
- **[Stripe](https://stripe.com)** — abonnement du plan payant (checkout, portail de facturation,
  webhooks).
- **[Resend](https://resend.com)** — envoi des emails d'invitation.

## Prérequis

- [Node.js](https://nodejs.org) ≥ 20
- npm (fourni avec Node.js)
- Un projet [Supabase](https://supabase.com) (base + auth)

## Installation

```sh
npm install
cp .env.example .env   # puis renseigner les valeurs (voir ci-dessous)
npm run dev
```

L'application est servie sur `http://localhost:5173`.

### Variables d'environnement

Copier `.env.example` vers `.env` et renseigner :

| Variable                                                     | Description                         |
| ------------------------------------------------------------ | ----------------------------------- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`                         | URL du projet Supabase              |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (publishable) Supabase |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`           | Identifiant du projet Supabase      |

Selon les fonctionnalités utilisées, le serveur lit aussi (non versionnées, à définir dans
l'environnement d'exécution) :

| Variable                                                        | Description                                                                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                                     | Client admin, contourne les RLS (facturation, notifications d'invitation)                                                         |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Facturation Stripe                                                                                                                |
| `RESEND_API_KEY`                                                | Clé API [Resend](https://resend.com/api-keys) pour l'envoi des emails                                                             |
| `RESEND_FROM`                                                   | Adresse d'expédition, ex. `Cadence Mada <rdv@cadencemada.com>` — le domaine doit être vérifié (DKIM/SPF) dans le dashboard Resend |

> Pour que le bouton de connexion Google fonctionne, activer le provider **Google** dans
> Authentication → Providers du dashboard Supabase du projet.

## Scripts

| Commande            | Description                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Démarre le serveur de développement (Vite) |
| `npm run build`     | Build de production                        |
| `npm run build:dev` | Build en mode développement                |
| `npm run preview`   | Prévisualise le build de production        |
| `npm run lint`      | Vérifie le code avec ESLint                |
| `npm run format`    | Formate le code avec Prettier              |

## Structure du projet

```
src/
├── router.tsx, server.ts, start.ts   # bootstrap TanStack Start (routeur, entrée SSR, middlewares)
├── styles.css                        # styles Tailwind globaux
├── routeTree.gen.ts                  # généré automatiquement par TanStack Router — ne pas éditer
│
├── routes/                           # routing par fichiers (TanStack Router)
│   ├── __root.tsx                    # layout racine (head, providers, gestion d'erreurs)
│   ├── index.tsx                     # page d'accueil
│   ├── auth.tsx                      # connexion / inscription
│   ├── invite.$token.tsx             # réponse publique à une invitation (sans compte)
│   ├── documentation.tsx, cgu.tsx, confidentialite.tsx, cookies.tsx, mentions-legales.tsx
│   └── _authenticated/               # routes protégées : dashboard, contacts, settings, admin
│
├── components/
│   ├── agenda/                       # composants métier rendez-vous (stats, dialogs, historique)
│   ├── billing/                      # abonnement, retour de paiement Stripe
│   ├── legal/                        # bannière cookies, pages légales
│   ├── loading/                      # skeletons
│   └── ui/                           # bibliothèque shadcn/ui
│
├── integrations/supabase/            # clients Supabase (navigateur, serveur), middleware d'auth
│
└── lib/                              # logique métier : agenda, plans, admin, facturation Stripe,
                                       # envoi d'invitations, gestion d'erreurs
```

## Supabase

Le projet est lié au projet Supabase référencé dans `supabase/config.toml` (`project_id`). Les
migrations SQL du schéma se trouvent dans `supabase/migrations/`.

### Emails transactionnels (`supabase/emails/`)

Les templates HTML des emails envoyés via Resend (`src/lib/resend.server.ts`) vivent dans
`supabase/emails/` :

- `invite-request.ts` — proposition de rendez-vous envoyée à l'invité.
- `invite-accepted.ts` / `invite-declined.ts` — notification à l'organisateur quand l'invité
  répond (déclenchée par `notifyInviteResponse` dans `src/lib/invites.functions.ts`).
- `shared.ts` — palette de couleurs, layout commun, utilitaires (`escapeHtml`, formatage de dates).

Ce ne sont pas les emails d'authentification Supabase (confirmation de compte, réinitialisation
de mot de passe) — ceux-là se configurent dans Authentication → Email Templates du dashboard
Supabase.

## Déploiement

Le build utilise [Nitro](https://nitro.build) (`nitro/vite` dans `vite.config.ts`), qui détecte
automatiquement la plateforme cible. Sur Vercel, le déploiement fonctionne en zero-config (pas de
`vercel.json` requis) : Nitro génère la sortie serveur adaptée dès que `process.env.VERCEL` est
présent au moment du build.
