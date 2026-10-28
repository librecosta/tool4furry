import type { Locale } from '../i18n/locale';
import type { Region } from '../config/region';
import type {
  DomainId,
  GroupId,
  AudienceId,
  ContextId,
} from '../site/taxonomy';
export type WorkspaceMode = 'canvas' | 'form' | 'batch' | 'custom';
export type ToolDefinition = {
  id: string;
  slug: string;
  category: DomainId;
  group: GroupId;
  audiences?: readonly AudienceId[];
  contexts?: readonly ContextId[];
  mode: WorkspaceMode;
  status: 'draft' | 'published';
  regions: readonly Region[];
  copy: Record<Locale, { title: string; description: string; summary?: string }>;
};
export type ToolProps = { region: Region; locale: Locale };
