# Graph Report - ZeuS3S  (2026-10-10)

## Corpus Check
- Corpus is ~18,013 words - fits in a single context window. You may not need a graph.

## Summary
- 293 nodes · 678 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.86)
- Token cost: 132,266 input · 0 output

## Community Hubs (Navigation)
- Panel & Interaction Handlers
- Pure Helpers & Audio
- Bot Core Wiring
- SQLite Storage Layer
- Package Dependencies
- Radio Bot Features (Docs)
- Live/Pause Badge Tiles
- Music APIs & Lyrics
- Scale & Monitoring
- Graphify Setup

## God Nodes (most connected - your core abstractions)
1. `cfgOf()` - 28 edges
2. `onPanelAction()` - 27 edges
3. `t()` - 25 edges
4. `panelPayload()` - 21 edges
5. `stationsOf()` - 16 edges
6. `langFor()` - 16 edges
7. `refresh()` - 15 edges
8. `stop()` - 14 edges
9. `reply()` - 14 edges
10. `playFor()` - 13 edges

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
- **Premium-gated perks** — radio_bot_readme_premium_system, radio_bot_readme_mode_247, radio_bot_readme_audio_effects, radio_bot_readme_now_playing_panel [EXTRACTED 1.00]
- **Bot liveness monitoring** — radio_bot_readme_status_command, radio_bot_readme_health_endpoint, radio_bot_readme_uptimerobot, radio_bot_readme_sharding [EXTRACTED 1.00]
- **Tiles forming 'EN DIRECT' badge** — radio_bot_assets_badges_live_fr_1, radio_bot_assets_badges_live_fr_2, radio_bot_assets_badges_live_fr_3 [INFERRED 0.95]
- **Tiles forming 'EN PAUSE' badge** — radio_bot_assets_badges_pause_fr_1, radio_bot_assets_badges_pause_fr_2, radio_bot_assets_badges_pause_fr_3 [INFERRED 0.95]

## Communities (11 total, 1 thin omitted)

### Community 0 - "Panel & Interaction Handlers"
Cohesion: 0.13
Nodes (55): t(), addRecent(), announceChannel(), badgeOf(), button(), cfgOf(), configPayload(), container() (+47 more)

### Community 1 - "Pure Helpers & Audio"
Cohesion: 0.06
Nodes (35): canControl(), clock(), formatMinutes(), { PermissionFlagsBits }, progressBar(), stationKey(), stripEmoji(), volumeBar() (+27 more)

### Community 2 - "Bot Core Wiring"
Cohesion: 0.05
Nodes (45): isStreamUrl(), lineAt(), badges, {
  canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes, parseLrc, lineAt, progressBar, weekStart,
}, client, {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
  InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType,
  AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContainerBuilder, TextDisplayBuilder, SectionBuilder,
  ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder, Status,
}, commandIds, commands (+37 more)

### Community 3 - "SQLite Storage Layer"
Cohesion: 0.08
Nodes (39): flag(), { DatabaseSync }, db, del(), delStmt, fs, get(), getStmt (+31 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.07
Nodes (25): dependencies, discord.js, @discordjs/opus, @discordjs/voice, ffmpeg-static, libsodium-wrappers, @napi-rs/canvas, prism-media (+17 more)

### Community 5 - "Radio Bot Features (Docs)"
Cohesion: 0.09
Nodes (22): Inter font license (OFL-1.1), Inter font (rsms/inter), SIL Open Font License 1.1, Radio Bot README, Application emoji badges (assets/badges, scripts/badges.py), Audio effects (Bass boost, Nightcore, Vaporwave, 8D, Night), Built-in stations list (stations.js), DJ role permission (+14 more)

### Community 6 - "Live/Pause Badge Tiles"
Cohesion: 0.19
Nodes (16): live_en_1.png - tile 1/2 of 'LIVE' red pill badge, live_en_2.png - tile 2/2 of 'LIVE' red pill badge, 'LIVE' red status badge (Discord emoji strip), live_fr_1.png - tile 1/3 of 'EN DIRECT' red pill badge, live_fr_2.png - tile 2/3 of 'EN DIRECT' red pill badge, live_fr_3.png - tile 3/3 of 'EN DIRECT' red pill badge, 'EN DIRECT' red status badge (Discord emoji strip), pause_en_1.png - tile 1/2 of 'PAUSED' blue pill badge (+8 more)

### Community 7 - "Music APIs & Lyrics"
Cohesion: 0.21
Nodes (13): parseLrc(), learnLogoColor(), onNewTitle(), cachedImage(), fetchImage(), fetchLyrics(), fetchTrack(), getJson() (+5 more)

### Community 8 - "Scale & Monitoring"
Cohesion: 0.33
Nodes (6): Favorites (cross-server), HTTP health endpoint (HEALTH_PORT, /health 200/503), Automatic sharding (SHARDS), SQLite storage (radio.db, shared across shards, data.json import), /status command (live shard/DB/audio check), UptimeRobot external monitoring

### Community 9 - "Graphify Setup"
Cohesion: 0.40
Nodes (4): .claude/CLAUDE.md graphify skill instructions, graphify skill (/graphify trigger), CLAUDE.md project instructions, graphify knowledge graph (graphify-out)

## Knowledge Gaps
- **17 isolated node(s):** `@discordjs/opus`, `libsodium-wrappers`, `.claude/CLAUDE.md graphify skill instructions`, `CLAUDE.md project instructions`, `MovixFR Discord server` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 102 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureBadges()` connect `Live/Pause Badge Tiles` to `Bot Core Wiring`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `@discordjs/opus`, `libsodium-wrappers`, `.claude/CLAUDE.md graphify skill instructions` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Panel & Interaction Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.13131313131313133 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `Package Dependencies` to `Pure Helpers & Audio`, `Bot Core Wiring`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Pure Helpers & Audio` be split into smaller, more focused modules?**
  _Cohesion score 0.06207482993197279 - nodes in this community are weakly interconnected._
- **Should `Bot Core Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.04846938775510204 - nodes in this community are weakly interconnected._
- **Should `SQLite Storage Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07928118393234672 - nodes in this community are weakly interconnected._