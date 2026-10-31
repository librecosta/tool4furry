import type { ComponentType } from 'react';
import type { ToolProps } from './types';
export type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>;
// Add a literal () => import('./my-tool/MyTool') when implementing a real tool.
export const toolLoaders: Readonly<Partial<Record<string, ToolLoader>>> = {
  'image-resize-crop': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_RESIZE_CROP_AVAILABLE
    ? () => import('./image-resize-crop/ImageResizeCrop')
    : undefined,
  // Publication follows metadata; no additional release switch to remove.
  'image-converter': import.meta.env.DEV || import.meta.env.T4F_TOOL_IMAGE_CONVERTER_AVAILABLE
    ? () => import('./image-converter/ImageConverter')
    : undefined,
};
