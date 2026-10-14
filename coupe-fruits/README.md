# Coupe-Fruits, version à héberger

Le même jeu que dans claude.ai, prêt à mettre sur ton propre site, avec une connexion **Discord** ou **Google** pour le classement, le fil d'actu et la sauvegarde en ligne.

Sans configuration, la page fonctionne déjà : le jeu tourne en local (progression gardée dans le navigateur), sans classement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page à héberger. Générée, ne pas modifier à la main. |
| `jeu.html` | Le jeu lui-même : la même source que l'artifact claude.ai. |
| `build.py` | Régénère `index.html` à partir de `jeu.html` : `python3 build.py`. |
| `auth.js` | Branche le jeu sur Supabase (connexion, classement, sauvegarde). |
| `config.js` | Tes réglages Supabase, à remplir. |
| `schema.sql` | La table et les règles d'accès, à exécuter une fois dans Supabase. |

## Mise en place (environ 20 minutes)

Supabase sert de serveur : il gère la connexion Discord/Google et stocke les scores. L'offre gratuite suffit.

1. **Créer le projet** sur https://supabase.com (New project).
2. **Créer la table** : *SQL Editor > New query*, colle le contenu de `schema.sql`, puis *Run*.
3. **Remplir `config.js`** avec *Project Settings > API* : `Project URL` dans `supabaseUrl`, clé `anon public` dans `supabaseAnonKey`. Cette clé est faite pour être publique : ce sont les règles de `schema.sql` qui protègent les données (chacun n'écrit que ses propres scores et sa propre sauvegarde).
4. **Activer Discord** :
   - Sur https://discord.com/developers/applications : *New Application*, puis *OAuth2*. Note le *Client ID* et le *Client Secret*.
   - Dans *Redirects*, ajoute l'adresse de rappel donnée par Supabase (*Authentication > Providers > Discord*, de la forme `https://<projet>.supabase.co/auth/v1/callback`).
   - Dans Supabase, active Discord et colle le Client ID et le Secret.
5. **Activer Google** :
   - Sur https://console.cloud.google.com : *APIs & Services > Credentials > Create credentials > OAuth client ID*, type *Web application*.
   - Ajoute la même adresse de rappel Supabase dans *Authorized redirect URIs*.
   - Dans Supabase, active Google et colle le Client ID et le Secret.
6. **Indiquer ton site** : *Authentication > URL Configuration*, mets l'adresse de ton site dans *Site URL* (et dans *Redirect URLs* si tu en as plusieurs, par exemple une adresse de test).
7. **Mettre en ligne** les fichiers `index.html`, `config.js` et `auth.js` sur n'importe quel hébergeur de pages statiques : GitHub Pages, Netlify, Vercel, Cloudflare Pages… Il faut une adresse en `https://`.

Si tu n'actives qu'un seul des deux, retire l'autre de `providers` dans `config.js`.

## Mettre à jour le jeu

Remplace `jeu.html` par la nouvelle version, lance `python3 build.py`, puis remets `index.html` en ligne.

## Ce qui change par rapport à claude.ai

- Le classement, le fil d'actu et la sauvegarde demandent une connexion Discord ou Google. Le profil et le classement affichent les boutons de connexion, puis « Se déconnecter » une fois connecté.
- Le pseudo est proposé à partir du nom du compte.
- La carte de score s'enregistre par appui long sur l'image (le bouton « Enregistrer » est propre à claude.ai).
- Les comptes claude.ai et les comptes du site sont séparés : la progression ne passe pas de l'un à l'autre automatiquement.
