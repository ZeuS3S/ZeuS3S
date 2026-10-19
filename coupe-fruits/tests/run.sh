#!/bin/sh
# Lance toute la suite sur jeu.html (les tests ouvrent coupe.html à côté d'eux).
cd "$(dirname "$0")" && cp ../jeu.html coupe.html || exit 1
ok=0; ko=0
for t in $(cat liste.txt); do
  if node "$t.js" >/dev/null 2>"/tmp/$t.err"; then ok=$((ok+1)); else ko=$((ko+1)); echo "ÉCHEC $t (détails : /tmp/$t.err)"; fi
done
echo "$ok réussis, $ko échoués"
