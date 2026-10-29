import type { CatalogEntry } from './catalog';
import type { Locale } from '../i18n/locale';
import { domains, type DomainId } from './taxonomy';
import { roles, type RoleId } from './roles';

// Display-only samples. Never pass these to Registry, loaders or route creation.
export type CatalogDisplayEntry = Omit<CatalogEntry, 'href' | 'groupId' | 'group'> & { href?: string; groupId: string; group?: string; fixture?: true };
export type CatalogDisplaySection = { id: string; label: string; groups: { id: string; label: string; entries: CatalogDisplayEntry[] }[] };
const sampleGroups = [
  { id: 'image-processing', category: 'images', zh: '图片处理', en: 'Image Processing', keyword: 'PNG' },
  { id: 'fixture-image-formats', category: 'images', zh: '格式样本', en: 'Format samples', keyword: 'WebP' },
  { id: 'fixture-creative-layout', category: 'creative', zh: '排版样本', en: 'Layout samples', keyword: 'Layout' },
  { id: 'fixture-document-layout', category: 'documents', zh: '文档样本', en: 'Document samples', keyword: 'PDF' },
  { id: 'fixture-development-data', category: 'development', zh: '数据样本', en: 'Data samples', keyword: 'JSON' },
  { id: 'fixture-file-arrangement', category: 'files', zh: '文件样本', en: 'File samples', keyword: 'Files' },
] as const satisfies readonly { id: string; category: DomainId; zh: string; en: string; keyword: string }[];

/** Called only behind import.meta.env.DEV in ToolsCatalog.astro. */
export function addCatalogFixture(real: CatalogEntry[], realSections: CatalogDisplaySection[], locale: Locale, mode = 'off'): { entries: CatalogDisplayEntry[]; sections: CatalogDisplaySection[]; fixtureCount: number } {
  if (!['compact', 'pagination', 'off'].includes(mode)) throw new RangeError('Invalid T4F_CATALOG_FIXTURE: expected compact, pagination or off');
  const counts = mode === 'off' ? [0, 0, 0, 0, 0, 0] : mode === 'pagination' ? [108, 24, 12, 12, 12, 12] : [8, 8, 8, 8, 8, 8];
  const fixtureCount = counts.reduce((sum, count) => sum + count, 0);
  const distribution = sampleGroups.flatMap((group, index) => Array.from({ length: counts[index] }, () => group));
  const roleIds = Object.keys(roles) as RoleId[];
  const samples: CatalogDisplayEntry[] = Array.from({ length: fixtureCount }, (_, index) => {
    const group = distribution[index];
    const sequence = String(index + 1).padStart(3, '0');
    const summary = locale === 'zh' ? '仅用于目录分页、筛选和长标题验收，不提供工具功能。' : 'For catalog pagination, filters and long-title QA only. No tool functionality.';
    return {
      id: `catalog-fixture-${sequence}`, fixture: true, status: 'draft',
      title: locale === 'zh' ? `目录样本 ${sequence} · ${group.keyword}` : `Catalog sample ${sequence} · ${group.keyword} layout verification`,
      summary, description: summary,
      categoryId: group.category, category: domains[group.category][locale], groupId: group.id, group: group[locale],
      roles: [roleIds[index % roleIds.length], roleIds[(index + 1) % roleIds.length]],
    };
  });
  const sections = realSections.map(section => ({ ...section, groups: section.groups.map(group => ({ ...group, entries: [...group.entries] })) }));
  for (const entry of samples) {
    let section = sections.find(section => section.id === entry.categoryId);
    if (!section) { section = { id: entry.categoryId, label: entry.category!, groups: [] }; sections.push(section); }
    let group = section.groups.find(group => group.id === entry.groupId);
    if (!group) { group = { id: entry.groupId, label: entry.group!, entries: [] }; section.groups.push(group); }
    group.entries.push(entry);
  }
  return { entries: [...real, ...samples], sections, fixtureCount };
}
