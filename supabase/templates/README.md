# Emails d’authentification Cadence Mada

Ces six fichiers correspondent aux modèles de la page **Authentication → Email Templates** de Supabase :

| Modèle Supabase      | Fichier                 |
| -------------------- | ----------------------- |
| Confirm sign up      | `confirmation.html`     |
| Invite user          | `invite.html`           |
| Magic link or OTP    | `magic-link.html`       |
| Change email address | `email-change.html`     |
| Reset password       | `recovery.html`         |
| Reauthentication     | `reauthentication.html` |

`supabase/config.toml` charge automatiquement ces fichiers pour le développement local. Après modification, redémarrer la stack locale avec `supabase stop` puis `supabase start`.

Pour le projet Supabase hébergé, copier le contenu de chaque fichier dans le modèle correspondant du dashboard, ou déployer les mêmes valeurs via la Management API. Le logo affiché dans le corps de l’email est servi depuis `https://www.cadencemada.com/apple-touch-icon.png`.

L’avatar visible à côté du nom de l’expéditeur dans Gmail, Outlook ou Apple Mail n’est pas contrôlé par le HTML. Il dépend du compte d’envoi et, selon le client, de BIMI et de la configuration DNS du domaine `cadencemada.com`.
