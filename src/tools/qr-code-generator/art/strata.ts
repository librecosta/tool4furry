const sediments = ['#edd5c6', '#c88e77', '#dcad97', '#b98372', '#d9a48a', '#f0d5b9', '#c18a76', '#ae796f'];

export function bedding(x: number, y: number, seed: number) {
  const fault = x + 0.22 * y > 0.68 ? 0.19 : 0;
  return y + x * 0.34 + fault + 0.038 * Math.sin(6 * x + seed);
}

export function strataFrame(seed: number) {
  const tilt = Math.round(24 * Math.sin(seed));
  const layers = (offset: number) => sediments.map((fill, i) => {
    const top = -198 + i * 168 + offset;
    const rise = 305 + tilt;
    const seam = `M-20 ${top}L255 ${top - 24} 458 ${top - 143} 595 ${top - 174} 777 ${top - 255} 1020 ${top - rise}`;
    const seamBelow = `M-20 ${top + 17}L255 ${top - 7} 458 ${top - 126} 595 ${top - 157} 777 ${top - 238} 1020 ${top - rise + 17}`;
    return `<path fill="${fill}" d="${seam}V1000H-20Z"/><path d="${seam}" fill="none" stroke="#704f4a" stroke-opacity=".62" stroke-width="3"/><path d="${seamBelow}" fill="none" stroke="#fff0db" stroke-opacity=".61" stroke-width="3.5"/>`;
  }).join('');
  return '<defs><clipPath id="west"><path d="M0 0H770L691 206 725 328 551 662 576 754 434 1000H0Z"/></clipPath>' +
    '<clipPath id="east"><path d="M770 0H1000V1000H434L576 754 551 662 725 328 691 206Z"/></clipPath></defs>' +
    `<rect width="1000" height="1000" fill="#efcdb7"/><g clip-path="url(#west)">${layers(0)}</g><g clip-path="url(#east)">${layers(-132)}</g><path fill="none" stroke="#f7dfcb" stroke-width="11" d="M770 0L691 206 725 328 551 662 576 754 434 1000"/>`;
}
