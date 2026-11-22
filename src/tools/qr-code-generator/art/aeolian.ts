const sandLayers = ['#e9d2b3', '#ddba92', '#d2a87f', '#c69a71', '#b78960'];

export function windPhase(x: number, y: number, seed: number) {
  return 3.1 * y + 0.65 * x + 0.38 * Math.sin(2.8 * x + seed) + 0.17 * Math.sin(5 * y - 3 * x);
}

export function aeolianFrame(seed: number) {
  const forms = sandLayers.map((fill, i) => {
    const height = 666 + i * 66;
    const drift = Math.round(38 * Math.sin(seed + i * 0.42));
    return `<path fill="${fill}" d="M0 ${height}C260 ${height - 126 + drift} 470 ${height + 134} 720 ${height + 2}S920 ${height - 131} 1000 ${height - 145}V1000H0Z"/>`;
  }).join('');
  let ripples = '';
  for (let i = -9; i < 54; i++) {
    const y = i * 24;
    const drift = Math.round(20 * Math.sin(i * 0.37 + seed));
    ripples += `M-10 ${y + 85}C198 ${y + 15 - drift} 262 ${y - 64} 440 ${y - 6}S756 ${y + 104 + drift} 1010 ${y - 46}`;
  }
  let grain = '';
  for (let i = 0; i < 184; i++) {
    const key = Math.imul(i + Math.floor(seed * 1000), 0x9e3779b1);
    const x = (key >>> 0) % 1000;
    const y = ((key ^ key >>> 16) >>> 0) % 1000;
    grain += `M${x} ${y}h${1 + (key & 3)}`;
  }
  return `<rect width="1000" height="1000" fill="#eedbc4"/><path fill="#dfbd97" d="M0 0H1000V166C730 195 627 32 370 120S122 250 0 201Z"/>${forms}<path d="${ripples}" fill="none" stroke="#92613e" stroke-opacity=".34" stroke-width="1.9"/><path d="${grain}" stroke="#815638" stroke-opacity=".32" stroke-width="1.6"/>`;
}
