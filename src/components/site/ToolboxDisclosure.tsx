import { localizedPath, type Locale } from '../../i18n/locale';
import * as stylex from '@stylexjs/stylex';
import { ToolboxIcon, CaretDownIcon, SquaresFourIcon } from '@phosphor-icons/react';
import type { Region } from '../../config/region';
import { messages } from '../../i18n/messages';
import { getToolboxGroups, toolboxCopy } from '../../site/toolbox-navigation';
import { getToolIcon } from '../../site/tool-icons';
import { navigationStyles as n } from '../../styles/navigation';

export function ToolboxDisclosure({ region, locale, currentToolId, compact = false }: {
  region: Region; locale: Locale; currentToolId?: string; compact?: boolean;
}) {
  const t = messages[locale];
  const groups = getToolboxGroups(region, locale, import.meta.env.DEV);
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
          <div role="group" aria-label={toolboxCopy[locale].filters} {...stylex.props(n.filters)}>
            <a href={localizedPath('/tools/', region, locale)} {...stylex.props(n.filter)}>{t.browseAll}</a>
            {groups.map(group => <button key={group.id} type="button" data-tool-filter={group.id}
              suppressHydrationWarning aria-pressed={group.id === 'featured'} {...stylex.props(n.filter)}>
              {group.label}
            </button>)}
          </div>
          <div {...stylex.props(n.groups)}>
            {/* The shared native enhancer owns only these selection attributes.
                Keep them uncontrolled across early interaction and hydration. */}
            {groups.map(group => <section key={group.id} data-tool-group={group.id}
              suppressHydrationWarning hidden={group.id !== 'featured'} aria-label={group.label} {...stylex.props(n.tools)}>
              {group.entries.length === 0 && <p {...stylex.props(n.empty)}>{toolboxCopy[locale].empty}</p>}
              {group.entries.map(tool => {
                const icon = getToolIcon(tool.id);
                return <a key={tool.id} href={tool.href} aria-current={tool.id === currentToolId ? 'page' : undefined} {...stylex.props(n.tool)}>
                  {icon ? <img data-tool-icon={tool.id} src={icon[32]} srcSet={`${icon[32]} 32w, ${icon[128]} 128w`} sizes="32px"
                    width={32} height={32} alt="" decoding="async" {...stylex.props(n.toolIcon)} />
                    : <SquaresFourIcon data-tool-icon-fallback size={32} aria-hidden="true" {...stylex.props(n.toolIcon)} />}
                  <span {...stylex.props(n.toolCopy)}><span {...stylex.props(n.toolTitle)}>{tool.title}</span>
                  <span {...stylex.props(n.description)}>{tool.summary ?? tool.description}</span></span>
                </a>;
              })}
            </section>)}
          </div>
        </div>
      </div>
    </details>
  );
}
