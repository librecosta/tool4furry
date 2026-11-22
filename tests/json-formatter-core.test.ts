// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  formatJson, jsonChildren, jsonIssue, jsonNode, jsonPath, maxJsonInput, parseJson,
  type JsonIssue, type JsonKind,
} from '../src/tools/json-formatter/core';
import { createJsonNamer, maxJsonFile, readJsonFile } from '../src/tools/json-formatter/delivery';

function diagnose(text: string): JsonIssue {
  try {
    parseJson(text);
  } catch (error) {
    return jsonIssue(error);
  }
  throw new Error('Invalid test input was accepted');
}

describe('strict JSON with preserved source ranges', () => {
  it.each<[string, JsonKind]>([
    ['{"x":0}', 'object'], ['[1,2]', 'array'], ['"你好 🐾"', 'string'],
    ['-0', 'number'], ['9007199254740993123456789', 'number'], ['1e+999', 'number'],
    ['true', 'boolean'], ['false', 'boolean'], ['null', 'null'], ['{}', 'object'], ['[]', 'array'],
  ])('accepts a root %s', (text, kind) => {
    const source = ' \r\n\t' + text + '\n';
    const document = parseJson(source);
    expect(document.source).toBe(source);
    expect(jsonNode(document, 0).kind).toBe(kind);
    expect(formatJson(source, 0)).toBe(text);
  });

  it('round-trips formatting with exact tokens, ordering, duplicate and special fields', () => {
    const tokens = String.raw`{"2":9007199254740993,"1":1e+20,"zero":-0,"decimal":1.000,"\u0061":"\u2603\/ a  b\n\t\\\"","a":"胡狼🐾","__proto__":{"constructor":[false,null]}}`;
    const formatted = [
      '{', '  "2": 9007199254740993,', '  "1": 1e+20,', '  "zero": -0,', '  "decimal": 1.000,',
      String.raw`  "\u0061": "\u2603\/ a  b\n\t\\\"",`, '  "a": "胡狼🐾",',
      '  "__proto__": {', '    "constructor": [', '      false,', '      null', '    ]', '  }', '}',
    ].join('\n');
    expect(formatJson(tokens, 2)).toBe(formatted);
    expect(formatJson(formatted, 0)).toBe(tokens);
    expect(formatJson(formatted, 2)).toBe(formatted);
    const wider = formatted.replace(/^ +/gm, spaces => spaces + spaces);
    expect(formatJson(tokens, 4)).toBe(wider);
    expect(formatJson(wider, 4)).toBe(wider);

    const doc = parseJson(tokens);
    const keys = jsonChildren(doc, 0, 0).map(node => doc.source.slice(...node.key!));
    expect(keys).toEqual(['"2"', '"1"', '"zero"', '"decimal"', '"\\u0061"', '"a"', '"__proto__"']);
    expect(jsonChildren(doc, 0, 0).slice(4, 6).map(node => jsonPath(doc, node.id))).toEqual(['$.a', '$.a']);
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
    expect(({} as { constructor: unknown }).constructor).toBe(Object);
  });

  it('handles large inputs and deep structure with a separate bound for formatted output', () => {
    const input = '['.repeat(10000) + '"'.padEnd(500004, 'a') + '"' + ']'.repeat(10000);
    expect(formatJson(input, 0)).toBe(input);
    const parsed = parseJson(input);
    expect(jsonPath(parsed, 10000)).toBe('$' + '[0]'.repeat(10000));
    expect(() => formatJson(input, 4)).toThrow('outputLimit');
    expect(diagnose(' '.repeat(maxJsonInput + 1))).toEqual({ code: 'inputLimit' });
    expect(diagnose('[' + '0,'.repeat(500_000) + '0]')).toEqual({ code: 'nodeLimit' });
  });

  it('pages child ranges while retaining indices and unambiguous paths', () => {
    const doc = parseJson('{"a.b":["x",{"a\\"b":true}],"a b":0,"":null}');
    const [array, space, empty] = jsonChildren(doc, 0, 0);
    const second = jsonChildren(doc, array.id, 0)[1];
    const child = jsonChildren(doc, second.id, 0)[0];
    expect(jsonPath(doc, child.id)).toBe('$["a.b"][1]["a\\"b"]');
    expect(jsonPath(doc, space.id)).toBe('$["a b"]');
    expect(jsonPath(doc, empty.id)).toBe('$[""]');
    const big = parseJson('[' + Array.from({ length: 101 }, (_, i) => i).join(',') + ']');
    expect(jsonNode(big, 0).count).toBe(101);
    expect(jsonChildren(big, 0, 40).map(node => node.index)).toEqual(Array.from({ length: 40 }, (_, i) => 40 + i));
    expect(jsonChildren(big, 0, 80)).toHaveLength(21);
  });

  it.each([
    ['{\n  "a": 1,\n}', 'trailingComma', 12, 3, 1],
    ['[1,]', 'trailingComma', 3, 1, 4],
    ['{\r\n "a" 1}', 'expectedColon', 8, 2, 6],
    ['[1 2]', 'expectedComma', 3, 1, 4],
    ['"abc', 'unclosedString', 4, 1, 5],
    ['"\\x"', 'invalidEscape', 2, 1, 3],
    ['"\\uXYZ0"', 'invalidEscape', 2, 1, 3],
    ['"a\n"', 'controlCharacter', 2, 1, 3],
    ['"\ud800"', 'invalidUnicode', 1, 1, 2],
    ['01', 'invalidNumber', 1, 1, 2],
    ['-]', 'invalidNumber', 0, 1, 1],
    ['[1e+]', 'invalidNumber', 2, 1, 3],
    ['{\n', 'unclosedObject', 2, 2, 1],
    ['[ 1', 'unclosedArray', 3, 1, 4],
    ['null 0', 'extraContent', 5, 1, 6],
    ['true //test', 'comment', 5, 1, 6],
    ['{/*bad*/"a":1}', 'comment', 1, 1, 2],
    ['{"🐾":}', 'expectedValue', 6, 1, 7],
    ['\t\n', 'empty', 2, 2, 1],
  ])('diagnoses %j at its actual UTF-16 position', (text, code, offset, line, column) => {
    expect(diagnose(text)).toEqual({ code, offset, line, column });
  });
});

describe('JSON file delivery', () => {
  it('handles UTF-8 BOM, CRLF and case-insensitive JSON filenames', async () => {
    const file = new File(['\uFEFF{\r\n"x":"你好 🐾"\r\n}'], 'sample.JSON');
    await expect(readJsonFile(file)).resolves.toBe('{\n"x":"你好 🐾"\n}');
    await expect(readJsonFile(new File([new Uint8Array([0xff])], 'bad.json'))).rejects.toThrow(/UTF-8/);
    await expect(readJsonFile(new File(['null'], 'wrong.txt'))).rejects.toThrow(/\.json/);
    const arrayBuffer = vi.fn();
    await expect(readJsonFile({ name: 'large.json', size: maxJsonFile + 1, arrayBuffer } as unknown as File))
      .rejects.toThrow('32 MiB');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('generates safe distinct filenames even in one millisecond or after the clock goes backwards', () => {
    const name = createJsonNamer();
    const date = new Date(2026, 10, 22, 17, 30, 0, 123);
    expect(name(' ..sample?: .json', 'formatted', date)).toBe('sample---formatted-20261122-173000-123.json');
    expect(name(' ..sample?: .json', 'formatted', date)).toBe('sample---formatted-20261122-173000-124.json');
    expect(name('nul.JSON', 'minified', new Date(0))).toBe('json-minified-20261122-173000-125.json');
    expect(new TextEncoder().encode(name('🐾'.repeat(200) + '.json', 'minified', date)).length).toBeLessThan(180);
  });
});
