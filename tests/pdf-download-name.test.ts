import { expect, it } from 'vitest';
import { createPdfDownloadNamer } from '../src/tools/general/pdf-download-name';

const local = new Date(2026, 10, 4, 20, 47, 12, 123);
it('uses local date/time with milliseconds and handles repeated downloads in the same millisecond', () => {
  const name = createPdfDownloadNamer();
  expect(name('merged', '', local)).toBe('merged-20261104-204712-123.pdf');
  expect(name('merged', '', local)).toBe('merged-20261104-204712-123-2.pdf');
  expect(name('merged', '', local)).toBe('merged-20261104-204712-123-3.pdf');
  expect(name('merged', '', new Date(2026, 10, 4, 20, 47, 12, 124))).toBe('merged-20261104-204712-124.pdf');
});
it.each([
  ['document.pdf', 'document'], ['我的文档.PDF', '我的文档'], ['report.final.v2.pdf', 'report.final.v2'],
  ['插画🐾.pdf', '插画🐾'], ['../a\\b:<c>|?*\u0000\u0085.Pdf', 'abc'], [' .pdf', 'document'], ['...pdf', 'document'],
])('sanitizes the source stem %s while preserving reasonable Unicode', (source, stem) => {
  expect(createPdfDownloadNamer()('extracted', source, local)).toBe(`${stem}-extracted-20261104-204712-123.pdf`);
  expect(createPdfDownloadNamer()('pages', source, local)).toBe(`${stem}-pages-20261104-204712-123.zip`);
});
it('bounds long Unicode names without splitting code points or duplicating the final extension', () => {
  for (const source of ['汉'.repeat(400) + '.pdf', '🐾'.repeat(200) + '.PDF', 'a'.repeat(400) + '.pdf']) {
    const result = createPdfDownloadNamer()('extracted', source, local);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(200);
    expect(result.endsWith('-extracted-20261104-204712-123.pdf')).toBe(true);
    expect(result).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    expect(result.match(/\.pdf/gi)).toHaveLength(1);
  }
});
