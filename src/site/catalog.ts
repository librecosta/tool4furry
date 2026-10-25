import type { Region } from '../config/region';
import { getAvailableTools, tools } from '../tools/registry';
import { domains, groups, audiences, contexts } from './taxonomy';
import type { ToolDefinition } from '../tools/types';

// Editorial order, not another publication list. Unknown/unavailable IDs are ignored.
export const featuredToolIds: readonly string[] = [];
export const HOME_TOOL_LIMIT = 9;
export const SWITCHER_TOOL_LIMIT = 6;

// Presentation metadata only. The existing registry remains the publication gate.
export function getCatalogEntries(region: Region, registry = tools, dev = false) {
  return getAvailableTools(region, dev, registry).map((tool) => ({
    id: tool.id,
    href: `/tools/${tool.slug}/`,
    ...tool.copy[region],
    category: Object.hasOwn(domains, tool.category)
      ? domains[tool.category][region]
      : undefined,
    categoryId: tool.category,
    groupId: tool.group,
    group: groups[tool.group]?.[region],
    audiences: tool.audiences ?? [],
    contexts: tool.contexts ?? [],
  }));
}
export type CatalogEntry = ReturnType<typeof getCatalogEntries>[number];

export function getHomepageEntries(
  region: Region,
  registry = tools,
  featured = featuredToolIds,
  dev = false,
) {
  const entries = getCatalogEntries(region, registry, dev);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ordered = [
    ...new Set([...featured, ...entries.map((entry) => entry.id)]),
  ];
  return ordered
    .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    .slice(0, HOME_TOOL_LIMIT);
}

export function getCatalogSections(region: Region, registry = tools, dev = false) {
  const entries = getCatalogEntries(region, registry, dev);
  return Object.entries(domains)
    .map(([id, label]) => ({
      id,
      label: label[region],
      groups: Object.entries(groups)
        .filter(([, group]) => group.category === id)
        .map(([groupId, group]) => ({
          id: groupId,
          label: group[region],
          entries: entries.filter(
            (entry) => entry.groupId === groupId && entry.categoryId === id,
          ),
        }))
        .filter((group) => group.entries.length > 0),
    }))
    .filter((domain) => domain.groups.length > 0);
}

export function getDiscoverySections(region: Region, registry = tools, dev = false) {
  const entries = getCatalogEntries(region, registry, dev);
  return [
    ...Object.entries(audiences).map(([id, label]) => ({
      id: `audience-${id}`,
      label: label[region],
      reason: label.reason[region],
      entries: entries.filter((entry) =>
        entry.audiences.some((value) => value === id),
      ),
    })),
    ...Object.entries(contexts).map(([id, label]) => ({
      id: `context-${id}`,
      label: label[region],
      reason: label.reason[region],
      entries: entries.filter((entry) =>
        entry.contexts.some((value) => value === id),
      ),
    })),
  ].filter((section) => section.entries.length > 0);
}

export function getSwitcherTools(
  available: readonly ToolDefinition[],
  currentToolId?: string,
) {
  const current = available.find((tool) => tool.id === currentToolId);
  const same = available.filter((tool) => tool.group === current?.group);
  const others = available.filter((tool) => tool.group !== current?.group);
  return [...same, ...others].slice(0, SWITCHER_TOOL_LIMIT);
}
