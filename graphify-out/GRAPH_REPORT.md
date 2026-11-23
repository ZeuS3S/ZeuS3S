# Graph Report - ZeuS3S  (2026-11-23)

## Corpus Check
- 87 files · ~136,436 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .otf 3, (none) 2, .webmanifest 1)

## Summary
- 867 nodes · 1930 edges · 72 communities (30 shown, 42 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 178 edges (avg confidence: 0.85)
- Token cost: 132,266 input · 0 output

## Graph Freshness
- Built from commit: `94cf7690`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- j
- pa
- bot.test.js
- package.json
- Now-playing panel (Components V2)
- card.js
- HTTP health endpoint (HEALTH_PORT, /health 200/503)
- graphify knowledge graph (graphify-out)
- ln
- support.js
- xk
- m
- Z
- fi
- Ce
- test-beta.js
- ia
- ok
- test-v28.js
- test-v29.js
- test-v34.js
- tj
- test-v40.js
- ref_assert
- Coupe-Fruits, version à héberger
- test-v66m.js
- Volta Électricité
- test-v73.js
- ref
- w
- test-v67.js
- dh
- test-v63.js
- test-v53.js
- test-v83.js
- Passation — 19 octobre 2026
- be
- test-v38.js
- test-v78.js
- test-v80.js
- test-v86.js
- test-v87.js
- test-v36.js
- test-v39.js
- test-v66.js
- test-v70.js
- test-v72.js
- test-ach.js
- test-coupe.js
- test-pause.js
- test-v15.js
- test-v20.js
- test-v25.js
- test-v26.js
- test-v30.js
- test-v31.js
- test-v31b.js
- test-v32.js
- test-v37.js
- test-v41.js
- test-v49.js
- test-v51.js
- test-v52.js
- test-v57.js
- test-v58.js
- test-v59.js
- test-v90.js
- run.sh

## God Nodes (most connected - your core abstractions)
1. `xk()` - 33 edges
2. `cfgOf()` - 28 edges
3. `onPanelAction()` - 28 edges
4. `t()` - 26 edges
5. `panelPayload()` - 21 edges
6. `dh()` - 21 edges
7. `Ce()` - 20 edges
8. `ln()` - 17 edges
9. `v()` - 17 edges
10. `E()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `constructor()` --indirect_call--> `t()`  [INFERRED]
  coupe-fruits/tests/test-v83.js → radio-bot/i18n.js
- `Hyra Musique (Discord music bot V13)` --semantically_similar_to--> `Radio Bot README`  [INFERRED] [semantically similar]
  README.md → radio-bot/README.md
- `ensureBadges()` --references--> `live_en_1.png - tile 1/2 of 'LIVE' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_en_1.png
- `ensureBadges()` --references--> `live_en_2.png - tile 2/2 of 'LIVE' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_en_2.png
- `ensureBadges()` --references--> `live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_fr_1.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bot liveness monitoring** — radio_bot_readme_status_command, radio_bot_readme_health_endpoint, radio_bot_readme_uptimerobot, radio_bot_readme_sharding [EXTRACTED 1.00]
- **Premium-gated perks** — radio_bot_readme_premium_system, radio_bot_readme_mode_247, radio_bot_readme_audio_effects, radio_bot_readme_now_playing_panel [EXTRACTED 1.00]
- **Tiles forming 'EN DIRECT' badge** — radio_bot_assets_badges_live_fr_1, radio_bot_assets_badges_live_fr_2, radio_bot_assets_badges_live_fr_3 [INFERRED 0.95]
- **Tiles forming 'EN PAUSE' badge** — radio_bot_assets_badges_pause_fr_1, radio_bot_assets_badges_pause_fr_2, radio_bot_assets_badges_pause_fr_3 [INFERRED 0.95]

## Communities (72 total, 42 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.05
Nodes (119): canControl(), clock(), flag(), formatMinutes(), isStreamUrl(), lineAt(), parseLrc(), { PermissionFlagsBits } (+111 more)

### Community 1 - "j"
Cohesion: 0.20
Nodes (10): C(), ee(), ge(), j(), mt(), N(), Qh(), vk() (+2 more)

### Community 2 - "pa"
Cohesion: 0.17
Nodes (15): Bf(), eb(), ff(), gd(), mf(), mi(), nf(), oi() (+7 more)

### Community 3 - "bot.test.js"
Cohesion: 0.05
Nodes (53): stripEmoji(), EFFECTS, prism, assert, http, { PermissionFlagsBits }, test, { createCanvas, loadImage, GlobalFonts } (+45 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (26): dependencies, discord.js@^14.27.0, @discordjs/opus@^0.10.0, @discordjs/voice@^0.19.2, ffmpeg-static@^5.3.0, libsodium-wrappers@^0.8.4, @napi-rs/canvas@^1.0.10, prism-media@^1.3.5 (+18 more)

### Community 5 - "Now-playing panel (Components V2)"
Cohesion: 0.09
Nodes (22): Inter font license (OFL-1.1), Inter font (rsms/inter), SIL Open Font License 1.1, Radio Bot README, Application emoji badges (assets/badges, scripts/badges.py), Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night), Built-in stations list (stations.js), DJ role permission (+14 more)

### Community 6 - "card.js"
Cohesion: 0.19
Nodes (16): live_en_1.png - tile 1/2 of 'LIVE' red pill badge, live_en_2.png - tile 2/2 of 'LIVE' red pill badge, 'LIVE' red status badge (Discord emoji strip), live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge, live_fr_2.png - tile 2/3 of 'EN DIRECT' red pill badge, live_fr_3.png - tile 3/3 of 'EN DIRECT' red pill badge, 'EN DIRECT' red status badge (Discord emoji strip), pause_en_1.png - tile 1/2 of 'PAUSED' blue pill badge (+8 more)

### Community 8 - "HTTP health endpoint (HEALTH_PORT, /health 200/503)"
Cohesion: 0.33
Nodes (6): Favorites (cross-server), HTTP health endpoint (HEALTH_PORT, /health 200/503), Automatic sharding (SHARDS), SQLite storage (radio.db, shared across shards, data.json import), /status command (live shard/DB/audio check), UptimeRobot external monitoring

### Community 9 - "graphify knowledge graph (graphify-out)"
Cohesion: 0.40
Nodes (4): .claude/CLAUDE.md graphify skill instructions, graphify skill (/graphify trigger), CLAUDE.md project instructions, graphify knowledge graph (graphify-out)

### Community 11 - "ln"
Cohesion: 0.07
Nodes (36): B(), cn(), e(), n(), Ct(), Fe(), l(), f() (+28 more)

### Community 12 - "support.js"
Cohesion: 0.06
Nodes (23): $a(), Ab(), dj(), dn(), ej(), fd(), hj(), Ib() (+15 more)

### Community 13 - "xk"
Cohesion: 0.06
Nodes (62): af(), bj(), Bk(), Bt(), cf(), constructor(), D(), Dc() (+54 more)

### Community 14 - "m"
Cohesion: 0.11
Nodes (21): at(), Bd(), Cc(), cd(), de(), gj(), $h(), jd() (+13 more)

### Community 16 - "Z"
Cohesion: 0.14
Nodes (22): aa(), ah(), fb(), $g(), gi(), hi(), ic(), Id() (+14 more)

### Community 17 - "fi"
Cohesion: 0.15
Nodes (17): Db(), fi(), Gc(), Ha(), If(), kg(), le(), lg() (+9 more)

### Community 18 - "Ce"
Cohesion: 0.09
Nodes (31): ae(), Ag(), Bg(), Ce(), Cg(), df(), ed(), fc() (+23 more)

### Community 20 - "ia"
Cohesion: 0.17
Nodes (17): Eg(), hc(), Hk(), ia(), jk(), Kk(), Li(), Lk() (+9 more)

### Community 21 - "ok"
Cohesion: 0.21
Nodes (15): ai(), bi(), ci(), Dg(), ef(), Eh(), hb(), kb() (+7 more)

### Community 25 - "tj"
Cohesion: 0.20
Nodes (11): bh(), ch(), Ck(), dt(), Ie(), me(), pe(), Qc() (+3 more)

### Community 27 - "ref_assert"
Cohesion: 0.12
Nodes (10): assert, { chromium }, assert, { chromium }, assert, { chromium }, assert, { chromium } (+2 more)

### Community 31 - "Coupe-Fruits, version à héberger"
Cohesion: 0.33
Nodes (5): Ce qui change par rapport à claude.ai, Coupe-Fruits, version à héberger, Fichiers, Mettre à jour le jeu, Mise en place (environ 20 minutes)

### Community 32 - "test-v66m.js"
Cohesion: 0.11
Nodes (13): assert, { chromium }, fs, assert, { chromium }, { spawn }, assert, { chromium } (+5 more)

### Community 33 - "Volta Électricité"
Cohesion: 0.40
Nodes (4): Limites, Ouvrir le site depuis ce dossier, Pages, Volta Électricité

### Community 34 - "test-v73.js"
Cohesion: 0.20
Nodes (5): get(), set(), assert, { chromium }, path()

### Community 35 - "ref"
Cohesion: 0.11
Nodes (11): assert, { chromium }, assert, { chromium }, assert, { chromium }, assert, { chromium } (+3 more)

### Community 39 - "test-v67.js"
Cohesion: 0.20
Nodes (8): ALL, assert, { chromium }, clan(), d, pd, sc(), seed()

### Community 40 - "dh"
Cohesion: 0.31
Nodes (22): ac(), dh(), b(), c(), d(), e(), f(), g() (+14 more)

### Community 43 - "test-v83.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, constructor()

### Community 44 - "Passation — 19 octobre 2026"
Cohesion: 0.33
Nodes (5): 1. Coupe-Fruits (jeu de découpe de fruits, version 3.10), 2. Kappa Tarkov (quêtes requises pour le conteneur Kappa), Autres dossiers du dépôt, Passation — 19 octobre 2026, Règles de travail

### Community 45 - "be"
Cohesion: 0.24
Nodes (10): bc(), be(), ec(), Fg(), fj(), lc(), Rc(), tg() (+2 more)

## Knowledge Gaps
- **15 isolated node(s):** `SIL Open Font License 1.1`, `Application emoji badges (assets/badges, scripts/badges.py)`, `Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night)`, `Built-in stations list (stations.js)`, `DJ role permission` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 278 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `m()` connect `ln` to `test-v66m.js`, `xk`?**
  _High betweenness centrality (0.419) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `xk()` (e.g. with `h()` and `F()`) actually correct?**
  _`xk()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SIL Open Font License 1.1`, `Application emoji badges (assets/badges, scripts/badges.py)`, `Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night)` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05117460317460317 - nodes in this community are weakly interconnected._
- **Why does `t()` connect `index.js` to `bot.test.js`, `test-v83.js`?**
  _High betweenness centrality (0.360) - this node is a cross-community bridge._
- **Should `bot.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05093167701863354 - nodes in this community are weakly interconnected._
- **Why does `constructor()` connect `test-v83.js` to `index.js`?**
  _High betweenness centrality (0.359) - this node is a cross-community bridge._