import type { Region } from '../config/region';
import type { ToolDefinition } from '../tools/types';
import { getAvailableTools, getPublishedTools, tools } from '../tools/registry';
import { imageConverterContent } from './image-converter-content';

// Astro/build only. Never import this content module from React or the registry.
export type ToolPageContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  features?: readonly string[];
  steps?: readonly string[];
  limitations?: readonly string[];
  faq?: readonly { question: string; answer: string }[];
};
export type ToolContentMap = Readonly<
  Record<string, Partial<Record<Region, ToolPageContent>>>
>;
export const toolPageContents: ToolContentMap = {
  'image-converter': imageConverterContent,
};

export function getToolPageContent(
  tool: ToolDefinition,
  region: Region,
  contents = toolPageContents,
  dev = false,
) {
  if (!getAvailableTools(region, dev, [tool]).length)
    throw new Error(`Unpublished tool content: ${tool.id}/${region}`);
  const content = Object.hasOwn(contents, tool.id)
    ? contents[tool.id]?.[region]
    : undefined;
  if (
    !content ||
    ['title', 'description', 'h1', 'intro'].some(
      (key) => !content[key as keyof ToolPageContent]?.toString().trim(),
    )
  )
    throw new Error(`Missing tool content: ${tool.id}/${region}`);
  if ((content.title.match(/Tool4Furry/g) ?? []).length !== 1)
    throw new Error(`Tool title needs one brand: ${tool.id}/${region}`);
  for (const values of [content.features, content.steps, content.limitations]) {
    if (values?.some((value) => !value.trim()))
      throw new Error(`Empty tool guide item: ${tool.id}/${region}`);
  }
  if (content.faq?.some((item) => !item.question.trim() || !item.answer.trim()))
    throw new Error(`Empty FAQ: ${tool.id}/${region}`);
  return content;
}
export function assertPublishedContent(
  registry = tools,
  contents = toolPageContents,
) {
  for (const region of ['cn', 'global'] as const)
    for (const tool of getPublishedTools(region, registry))
      getToolPageContent(tool, region, contents);
}
export function getRelatedTools(
  tool: ToolDefinition,
  region: Region,
  registry = tools,
) {
  return getPublishedTools(region, registry)
    .filter((entry) => entry.id !== tool.id && entry.group === tool.group)
    .slice(0, 3);
}
