import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { compile } from 'sass-embedded';
import { tools } from '../src/tools/registry';
import { getCatalogEntries } from '../src/site/catalog';
import { getRelatedTools, getRelatedCatalogEntries } from '../src/site/tool-content';
import { getToolIcon } from '../src/site/tool-icons';
import { fixtureTool } from './fixtures/tools';

it('projects related cards for every Registry tool using the same available catalog entries and original selection order', () => {
  for (const region of ['cn','global'] as const) for (const locale of ['zh','en'] as const) for (const dev of [false,true]) {
    const catalog = getCatalogEntries(region, tools, dev, locale);
    for (const tool of tools) {
      expect(getToolIcon(tool.id)).toBeDefined();
      const related = getRelatedCatalogEntries(tool, region, tools, dev, locale);
      expect(related).toEqual(getRelatedTools(tool, region, tools, dev).map(tool => catalog.find(entry => entry.id === tool.id)));
      expect(related.length).toBeLessThanOrEqual(3);
      expect(related.every(entry => entry.id !== tool.id && entry.groupId === tool.group)).toBe(true);
      expect(related.every(entry => dev || entry.status === 'published')).toBe(true);
      expect(related.some(entry => 'fixture' in entry)).toBe(false);
    }
  }
});

it('filters region, Draft and other groups before the existing three-item selection, and preserves empty results', () => {
  const tool=fixtureTool('current'), list=[tool,fixtureTool('foreign',{regions:['global']}),fixtureTool('hidden',{status:'draft'}),fixtureTool('other-group',{group:'pdf-tools',category:'documents'}),fixtureTool('one'),fixtureTool('two'),fixtureTool('three'),fixtureTool('four')];
  expect(getRelatedCatalogEntries(tool,'cn',list,false,'zh').map(entry=>entry.id)).toEqual(['one','two','three']);
  expect(getRelatedCatalogEntries(tool,'cn',list,true,'en').map(entry=>entry.id)).toEqual(['hidden','one','two']);
  expect(getRelatedCatalogEntries(tool,'global',list,false,'en').map(entry=>entry.id)).toEqual(['foreign','one','two']);
  expect(getRelatedCatalogEntries(tool,'cn',[tool],false,'en')).toEqual([]);
});

it('uses one static icon/header and the actual directory card component without adding an island or fixture source', () => {
  const intro=readFileSync('src/components/site/ToolIntro.astro','utf8'), guide=readFileSync('src/components/site/ToolGuide.astro','utf8'), cards=readFileSync('src/components/site/ToolCards.astro','utf8'), route=readFileSync('src/pages/[...locale]/tools/[slug].astro','utf8');
  expect(intro).toContain('<FeaturedToolIcon id={toolId} size={40}'); expect(intro).toContain('aria-hidden="true"'); expect(intro.match(/<h1\b/g)).toHaveLength(1);
  expect(route).toContain('toolId={tool.id}'); expect(route).toContain('getRelatedCatalogEntries');
  expect(guide).toContain('<ToolCards entries={related} locale={locale} layout="related"'); expect(guide).toContain('related.length > 0');
  expect(guide).not.toContain('related.map('); expect(guide).not.toContain('addCatalogFixture'); expect(cards).toContain("layout = 'catalog'");
  for(const source of [intro,guide,cards]) expect(source).not.toContain('client:');
  const css=compile('src/components/site/ToolIntro.module.scss').css;
  expect(css).toMatch(/\.titleIcon\s*\{[^}]*flex-shrink:\s*0;[^}]*width:\s*40px;[^}]*height:\s*40px/);
  expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*width:\s*32px;[\s\S]*height:\s*32px/);
  const shared=compile('src/components/site/ToolCards.module.scss').css;
  expect(shared).toContain('.related .card'); expect(shared).toContain('list-style: none');
});
