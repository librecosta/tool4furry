import * as stylex from '@stylexjs/stylex';
import { ToolboxIcon, CaretDownIcon } from '@phosphor-icons/react';
import type { Region } from '../../config/region';
import { messages } from '../../i18n/messages';
import { getAvailableTools } from '../../tools/registry';
import { getSwitcherTools } from '../../site/catalog';
import { navigationStyles as n } from '../../styles/navigation';

export function ToolboxDisclosure({ region, currentToolId, compact = false }: {
  region: Region; currentToolId?: string; compact?: boolean;
}) {
  const t = messages[region];
  const shortcuts = getSwitcherTools(getAvailableTools(region, import.meta.env.DEV), currentToolId);
  return (
    // The native open attribute may already change before island hydration.
    // React leaves it uncontrolled; preserve that early user interaction.
    <details data-tool-disclosure suppressHydrationWarning {...stylex.props(n.disclosure)}>
      <summary aria-label={t.tools} {...stylex.props(n.control, n.trigger)}>
        <span {...stylex.props(!compact && n.mobileToolbox)}><ToolboxIcon size={20} aria-hidden /></span>
        {!compact && <>
          <span {...stylex.props(n.toolboxLabel)}>{t.tools}</span>
          <CaretDownIcon size={16} aria-hidden {...stylex.props(n.chevron)} />
        </>}
      </summary>
      <div {...stylex.props(n.positioner)}>
        <div data-tool-panel {...stylex.props(n.panel)}>
          <div {...stylex.props(n.panelHeader)}>
            <span>{t.tools}</span><a href="/tools/" {...stylex.props(n.browse)}>{t.browseAll}</a>
          </div>
          {shortcuts.length === 0 && <p {...stylex.props(n.empty)}>{t.empty}</p>}
          {shortcuts.map(tool => (
            <a key={tool.id} href={`/tools/${tool.slug}/`} aria-current={tool.id === currentToolId ? 'page' : undefined} {...stylex.props(n.tool)}>
              <span {...stylex.props(n.toolTitle)}>{tool.copy[region].title}</span>
              <span {...stylex.props(n.description)}>{tool.copy[region].description}</span>
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}
