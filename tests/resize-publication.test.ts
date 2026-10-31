import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageResizeCropDefinition as definition } from '../src/tools/image-resize-crop/definition';
import { imageResizeCropContent } from '../src/site/image-resize-crop-content';
import {
  getAvailableTools,
  getPublishedTools,
  tools,
} from '../src/tools/registry';
import {
  assertToolLoaderContract,
  toolBuildDefines,
} from '../src/tools/build-availability';
import { getToolPageContent } from '../src/site/tool-content';
import { getRelatedTools } from '../src/site/tool-content';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';

describe('Resize & Crop Draft platform contract', () => {
  it.each(['cn', 'global'] as const)(
    'is available in %s DEV only, with both static locales and a literal gated loader',
    (region) => {
      expect(definition).toMatchObject({
        id: 'image-resize-crop',
        slug: 'image-resize-crop',
        status: 'draft',
        mode: 'form',
      });
      expect(getAvailableTools(region, true)).toContain(definition);
      expect(getPublishedTools(region)).not.toContain(definition);
      expect(
        toolBuildDefines(tools, region)[
          'import.meta.env.T4F_TOOL_IMAGE_RESIZE_CROP_AVAILABLE'
        ],
      ).toBe('false');
      expect(() =>
        assertToolLoaderContract(
          tools,
          readFileSync('src/tools/loaders.ts', 'utf8'),
        ),
      ).not.toThrow();
      for (const locale of ['zh', 'en'] as const) {
        expect(
          getToolPageContent(definition, region, undefined, true, locale),
        ).toEqual(imageResizeCropContent[locale]);
        expect(() =>
          getToolPageContent(definition, region, undefined, false, locale),
        ).toThrow('Unpublished');
        expect(imageResizeCropContent[locale].steps?.length).toBeGreaterThan(0);
        expect(imageResizeCropContent[locale].faq?.length).toBeGreaterThan(0);
      }
      expect(getRelatedTools(definition, region)).toContain(
        imageConverterDefinition,
      );
      expect(getRelatedTools(imageConverterDefinition, region)).not.toContain(
        definition,
      );
      expect(
        getRelatedTools(imageConverterDefinition, region, undefined, true),
      ).toContain(definition);
    },
  );
  it('keeps crop CSS variables local and includes the original ISC terms', () => {
    const css = readFileSync('src/tools/image-resize-crop/crop.css', 'utf8');
    expect(css).not.toContain(':root');
    expect(css).toContain('[data-image-resize-crop]');
    expect(css).toContain('prefers-reduced-motion');
    expect(
      readFileSync('src/tools/image-resize-crop/crop.NOTICE.txt', 'utf8'),
    ).toContain('Copyright (c) 2015, Dominic Tobias');
  });
});
