import { isTerrainSeed } from './seed';
import { artStyleIds, errorCorrectionLevels, terrainIds, type QrRecipeV1 } from './types';

export type RecipeIssue =
  | 'structure' | 'version' | 'content' | 'terrain' | 'artwork' | 'revision' | 'seed' | 'errorCorrection'
  | 'shareLength' | 'base64url' | 'utf8' | 'json';

export class QrRecipeError extends Error {
  constructor(readonly code: RecipeIssue) {
    super(code);
    this.name = 'QrRecipeError';
  }
}

export function isQrContent(content: unknown): content is string {
  // With the Unicode flag a valid surrogate pair is read as a single code point.
  return typeof content === 'string' && content.length > 0 && !/[\uD800-\uDFFF]/u.test(content);
}

function readFields<const Key extends string>(value: unknown, keys: readonly Key[]): Record<Key, unknown> {
  if (typeof value !== 'object' || value === null) throw new QrRecipeError('structure');
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Reflect.ownKeys(value).length !== keys.length)
    throw new QrRecipeError('structure');
  const fields = {} as Record<Key, unknown>;
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property?.enumerable || !Object.hasOwn(property, 'value')) throw new QrRecipeError('structure');
    fields[key] = property.value;
  }
  return fields;
}

function hasValue<const T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some(candidate => candidate === value);
}

export function validateRecipe(input: unknown): QrRecipeV1 {
  // Report an unsupported wire version even if its field layout differs from V1.
  const version = typeof input === 'object' && input !== null
    ? Object.getOwnPropertyDescriptor(input, 'version') : undefined;
  if (version && Object.hasOwn(version, 'value') && version.value !== 1) throw new QrRecipeError('version');
  const { content, terrain, artwork, qr } = readFields(input, ['version', 'content', 'terrain', 'artwork', 'qr']);
  if (!isQrContent(content)) throw new QrRecipeError('content');
  const ground = readFields(terrain, ['id', 'revision', 'seed']);
  const art = readFields(artwork, ['id', 'revision']);
  const encoding = readFields(qr, ['errorCorrectionLevel']);
  if (!hasValue(terrainIds, ground.id)) throw new QrRecipeError('terrain');
  if (!hasValue(artStyleIds, art.id)) throw new QrRecipeError('artwork');
  if (ground.revision !== 1 || art.revision !== 1) throw new QrRecipeError('revision');
  if (!isTerrainSeed(ground.seed)) throw new QrRecipeError('seed');
  if (!hasValue(errorCorrectionLevels, encoding.errorCorrectionLevel)) throw new QrRecipeError('errorCorrection');
  return {
    version: 1,
    content,
    terrain: { id: ground.id, revision: 1, seed: ground.seed },
    artwork: { id: art.id, revision: 1 },
    qr: { errorCorrectionLevel: encoding.errorCorrectionLevel },
  };
}
