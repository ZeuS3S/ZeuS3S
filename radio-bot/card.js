const zlib = require('node:zlib');
const fs = require('node:fs');

// Encode une image RGBA en PNG (aucune dépendance : zlib de Node suffit).
function png(width, height, rgba) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length);
    head.write(type, 4);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])));
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Barres d'égaliseur orange (grises en pause), forme différente à chaque appel.
function equalizer(paused, { bars = 24, barW = 6, gap = 3, height = 26, color = [245, 166, 35] } = {}) {
  const width = bars * (barW + gap) - gap;
  const rgba = Buffer.alloc(width * height * 4);
  const phase = Math.random() * Math.PI * 2;
  for (let b = 0; b < bars; b++) {
    const wave = 0.4 + 0.3 * Math.sin(phase + b / 2.5) + 0.3 * Math.random();
    const h = paused ? 4 : Math.max(4, Math.round(height * Math.min(1, wave)));
    const [r, g, bl] = paused ? [120, 124, 130] : color;
    for (let y = height - h; y < height; y++) {
      for (let x = b * (barW + gap); x < b * (barW + gap) + barW; x++) rgba.set([r, g, bl, 255], (y * width + x) * 4);
    }
  }
  return png(width, height, rgba);
}

// Badges en tuiles (assets/badges/<nom>_<n>.png), envoyés comme émojis d'application.
const BADGE_DIR = `${__dirname}/assets/badges`;
const badgeFiles = () => fs.readdirSync(BADGE_DIR).filter((f) => f.endsWith('.png')).sort();

module.exports = { png, equalizer, badgeFiles, BADGE_DIR };
