export const terrainIds = ['dunes', 'highlands', 'valley'] as const;
export const artStyleIds = ['aeolian', 'contour', 'strata'] as const;
export const errorCorrectionLevels = ['L', 'M', 'Q', 'H'] as const;

export type TerrainId = typeof terrainIds[number];
export type ArtStyleId = typeof artStyleIds[number];
export type QrErrorCorrectionLevel = typeof errorCorrectionLevels[number];

export type QrRecipeV1 = {
  version: 1;
  content: string;
  terrain: { id: TerrainId; revision: 1; seed: number };
  artwork: { id: ArtStyleId; revision: 1 };
  qr: { errorCorrectionLevel: QrErrorCorrectionLevel };
};
