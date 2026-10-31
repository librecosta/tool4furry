import { defaultLocale, locales, type Locale } from '../i18n/locale';
import type { Region } from '../config/region';
import type { ToolDefinition } from '../tools/types';
import { getAvailableTools, getPublishedTools, tools } from '../tools/registry';
import { imageConverterContent } from './image-converter-content';
import { imageResizeCropContent } from './image-resize-crop-content';
import { paletteExtractorContent } from './palette-extractor-content';

// Astro/build only. Never import this content module from React or the registry.
export type ToolPageContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  headings?: Partial<Record<'steps' | 'limitations' | 'faq', string>>;
  features?: readonly string[];
  steps?: readonly string[];
  limitations?: readonly string[];
  faq?: readonly { question: string; answer: string }[];
};
export type ToolContentMap = Readonly<
  Record<string, Partial<Record<Locale, ToolPageContent>>>
>;
export const toolPageContents: ToolContentMap = {
  'palette-extractor': paletteExtractorContent,
  'image-resize-crop': imageResizeCropContent,
  'image-converter': imageConverterContent,
};

export function getToolPageContent(
  tool: ToolDefinition,
  region: Region,
  contents = toolPageContents,
  dev = false,
  locale: Locale = defaultLocale(region),
) {
  if (!getAvailableTools(region, dev, [tool]).length)
    throw new Error(`Unpublished tool content: ${tool.id}/${region}/${locale}`);
  const content = Object.hasOwn(contents, tool.id)
    ? contents[tool.id]?.[locale]
    : undefined;
  if (
    !content ||
    ['title', 'description', 'h1', 'intro'].some(
      (key) => !content[key as keyof ToolPageContent]?.toString().trim(),
    )
  )
    throw new Error(`Missing tool content: ${tool.id}/${region}/${locale}`);
  if ((content.title.match(/Tool4Furry/g) ?? []).length !== 1)
    throw new Error(`Tool title needs one brand: ${tool.id}/${region}/${locale}`);
  for (const values of [content.features, content.steps, content.limitations]) {
    if (values?.some((value) => !value.trim()))
      throw new Error(`Empty tool guide item: ${tool.id}/${region}/${locale}`);
  }
  if (content.faq?.some((item) => !item.question.trim() || !item.answer.trim()))
    throw new Error(`Empty FAQ: ${tool.id}/${region}/${locale}`);
  return content;
}
export function assertPublishedContent(
  registry = tools,
  contents = toolPageContents,
) {
  for (const region of ['cn', 'global'] as const)
    for (const tool of getPublishedTools(region, registry))
      for (const locale of Object.keys(locales) as Locale[])
        getToolPageContent(tool, region, contents, false, locale);
}
export function getRelatedTools(
  tool: ToolDefinition,
  region: Region,
  registry = tools,
  dev = false,
) {
  return getAvailableTools(region, dev, registry)
    .filter((entry) => entry.id !== tool.id && entry.group === tool.group)
    .slice(0, 3);
}
