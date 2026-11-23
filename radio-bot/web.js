// APIs publiques sans clé : Deezer et iTunes (titres), LRCLIB (paroles), Radio Browser (radios du monde).
const HEADERS = { 'User-Agent': 'DiscordRadioBot/2.0 (github.com/ZeuS3S/ZeuS3S)' };
const RADIO_BROWSER = process.env.RADIO_BROWSER_URL || 'https://de1.api.radio-browser.info';

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Infos du titre en cours : pochette, durée et liens d'écoute. Deezer d'abord, iTunes en secours.
const tracks = new Map();
async function fetchTrack(title) {
  if (tracks.has(title)) return tracks.get(title);
  const q = encodeURIComponent(title);
  const links = { spotifyUrl: `https://open.spotify.com/search/${q}`, deezerUrl: `https://www.deezer.com/search/${q}` };
  let track = null;
  const deezer = await getJson(`https://api.deezer.com/search?limit=1&q=${q}`).catch(() => null);
  const d = deezer?.data?.[0];
  if (d) {
    track = { ...links, cover: d.album?.cover_xl ?? null, durationMs: d.duration * 1000 || null, deezerUrl: d.link ?? links.deezerUrl };
  } else {
    const itunes = await getJson(`https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${q}`).catch(() => null);
    const it = itunes?.results?.[0];
    track = { ...links, cover: it?.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null, durationMs: it?.trackTimeMillis ?? null };
  }
  if (tracks.size > 500) tracks.clear();
  tracks.set(title, track);
  return track;
}

// Télécharge une image (pochette, logo) pour la carte, avec cache.
const images = new Map();
async function fetchImage(url) {
  if (!url) return null;
  if (images.has(url)) return images.get(url);
  const buf = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) })
    .then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? Buffer.from(b) : null)).catch(() => null);
  if (images.size > 100) images.clear();
  images.set(url, buf);
  return buf;
}

async function fetchLyrics(title) {
  const list = await getJson(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`).catch(() => []);
  // Paroles minutées en priorité (pour l'affichage synchronisé), sinon texte simple.
  return list.find((l) => l.syncedLyrics) ?? list.find((l) => l.plainLyrics) ?? null;
}

function searchWorld(query) {
  const params = new URLSearchParams({ name: query, limit: '25', hidebroken: 'true', order: 'clickcount', reverse: 'true' });
  return getJson(`${RADIO_BROWSER}/json/stations/search?${params}`).catch(() => []);
}

async function worldStation(uuid) {
  const [station] = await getJson(`${RADIO_BROWSER}/json/stations/byuuid/${encodeURIComponent(uuid)}`).catch(() => []);
  return station ?? null;
}

// Image déjà téléchargée, sans attendre (pour répondre vite à une interaction).
const cachedImage = (url) => images.get(url) ?? null;

module.exports = { fetchTrack, fetchImage, cachedImage, fetchLyrics, searchWorld, worldStation };
