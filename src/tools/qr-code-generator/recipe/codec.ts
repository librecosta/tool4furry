import type { QrRecipeV1 } from './types';
import { QrRecipeError, validateRecipe } from './validate';

export const maxEncodedRecipeLength = 8192;

const base64Url = (binary: string) => btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');

export function encodeRecipe(recipe: QrRecipeV1): string {
  const validated = validateRecipe(recipe);
  if (validated.content.length > maxEncodedRecipeLength) throw new QrRecipeError('shareLength');
  const bytes = new TextEncoder().encode(JSON.stringify(validated));
  const length = Math.ceil(bytes.length * 4 / 3);
  if (length > maxEncodedRecipeLength) throw new QrRecipeError('shareLength');
  return base64Url(String.fromCharCode(...bytes));
}

export function decodeRecipe(encoded: string): QrRecipeV1 {
  if (typeof encoded !== 'string') throw new QrRecipeError('base64url');
  if (encoded.length > maxEncodedRecipeLength) throw new QrRecipeError('shareLength');
  if (!encoded || /[^A-Za-z0-9_-]/.test(encoded) || encoded.length % 4 === 1) throw new QrRecipeError('base64url');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  if (base64Url(binary) !== encoded) throw new QrRecipeError('base64url');
  let json: string;
  try {
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new QrRecipeError('utf8');
  }
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new QrRecipeError('json');
  }
  return validateRecipe(input);
}
