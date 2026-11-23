// Lit le titre en cours d'un flux Icecast/Shoutcast (métadonnées ICY), puis coupe la connexion.
async function fetchTitle(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'Icy-MetaData': '1' }, signal: ctrl.signal });
    const metaint = Number(res.headers.get('icy-metaint'));
    if (!metaint) return null;
    let buf = Buffer.alloc(0);
    for await (const chunk of res.body) {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length <= metaint) continue;
      const len = buf[metaint] * 16;
      if (buf.length < metaint + 1 + len) continue;
      const meta = buf.subarray(metaint + 1, metaint + 1 + len).toString('utf8');
      return meta.match(/StreamTitle='(.*?)';/)?.[1]?.trim() || null;
    }
    return null;
  } catch {
    return null; // Flux sans métadonnées ou injoignable : pas de titre, pas grave.
  } finally {
    clearTimeout(timer);
    ctrl.abort();
  }
}

module.exports = { fetchTitle };
