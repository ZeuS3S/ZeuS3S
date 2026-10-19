# Graph Report - ZeuS3S  (2026-10-19)

## Corpus Check
- 85 files · ~148,808 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .otf 3, (none) 2, .webmanifest 1)

## Summary
- 877 nodes · 2182 edges · 83 communities (40 shown, 43 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 301 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d222093`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- t
- bot.test.js
- index.js
- db.js
- package.json
- Now-playing panel (Components V2)
- card.js
- Zk
- HTTP health endpoint (HEALTH_PORT, /health 200/503)
- graphify knowledge graph (graphify-out)
- b
- support.js
- xk
- m
- shard.js
- Z
- fi
- Hg
- ej
- ni
- ok
- on
- cfgOf
- refresh
- tj
- Xc
- ref
- health.js
- mb
- jt
- Coupe-Fruits, version à héberger
- test-v66m.js
- Volta Électricité
- test-v73.js
- ref_assert
- w
- test-v67.js
- uk
- test-v63.js
- test-v53.js
- test-v83.js
- Passation — 19 octobre 2026
- ec
- test-v38.js
- test-v78.js
- test-v80.js
- test-v86.js
- test-v87.js
- fd
- test-v36.js
- test-v39.js
- test-v66.js
- test-v70.js
- test-v72.js
- test-ach.js
- test-coupe.js
- test-modes.js
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
- test-v54.js
- test-v57.js
- test-v58.js
- test-v59.js
- test-v77.js
- test-v90.js
- artifact.js
- mj
- run.sh

## God Nodes (most connected - your core abstractions)
1. `m()` - 53 edges
2. `b()` - 43 edges
3. `xk()` - 41 edges
4. `c()` - 35 edges
5. `d()` - 32 edges
6. `a()` - 30 edges
7. `e()` - 30 edges
8. `cfgOf()` - 28 edges
9. `t()` - 27 edges
10. `onPanelAction()` - 27 edges

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

## Communities (83 total, 43 thin omitted)

### Community 0 - "t"
Cohesion: 0.18
Nodes (35): user(), t(), badgeOf(), button(), configPayload(), container(), editPanel(), embed() (+27 more)

### Community 1 - "bot.test.js"
Cohesion: 0.08
Nodes (22): canControl(), clock(), lineAt(), { PermissionFlagsBits }, progressBar(), stationKey(), volumeBar(), weekStart() (+14 more)

### Community 2 - "index.js"
Cohesion: 0.06
Nodes (35): isStreamUrl(), badges, {
  canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes, parseLrc, lineAt, progressBar, weekStart,
}, client, {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
  InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType,
  AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContainerBuilder, TextDisplayBuilder, SectionBuilder,
  ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder, Status,
}, commandIds, commands, COMPONENT_HANDLERS (+27 more)

### Community 3 - "db.js"
Cohesion: 0.09
Nodes (34): { DatabaseSync }, db, del(), delStmt, fs, get(), getStmt, guild() (+26 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (22): dependencies, discord.js, @discordjs/opus, @discordjs/voice, ffmpeg-static, libsodium-wrappers, @napi-rs/canvas, prism-media (+14 more)

### Community 5 - "Now-playing panel (Components V2)"
Cohesion: 0.09
Nodes (22): Inter font license (OFL-1.1), Inter font (rsms/inter), SIL Open Font License 1.1, Radio Bot README, Application emoji badges (assets/badges, scripts/badges.py), Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night), Built-in stations list (stations.js), DJ role permission (+14 more)

### Community 6 - "card.js"
Cohesion: 0.11
Nodes (26): stripEmoji(), live_en_1.png - tile 1/2 of 'LIVE' red pill badge, live_en_2.png - tile 2/2 of 'LIVE' red pill badge, 'LIVE' red status badge (Discord emoji strip), live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge, live_fr_2.png - tile 2/3 of 'EN DIRECT' red pill badge, live_fr_3.png - tile 3/3 of 'EN DIRECT' red pill badge, 'EN DIRECT' red status badge (Discord emoji strip) (+18 more)

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
Cohesion: 0.05
Nodes (115): aa(), ac(), at(), B(), bc(), be(), bj(), Bt() (+107 more)

### Community 12 - "support.js"
Cohesion: 0.06
Nodes (14): ae(), dt(), Fg(), Fh(), Ij(), Lb(), M(), oa() (+6 more)

### Community 13 - "xk"
Cohesion: 0.17
Nodes (22): Bk(), cf(), Db(), Dc(), F(), fa(), hf(), jf() (+14 more)

### Community 14 - "m"
Cohesion: 0.12
Nodes (25): Ag(), Bg(), Cc(), cd(), Cg(), df(), gj(), Gk() (+17 more)

### Community 16 - "Z"
Cohesion: 0.15
Nodes (21): ah(), fb(), $g(), gf(), gi(), hi(), ic(), Ih() (+13 more)

### Community 17 - "fi"
Cohesion: 0.13
Nodes (19): componentDidMount(), componentDidUpdate(), componentWillUnmount(), di(), dn(), fi(), Gc(), Ha() (+11 more)

### Community 18 - "Hg"
Cohesion: 0.33
Nodes (5): Bd(), Hg(), ob(), sh(), Ud()

### Community 20 - "ni"
Cohesion: 0.14
Nodes (21): af(), Eg(), hc(), Hk(), ia(), jk(), kb(), Kk() (+13 more)

### Community 21 - "ok"
Cohesion: 0.17
Nodes (18): ai(), bi(), ci(), Dg(), ef(), Eh(), hb(), Lh() (+10 more)

### Community 22 - "on"
Cohesion: 0.67
Nodes (4): Ct(), on(), rn(), sn()

### Community 23 - "cfgOf"
Cohesion: 0.14
Nodes (31): formatMinutes(), addRecent(), announceChannel(), cfgOf(), countListening(), langOf(), listenersOf(), logPremium() (+23 more)

### Community 24 - "refresh"
Cohesion: 0.18
Nodes (16): flag(), parseLrc(), autocomplete(), learnLogoColor(), onNewTitle(), refresh(), cachedImage(), fetchImage() (+8 more)

### Community 25 - "tj"
Cohesion: 0.33
Nodes (7): bh(), ch(), Ck(), Ie(), sj(), tj(), ya()

### Community 26 - "Xc"
Cohesion: 0.29
Nodes (7): constructor(), hj(), ig(), jg(), Pc(), Xc(), yj()

### Community 27 - "ref"
Cohesion: 0.11
Nodes (12): assert, { chromium }, assert, { chromium }, assert, { chromium }, assert, { chromium } (+4 more)

### Community 28 - "health.js"
Cohesion: 0.38
Nodes (5): health(), http, STARTED_AT, startHealthServer(), timeout()

### Community 29 - "mb"
Cohesion: 0.67
Nodes (3): $a(), Ab(), mb()

### Community 30 - "jt"
Cohesion: 0.67
Nodes (3): It(), jt(), Pt()

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

### Community 35 - "ref_assert"
Cohesion: 0.12
Nodes (10): assert, { chromium }, assert, { chromium }, assert, { chromium }, assert, { chromium } (+2 more)

### Community 39 - "test-v67.js"
Cohesion: 0.20
Nodes (8): ALL, assert, { chromium }, clan(), d, pd, sc(), seed()

### Community 40 - "uk"
Cohesion: 0.24
Nodes (11): Bf(), e(), eb(), ff(), gd(), pa(), rd(), ui() (+3 more)

### Community 43 - "test-v83.js"
Cohesion: 0.33
Nodes (3): assert, { chromium }, constructor()

### Community 44 - "Passation — 19 octobre 2026"
Cohesion: 0.33
Nodes (5): 1. Coupe-Fruits (jeu de découpe de fruits, version 3.10), 2. Kappa Tarkov (quêtes requises pour le conteneur Kappa), Autres dossiers du dépôt, Passation — 19 octobre 2026, Règles de travail

### Community 45 - "ec"
Cohesion: 0.33
Nodes (6): ec(), lc(), Rc(), tg(), vg(), vj()

### Community 51 - "fd"
Cohesion: 0.40
Nodes (5): fd(), Ib(), pj(), Qj(), Rj()

### Community 81 - "mj"
Cohesion: 1.00
Nodes (3): gh(), mj(), Xg()

## Knowledge Gaps
- **17 isolated node(s):** `@discordjs/opus`, `libsodium-wrappers`, `SIL Open Font License 1.1`, `Application emoji badges (assets/badges, scripts/badges.py)`, `Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night)` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 297 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `t` to `bot.test.js`, `index.js`, `test-v83.js`, `support.js`, `cfgOf`?**
  _High betweenness centrality (0.376) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `m()` (e.g. with `test-v75.js` and `wd()`) actually correct?**
  _`m()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@discordjs/opus`, `libsodium-wrappers`, `SIL Open Font License 1.1` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `bot.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08021390374331551 - nodes in this community are weakly interconnected._
- **Why does `m()` connect `m` to `test-v66m.js`, `uk`, `b`, `support.js`, `xk`, `ec`, `Z`, `fi`, `mj`, `fd`, `ni`, `ok`, `tj`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `b()` (e.g. with `be()` and `bh()`) actually correct?**
  _`b()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.058029689608636977 - nodes in this community are weakly interconnected._