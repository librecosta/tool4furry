export const firstBatchIds = [
  'pdf-merge',
  'pdf-split',
  'images-to-pdf',
  'zip-manager',
  'batch-file-renamer',
  'file-hash',
  'text-cleaner',
  'text-diff',
  'subtitle-tools',
  'json-formatter',
  'url-base64',
  'timestamp-converter',
  'qr-code-generator',
  'color-contrast',
  'audio-trimmer',
];
export const secondBatchIds = [
  'markdown-editor',
  'video-frame-extractor',
  'csv-json-converter',
  'code-image-generator',
  'svg-to-png',
  'regex-tester',
  'uuid-generator',
];
export const generalToolboxIds = [...firstBatchIds, ...secondBatchIds];
export const draftIds = generalToolboxIds.filter(id => !['pdf-merge', 'pdf-split', 'images-to-pdf', 'zip-manager', 'batch-file-renamer', 'file-hash', 'text-cleaner'].includes(id));
