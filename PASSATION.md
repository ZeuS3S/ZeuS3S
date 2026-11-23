# Passation — 19 octobre 2026

À lire en premier dans une nouvelle session. L'utilisateur parle français : réponds en français.

## Règles de travail
- Branche : `claude/install-ponytail-agent-skills-graphify-gxttmp`. Pas de PR sauf demande.
- Après un changement de code : `graphify update .`, puis commit et push (le hook de fin l'exige).
- Mode Ponytail : le plus petit changement complet ; finir chaque réponse par une ou deux lignes sur ce qui n'a pas été vérifié et les risques.

## 1. Coupe-Fruits (jeu de découpe de fruits, version 3.10)
- Artifact : https://claude.ai/artifact/LBhepmt1gHjkwYwQFBtSXA (version 54). Il se publie depuis une copie de `coupe-fruits/jeu.html`.
- `coupe-fruits/jeu.html` : le jeu complet, en un seul fichier. **C'est la source.**
- `coupe-fruits/index.html` : version hébergée, **toujours** régénérée avec `cd coupe-fruits && python3 build.py` (ajoute métas, service worker, config.js, Supabase, auth.js). Ne jamais y copier jeu.html à la main.
- Hébergement : `auth.js` (connexion Discord/Google via Supabase), `schema.sql` (tables, RLS, trigger anti-triche `verifier_score`, RPC `supprimer_mon_compte`), `confidentialite.html` (les passages surlignés en jaune `.todo` sont **à remplir par l'utilisateur** : nom, e-mail, hébergeur). Voir `coupe-fruits/README.md`.
- Tests : `coupe-fruits/tests/run.sh` lance les 52 tests navigateur (Playwright dans `/opt/node-tools/node_modules/playwright`, environ 10 min). Ne pas modifier le jeu pendant qu'ils tournent.
  - Tests instables connus, sans bug derrière : `test-shop` (succès « Oiseau de nuit » la nuit : +25 pièces), `test-v20` (langue / écran de fin), `test-beta` et `test-ach` (délai des notes de version).
- Crochets de test dans le jeu : `window.__wx`, `__we`, `__ts`, `__sat` ; `navigator.webdriver` coupe le hasard (samedi double, etc.).
- Anti-triche côté client : la sauvegarde est scellée ; pour donner un objet en test, utiliser `hpGrant([0,'skin',id])`.
- Versions comparées par parties (3.10 vient après 3.9) : ne pas utiliser `parseFloat` sur une version.
- Dernières demandes faites : jouer sans compte, mentions légales, anti-triche serveur, ambiances par lieu, défi 3 étoiles, interface téléphone, étal de fruits, passe Halloween en Carrière/Puzzle, bandeau de Carrière sur plusieurs lignes.
- En attente de l'utilisateur :
  - prototype Roblox (via Rojo) proposé, pas encore accepté ;
  - si l'XP du passe de combat bloque encore, demander quel passe et dans quel mode.

## 2. Kappa Tarkov (quêtes requises pour le conteneur Kappa)
- Artifact : https://claude.ai/artifact/MeZe7zUoNJHgbLu3fRHVeU — publié depuis `kappa-tarkov/artifact.html`. Un artifact ne peut pas appeler d'API extérieure : l'utilisateur importe la liste par copier-coller depuis tarkov.dev (lien dans la page).
- `kappa-tarkov/index.html` : version à héberger, qui charge la liste en direct depuis `https://api.tarkov.dev/graphql` (`tasks(lang:fr)`, filtre `kappaRequired`) et garde un cache hors ligne.
- Liens vers le wiki français par sa recherche (titres exacts des pages inconnus).
- Tests : `kappa-tarkov/tests/site.js <chemin playwright> <index.html> <capture.png>` et `kappa-tarkov/tests/artifact.js <artifact.html>`. Ils n'utilisent que de fausses données.
- **Bloqué :** le réseau de la session refuse `api.tarkov.dev` et `escapefromtarkov.fandom.com`. L'utilisateur doit les ajouter dans l'environnement cloud (nom de l'environnement en haut de la session sur claude.ai/code → Edit → Network access → Allowed domains). Il n'a pas trouvé le menu sur son appareil.
- Prochaine étape une fois le réseau ouvert : récupérer la vraie liste, l'intégrer dans l'artifact (plus d'import manuel), vérifier le lien GET vers tarkov.dev, et si possible lier les vraies pages du wiki français.

## Autres dossiers du dépôt
`Volta/` et `radio-bot/` : non touchés pendant cette session.
