// Adresse web de santé pour un service de surveillance (UptimeRobot…) : 200 si tous les shards sont connectés, 503 sinon.
// Tourne dans le processus qui lance les shards : il répond même si un shard plante, et se tait si tout le bot est arrêté.
const http = require('node:http');

const STARTED_AT = Date.now();
const READY = 0; // Status.Ready de discord.js

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

async function health(manager) {
  const shards = await Promise.all([...manager.shards.values()].map(async (shard) => {
    try {
      const info = await Promise.race([
        shard.eval((c) => ({ status: c.ws.status, ping: c.ws.ping, guilds: c.guilds.cache.size, live: c.liveRadios ?? 0 })),
        timeout(3000),
      ]);
      return { id: shard.id, ready: info.status === READY, ping: info.ping, guilds: info.guilds, live: info.live };
    } catch {
      return { id: shard.id, ready: false };
    }
  }));
  const expected = typeof manager.totalShards === 'number' ? manager.totalShards : null; // 'auto' tant que le lancement n'est pas fini.
  const ok = expected !== null && shards.length === expected && shards.every((s) => s.ready);
  return {
    ok,
    body: {
      status: ok ? 'ok' : shards.some((s) => s.ready) ? 'degraded' : 'down',
      uptime: Math.floor((Date.now() - STARTED_AT) / 1000),
      guilds: shards.reduce((a, s) => a + (s.guilds ?? 0), 0),
      live: shards.reduce((a, s) => a + (s.live ?? 0), 0),
      shards,
    },
  };
}

function startHealthServer(manager, port) {
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' || !['/', '/health'].includes(req.url)) {
      res.writeHead(404).end();
      return;
    }
    const { ok, body } = await health(manager);
    res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  }).listen(port, () => console.log(`Santé du bot : http://localhost:${port}/health`));
}

module.exports = { health, startHealthServer };
