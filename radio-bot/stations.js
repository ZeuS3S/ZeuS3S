// Flux publics des radios. Une URL morte ? Remplace-la ici ou via /admin add-station.
// Logo de la radio : favicon HD du site officiel.
const logo = (site) => `https://www.google.com/s2/favicons?domain=${site}&sz=128`;

module.exports = {
  lofi: { name: '🎧 LoFi Radio', url: 'https://stream.laut.fm/lofi', logo: logo('laut.fm') },
  chillhop: { name: '☕ I Love Chillhop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3', logo: logo('iloveradio.de') },
  groovesalad: { name: '🌿 SomaFM Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', logo: logo('somafm.com') },
  nrj: { name: '🔴 NRJ', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3', logo: logo('nrj.fr') },
  nostalgie: { name: '📻 Nostalgie', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30601/mp3_128.mp3', logo: logo('nostalgie.fr') },
  cherie: { name: '💗 Chérie FM', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30201/mp3_128.mp3', logo: logo('cheriefm.fr') },
  rireetchansons: { name: '😂 Rire & Chansons', url: 'https://scdn.nrjaudio.fm/adwz2/fr/30401/mp3_128.mp3', logo: logo('rireetchansons.fr') },
  skyrock: { name: '🎤 Skyrock', url: 'http://icecast.skyrock.net/s/natio_mp3_128k', logo: logo('skyrock.com') },
  funradio: { name: '🪩 Fun Radio', url: 'https://streamer-02.rtl.fr/fun-1-44-128', logo: logo('funradio.fr') },
  rtl: { name: '📰 RTL', url: 'https://streamer-02.rtl.fr/rtl-1-44-128', logo: logo('rtl.fr') },
  generations: { name: '🧢 Générations', url: 'http://generationfm.ice.infomaniak.ch/generationfm-high.mp3', logo: logo('generations.fr') },
  mouv: { name: '🎧 Mouv\'', url: 'https://icecast.radiofrance.fr/mouv-midfi.mp3', logo: logo('mouv.fr') },
  franceinter: { name: '🇫🇷 France Inter', url: 'https://icecast.radiofrance.fr/franceinter-midfi.mp3', logo: logo('franceinter.fr') },
  fip: { name: '🎷 FIP', url: 'https://icecast.radiofrance.fr/fip-midfi.mp3', logo: logo('fip.fr') },
  radiomeuh: { name: '🐮 Radio Meuh', url: 'https://radiomeuh.ice.infomaniak.ch/radiomeuh-128.mp3', logo: logo('radiomeuh.com') },
};
