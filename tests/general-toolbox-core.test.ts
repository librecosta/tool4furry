// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { zipSync, strToU8, unzipSync } from 'fflate';
import jsQR from 'jsqr';
import { cleanText, defaults, textStats } from '../src/tools/text-cleaner/core';
import { compareLines } from '../src/tools/text-diff/core';
import { diffReport } from '../src/tools/text-diff/report';
import { formatJson } from '../src/tools/json-formatter/core';
import { transformEncoding } from '../src/tools/url-base64/core';
import { fromIso, fromTimestamp } from '../src/tools/timestamp-converter/core';
import {
  parseColor,
  colorValues,
  contrast,
} from '../src/tools/color-contrast/core';
import {
  convertSubtitles,
  parseSubtitles,
} from '../src/tools/subtitle-tools/core';
import {
  pageRange,
  mergePdfs,
  extractPdf,
  readPdf,
} from '../src/tools/general/pdf';
import {
  createZip,
  inspectZip,
  extractZip,
  safePath,
} from '../src/tools/zip-manager/core';
import { renamePlan, defaultRules } from '../src/tools/batch-file-renamer/core';
import { compareHash } from '../src/tools/file-hash/core';
import { createHashEngine } from '../src/tools/file-hash/engine';
import { qrMatrix, qrSvg } from '../src/tools/qr-code-generator/core';
import { audioRange, encodeWav } from '../src/tools/audio-trimmer/core';
describe('general toolbox text and data', () => {
  it('cleans lines without destroying indentation and counts basic editor text', () => {
    expect(cleanText(' 你好 \r\n\r\n\r\n world \r\n', defaults)).toBe(
      ' 你好\n\n world\n',
    );
    expect(
      cleanText(' a \r\n\r\n', {
        trimEnd: true,
        trimStart: true,
        lineEnding: 'crlf',
        blankLines: 'keep',
      }),
    ).toBe('a\r\n\r\n');
    expect(textStats('你好 world')).toMatchObject({
      characters: 8,
      lines: 1,
    });
  });
  it('retains large JSON numbers, whitespace in strings and validates nesting', () => {
    const input = '{"n":90071992547409931234,"s":"a  b","a":[]}';
    expect(formatJson(input, 0)).toBe(input);
    expect(formatJson(input, 4)).toContain('    "n": 90071992547409931234');
    expect(() => formatJson('{bad}', 2)).toThrow();
    expect(() =>
      formatJson('['.repeat(129) + '0' + ']'.repeat(129), 0),
    ).toThrow();
  });
  it('round trips Unicode encodings and rejects malformed UTF-8 or Base64', () => {
    for (const value of ['你好 🦊', 'a+b /?=']) {
      expect(
        transformEncoding(
          transformEncoding(value, 'base64-encode'),
          'base64-decode',
        ),
      ).toBe(value);
      expect(
        transformEncoding(transformEncoding(value, 'url-encode'), 'url-decode'),
      ).toBe(value);
    }
    for (const value of ['abc', '!!!!', '/w==', 'Zh=='])
      expect(() => transformEncoding(value, 'base64-decode')).toThrow();
    expect(() => transformEncoding('%ZZ', 'url-decode')).toThrow();
  });
  it('uses explicit timestamp units, timezone and valid calendar dates', () => {
    expect(fromTimestamp('1000', 'seconds')).toBe(1_000_000);
    expect(fromTimestamp('1000', 'milliseconds')).toBe(1000);
    expect(fromIso('2026-11-03T08:00:00+08:00')).toBe(
      Date.parse('2026-11-03T00:00:00Z'),
    );
    for (const v of [
      '2026-02-30T00:00:00Z',
      '2026-01-01T00:00:00',
      '2026-01-01T24:00:00Z',
    ])
      expect(() => fromIso(v)).toThrow();
  });
  it('reports line edits and trailing whitespace option', () => {
    expect(compareLines('one\ntwo\n', 'one\nthree\n', false)).toMatchObject({
      added: 1,
      removed: 1,
    });
    expect(compareLines('a  \r\n', 'a\n', true)).toMatchObject({
      added: 0,
      removed: 0,
    });
    const result = compareLines('before', 'after', false);
    expect(result.lines.map(line => [line.type, line.oldNumber, line.newNumber, line.text])).toEqual([
      ['removed', 1, undefined, 'before'], ['added', undefined, 1, 'after'],
    ]);
    expect(diffReport(result)).toContain('1\t\t−\tbefore\n\t1\t+\tafter');
  });
  it('converts opaque colors and exact WCAG values', () => {
    expect(parseColor('hsl(120,100%,50%)')).toEqual([0, 255, 0]);
    expect(colorValues(parseColor('rgb(255,0,0)')).hex).toBe('#FF0000');
    expect(contrast([0, 0, 0], [255, 255, 255])).toBe(21);
    expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.478, 3);
    expect(() => parseColor('rgb(300,0,0)')).toThrow();
  });
  it('preserves multiline subtitle text and validates shifts', () => {
    const input =
      '1\n00:00:01,000 --> 00:00:02,500\n你好\nworld\n\n2\n00:00:03,000 --> 00:00:04,000\nEnd';
    const vtt = convertSubtitles(input, 'vtt', '250');
    expect(vtt.text).toContain('00:00:01.250 --> 00:00:02.750\n你好\nworld');
    expect(
      parseSubtitles(convertSubtitles(vtt.text, 'srt', '-250').text).cues,
    ).toHaveLength(2);
    expect(() => convertSubtitles(input, 'vtt', '-1001')).toThrow();
    expect(() =>
      parseSubtitles('1\n00:00:65,000 --> 00:01:05,000\nBad'),
    ).toThrow();
  });
});
describe('actual document and archive contents', () => {
  async function pdfFile(name: string, sizes: number[]) {
    const d = await PDFDocument.create();
    for (const size of sizes) d.addPage([size, 200]);
    return new File([(await d.save()) as Uint8Array<ArrayBuffer>], name, {
      type: 'application/pdf',
    });
  }
  it('merges and splits real pages in exact order', async () => {
    const a = await pdfFile('a.pdf', [100, 120]),
      b = await pdfFile('b.pdf', [150]);
    const merged = await mergePdfs([b, a]);
    expect(merged.type).toBe('application/pdf');
    const doc = await PDFDocument.load(await merged.arrayBuffer());
    expect(doc.getPages().map((p) => p.getWidth())).toEqual([150, 100, 120]);
    const extracted = await extractPdf(doc, pageRange('3,1', 3));
    expect(
      (await PDFDocument.load(await extracted.arrayBuffer()))
        .getPages()
        .map((p) => p.getWidth()),
    ).toEqual([120, 150]);
    await expect(readPdf(new File(['bad'], 'bad.pdf'))).rejects.toThrow();
    for (const range of ['0', '2-1', '1,1', '4', '1-a', ''])
      expect(() => pageRange(range, 3)).toThrow();
  });
  it('preserves UTF-8 paths and exact bytes through ZIP creation/extraction', async () => {
    const original = new Uint8Array([0, 255, 42, 7]),
      blob = await createZip([
        { name: '作品/page-01.bin', blob: new Blob([original]) },
        { name: 'folder/empty.txt', blob: new Blob() },
      ]);
    const items = await inspectZip(blob);
    expect(items.map((i) => i.name)).toEqual([
      '作品/page-01.bin',
      'folder/empty.txt',
    ]);
    const entries = await extractZip(blob, items, [items[0].name]);
    expect(new Uint8Array(await entries[0].blob.arrayBuffer())).toEqual(
      original,
    );
    expect(
      unzipSync(new Uint8Array(await blob.arrayBuffer()))['作品/page-01.bin'],
    ).toEqual(original);
  });
  it('extracts deflated ZIPs, rejects traversal, CRC damage, encryption and bombs', async () => {
    await expect(
      inspectZip(new Blob([zipSync({}) as Uint8Array<ArrayBuffer>])),
    ).resolves.toEqual([]);
    const valid = new Blob([
      zipSync({
        'ok.txt': strToU8('hello '.repeat(10)),
      }) as Uint8Array<ArrayBuffer>,
    ]);
    expect(
      new TextDecoder().decode(
        await (
          await extractZip(valid, await inspectZip(valid), ['ok.txt'])
        )[0].blob.arrayBuffer(),
      ),
    ).toBe('hello '.repeat(10));
    for (const name of ['../bad', '/absolute', 'C:/bad', 'folder/CON', 'a\\b'])
      expect(() => safePath(name)).toThrow();
    const badPath = new Blob([
      zipSync({ '../evil': strToU8('x') }) as Uint8Array<ArrayBuffer>,
    ]);
    await expect(inspectZip(badPath)).rejects.toThrow();
    const bomb = new Blob([
      zipSync({
        bomb: new Uint8Array(2 * 1024 ** 2),
      }) as Uint8Array<ArrayBuffer>,
    ]);
    await expect(inspectZip(bomb)).rejects.toThrow();
    const bytes = new Uint8Array(await valid.arrayBuffer());
    const listed = await inspectZip(valid);
    const encrypted = new Uint8Array(await valid.arrayBuffer());
    const encryptedView = new DataView(encrypted.buffer);
    const central = encryptedView.getUint32(encrypted.length - 22 + 16, true);
    encrypted[6] |= 1;
    encrypted[central + 8] |= 1;
    await expect(inspectZip(new Blob([encrypted]))).rejects.toThrow();
    bytes[30 + 'ok.txt'.length] ^= 1;
    await expect(
      extractZip(new Blob([bytes]), listed, ['ok.txt']),
    ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      createZip([{ name: 'ok', blob: new Blob(['x']) }], controller.signal),
    ).rejects.toThrow();
  });
  it('renames safely without re-encoding and rejects duplicates', () => {
    expect(
      renamePlan(['a.jpg', 'b.png'], { ...defaultRules, name: '作品' }).map(
        (i) => i.name,
      ),
    ).toEqual(['作品-001.jpg', '作品-002.png']);
    expect(() =>
      renamePlan(['same.txt', 'same.txt'], {
        ...defaultRules,
        sequence: false,
      }),
    ).toThrow();
    expect(() =>
      renamePlan(['a'], { ...defaultRules, name: '../' }),
    ).toThrow();
  });
  it('computes a known SHA-256 and validates comparisons', async () => {
    const value = await createHashEngine()(new Blob(['abc']), 'sha256');
    expect(value).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(compareHash(value, value.toUpperCase(), 'sha256')).toBe(true);
    expect(() => compareHash(value, 'xyz', 'sha256')).toThrow();
    // Former 32 MiB rejection is replaced by bounded-read tests in file-hash-core.test.ts.
  });
  it('generates an independently decodable Unicode QR matrix and safe SVG', () => {
    const text = 'Tool4Furry 你好 https://tool4furry.com',
      matrix = qrMatrix(text),
      scale = 6,
      size = (matrix.size + 8) * scale,
      data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < matrix.size; y++)
      for (let x = 0; x < matrix.size; x++)
        if (matrix.get(y, x))
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const at =
                (((y + 4) * scale + dy) * size + (x + 4) * scale + dx) * 4;
              data[at] = data[at + 1] = data[at + 2] = 0;
            }
    expect(jsQR(data, size, size)?.data).toBe(text);
    expect(qrSvg(text, 512, '#000000', '#ffffff').svg).toContain(
      'shape-rendering="crispEdges"',
    );
    expect(() => qrSvg(text, 10, '#000000', '#ffffff')).toThrow();
  });
  it('writes actual stereo PCM WAV frames with correct headers and range', () => {
    const bytes = encodeWav(
        [new Float32Array([-1, 0, 0.5, 1]), new Float32Array([1, 0.5, 0, -1])],
        8000,
        1,
        4,
      ),
      d = new DataView(bytes);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WAVE');
    expect(d.getUint32(4, true) + 8).toBe(bytes.byteLength);
    expect(d.getUint16(20, true)).toBe(1);
    expect(d.getUint16(22, true)).toBe(2);
    expect(d.getUint32(40, true)).toBe(12);
    expect(d.getInt16(44, true)).toBe(0);
    expect(d.getInt16(46, true)).toBe(16384);
    expect(audioRange('0', '1.5', 2)).toEqual([0, 1.5]);
    expect(() => audioRange('1', '0', 2)).toThrow();
    expect(() => encodeWav([new Float32Array(1)], 8000, 0, 0)).toThrow();
  });
});
