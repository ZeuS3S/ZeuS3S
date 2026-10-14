"""Fabrique index.html (la page à héberger) à partir de jeu.html, la même source que l'artifact claude.ai.
Usage : python3 build.py   (à relancer après chaque mise à jour de jeu.html)"""
from pathlib import Path
here = Path(__file__).parent
game = (here / 'jeu.html').read_text(encoding='utf-8')
head = '''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="auth.js"></script>
</head>
<body>
'''
(here / 'index.html').write_text(head + game + '\n</body>\n</html>\n', encoding='utf-8')
print('index.html généré')
