# Graph Report - ZeuS3S  (2026-10-16)

## Corpus Check
- 29 files · ~122,747 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .otf 3, .webmanifest 1, .example 1)

## Summary
- 660 nodes · 1906 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 295 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `624e2c7b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- le
- bot.test.js
- index.js
- db.js
- package.json
- Now-playing panel (Components V2)
- ensureBadges
- Zk
- HTTP health endpoint (HEALTH_PORT, /health 200/503)
- graphify knowledge graph (graphify-out)
- b
- support.js
- xk
- m
- discord.js
- pi
- fi
- nb
- D
- ia
- xa
- on
- card.js
- access.js
- me
- fd
- dependencies
- health.js
- mb
- zt
- Coupe-Fruits, version à héberger
- ka
- Volta Électricité
- audio.js
- w
- Nt

## God Nodes (most connected - your core abstractions)
1. `m()` - 52 edges
2. `b()` - 43 edges
3. `xk()` - 41 edges
4. `c()` - 35 edges
5. `d()` - 32 edges
6. `a()` - 30 edges
7. `e()` - 30 edges
8. `cfgOf()` - 28 edges
9. `onPanelAction()` - 27 edges
10. `Ce()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Hyra Musique (Discord music bot V13)` --semantically_similar_to--> `Radio Bot README`  [INFERRED] [semantically similar]
  README.md → radio-bot/README.md
- `ensureBadges()` --references--> `live_en_1.png - tile 1/2 of 'LIVE' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_en_1.png
- `ensureBadges()` --references--> `live_en_2.png - tile 2/2 of 'LIVE' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_en_2.png
- `ensureBadges()` --references--> `live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_fr_1.png
- `ensureBadges()` --references--> `live_fr_2.png - tile 2/3 of 'EN DIRECT' red pill badge`  [INFERRED]
  radio-bot/index.js → radio-bot/assets/badges/live_fr_2.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Bot liveness monitoring** — radio_bot_readme_status_command, radio_bot_readme_health_endpoint, radio_bot_readme_uptimerobot, radio_bot_readme_sharding [EXTRACTED 1.00]
- **Premium-gated perks** — radio_bot_readme_premium_system, radio_bot_readme_mode_247, radio_bot_readme_audio_effects, radio_bot_readme_now_playing_panel [EXTRACTED 1.00]
- **Tiles forming 'EN DIRECT' badge** — radio_bot_assets_badges_live_fr_1, radio_bot_assets_badges_live_fr_2, radio_bot_assets_badges_live_fr_3 [INFERRED 0.95]
- **Tiles forming 'EN PAUSE' badge** — radio_bot_assets_badges_pause_fr_1, radio_bot_assets_badges_pause_fr_2, radio_bot_assets_badges_pause_fr_3 [INFERRED 0.95]

## Communities (40 total, 5 thin omitted)

### Community 0 - "le"
Cohesion: 0.22
Nodes (10): ef(), Eh(), le(), lg(), O(), Qt(), Se(), st() (+2 more)

### Community 1 - "bot.test.js"
Cohesion: 0.12
Nodes (8): assert, { canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes }, { fetchTitle }, http, { PermissionFlagsBits }, test, STRINGS, fetchTitle()

### Community 2 - "index.js"
Cohesion: 0.05
Nodes (115): canControl(), formatMinutes(), lineAt(), t(), addRecent(), announceChannel(), badgeOf(), badges (+107 more)

### Community 3 - "db.js"
Cohesion: 0.09
Nodes (36): { DatabaseSync }, db, del(), delStmt, fs, get(), getStmt, guild() (+28 more)

### Community 4 - "package.json"
Cohesion: 0.14
Nodes (13): description, engines, node, main, name, scripts, start, test (+5 more)

### Community 5 - "Now-playing panel (Components V2)"
Cohesion: 0.09
Nodes (22): Inter font license (OFL-1.1), Inter font (rsms/inter), SIL Open Font License 1.1, Radio Bot README, Application emoji badges (assets/badges, scripts/badges.py), Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night), Built-in stations list (stations.js), DJ role permission (+14 more)

### Community 6 - "ensureBadges"
Cohesion: 0.19
Nodes (16): live_en_1.png - tile 1/2 of 'LIVE' red pill badge, live_en_2.png - tile 2/2 of 'LIVE' red pill badge, 'LIVE' red status badge (Discord emoji strip), live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge, live_fr_2.png - tile 2/3 of 'EN DIRECT' red pill badge, live_fr_3.png - tile 3/3 of 'EN DIRECT' red pill badge, 'EN DIRECT' red status badge (Discord emoji strip), pause_en_1.png - tile 1/2 of 'PAUSED' blue pill badge (+8 more)

### Community 7 - "Zk"
Cohesion: 0.40
Nodes (5): sc(), Td(), yb(), Yi(), Zk()

### Community 8 - "HTTP health endpoint (HEALTH_PORT, /health 200/503)"
Cohesion: 0.33
Nodes (6): Favorites (cross-server), HTTP health endpoint (HEALTH_PORT, /health 200/503), Automatic sharding (SHARDS), SQLite storage (radio.db, shared across shards, data.json import), /status command (live shard/DB/audio check), UptimeRobot external monitoring

### Community 9 - "graphify knowledge graph (graphify-out)"
Cohesion: 0.40
Nodes (4): .claude/CLAUDE.md graphify skill instructions, graphify skill (/graphify trigger), CLAUDE.md project instructions, graphify knowledge graph (graphify-out)

### Community 11 - "b"
Cohesion: 0.07
Nodes (98): ac(), at(), B(), bc(), be(), C(), Ce(), cn() (+90 more)

### Community 12 - "support.js"
Cohesion: 0.06
Nodes (13): ae(), Fg(), Fh(), gd(), Ij(), K(), Kk(), Lb() (+5 more)

### Community 13 - "xk"
Cohesion: 0.11
Nodes (35): Bf(), Bk(), cf(), Db(), Dc(), ea(), F(), fa() (+27 more)

### Community 14 - "m"
Cohesion: 0.14
Nodes (21): Cc(), cd(), gh(), Gk(), $h(), jd(), Kh(), lf() (+13 more)

### Community 15 - "discord.js"
Cohesion: 0.50
Nodes (3): manager, { ShardingManager }, discord.js

### Community 16 - "pi"
Cohesion: 0.20
Nodes (14): aa(), af(), ah(), fb(), $g(), gi(), hi(), ic() (+6 more)

### Community 17 - "fi"
Cohesion: 0.17
Nodes (16): componentDidMount(), componentDidUpdate(), componentWillUnmount(), di(), fi(), Gc(), Ha(), Id() (+8 more)

### Community 18 - "nb"
Cohesion: 0.17
Nodes (12): Ag(), Bd(), Bg(), Cg(), df(), Hg(), nb(), nj() (+4 more)

### Community 19 - "D"
Cohesion: 0.29
Nodes (7): bj(), Bt(), D(), dj(), ej(), Ft(), Gt()

### Community 20 - "ia"
Cohesion: 0.17
Nodes (15): Eg(), hc(), Hk(), ia(), jk(), kb(), Li(), oj() (+7 more)

### Community 21 - "xa"
Cohesion: 0.16
Nodes (15): ai(), bi(), ci(), Dg(), hb(), Lh(), Mh(), pd() (+7 more)

### Community 22 - "on"
Cohesion: 0.67
Nodes (4): Ct(), on(), rn(), sn()

### Community 23 - "card.js"
Cohesion: 0.23
Nodes (11): stripEmoji(), { createCanvas, loadImage, GlobalFonts }, dominantColor(), fit(), fs, load(), renderCard(), rgb() (+3 more)

### Community 24 - "access.js"
Cohesion: 0.22
Nodes (9): clock(), flag(), isStreamUrl(), parseLrc(), { PermissionFlagsBits }, progressBar(), stationKey(), volumeBar() (+1 more)

### Community 25 - "me"
Cohesion: 0.20
Nodes (11): bh(), ch(), Ck(), dt(), Ie(), me(), pe(), Qc() (+3 more)

### Community 26 - "fd"
Cohesion: 0.10
Nodes (21): constructor(), ec(), fd(), hj(), Ib(), ig(), jg(), lc() (+13 more)

### Community 27 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, discord.js, @discordjs/opus, @discordjs/voice, ffmpeg-static, libsodium-wrappers, @napi-rs/canvas, prism-media

### Community 28 - "health.js"
Cohesion: 0.38
Nodes (5): health(), http, STARTED_AT, startHealthServer(), timeout()

### Community 29 - "mb"
Cohesion: 0.67
Nodes (3): $a(), Ab(), mb()

### Community 30 - "zt"
Cohesion: 0.20
Nodes (10): It(), je(), jt(), Lt(), pn(), Pt(), Tt(), un() (+2 more)

### Community 31 - "Coupe-Fruits, version à héberger"
Cohesion: 0.33
Nodes (5): Ce qui change par rapport à claude.ai, Coupe-Fruits, version à héberger, Fichiers, Mettre à jour le jeu, Mise en place (environ 20 minutes)

### Community 32 - "ka"
Cohesion: 0.67
Nodes (3): dd(), ka(), b()

### Community 33 - "Volta Électricité"
Cohesion: 0.40
Nodes (4): Limites, Ouvrir le site depuis ce dossier, Pages, Volta Électricité

### Community 35 - "audio.js"
Cohesion: 0.40
Nodes (4): createStream(), EFFECTS, prism, prism-media

### Community 39 - "Nt"
Cohesion: 0.67
Nodes (3): dn(), Nt(), qe()

## Knowledge Gaps
- **17 isolated node(s):** `@discordjs/opus`, `libsodium-wrappers`, `SIL Open Font License 1.1`, `Application emoji badges (assets/badges, scripts/badges.py)`, `Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night)` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 146 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `index.js` to `bot.test.js`, `support.js`?**
  _High betweenness centrality (0.408) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `b()` (e.g. with `be()` and `bh()`) actually correct?**
  _`b()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@discordjs/opus`, `libsodium-wrappers`, `SIL Open Font License 1.1` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bot.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
- **Why does `ensureBadges()` connect `ensureBadges` to `index.js`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `xk()` (e.g. with `e()` and `h()`) actually correct?**
  _`xk()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05238095238095238 - nodes in this community are weakly interconnected._