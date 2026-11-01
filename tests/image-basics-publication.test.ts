import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tools, getAvailableTools } from '../src/tools/registry';
import { getToolPageContent, getRelatedTools } from '../src/site/tool-content';
import { assertToolLoaderContract, toolBuildDefines, toolAvailabilityConstant } from '../src/tools/build-availability';
import { publicPages, llmsText } from '../src/site/discovery';

const ids = ['image-compressor', 'comic-page-organizer', 'image-watermark', 'exif-metadata'];
describe.each(['cn', 'global'] as const)('%s four complete Draft modules', region => {
  it('keeps implementations behind their literal Loader and Registry qualifications', () => {
    expect(() => assertToolLoaderContract(tools, readFileSync('src/tools/loaders.ts', 'utf8'))).not.toThrow();
    const available = getAvailableTools(region, true), production = getAvailableTools(region, false);
    for (const id of ids) {
      const tool = tools.find(tool => tool.id === id)!;
      expect(tool).toMatchObject({id, slug: id, status: 'draft', mode: 'form', regions: ['cn', 'global']});
      expect(available).toContain(tool); expect(production).not.toContain(tool);
      expect(toolBuildDefines(tools, region)[toolAvailabilityConstant(id)]).toBe('false');
      expect(publicPages(region).some(page => page.url.includes(`/tools/${id}/`))).toBe(false);
      expect(llmsText(region)).not.toContain(`/tools/${id}/`);
      for (const locale of ['zh', 'en'] as const) {
        const content = getToolPageContent(tool, region, undefined, true, locale);
        expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
        expect(content.h1).toBe(tool.copy[locale].title);
        expect(content.steps).toHaveLength(3); expect(content.limitations).toHaveLength(3); expect(content.faq).toHaveLength(3);
        if (locale === 'en') expect(JSON.stringify(content)).not.toMatch(/\p{Script=Han}/u);
        expect(() => getToolPageContent(tool, region, undefined, false, locale)).toThrow('Unpublished');
      }
      expect(getRelatedTools(tool, region, undefined, true).length).toBeGreaterThan(0);
    }
    expect(production.map(tool => tool.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor']);
  });
});
