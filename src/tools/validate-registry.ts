import { domains, groups, audiences, contexts } from '../site/taxonomy';
import { roles } from '../site/roles';
import { locales } from '../i18n/locale';
import { regions } from '../config/region';
import type { ToolDefinition } from './types';

// Pure validation: the caller supplies loader presence; metadata never imports implementations.
export function registryIssues(
  registry: readonly ToolDefinition[],
  loaders: Readonly<Record<string, unknown>>,
) {
  const issues: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const knownList = (
    values: readonly string[],
    known: object,
    label: string,
  ) => {
    if (new Set(values).size !== values.length)
      issues.push(`${label}: duplicate values`);
    for (const value of values)
      if (!Object.hasOwn(known, value))
        issues.push(`${label}: unknown ${value}`);
  };
  for (const tool of registry) {
    for (const [key, seen] of [
      ['id', ids],
      ['slug', slugs],
    ] as const) {
      const value = tool[key];
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
        issues.push(`${tool.id}: invalid ${key}`);
      if (seen.has(value)) issues.push(`${tool.id}: duplicate ${key}`);
      seen.add(value);
    }
    if (!Object.hasOwn(domains, tool.category))
      issues.push(`${tool.id}: unknown category`);
    if (
      !Object.hasOwn(groups, tool.group) ||
      groups[tool.group]?.category !== tool.category
    )
      issues.push(`${tool.id}: invalid category/group relationship`);
    knownList(tool.audiences ?? [], audiences, `${tool.id}: audiences`);
    knownList(tool.contexts ?? [], contexts, `${tool.id}: contexts`);
    knownList(tool.roles ?? [], roles, `${tool.id}: roles`);
    knownList(tool.regions, regions, `${tool.id}: regions`);
    if (!tool.regions.length) issues.push(`${tool.id}: missing regions`);
    if (!['draft', 'published'].includes(tool.status))
      issues.push(`${tool.id}: invalid status`);
    if (!['canvas', 'form', 'batch', 'custom'].includes(tool.mode))
      issues.push(`${tool.id}: invalid workspace mode`);
    if (tool.status === 'published') {
      if (
        !Object.hasOwn(loaders, tool.id) ||
        typeof loaders[tool.id] !== 'function'
      )
        issues.push(`${tool.id}: missing loader`);
      for (const locale of Object.keys(locales) as (keyof typeof locales)[]) {
        const copy = tool.copy[locale];
        if (!copy?.title?.trim() || !copy?.description?.trim())
          issues.push(`${tool.id}: missing ${locale} copy`);
      }
    }
  }
  return issues;
}
export function assertValidRegistry(
  registry: readonly ToolDefinition[],
  loaders: Readonly<Record<string, unknown>>,
) {
  const issues = registryIssues(registry, loaders);
  if (issues.length)
    throw new Error(`Invalid tool registry:\n${issues.join('\n')}`);
}
