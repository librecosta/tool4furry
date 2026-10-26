import { localizedPath, type Locale } from '../../i18n/locale';
import * as stylex from '@stylexjs/stylex';
import { ToolboxIcon, CaretDownIcon } from '@phosphor-icons/react';
import type { Region } from '../../config/region';
import { messages } from '../../i18n/messages';
import { getHomepageEntries } from '../../site/catalog';
import { navigationStyles as n } from '../../styles/navigation';

export function ToolboxDisclosure({ region, locale, currentToolId, compact = false }: {
  region: Region; locale: Locale; currentToolId?: string; compact?: boolean;
}) {
  const t = messages[locale];
  const entries = getHomepageEntries(region, undefined, undefined, import.meta.env.DEV, locale);
  return (
    // The native open attribute may already change before island hydration.
    // React leaves it uncontrolled; preserve that early user interaction.
    <details data-tool-disclosure suppressHydrationWarning {...stylex.props(n.disclosure)}>
      <summary suppressHydrationWarning aria-label={t.featuredTools} {...stylex.props(n.control, n.trigger, compact && n.compactTrigger)}>
        <span {...stylex.props(!compact && n.mobileToolbox)}><ToolboxIcon size={20} aria-hidden /></span>
        {!compact && <>
          <span {...stylex.props(n.toolboxLabel)}><span {...stylex.props(n.labelFull)}>{t.featuredTools}</span><span {...stylex.props(n.labelShort)}>{t.featuredToolsShort}</span></span>
          <span {...stylex.props(n.chevron)}><CaretDownIcon size={16} aria-hidden {...stylex.props(n.svg)} /></span>
        </>}
      </summary>
      {/* The disclosure script may update aria/inert before hydration, too. */}
      <div data-tool-positioner suppressHydrationWarning {...stylex.props(n.positioner, compact && n.compactPositioner)}>
        <div data-tool-panel {...stylex.props(n.panel, compact && n.compactPanel)}>
          <div {...stylex.props(n.panelHeader, compact && n.compactPanelHeader)}>
            <span>{t.featuredTools}</span><a href={localizedPath('/tools/', region, locale)} {...stylex.props(n.browse)}>{t.browseAll}</a>
          </div>
          <div {...stylex.props(n.tools)}>
            {entries.length === 0 && <p {...stylex.props(n.empty)}>{t.empty}</p>}
            {entries.map(tool => (
              <a key={tool.id} href={tool.href} aria-current={tool.id === currentToolId ? 'page' : undefined} {...stylex.props(n.tool)}>
                <span {...stylex.props(n.toolTitle)}>{tool.title}</span>
                <span {...stylex.props(n.description)}>{tool.description}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
