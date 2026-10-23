# Bot salon piège

Quiconque écrit dans le salon piège est banni automatiquement (utile contre les bots de spam et les comptes piratés).
Les membres avec la permission « Gérer les messages » ou « Bannir des membres » sont ignorés.

## Installation
1. Va sur https://discord.com/developers/applications, crée une application, puis un bot. Copie le token.
2. Dans l’onglet **Bot**, active **Message Content Intent**.
3. Invite le bot avec les permissions **Bannir des membres**, **Voir le salon**, **Envoyer des messages** (scope `bot`).
4. Dans ton serveur, place le rôle du bot **au-dessus** des rôles des membres à bannir.
5. Crée un salon piège avec un nom clair, par exemple « ne-pas-écrire-ici », et écris dedans un message qui prévient du ban.
6. Copie `.env.example` en `.env` et remplis les valeurs.
7. `npm install` puis `npm start`.
