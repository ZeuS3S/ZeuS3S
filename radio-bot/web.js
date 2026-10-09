// APIs publiques sans clé : iTunes (pochettes), LRCLIB (paroles), Radio Browser (radios du monde).
const HEADERS = { 'User-Agent': 'DiscordRadioBot/2.0 (github.com/ZeuS3S/ZeuS3S)' };
const RADIO_BROWSER = process.env.RADIO_BROWSER_URL || 'https://de1.api.radio-browser.info';

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const covers = new Map();
async function fetchCover(title) {
  if (covers.has(title)) return covers.get(title);
  const res = await getJson(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(title)}`).catch(() => null);
  const url = res?.results?.[0]?.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null;
  if (covers.size > 500) covers.clear();
  covers.set(title, url);
  return url;
}

async function fetchLyrics(title) {
  const list = await getJson(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`).catch(() => []);
  return list.find((l) => l.plainLyrics) ?? null;
}

function searchWorld(query) {
  const params = new URLSearchParams({ name: query, limit: '25', hidebroken: 'true', order: 'clickcount', reverse: 'true' });
  return getJson(`${RADIO_BROWSER}/json/stations/search?${params}`).catch(() => []);
}

async function worldStation(uuid) {
  const [station] = await getJson(`${RADIO_BROWSER}/json/stations/byuuid/${encodeURIComponent(uuid)}`).catch(() => []);
  return station ?? null;
}

module.exports = { fetchCover, fetchLyrics, searchWorld, worldStation };
