# Bot de modération et d’accueil

Chaque fonction a sa commande slash et son propre embed, réservés aux administrateurs. Tout se règle avec les menus et les boutons, rien n’est à écrire dans un fichier.

| Commande | Embed |
|---|---|
| `/piege` | Salon piège : salon, action (ban, expulsion ou sourdine), durées, rôles ignorés, activer ou désactiver |
| `/statut` | Rôle selon le statut : plusieurs règles « texte du statut → rôle », ajout, suppression, resynchronisation |
| `/logs` | Salon de logs, 10 derniers événements, annulation d’un ban, vidage de l’historique |
| `/bienvenue` | Message de bienvenue : salon, titre et texte modifiables (`{user}` `{mention}` `{server}` `{count}`), aperçu |

Le staff (permission « Gérer les messages » ou « Bannir des membres ») n’est jamais touché par le piège.
Le bot ne peut pas lire la bio des membres, seulement leur **statut personnalisé**. Le membre doit être en ligne, pas en invisible.

## Installation
1. Va sur https://discord.com/developers/applications, crée une application, puis un bot. Copie le token.
2. Dans l’onglet **Bot**, active **Message Content Intent**, **Server Members Intent** et **Presence Intent**.
3. Invite le bot avec les scopes `bot` et `applications.commands`, et les permissions **Bannir des membres**, **Expulser des membres**, **Exclure temporairement des membres**, **Gérer les rôles**, **Gérer les messages**, **Voir le salon** et **Envoyer des messages**.
4. Place le rôle du bot **au-dessus** des rôles qu’il doit donner ou des membres qu’il doit sanctionner.
5. Copie `.env.example` en `.env` et mets le token (et `GUILD_ID` pour que les commandes apparaissent tout de suite).
6. `npm install` puis `npm start`.

La configuration est enregistrée dans `data/config.json`.
