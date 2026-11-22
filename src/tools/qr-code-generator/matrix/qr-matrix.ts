import QRCode from 'qrcode';
import { errorCorrectionLevels, type QrErrorCorrectionLevel, type QrRecipeV1 } from '../recipe/types';
import { isQrContent } from '../recipe/validate';

export const qrQuietZoneModules = 4;

export type QrMatrixData = {
  size: number;
  /** Row-major, top to bottom, left to right. Each cell is 0 (light) or 1 (dark). */
  cells: Uint8Array;
  /** Row-major mask from the same encoder pass, with 1 for functional modules. */
  functionalMask: Uint8Array;
  quietZoneModules: typeof qrQuietZoneModules;
  errorCorrectionLevel: QrErrorCorrectionLevel;
};

export class QrMatrixError extends Error {
  constructor(readonly code: 'content' | 'errorCorrection' | 'capacity' | 'functionalMask') {
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
  const { size, data, reservedBit } = encodeQrModules(content, errorCorrectionLevel);
  // qrcode@1.5.4 uses reservedBit to exclude functional modules from data masking.
  // Recheck the fixed version and pattern fixtures before updating the encoder.
  if (!(reservedBit instanceof Uint8Array) || reservedBit.length !== size * size ||
      reservedBit.some(bit => bit > 1) || !reservedBit.includes(0) || !reservedBit.includes(1)) {
    throw new QrMatrixError('functionalMask');
  }
  return { size, cells: data, functionalMask: reservedBit, quietZoneModules: qrQuietZoneModules, errorCorrectionLevel };
}
