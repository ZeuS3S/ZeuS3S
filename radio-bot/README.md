# 📻 Radio Bot

Bot Discord de radio en slash commands : LoFi, NRJ, Skyrock, Fun Radio, FIP, Mouv'… avec mode 24/7, rôle DJ et radios perso par serveur.

## Installation

1. Crée une application sur le [portail développeur Discord](https://discord.com/developers/applications), onglet **Bot** → copie le token.
2. Invite le bot avec les scopes `bot` + `applications.commands` et les permissions **Se connecter** et **Parler**.
3. Lance-le (Node.js 22+) :

```bash
cd radio-bot
npm install
cp .env.example .env   # puis colle ton token dans .env
npm start
```

Les commandes s'enregistrent toutes seules au démarrage (comptent jusqu'à 1 h pour apparaître partout la première fois).

## Commandes

| Commande | Qui | Rôle |
|---|---|---|
| `/play station:` | DJ | Lance une radio dans ton salon vocal (autocomplétion) |
| `/stop` | DJ | Arrête et quitte le salon |
| `/volume valeur:` | DJ | Volume de 1 à 100 |
| `/stations` | Tous | Liste des radios |
| `/nowplaying` | Tous | Radio en cours |
| `/admin dj-role role:` | Admin | Rôle requis pour `/play`, `/stop`, `/volume` (vide = tout le monde) |
| `/admin 247 actif:` | Admin | Reste dans le salon même vide, et revient après un redémarrage |
| `/admin add-station nom: url:` | Admin | Ajoute une radio perso (25 max) |
| `/admin remove-station station:` | Admin | Supprime une radio perso |
| `/admin config` | Admin | Affiche la config du serveur |

« Admin » = permission **Gérer le serveur** (modifiable dans Paramètres du serveur → Intégrations).

## Fonctionnement

- Si le flux coupe, le bot se reconnecte tout seul à la radio au bout de 3 s.
- Sans 24/7, il quitte le salon quand il ne reste plus personne.
- La config de chaque serveur est sauvegardée dans `data.json`.
- Les radios intégrées sont dans `stations.js` : une URL qui ne marche plus se change là.

Tests : `npm test`.
