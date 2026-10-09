// Point d'entrée : découpe le bot en shards (obligatoire au-delà de 2 500 serveurs, automatique avant).
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager(`${__dirname}/index.js`, {
  token: process.env.DISCORD_TOKEN,
  totalShards: process.env.SHARDS ? Number(process.env.SHARDS) : 'auto',
  execArgv: ['--disable-warning=ExperimentalWarning'],
});
manager.on('shardCreate', (shard) => console.log(`Shard ${shard.id} lancé`));
manager.spawn();
