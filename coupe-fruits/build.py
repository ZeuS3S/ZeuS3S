"""Fabrique index.html (la page à héberger) à partir de jeu.html, la même source que l'artifact claude.ai.
Usage : python3 build.py https://ton-site.fr   (à relancer après chaque mise à jour de jeu.html)
L'adresse sert à l'image d'aperçu quand on partage le lien (Discord, WhatsApp…), qui exige une adresse complète."""
import sys
from pathlib import Path
here = Path(__file__).parent
site = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else ''
game = (here / 'jeu.html').read_text(encoding='utf-8')
head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Tranche les fruits, enchaîne les combos, évite le durian. Classement, clans et passe de saison.">
<meta name="theme-color" content="#0f3b33">
<meta property="og:type" content="website">
<meta property="og:title" content="Coupe-Fruits">
<meta property="og:description" content="Tranche les fruits, enchaîne les combos, évite le durian.">
<meta property="og:image" content="{site}og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))</script>
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="auth.js"></script>
</head>
<body>
'''
(here / 'index.html').write_text(head.replace('{site}', site) + game + '\n</body>\n</html>\n', encoding='utf-8')
print('index.html généré' + ('' if site else " (sans adresse : l'image d'aperçu ne s'affichera pas partout)"))
