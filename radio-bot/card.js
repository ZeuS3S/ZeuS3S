// Carte « en cours » en image : pochette floutée en fond, pochette, titre, artiste et égaliseur aux couleurs de la radio.
const fs = require('node:fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { stripEmoji } = require('./access');

const FONT_DIR = `${__dirname}/assets/fonts`;
GlobalFonts.registerFromPath(`${FONT_DIR}/Inter-Regular.otf`, 'Inter');
GlobalFonts.registerFromPath(`${FONT_DIR}/Inter-SemiBold.otf`, 'Inter SemiBold');
GlobalFonts.registerFromPath(`${FONT_DIR}/Inter-Bold.otf`, 'Inter Bold');

const W = 1000;
const H = 300;
const rgb = (color) => `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`;

const load = async (buf) => (buf ? loadImage(buf).catch(() => null) : null);

// Coupe un texte trop long avec « … ».
function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function roundedImage(ctx, img, x, y, size, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

/**
 * @param {{ title: string|null, station: string, label: string, color: number, paused: boolean,
 *           cover: Buffer|null, logo: Buffer|null }} o
 */
async function renderCard(o) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const cover = await load(o.cover);
  const art = cover ?? await load(o.logo);
  const accent = o.paused ? 0x80848e : o.color;

  // Fond : pochette floutée et assombrie, sinon un fond sombre teinté de la couleur de la radio.
  ctx.fillStyle = '#1e1f22';
  ctx.fillRect(0, 0, W, H);
  if (art) {
    ctx.filter = 'blur(40px)';
    ctx.drawImage(art, -100, -350, W + 200, W + 200);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = rgb(accent);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(17, 18, 20, 0.62)';
  ctx.fillRect(0, 0, W, H);

  // Pochette (ou logo, ou disque coloré).
  const size = 236;
  if (art) roundedImage(ctx, art, 32, 32, size, 20);
  else { // Disque coloré avec les initiales de la radio.
    ctx.fillStyle = rgb(accent);
    ctx.beginPath();
    ctx.roundRect(32, 32, size, size, 20);
    ctx.fill();
    const initials = stripEmoji(o.station).split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '84px "Inter Bold"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 32 + size / 2, 32 + size / 2);
    ctx.textAlign = 'left';
  }

  // Textes : « EN DIRECT · NRJ », titre, artiste (« Artiste - Titre » dans le flux).
  const x = 300;
  const maxText = W - x - 36;
  const [artist, song] = o.title?.includes(' - ') ? o.title.split(/ - (.*)/s) : [null, o.title];
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = rgb(accent);
  ctx.font = '24px "Inter Bold"';
  ctx.fillText(fit(ctx, `${o.label} · ${stripEmoji(o.station)}`.toUpperCase(), maxText), x, 78);
  ctx.fillStyle = '#ffffff';
  ctx.font = '46px "Inter Bold"';
  ctx.fillText(fit(ctx, song ?? stripEmoji(o.station), maxText), x, 138);
  ctx.fillStyle = '#c4c9d0';
  ctx.font = '30px "Inter SemiBold"';
  if (artist) ctx.fillText(fit(ctx, artist, maxText), x, 184);

  // Égaliseur : forme différente à chaque rendu (il « bouge » à chaque mise à jour du panneau).
  const bars = 40;
  const gap = 6;
  const barW = (maxText - gap * (bars - 1)) / bars;
  const base = 268;
  const maxH = 58;
  const phase = Math.random() * Math.PI * 2;
  ctx.fillStyle = rgb(accent);
  for (let b = 0; b < bars; b++) {
    const wave = 0.4 + 0.3 * Math.sin(phase + b / 3) + 0.3 * Math.random();
    const h = o.paused ? 6 : Math.max(6, Math.round(maxH * Math.min(1, wave)));
    ctx.beginPath();
    ctx.roundRect(x + b * (barW + gap), base - h, barW, h, 3);
    ctx.fill();
  }
  return canvas.toBuffer('image/png');
}

// Couleur moyenne d'une image (logo d'une radio du monde) pour lui donner une couleur. null si illisible.
async function dominantColor(buf) {
  const img = await load(buf);
  if (!img) return null;
  const ctx = createCanvas(16, 16).getContext('2d');
  ctx.drawImage(img, 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  let r = 0, g = 0, b = 0, n = 0;
  for (let p = 0; p < data.length; p += 4) {
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    if (data[p + 3] < 128 || max - min < 40) continue; // Ignore la transparence et le gris/blanc/noir.
    r += data[p]; g += data[p + 1]; b += data[p + 2]; n++;
  }
  return n ? (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n) : null;
}

// Badges en tuiles (assets/badges/<nom>_<n>.png), envoyés comme émojis d'application.
const BADGE_DIR = `${__dirname}/assets/badges`;
const badgeFiles = () => fs.readdirSync(BADGE_DIR).filter((f) => f.endsWith('.png')).sort();

module.exports = { renderCard, dominantColor, badgeFiles, BADGE_DIR };
