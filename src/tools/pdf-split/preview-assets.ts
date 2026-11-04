// PDF.js-owned data only. Vite emits local, hashed URLs in this lazy Draft graph;
// the factory fetches only the exact resource requested by the document worker.
const assets = {
  ...import.meta.glob<string>('../../../node_modules/pdfjs-dist/cmaps/*.bcmap', { eager: true, query: '?url&no-inline', import: 'default' }),
  ...import.meta.glob<string>('../../../node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}', { eager: true, query: '?url&no-inline', import: 'default' }),
  ...import.meta.glob<string>('../../../node_modules/pdfjs-dist/wasm/*.wasm', { eager: true, query: '?url&no-inline', import: 'default' }),
};
export class PdfBinaryData {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    const directory = ({ cMapUrl: 'cmaps', standardFontDataUrl: 'standard_fonts', wasmUrl: 'wasm' } as Record<string, string>)[kind];
    const path = `../../../node_modules/pdfjs-dist/${directory}/${filename}`;
    const url = assets[path];
    if (!directory || !url) throw new Error('Unsupported PDF resource');
    const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('Unable to load local PDF resource');
    return new Uint8Array(await response.arrayBuffer());
  }
}
