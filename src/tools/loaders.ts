import type { ComponentType } from 'react';
import type { ToolProps } from './types';
export type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>;
// Add a literal () => import('./my-tool/MyTool') when implementing a real tool.
export const toolLoaders: Readonly<Partial<Record<string, ToolLoader>>> = {
  // Publication follows metadata; no additional release switch to remove.
  'image-converter': import.meta.env.DEV || import.meta.env.T4F_IMAGE_CONVERTER_AVAILABLE
    ? () => import('./image-converter/ImageConverter')
    : undefined,
};
