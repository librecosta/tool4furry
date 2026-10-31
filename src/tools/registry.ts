import type { Region } from '../config/region';
import type { ToolDefinition } from './types';
import { imageConverterDefinition } from './image-converter/definition';
import { imageResizeCropDefinition } from './image-resize-crop/definition';
// Metadata only. Lab demos are intentionally not registered as tools.
export const tools: readonly ToolDefinition[] = [imageConverterDefinition, imageResizeCropDefinition];
export function getPublishedTools(region: Region, registry = tools) {
  return getAvailableTools(region, false, registry);
}
export function getAvailableTools(region: Region, dev: boolean, registry = tools) {
  return registry.filter(
    (tool) => (dev || tool.status === 'published') && tool.regions.includes(region),
  );
}
