const prism = require('prism-media');

// Filtres ffmpeg appliqués au flux. aresample avant asetrate : le calcul suppose une entrée à 48 kHz.
const EFFECTS = {
  normal: { label: '🎚️ Normal', af: null },
  bassboost: { label: '🔊 Bass boost', af: 'bass=g=12,dynaudnorm' },
  nightcore: { label: '⚡ Nightcore', af: 'aresample=48000,asetrate=48000*1.25,aresample=48000' },
  vaporwave: { label: '🌴 Vaporwave', af: 'aresample=48000,asetrate=48000*0.8,aresample=48000' },
  '8d': { label: '🎧 8D', af: 'apulsator=hz=0.09' },
  night: { label: '🌙 Night', af: 'lowpass=f=3500,acompressor=threshold=-20dB:ratio=4,volume=1.5' },
};

// Lit le flux avec ffmpeg et sort du PCM 48 kHz stéréo, avec reconnexion HTTP intégrée.
function createStream(url, effect) {
  const af = EFFECTS[effect]?.af;
  return new prism.FFmpeg({
    args: [
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
      '-analyzeduration', '0', '-loglevel', '0', '-i', url,
      ...(af ? ['-af', af] : []),
      '-f', 's16le', '-ar', '48000', '-ac', '2',
    ],
  });
}

module.exports = { EFFECTS, createStream };
