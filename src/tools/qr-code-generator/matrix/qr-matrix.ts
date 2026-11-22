import QRCode from 'qrcode';
import { errorCorrectionLevels, type QrErrorCorrectionLevel, type QrRecipeV1 } from '../recipe/types';
import { isQrContent } from '../recipe/validate';

export const qrQuietZoneModules = 4;

export type QrMatrixData = {
  size: number;
  /** Row-major, top to bottom, left to right. Each cell is 0 (light) or 1 (dark). */
  cells: Uint8Array;
  quietZoneModules: typeof qrQuietZoneModules;
  errorCorrectionLevel: QrErrorCorrectionLevel;
};

export class QrMatrixError extends Error {
  constructor(readonly code: 'content' | 'errorCorrection' | 'capacity') {
    super(code);
    this.name = 'QrMatrixError';
  }
}

export function encodeQrModules(content: string, errorCorrectionLevel: QrErrorCorrectionLevel) {
  if (!isQrContent(content)) throw new QrMatrixError('content');
  if (!errorCorrectionLevels.includes(errorCorrectionLevel)) throw new QrMatrixError('errorCorrection');
  try {
    return QRCode.create(content, { errorCorrectionLevel }).modules;
  } catch (error) {
    if (error instanceof Error && error.message.includes('amount of data is too big'))
      throw new QrMatrixError('capacity');
    throw error;
  }
}

export function createQrMatrix({ content, qr: { errorCorrectionLevel } }: Pick<QrRecipeV1, 'content' | 'qr'>): QrMatrixData {
  const { size, data } = encodeQrModules(content, errorCorrectionLevel);
  return { size, cells: data, quietZoneModules: qrQuietZoneModules, errorCorrectionLevel };
}
