# Volta Électricité

Maquette du site d'un électricien moderne, sur une grille de 12 colonnes.

**Voir et tester le site :** https://claude.ai/artifact/8jpMwbhH3BnaAQpe2AopBJ#play-15dd8cd198dd

## Ouvrir le site depuis ce dossier

Ouvrez `index.html` dans un navigateur : il mène à l'accueil.

## Pages

| Fichier | Page |
|---|---|
| `Main.dc.html` | Accueil : créneaux, diagnostic de panne, calculateur de recharge, tableau électrique interactif |
| `Services.dc.html` | Services et tarifs, avec « Estimer le prix » vers le devis |
| `Methode.dc.html` | Méthode de travail |
| `Realisations.dc.html` | Réalisations, filtrables |
| `Contact.dc.html` | Formulaire de contact, urgence, zones d'intervention |
| `Devis.dc.html` | Devis en ligne en 3 questions |
| `RendezVous.dc.html` | Prise de rendez-vous en 3 étapes, avec SMS simulé |
| `Ville.dc.html` | Modèle de page locale (« Électricien à [VILLE] ») |
| `Admin.dc.html` | Administration : statistiques, demandes, agenda, grille de prix, blocs de page, contenu |

Les autres fichiers :
- `support.js` : le moteur d'affichage des pages ;
- `canvas.json` : la disposition des pages sur le canevas de l'artefact.

## Limites

- Les demandes, les prix, l'agenda et les blocs sont enregistrés dans le navigateur (`localStorage`). Ils ne sont pas partagés entre les appareils.
- Le SMS de confirmation est simulé.
- Les dates des créneaux sont fixes.
- Les textes entre crochets (`[VOTRE TÉLÉPHONE]`, `[PRIX]`, `[VILLE]`…) sont à remplacer.
