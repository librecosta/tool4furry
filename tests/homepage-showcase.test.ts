import { tools } from '../src/tools/registry';
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getRoleShowcases, getFeaturedShowcase, roleShowcases, homepageCopy, homepageStories, homepageMedia, hasHomeMedia } from '../src/site/homepage-showcase';
import { getHomepageEntries } from '../src/site/catalog';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import { imageResizeCropDefinition } from '../src/tools/image-resize-crop/definition';
import { paletteExtractorDefinition } from '../src/tools/palette-extractor/definition';
import { imageCompressorDefinition } from '../src/tools/image-compressor/definition';
import { comicPageOrganizerDefinition } from '../src/tools/comic-page-organizer/definition';
import { imageWatermarkDefinition } from '../src/tools/image-watermark/definition';
import { exifMetadataDefinition } from '../src/tools/exif-metadata/definition';
import { fixtureTools } from './fixtures/tools';
import type { ToolDefinition } from '../src/tools/types';

describe('four-slot featured presentation', () => {
  it('keeps delivered imported artwork and leaves optional media absent', () => {
    expect(hasHomeMedia(homepageMedia.feedback), homepageMedia.feedback.src).toBe(true);
    expect(hasHomeMedia(homepageMedia.collaboration)).toBe(true);
    expect(hasHomeMedia(homepageMedia.featuredDecor)).toBe(false);
    expect(hasHomeMedia({ ...homepageMedia.feedback, src: 'https://example.com/art.avif' })).toBe(false);
    expect(hasHomeMedia({ ...homepageMedia.feedback, width: 0 })).toBe(false);
  });
  it.each(['cn', 'global'] as const)('preserves %s editorial order and locale without reducing the navigation limit', region => {
    const list = [
      { ...imageConverterDefinition, regions: [region] },
      ...fixtureTools(12),
      { ...fixtureTools(1)[0], id: 'other-region', regions: [region === 'cn' ? 'global' : 'cn'] },
    ] satisfies ToolDefinition[];
    for (const locale of ['zh', 'en'] as const) {
      const navigation = getHomepageEntries(region, list, ['missing', 'other-region', 'fixture-8', 'fixture-8'], false, locale);
      const cards = getFeaturedShowcase(navigation);
      expect(navigation).toHaveLength(9);
      expect(cards.map(card => card.id)).toEqual(['fixture-8', 'image-converter', 'fixture-1', 'fixture-2']);
      expect(cards[0].title).toBe(list.find(tool => tool.id === 'fixture-8')!.copy[locale].title);
      expect(cards[0]).toMatchObject({ href: navigation[0].href });
    }
  });

  it.each([0, 1, 3, 4, 9])('does not fill %i entries with examples', count => {
    const cards = getFeaturedShowcase(getHomepageEntries('cn', fixtureTools(count)));
    expect(cards).toHaveLength(Math.min(count, 4));
  });

  it.each(['cn', 'global'] as const)('shows four Published cards in %s production and DEV', region => {
    for (const locale of ['zh', 'en'] as const) {
      const entries = getHomepageEntries(region, undefined, undefined, true, locale);
      const cards = getFeaturedShowcase(entries);
      expect(cards.map(card => card.id)).toEqual(['image-converter', 'image-resize-crop', 'palette-extractor', 'image-compressor']);
      expect(cards[0].description).toBe(imageConverterDefinition.copy[locale].summary);
      expect(entries[0].description).toBe(imageConverterDefinition.copy[locale].description);
      expect(cards[0].href).toBe(entries[0].href);
      expect(cards.map(card => card.status)).toEqual(['published', 'published', 'published', 'published']);
      expect(getFeaturedShowcase(getHomepageEntries(region, undefined, undefined, false, locale))).toEqual(cards);
    }
    expect(imageConverterDefinition.status).toBe('published');
  });
});

describe('homepage editorial role projection', () => {
  it('uses the revised bilingual identity labels with stable role IDs', () => {
    for (const region of ['cn', 'global'] as const) {
      for (const locale of ['zh', 'en'] as const) {
        const entries = getRoleShowcases(region, locale);
        expect(entries.find(role => role.id === 'painter')?.label).toEqual({ zh: '画师', en: 'Artists' });
        expect(entries.find(role => role.id === 'composer')?.label).toEqual({ zh: '调音师', en: 'Audio Engineers' });
      }
    }
  });

  const portraits = [
    ['painter', 'lynx-artist', '5fc730a97ddcec6e56cd965dbbb5e4f697e53bb00d72858224f1b25b5e6f7d4d'],
    ['composer', 'songbird-music-producer', '7f9dd7fc051a88e1ccbdf9deac599dad7d94b9f034ad7036b18f51de37e5535b'],
    ['developer', 'wolf-developer', 'e82d170cb65708f9ee1fac6887aea0ed8a26f0bcb59bb3213f7ab2b604466efb'],
    ['animator', 'fox-animator', 'd903b1c4a9850048fa44cac1d5d20ce259f756c3694c377ead78df9eea76cce0'],
    ['operations', 'tabby-cat-community-curator', '95bd476b06525cdd1d264185fe678581c27500e06356f27199b7c27241847220'],
    ['studio', 'lion-studio', '380c61f03f8ff9be45f5e96b1eed6ddd64f3ab57cce2762be62bfa360c7a1120'],
  ] as const;

  it.each(portraits)('assigns the approved original portrait to %s in every region and locale', async (id, filename, sha256) => {
    const media = roleShowcases.find(role => role.id === id)?.media;
    expect(hasHomeMedia(media)).toBe(true);
    expect(media).toMatchObject({ width: 1086, height: 1448, alt: { zh: '', en: '' } });
    expect(media?.src).toContain(`/illustrations/roles/${filename}.avif`);
    const bytes = await readFile(`src/assets/illustrations/roles/${filename}.avif`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
    for (const region of ['cn', 'global'] as const) for (const locale of ['zh', 'en'] as const) {
      expect(getRoleShowcases(region, locale).find(role => role.id === id)?.media).toEqual(media);
    }
  });

  const associatedRoles = ['painter', 'developer', 'animator', 'operations'];
  const publishedTools = [imageConverterDefinition, imageResizeCropDefinition, paletteExtractorDefinition, imageCompressorDefinition, comicPageOrganizerDefinition, imageWatermarkDefinition, exifMetadataDefinition];
  const roleTools = (id: string, list = publishedTools) => associatedRoles.includes(id)
    ? list.filter(tool => (tool.id !== 'palette-extractor' || ['painter', 'animator'].includes(id)) &&
      (tool.id !== 'comic-page-organizer' || ['painter', 'animator'].includes(id)) &&
      (tool.id !== 'exif-metadata' || ['painter', 'operations'].includes(id)) &&
      (tool.id !== 'image-watermark' || ['painter', 'animator', 'operations'].includes(id))) : [];

  it.each(['cn', 'global'] as const)('projects seven Published tools in %s editorial order without filling unrelated roles', region => {
    for (const locale of ['zh', 'en'] as const) {
      const production = getRoleShowcases(region, locale);
      expect(production).toHaveLength(6);
      expect(production.filter(role => role.entries.length).map(role => role.id)).toEqual(associatedRoles);
      const expectedPrefix = (region === 'cn' ? locale === 'en' : locale === 'zh') ? `/${locale}` : '';
      for (const role of production) {
        const expected = roleTools(role.id);
        expect(role.entries.map(entry => entry.id)).toEqual(expected.map(tool => tool.id));
        expect(role.entries.map(entry => [entry.title, entry.href, entry.status])).toEqual(expected.map(tool => [
          tool.copy[locale].title, `${expectedPrefix}/tools/${tool.slug}/`, 'published',
        ]));
      }
      const dev = getRoleShowcases(region, locale, true);
      for (const role of dev) {
        const productionRole = production.find(item => item.id === role.id)!;
        expect(role.entries.filter(entry => entry.status === 'published')).toEqual(productionRole.entries);
        expect(role.entries.filter(entry => entry.status === 'draft').map(entry=>entry.id)).toEqual(role.toolIds.filter(id=>tools.some(tool=>tool.id===id&&tool.status==='draft')).slice(0,12-productionRole.entries.length));
      }
    }
    expect(publishedTools.map(tool => tool.status)).toEqual(['published', 'published', 'published', 'published', 'published', 'published', 'published']);
  });

  it.each(['cn', 'global'] as const)('keeps %s editorial IDs behind Registry Draft and region filtering in both locales', region => {
    for (const locale of ['zh', 'en'] as const) {
      for (const draftTool of publishedTools) {
        const registry = publishedTools.map(tool => tool.id === draftTool.id ? { ...tool, status: 'draft' as const } : tool);
        const production = getRoleShowcases(region, locale, false, registry);
        const dev = getRoleShowcases(region, locale, true, registry);
        for (const role of production) {
          const expected = roleTools(role.id).filter(tool => tool.id !== draftTool.id);
          expect(role.entries.map(entry => entry.id)).toEqual(expected.map(tool => tool.id));
          expect(dev.find(entry => entry.id === role.id)?.entries.map(entry => [entry.id, entry.status])).toEqual(
            roleTools(role.id, registry).map(tool => [tool.id, tool.status]),
          );
        }
      }
      const allDraft = publishedTools.map(tool => ({ ...tool, status: 'draft' as const }));
      expect(getRoleShowcases(region, locale, false, allDraft).flatMap(role => role.entries)).toEqual([]);
      const otherRegion = region === 'cn' ? 'global' : 'cn';
      const list: ToolDefinition[] = publishedTools.map(tool => ({ ...tool, regions: [otherRegion] }));
      expect(getRoleShowcases(region, locale, false, list).flatMap(role => role.entries)).toEqual([]);
      expect(getRoleShowcases(region, locale, true, list).flatMap(role => role.entries)).toEqual([]);
    }
    expect(publishedTools.map(tool => tool.status)).toEqual(['published', 'published', 'published', 'published', 'published', 'published', 'published']);
  });

  it('deduplicates editorial IDs, ignores unknown/unavailable IDs, and caps each role at twelve', () => {
    const list = fixtureTools(15);
    const ids = ['unknown', list[3].id, list[3].id, ...list.map(tool => tool.id)];
    const roles = [{ ...roleShowcases[0], toolIds: ids }];
    const entries = getRoleShowcases('cn', 'en', false, list, roles)[0].entries;
    expect(entries.map(entry => entry.id)).toEqual(['fixture-4', 'fixture-1', 'fixture-2', 'fixture-3', 'fixture-5', 'fixture-6', 'fixture-7', 'fixture-8', 'fixture-9', 'fixture-10', 'fixture-11', 'fixture-12']);
  });

  it.each([0, 1, 12])('renders only %i manually selected tools without filling slots or assigning matching categories', count => {
    const list = fixtureTools(13);
    const roles = [{ ...roleShowcases[0], toolIds: list.slice(0, count).map(tool => tool.id) }];
    expect(getRoleShowcases('cn', 'zh', true, list, roles)[0].entries.map(entry => entry.id)).toEqual(roles[0].toolIds);
  });

  it('defines six bilingual roles and two localized editorial stories without making tools', () => {
    expect(roleShowcases.map(role => role.id)).toEqual(['painter', 'composer', 'developer', 'animator', 'operations', 'studio']);
    expect(roleShowcases.slice(3).map(role => ({ label: role.label, description: role.description }))).toEqual([
      { label: { zh: '动画师', en: 'Animators' }, description: { zh: '每一帧都值得打磨', en: 'Every frame deserves care.' } },
      { label: { zh: '运营', en: 'Community teams' }, description: { zh: '为内容与社群增添色彩', en: 'Bring more color to content and communities.' } },
      { label: { zh: '工作室', en: 'Studios' }, description: { zh: '工作细节决定成败', en: 'Details make the difference.' } },
    ]);
    for (const role of roleShowcases) {
      expect(role.label.zh).toBeTruthy();
      expect(role.label.en).toBeTruthy();
      expect(role.description.en).toBeTruthy();
    }
    expect(Object.keys(homepageCopy.zh)).toEqual(Object.keys(homepageCopy.en));
    for (const locale of ['zh', 'en'] as const) {
      expect(homepageStories[locale].map(story => story.id)).toEqual(['feedback', 'collaboration']);
      expect(homepageStories[locale].map(story => story.link.href)).toEqual(['https://github.com/librecosta/tool4furry/issues', 'mailto:contact@librecosta.com']);
    }
  });
});
