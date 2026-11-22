type Point = { x: number; y: number; z: number };
const elevations = [0.20, 0.31, 0.42, 0.53, 0.64, 0.75, 0.86];
const colors = ['#dfe8d3', '#d4e1c9', '#c8d9bf', '#bbcfaf', '#afc3a2', '#a1b795', '#93aa87'];

export function elevation(x: number, y: number, seed: number) {
  const ridge = (cx: number, cy: number, a: number, b: number) => {
    const dx = x - cx;
    const dy = y - cy;
    return Math.exp(-(a * (dx + 0.4 * dy) ** 2 + b * (dy - 0.2 * dx) ** 2));
  };
  return 0.94 * ridge(0.18 + 0.055 * Math.cos(seed), 0.21, 15, 29) +
    0.80 * ridge(0.83, 0.71 + 0.10 * Math.sin(seed), 22, 12) +
    0.58 * ridge(0.38, 0.91, 25, 55) + 0.39 * ridge(0.80, 0.05, 30, 28) -
    0.11 * ridge(0.56, 0.48, 40, 26);
}

const point = ({ x, y }: Point) => `${Math.round(x * 1000)} ${Math.round(y * 1000)}`;
const intersect = (a: Point, b: Point, z: number): Point => {
  const t = (z - a.z) / (b.z - a.z);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z };
};

export function contourFrame(seed: number) {
  const count = 24;
  const nodes = Array.from({ length: count + 1 }, (_, row) =>
    Array.from({ length: count + 1 }, (_, col) => {
      const x = col / count;
      const y = row / count;
      return { x, y, z: elevation(x, y, seed) };
    }));

  return '<rect width="1000" height="1000" fill="#e8eddf"/>' +
    elevations.map((level, band) => {
      let area = '';
      let line = '';
      for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
          const [a, b, c, d] = [nodes[y][x], nodes[y][x + 1], nodes[y + 1][x + 1], nodes[y + 1][x]];
          for (const triangle of [[a, b, c], [a, c, d]]) {
            const above: Point[] = [];
            const crossings: Point[] = [];
            for (let i = 0; i < 3; i++) {
              const from = triangle[i];
              const to = triangle[(i + 1) % 3];
              if (from.z >= level) above.push(from);
              if ((from.z >= level) !== (to.z >= level)) {
                const crossing = intersect(from, to, level);
                above.push(crossing);
                crossings.push(crossing);
              }
            }
            if (above.length >= 3) area += `M${above.map(point).join('L')}Z`;
            if (crossings.length === 2) line += `M${crossings.map(point).join('L')}`;
          }
        }
      }
      return `<path fill="${colors[band]}" d="${area}"/><path fill="none" stroke="#688268" stroke-opacity="${band % 3 === 0 ? '.78' : '.48'}" stroke-width="${band % 3 === 0 ? 4 : 2}" stroke-linecap="round" d="${line}"/>`;
    }).join('');
}
