import type { Region } from '../config/region';
import type { Locale } from '../i18n/locale';
import { tools } from '../tools/registry';
import { getNavigationEntries } from './catalog';
import { getRoleShowcases } from './homepage-showcase';
import { roleLabel } from './roles';

export const toolboxCopy = {
  zh: { featured: '总精选', filters: '工具精选分类', empty: '暂无可用工具。' },
  en: { featured: 'All picks', filters: 'Tool selections', empty: 'No tools available yet.' },
};

// Both navigation renderers share editorial IDs and the Registry projection.
export function getToolboxGroups(region: Region, locale: Locale, dev = false, registry = tools) {
  return [
    { id: 'featured' as const, label: toolboxCopy[locale].featured, entries: getNavigationEntries(region, registry, dev, locale) },
    ...getRoleShowcases(region, locale, dev, registry).map(role => ({
      id: role.id, label: roleLabel(role.id)[locale], entries: role.entries.slice(0, 9),
    })),
  ];
}
