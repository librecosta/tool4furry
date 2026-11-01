import { fixtureTools, fixtureTool } from './tools';
import { imageConverterDefinition } from '../../src/tools/image-converter/definition';
import { imageResizeCropDefinition } from '../../src/tools/image-resize-crop/definition';
import { paletteExtractorDefinition } from '../../src/tools/palette-extractor/definition';
import { imageCompressorDefinition } from '../../src/tools/image-compressor/definition';
import { comicPageOrganizerDefinition } from '../../src/tools/comic-page-organizer/definition';
import { imageWatermarkDefinition } from '../../src/tools/image-watermark/definition';
import { exifMetadataDefinition } from '../../src/tools/exif-metadata/definition';

// Resource probes use original tiny WASM answer()=42 modules. Their inert custom
// sections exceed Vite's inline threshold so the audit tests real emitted files.
export const publicationFixtures = [
  imageConverterDefinition,
  imageResizeCropDefinition,
  paletteExtractorDefinition,
  imageCompressorDefinition,
  comicPageOrganizerDefinition,
  imageWatermarkDefinition,
  exifMetadataDefinition,
  ...fixtureTools(20),
  fixtureTool('image-resizer-fixture', { status: 'draft' }),
  fixtureTool('character-editor-fixture', { regions: ['global'] }),
  fixtureTool('cn-only-fixture', { regions: ['cn'] }),
];
