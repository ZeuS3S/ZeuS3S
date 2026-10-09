# 📻 Radio Bot

Bot Discord de radio en slash commands : LoFi, NRJ, Skyrock, Fun Radio, FIP, Mouv'… plus 40 000 radios du monde entier, avec panneau interactif, pochettes, paroles, effets audio, favoris, top, minuteur, message de statut, français/anglais et sharding.

## Installation

1. Crée une application sur le [portail développeur Discord](https://discord.com/developers/applications), onglet **Bot** → copie le token.
2. Invite le bot avec les scopes `bot` + `applications.commands` et les permissions **Se connecter**, **Parler**, **Envoyer des messages**, **Intégrer des liens** et **Définir le statut du salon vocal**.
3. Lance-le (Node.js 22.13+) :

```bash
cd radio-bot
npm install
cp .env.example .env   # puis colle ton token dans .env
npm start
```

Les commandes s'enregistrent toutes seules au démarrage (jusqu'à 1 h pour apparaître partout la première fois).

## Commandes

Les commandes sont en anglais, et en français pour les membres qui ont Discord en français (`/monde`, `/favoris`, `/paroles`…).

| Commande | Qui | Rôle |
|---|---|---|
| `/play station:` | DJ | Lance une radio dans ton salon vocal (autocomplétion) |
| `/world` · `/monde` | DJ | Cherche et lance une radio parmi 40 000 dans le monde ([Radio Browser](https://www.radio-browser.info)) |
| `/stop` | DJ | Arrête et quitte le salon |
| `/volume` | DJ | Volume de 0 à 100 |
| `/effect` · `/effet` | DJ | Normal, Bass boost, Nightcore, Vaporwave, 8D, Night |
| `/sleep` · `/minuteur` | DJ | Arrête la radio dans X minutes (0 = annuler) |
| `/nowplaying` | Tous | Affiche le panneau en cours |
| `/lyrics` · `/paroles` | Tous | Paroles du titre en cours ([LRCLIB](https://lrclib.net)) |
| `/favorites` · `/favoris` | Tous | `list`, `add`, `play`, `remove` : tes radios favorites, sur tous les serveurs |
| `/top` | Tous | Radios les plus écoutées du serveur (temps d'écoute × auditeurs) |
| `/stations` | Tous | Liste des radios |
| `/admin dj-role` | Admin | Rôle requis pour piloter la radio (vide = tout le monde) |
| `/admin 247` | Admin 💎 | Reste dans le salon même vide, et revient après un redémarrage (**Premium**) |
| `/admin status` | Admin | Message de statut en direct dans un salon (vide = désactiver) |
| `/admin language` | Admin | Langue du bot : auto, français ou anglais |
| `/admin config` | Admin | Affiche la config du serveur |
| `/premium status` | Tous | Statut premium du serveur et avantages (✅ / 🔒) |
| `/premium redeem key:` | Admin | Active une clé premium sur le serveur |
| `/premium trial` | Admin | Essai Premium gratuit de 3 jours, une fois par serveur |
| `/premium color hex:` | Admin 💎 | Couleur du panneau (`#ff3b3b`, ou `reset`) |

« Admin » = permission **Gérer le serveur** (modifiable dans Paramètres du serveur → Intégrations).

## 💎 Premium et owners

Un owner crée une clé, un admin du serveur l'active avec `/premium redeem` (ou lance l'essai gratuit de 3 jours avec `/premium trial`). Une nouvelle clé prolonge le premium en cours.

| Avantage | Gratuit | 💎 Premium |
|---|---|---|
| Mode 24/7 | ❌ | ✅ |
| Effets audio (Bass boost, Nightcore, Vaporwave, 8D, Night) | ❌ | ✅ |
| Volume | 100 % | 200 % |
| Couleur du panneau | ❌ | ✅ |
| Badge 💎 Premium sur le panneau | ❌ | ✅ |

Le bot prévient le serveur 3 jours avant la fin (dans le salon du message de statut, sinon le salon système), puis à la fin, où il coupe tout seul le 24/7, les effets et le volume boosté. Avec `PREMIUM_LOG_CHANNEL_ID`, les owners reçoivent un journal : clés créées et activées, essais, premiums donnés, retirés et terminés.

Les **owners** sont le propriétaire de l'application Discord (ou les membres de son équipe) et les IDs mis dans `OWNER_IDS` (`.env`). Ils ont `/owner` :

| Sous-commande | Rôle |
|---|---|
| `key-create days: uses:` | Crée une clé `RADIO-XXXX-XXXX-XXXX` (0 jour = à vie, `uses` = nombre de serveurs) |
| `keys` | Liste les clés et leurs utilisations |
| `premium-list` | Liste les serveurs premium et leur date de fin |
| `key-delete key:` | Supprime une clé |
| `premium-add days: guild:` | Donne (ou prolonge) le premium d'un serveur sans clé |
| `premium-remove guild:` | Retire le premium |
| `247 enabled:` | Active le 24/7 sur ce serveur sans premium |
| `station-add name: url: logo:` | Ajoute une radio pour **tous** les serveurs |
| `station-remove station:` | Supprime une radio ajoutée par un owner |

Mets `OWNER_GUILD_ID` pour que `/owner` n'apparaisse que sur ton serveur.

## Panneau « en cours »

`/play` et `/nowplaying` affichent un panneau qui se met à jour tout seul toutes les 15 s :

- Badge rouge **EN DIRECT** (bleu **EN PAUSE**), nom de la radio, **titre en cours**, **pochette** (iTunes) ou logo
- Salon, demandé par, diffusion (`24 h / 24` en 24/7), volume, effet et minuteur s'ils sont actifs
- Égaliseur orange (image générée par le bot)
- Boutons : **Pause**, **Station suivante**, **Volume** (fenêtre pour taper la valeur), **Stop** · ⏮️ 🎲 💤 ⭐ 📝 · menu des radios

Les badges sont des émojis d'application que le bot crée tout seul au premier démarrage (images dans `assets/badges`, régénérables avec `python3 scripts/badges.py`).

💤 fait défiler 15 → 30 → 60 → 120 min → désactivé. ⭐ et 📝 marchent pour tout le monde ; les autres boutons demandent d'être dans le salon du bot (et d'avoir le rôle DJ s'il est défini).

## Message de statut

`/admin status salon:#radio` publie un message qui se met à jour tout seul : radio et titre en cours, pochette, auditeurs, top 3 du serveur, nombre de serveurs et de radios en direct. S'il est supprimé, le bot le republie.

Le bot affiche aussi la radio et le titre dans le **statut du salon vocal** et ses totaux dans son propre statut.

## Plusieurs serveurs

- `npm start` lance le bot en **shards** automatiquement (`SHARDS=4 npm start` pour forcer un nombre).
- Les données sont dans **SQLite** (`radio.db`, intégré à Node, rien à installer), partagé entre les shards. Un ancien `data.json` est importé automatiquement.

## Fonctionnement

- Si le flux coupe, ffmpeg se reconnecte, puis le bot relance la radio au bout de 3 s si besoin.
- Sans 24/7, il quitte le salon quand il ne reste plus personne.
- Les radios intégrées sont dans `stations.js` : une URL qui ne marche plus se change là.
- Les radios lancées via `/world` ou un favori restent dans le menu (les 10 dernières).

Tests : `npm test`.
