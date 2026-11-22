import { boundedText, fail } from '../general/bounds';
import { createQrMatrix, encodeQrModules, QrMatrixError } from './matrix/qr-matrix';
import { generateVerifiedQr } from './art/export';
import { QrDensityError, renderQrSvg } from './art/render';
import type { QrRecipeV1 } from './recipe/types';

function requireContent(text: string) {
  boundedText(text, 2000);
  if (!text.trim()) fail('请输入二维码内容。', 'Enter QR code content.');
}

function encode<T>(text: string, create: () => T): T {
  requireContent(text);
  try {
    return create();
  } catch (error) {
    if (error instanceof QrMatrixError) {
      if (error.code === 'capacity') fail('内容超出二维码容量。', 'Content exceeds QR code capacity.');
      if (error.code === 'content') fail('请输入有效的二维码文本。', 'Enter valid QR code text.');
      if (error.code === 'functionalMask') fail('二维码功能模块无法验证。', 'QR functional modules could not be verified.');
    }
    throw error;
  }
}

export function qrMatrix(text: string) {
  return encode(text, () => encodeQrModules(text, 'M'));
}

export function createWorkspaceMatrix(recipe: Pick<QrRecipeV1, 'content' | 'qr'>) {
  return encode(recipe.content, () => createQrMatrix(recipe));
}

const standardConfig = (content: string) => ({ content, qr: { errorCorrectionLevel: 'M' as const } });

export function qrSvg(
  text: string,
  size: number,
  foreground: string,
  background: string,
) {
  if (
    !Number.isInteger(size) ||
    size < 128 ||
    size > 2048 ||
    !/^#[a-f\d]{6}$/i.test(foreground) ||
    !/^#[a-f\d]{6}$/i.test(background)
  )
    fail(
      '尺寸须为 128–2048，颜色须为六位 HEX。',
      'Size must be 128–2048; colors must use six-digit HEX.',
    );
  const matrix = createWorkspaceMatrix(standardConfig(text));
  try {
    return { matrix, svg: renderQrSvg(matrix, size, { kind: 'standard', colors: { dark: foreground, light: background } }).svg };
  } catch (error) {
    if (error instanceof QrDensityError) fail('内容较多，请增加输出尺寸。', 'Increase output size for this amount of content.');
    throw error;
  }
}
export async function qrPng(
  text: string,
  size: number,
  foreground: string,
  background: string,
) {
  const matrix = createWorkspaceMatrix(standardConfig(text));
  const { png, svg } = await generateVerifiedQr(matrix, text, size,
    { kind: 'standard', colors: { dark: foreground, light: background } }, new AbortController().signal);
  return { png, svg };
}
