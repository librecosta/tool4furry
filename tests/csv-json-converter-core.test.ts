import { describe, expect, it } from 'vitest';
import { convertTable, inferCell } from '../src/tools/csv-json-converter/core';
import { createDownloadNamer } from '../src/tools/csv-json-converter/delivery';
import { CsvRecords, detectDelimiter } from '../src/tools/csv-json-converter/csv';
import { OutputBuffer } from '../src/tools/csv-json-converter/output';
import { chunkSize, csvDefaults, jsonDefaults, outputLimit, utf8, type CsvSettings, type JsonSettings } from '../src/tools/csv-json-converter/settings';

const csv = (text: string | File, settings: Partial<CsvSettings> = {}) =>
  convertTable(text, { direction: 'csv-json', settings: { ...csvDefaults, ...settings } });
const json = (text: string | File, settings: Partial<JsonSettings> = {}) =>
  convertTable(text, { direction: 'json-csv', settings: { ...jsonDefaults, ...settings } });
const blobText = async (blob: Blob) => utf8().decode(await blob.arrayBuffer());

describe('CSV → JSON fidelity', () => {
  it.each([',', ';', '\t', '|'] as const)('detects %j and preserves quoting, UTF-8 and trailing fields', async delimiter => {
    const { result, table } = await csv('\uFEFF' + ['name', 'note', 'id'].join(delimiter) + '\r\n' +
      ['"银河🌌' + delimiter + '星"', '"line 1\r\nline ""2""\rline 3\nline 4"', ''].join(delimiter) + '\n');
    expect(result.delimiter).toBe(delimiter);
    expect(JSON.parse(result.preview.text)).toEqual([{ name: '银河🌌' + delimiter + '星', note: 'line 1\r\nline "2"\rline 3\nline 4', id: '' }]);
    expect(await table.cell(0, 1)).toBe('line 1\r\nline "2"\rline 3\nline 4');
  });

  it('separates blank records, blank fields and a final record separator', async () => {
    const { result } = await csv('header\r\nfirst\n\n \r""\n', { shape: 'arrays' });
    expect(JSON.parse(result.preview.text)).toEqual([['first'], [''], [' '], ['']]);
    await expect(csv('a,b\n\nlast,field')).rejects.toThrow('Record 2');
  });

  it('reports ambiguous autodetection, malformed quotes, field count and headers', async () => {
    expect(() => detectDelimiter('a,b|c\n1,2|3', true)).toThrow('manually');
    await expect(csv('a,b\n"bad" cells,b')).rejects.toThrow('quoting');
    await expect(csv('a,a\n1,2')).rejects.toThrow('unique');
    await expect(csv('a, \n1,2')).rejects.toThrow('nonempty');
    await expect(csv('a,b\n1')).rejects.toThrow('Record 2');
    expect((await csv('a,a\n1,2', { shape: 'arrays', indent: 0 })).result.preview.text).toBe('[["1","2"]]');
  });

  it('retains header-free records and uses deterministic column names', async () => {
    expect(JSON.parse((await csv('001,true\n002,', { header: false, infer: true, emptyNull: true })).result.preview.text))
      .toEqual([{ column_1: '001', column_2: true }, { column_1: '002', column_2: null }]);
    expect(JSON.parse((await csv('a,b\n1,2', { header: false, shape: 'arrays' })).result.preview.text))
      .toEqual([['a', 'b'], ['1', '2']]);
  });

  it.each([
    ['1.2500', 1.25], ['-1', -1], ['9007199254740991', 9007199254740991], ['false', false],
    ['001', '001'], ['9007199254740993', '9007199254740993'], ['1.234567890123456789', '1.234567890123456789'],
    ['1e+100', '1e+100'], ['TRUE', 'TRUE'], ['2026-01-01', '2026-01-01'], ['+12345', '+12345'],
    [' 42 ', ' 42 '], ['-0', '-0'], ['0.0000001', '0.0000001'],
  ])('only infers conservative scalars from %j', (input, expected) => {
    expect(inferCell(input, true, false)).toBe(expected);
    expect(inferCell(input, false, false)).toBe(input);
  });

  it('preserves quote escaping and CRLF when every character arrives separately', () => {
    const actual: string[][] = [];
    const scan = new CsvRecords(',', rows => actual.push(...rows));
    for (const char of 'A,B\r\n"\r\n""foo",x\r\nhello,') scan.push(char);
    scan.finish();
    expect(actual).toEqual([['A', 'B'], ['\r\n"foo', 'x'], ['hello', '']]);
  });

  it('validates UTF-8 across file chunks without removing a later U+FEFF field', async () => {
    const input = 'name,value\n' + 'a'.repeat(chunkSize - 12) + '🌌,value\r\n\uFEFFfield,ok';
    const { table, result } = await csv(new File([input], 'samples.csv'));
    expect(result.preview.partial).toBe(true);
    expect(await table.cell(0, 0)).toMatch(/🌌$/u);
    expect(await table.cell(1, 0)).toBe('\uFEFFfield');
    await expect(csv(new File([new Uint8Array([0x61, 0x2c, 0x80])], 'broken.csv'))).rejects.toThrow('valid UTF-8');
  });
});

describe('JSON → CSV fidelity', () => {
  it('preserves numeric lexemes, nesting, field order and special property names', async () => {
    const { result, table } = await json('[{"10":9007199254740993,"2":123.4500,"__proto__":{"n":1.234567890123456789}},' +
      '{"constructor":[1e+100,null],"2":null}]');
    expect(result.preview.text).toBe('10,2,__proto__,constructor\r\n9007199254740993,123.4500,"{""n"":1.234567890123456789}",\r\n,,,"[1e+100,null]"');
    expect(await table.cell(0, 0)).toBe('9007199254740993');
    expect(await table.cell(1, 3)).toBe('[1e+100,null]');
  });

  it('flattens objects, keeps arrays as a single cell and rejects path collisions', async () => {
    const { result } = await json('{"profile":{"country":"China","roles":[1.20,2]},"other":{}}', { flatten: true });
    expect(result.preview.text).toBe('profile.country,profile.roles,other\r\nChina,"[1.20,2]",{}');
    await expect(json('[{"a":{"b":1}},{"a.b":2}]', { flatten: true })).rejects.toThrow('collision');
    await expect(json('{"a":{"b":1},"a.b":2}', { flatten: true })).rejects.toThrow('collision');
  });

  it('rejects duplicate names throughout the document, including escaped keys', async () => {
    await expect(json('{"x":[{"a":1,"\\u0061":2}]}')).rejects.toThrow('Duplicate JSON property');
    await expect(json('{"x":"\\ud800"}')).rejects.toThrow('surrogate');
    await expect(json('[{},[]]')).rejects.toThrow('rectangular');
    await expect(json('[[1,2],[3]]')).rejects.toThrow('Record 2');
  });

  it('applies protection to both headers and data before producing preview and download', async () => {
    const source = '[{"=header":" =A1","plain":"\u0009-2","cr":"\\rstart","negative":-2}]'
      .replace('\t', '\\t');
    const { result, table } = await json(source, { escapeFormulae: true, bom: true, delimiter: '\t', newline: '\n' });
    expect(await blobText(result.blob)).toBe(result.preview.text);
    expect(result.blob.type).toBe('text/tab-separated-values;charset=utf-8');
    expect(result.preview.text.startsWith("\uFEFF'=header\tplain\tcr\tnegative\n")).toBe(true);
    expect((await table.page(0, 50, 0, 48)).rows).toEqual([["' =A1", "'\t-2", "'\rstart", "'-2"]]);
    expect(await (await json(source)).table.cell(0, 3)).toBe('-2');
  });

  it('handles headerless TSV, leading BOM-as-data and single empty records', async () => {
    const output = await json('[[null],[""],["\\uFEFFfield"]]', { header: false, delimiter: '\t' });
    const bytes = await blobText(output.result.blob);
    expect(bytes).toBe('""\r\n""\r\n"\uFEFFfield"');
    expect(JSON.parse((await csv(bytes, { header: false, shape: 'arrays', delimiter: '\t' })).result.preview.text))
      .toEqual([[''], [''], ['\uFEFFfield']]);
    expect((await json('[[1,2]]')).result.preview.text).toBe('column_1,column_2\r\n1,2');
  });
});

describe('bounded delivery', () => {
  it('uses local click times and a deterministic sequence for repeated milliseconds', () => {
    const name = createDownloadNamer();
    const first = new Date(2026, 10, 26, 22, 55, 30, 128);
    const next = new Date(2026, 10, 26, 22, 55, 32, 315);
    expect(name('', 'JSON', first)).toBe('converted-20261126-225530-128.json');
    expect(name('', 'JSON', first)).toBe('converted-20261126-225530-128-2.json');
    expect(name('', 'CSV', next)).toBe('converted-20261126-225532-315.csv');
    expect(name('', 'JSON', first)).toBe('converted-20261126-225530-128-3.json');
  });

  it('preserves safe Unicode stems and chooses the actual output extension', () => {
    const name = createDownloadNamer();
    const now = new Date(2026, 10, 26, 22, 55, 38, 512);
    expect(name('用户🌌.v1.JSON', 'TSV', now)).toBe('用户🌌.v1-20261126-225538-512.tsv');
    expect(name('用/户?:表.CSV', 'JSON', now)).toBe('用-户--表-20261126-225538-512-2.json');
    expect(name('CON.backup.TSV', 'CSV', now)).toBe('_CON.backup-20261126-225538-512-3.csv');
    expect(name('...CSV', 'JSON', now)).toBe('converted-20261126-225538-512-4.json');
    expect(name('🌌'.repeat(50) + '.csv', 'JSON', now)).toBe('🌌'.repeat(40) + '-20261126-225538-512-5.json');
  });

  it('serves later row and column pages from the final output', async () => {
    const input = Array.from({ length: 105 }, (_, row) =>
      Array.from({ length: 120 }, (_, col) => row + '-' + col).join(',')).join('\n');
    const { table, result } = await csv(input, { header: false, shape: 'arrays', indent: 0 });
    expect(result).toMatchObject({ records: 105, columns: 120, inputLines: 105 });
    const page = await table.page(100, 50, 96, 48);
    expect(page.headers).toHaveLength(24);
    expect(page.rows).toHaveLength(5);
    expect(page.rows[0][0]).toBe('100-96');
    expect(await table.cell(104, 119)).toBe('104-119');
  });

  it('enforces the real UTF-8 byte budget before writing the next block', () => {
    const writer = new OutputBuffer();
    writer.bytes = outputLimit - 3;
    expect(() => writer.append('🌌')).toThrow('64 MiB');
  });
});
