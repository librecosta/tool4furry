import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { decodeRecipe, encodeRecipe, maxEncodedRecipeLength } from '../src/tools/qr-code-generator/recipe/codec';
import { createDefaultRecipe } from '../src/tools/qr-code-generator/recipe/defaults';
import { deriveSeed } from '../src/tools/qr-code-generator/recipe/seed';
import { artStyleIds, terrainIds } from '../src/tools/qr-code-generator/recipe/types';
import { validateRecipe } from '../src/tools/qr-code-generator/recipe/validate';

const example = createDefaultRecipe();
const wire = (value: unknown) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

it('builds a fixed English example and validates all terrain/artwork combinations independently', () => {
  expect(example).toEqual({
    version: 1, content: 'https://example.com',
    terrain: { id: 'dunes', revision: 1, seed: 1428536480 },
    artwork: { id: 'aeolian', revision: 1 }, qr: { errorCorrectionLevel: 'M' },
  });
  for (const id of terrainIds) for (const art of artStyleIds) {
    const recipe = { ...example, terrain: { ...example.terrain, id }, artwork: { ...example.artwork, id: art } };
    expect(validateRecipe(recipe)).toEqual(recipe);
    expect(createDefaultRecipe()).toEqual(example);
  }
  for (const seed of [0, 0xffffffff]) {
    const modified = { ...example, terrain: { ...example.terrain, seed } };
    expect(decodeRecipe(encodeRecipe(modified))).toEqual(modified);
  }
});

it.each([
  ['https://example.com', 'dunes', 1, 1, 1428536480],
  ['https://例子.test/#中文', 'dunes', 1, 1, 2171149696],
  ['🦊🌍', 'valley', 1, 1, 3284492103],
  ['Hello 🌍'.repeat(400), 'highlands', 1, 1, 246403663],
  ['https://example.com', 'valley', 1, 1, 949357304],
  ['https://example.com', 'dunes', 2, 1, 1683855081],
  ['https://example.com', 'dunes', 1, 2, 2938988953],
] as const)('matches the independent UTF-8 seed vector for %s / %s / %i / %i', (content, id, revision, version, seed) => {
  expect(deriveSeed(content, id, revision, version)).toBe(seed);
});

describe('Recipe V1 validation', () => {
  it.each([
    [null, 'structure'], [[], 'structure'], [{ version: 2 }, 'version'],
    [{ ...example, version: '1' }, 'version'],
    [{ ...example, content: 42 }, 'content'],
    [{ ...example, content: '' }, 'content'],
    [{ ...example, content: '\ud800' }, 'content'],
    [{ ...example, terrain: { ...example.terrain, id: 'missing' } }, 'terrain'],
    [{ ...example, artwork: { ...example.artwork, id: 'missing' } }, 'artwork'],
    [{ ...example, terrain: { ...example.terrain, revision: 2 } }, 'revision'],
    [{ ...example, artwork: { ...example.artwork, revision: 0 } }, 'revision'],
    [{ ...example, qr: { errorCorrectionLevel: 'X' } }, 'errorCorrection'],
    [{ ...example, qr: {} }, 'structure'],
    [{ ...example, terrain: { id: 'dunes', seed: 1 } }, 'structure'],
  ])('rejects malformed input %# with the appropriate issue', (value, issue) => {
    expect(() => validateRecipe(value)).toThrow(issue);
  });

  it.each([-1, -0, 0x1_0000_0000, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '42'])('rejects seed %s', seed => {
    expect(() => validateRecipe({ ...example, terrain: { ...example.terrain, seed } })).toThrow('seed');
  });

  it('normalizes data without mutating, following inherited fields, or invoking an accessor', () => {
    const original = Object.freeze({ ...example, terrain: Object.freeze({ ...example.terrain }) });
    const validated = validateRecipe(original);
    expect(validated).toEqual(original);
    expect(validated.terrain).not.toBe(original.terrain);
    expect(() => validateRecipe(Object.create(original))).toThrow('structure');
    let read = false;
    const accessor = Object.defineProperty({ ...original }, 'content', { get() { read = true; return 'unexpected'; } });
    expect(() => validateRecipe(accessor)).toThrow('structure');
    expect(read).toBe(false);
  });
});

describe('share payload', () => {
  it('round-trips the exact text and saved seed in a compact canonical encoding', () => {
    const content = ' https://例子.test/🦊?q=%23&name=中文#原样 \r\n\u0000 ';
    const config = { ...example, content, terrain: { ...example.terrain, seed: 0xffffffff } };
    const alternateOrder = { qr: config.qr, content, terrain: config.terrain, artwork: config.artwork, version: 1 as const };
    const encoded = encodeRecipe(config);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).toBe(wire(config));
    expect(encodeRecipe(alternateOrder)).toBe(encoded);
    expect(decodeRecipe(encoded)).toEqual(config);
  });

  it.each(['', 'a', '_x', 'a===', 'e30=', 'e30\n', '/w', '+w'])('rejects invalid or noncanonical Base64URL %j', encoded => {
    expect(() => decodeRecipe(encoded)).toThrow('base64url');
  });

  it('rejects malformed UTF-8, invalid JSON, unknown versions and invalid nested fields', () => {
    expect(() => decodeRecipe('_w')).toThrow('utf8');
    expect(() => decodeRecipe(Buffer.from('{', 'utf8').toString('base64url'))).toThrow('json');
    expect(() => decodeRecipe(wire({ version: 15, payload: {} }))).toThrow('version');
    expect(() => decodeRecipe(wire({ ...example, artwork: { id: 'aeolian' } }))).toThrow('structure');
    expect(() => decodeRecipe(wire({ ...example, terrain: { ...example.terrain, revision: 2 } }))).toThrow('revision');
  });

  it('budgets the actual encoded bytes and rejects excess without truncation', () => {
    const empty = Buffer.byteLength(JSON.stringify({ ...example, content: '' }));
    const fill = 'x'.repeat(maxEncodedRecipeLength * 3 / 4 - empty);
    const encoded = encodeRecipe({ ...example, content: fill });
    expect(encoded).toHaveLength(maxEncodedRecipeLength);
    expect(decodeRecipe(encoded).content).toBe(fill);
    expect(() => encodeRecipe({ ...example, content: fill + 'x' })).toThrow('shareLength');
    expect(() => encodeRecipe({ ...example, content: '🦊'.repeat(2000) })).toThrow('shareLength');
    expect(() => decodeRecipe(encoded + 'x')).toThrow('shareLength');
  });

  it('rejects unexpected prototype-related fields and treats embedded code as plain text', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const payload = { ...example, [key]: { poisoned: true } };
      expect(() => decodeRecipe(wire(payload))).toThrow('structure');
    }
    expect(() => decodeRecipe(wire({ ...example, terrain: { ...example.terrain, ['__proto__']: {} } }))).toThrow('structure');
    expect(Object.hasOwn(Object.prototype, 'poisoned')).toBe(false);
    const content = 'javascript:globalThis.qrCodeProbeExecuted=true';
    expect(decodeRecipe(encodeRecipe({ ...example, content })).content).toBe(content);
    expect(Object.hasOwn(globalThis, 'qrCodeProbeExecuted')).toBe(false);
  });
});
