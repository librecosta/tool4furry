import { describe, expect, it } from 'vitest';
import { domains, groups } from '../src/site/taxonomy';
import { tools, getPublishedTools } from '../src/tools/registry';
import { toolLoaders } from '../src/tools/loaders';
import {
  assertValidRegistry,
  registryIssues,
} from '../src/tools/validate-registry';
import type { ToolDefinition } from '../src/tools/types';
import { fixtureTool, fixtureTools, fixtureLoaders } from './fixtures/tools';

describe('publication metadata gate', () => {
  it('has seven domains and only the real first direction', () => {
    expect(Object.keys(domains)).toEqual([
      'images',
      'creative',
      'characters',
      'text',
      'documents',
      'development',
      'files',
    ]);
    expect(groups).toEqual({
      'image-processing': {
        category: 'images',
        zh: '图片处理',
        en: 'Image Processing',
      },
    });
    expect(() => assertValidRegistry(tools, toolLoaders)).not.toThrow();
    expect(tools.map((tool) => [tool.id, tool.status])).toEqual([
      ['image-converter', 'draft'],
    ]);
    expect(getPublishedTools('cn')).toEqual([]);
    expect(getPublishedTools('global')).toEqual([]);
  });
  it.each([0, 3, 20, 100])(
    'validates %i test-only tools without registering them',
    (count) => {
      const list =
        count === 3
          ? ['image-converter', 'image-resizer', 'image-cropper'].map((id) =>
              fixtureTool(id),
            )
          : fixtureTools(count);
      expect(registryIssues(list, fixtureLoaders(list))).toEqual([]);
      expect(tools.map((tool) => [tool.id, tool.status])).toEqual([
        ['image-converter', 'draft'],
      ]);
      expect(getPublishedTools('cn')).toEqual([]);
      expect(getPublishedTools('global')).toEqual([]);
    },
  );
  it.each([
    { category: 'documents' },
    { group: 'invoice-processing' },
    { category: 'constructor' },
    { audiences: ['unknown'] },
    { contexts: ['personal'] },
    { audiences: ['creator', 'creator'] },
    { contexts: ['studio', 'studio'] },
    { roles: ['unknown'] },
    { roles: ['painter', 'painter'] },
    { regions: ['other'] },
    { regions: ['cn', 'cn'] },
    { regions: [] },
    { slug: '../escape' },
    { id: 'Bad ID' },
    { status: 'pretend' },
    { mode: 'infinite' },
  ])('rejects invalid metadata %j', (override) => {
    const tool = fixtureTool('bad', override as Partial<ToolDefinition>);
    expect(() => assertValidRegistry([tool], fixtureLoaders([tool]))).toThrow(
      'Invalid tool registry',
    );
  });
  it('rejects duplicate IDs, duplicate slugs, missing published copy and loaders', () => {
    const tool = fixtureTool('one');
    expect(registryIssues([tool, tool], fixtureLoaders([tool])).join()).toMatch(
      /duplicate id.*duplicate slug/,
    );
    expect(
      registryIssues(
        [tool, fixtureTool('two', { slug: tool.slug })],
        fixtureLoaders([tool]),
      ).join(),
    ).toContain('duplicate slug');
    expect(registryIssues([tool], {})).toContain('one: missing loader');
    expect(
      registryIssues(
        [
          fixtureTool('one', {
            copy: { ...tool.copy, zh: { title: '', description: '' } },
          }),
        ],
        fixtureLoaders([tool]),
      ),
    ).toContain('one: missing zh copy');
    expect(
      registryIssues([fixtureTool('draft', { status: 'draft' })], {}),
    ).toEqual([]);
  });
  it('requires only regional loaders while still validating all publication metadata', () => {
    const tool = fixtureTool('cn-only', { regions: ['cn'] });
    expect(registryIssues([tool], {}, 'cn')).toContain('cn-only: missing loader');
    expect(registryIssues([tool], {}, 'global')).toEqual([]);
    expect(registryIssues([tool], {})).toContain('cn-only: missing loader');
    expect(registryIssues([{ ...tool, copy: { ...tool.copy, en: { title: '', description: '' } } }], {}, 'global'))
      .toContain('cn-only: missing en copy');
    expect(registryIssues([tool, { ...tool }], {}, 'global')).toContain('cn-only: duplicate id');
  });
});
