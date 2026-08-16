# Dette de traduction — refonte landing (2026-08-17)

La refonte de la landing page (`home.json`) et de la page tarifs (`pricing.json`)
a été rédigée intégralement en **français** (référence) et en **anglais**.

Pour les 8 autres locales supportées — `de`, `ru`, `ar`, `es`, `it`, `pt`, `zh`, `hi` —
`home.json` et `pricing.json` ont été **remplacés par une copie du contenu anglais**,
le temps qu'une traduction humaine soit faite. C'est un choix délibéré :

- Ça garde `npm run i18n:check` vert (mêmes clés que la référence `fr`).
- Un visiteur sur `/de/`, `/ru/`, etc. voit un texte anglais honnête et à jour,
  plutôt que soit du français hors contexte, soit d'anciennes affirmations
  marketing devenues inexactes (ex. programme d'affiliation mis en avant sur les
  cartes tarifaires, plan Business présenté comme un outil d'équipe).

## À faire

- [ ] Traduire `home.json` (namespace `home`) dans les 8 locales listées ci-dessus.
- [ ] Traduire `pricing.json` (namespace `pricing`) dans les mêmes locales.
- [ ] Vérifier le rendu RTL de `ar` une fois traduit (ROI calculator, FAQ accordion).
- [ ] Lancer `npm run i18n:check` après chaque locale traduite pour confirmer la parité.

Ne pas traduire à la machine sans relecture humaine — ce sont des pages de conversion.
