// Flux publics des radios. Une URL morte ? Remplace-la ici ou via /owner station-add.
// genre : rangement dans /stations · color : couleur de la radio (carte, égaliseur, bordure du panneau).
// Logo de la radio : favicon HD du site officiel.
const logo = (site) => `https://www.google.com/s2/favicons?domain=${site}&sz=128`;

module.exports = {
  lofi: { name: '🎧 LoFi Radio', url: 'https://stream.laut.fm/lofi', logo: logo('laut.fm'), genre: 'chill', color: 0xb388ff },
  chillhop: { name: '☕ I Love Chillhop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3', logo: logo('iloveradio.de'), genre: 'chill', color: 0xc8a165 },
  groovesalad: { name: '🌿 SomaFM Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', logo: logo('somafm.com'), genre: 'chill', color: 0x7cb342 },
  nrj: { name: '🔴 NRJ', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3', logo: logo('nrj.fr'), genre: 'hits', color: 0xe4032e },
  funradio: { name: '🪩 Fun Radio', url: 'https://streamer-02.rtl.fr/fun-1-44-128', logo: logo('funradio.fr'), genre: 'hits', color: 0xe6007e },
  skyrock: { name: '🎤 Skyrock', url: 'http://icecast.skyrock.net/s/natio_mp3_128k', logo: logo('skyrock.com'), genre: 'rap', color: 0x1e88e5 },
  generations: { name: '🧢 Générations', url: 'http://generationfm.ice.infomaniak.ch/generationfm-high.mp3', logo: logo('generations.fr'), genre: 'rap', color: 0xffc400 },
  mouv: { name: '🎧 Mouv\'', url: 'https://icecast.radiofrance.fr/mouv-midfi.mp3', logo: logo('mouv.fr'), genre: 'rap', color: 0x00c2a8 },
  nostalgie: { name: '📻 Nostalgie', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30601/mp3_128.mp3', logo: logo('nostalgie.fr'), genre: 'oldies', color: 0xd4a017 },
  cherie: { name: '💗 Chérie FM', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30201/mp3_128.mp3', logo: logo('cheriefm.fr'), genre: 'oldies', color: 0xe91e8c },
  rireetchansons: { name: '😂 Rire & Chansons', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30401/mp3_128.mp3', logo: logo('rireetchansons.fr'), genre: 'humor', color: 0xffd600 },
  rtl: { name: '📰 RTL', url: 'https://streamer-02.rtl.fr/rtl-1-44-128', logo: logo('rtl.fr'), genre: 'talk', color: 0xe30613 },
  franceinter: { name: '🇫🇷 France Inter', url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3', logo: logo('franceinter.fr'), genre: 'talk', color: 0xe2001a },
  fip: { name: '🎷 FIP', url: 'https://icecast.radiofrance.fr/fip-midfi.mp3', logo: logo('fip.fr'), genre: 'eclectic', color: 0xe2007a },
  radiomeuh: { name: '🐮 Radio Meuh', url: 'https://radiomeuh.ice.infomaniak.ch/radiomeuh-128.mp3', logo: logo('radiomeuh.com'), genre: 'eclectic', color: 0xff7043 },
};
