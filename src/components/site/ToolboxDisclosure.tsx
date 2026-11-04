import { localizedPath, type Locale } from '../../i18n/locale';
import { ToolboxIcon, CaretDownIcon, SquaresFourIcon } from '@phosphor-icons/react';
import type { Region } from '../../config/region';
import { messages } from '../../i18n/messages';
import { getToolboxGroups, toolboxCopy } from '../../site/toolbox-navigation';
import { getToolIcon } from '../../site/tool-icons';
import n from './ToolboxDisclosure.module.scss';

export function ToolboxDisclosure({ region, locale, currentToolId, compact = false }: {
  region: Region; locale: Locale; currentToolId?: string; compact?: boolean;
}) {
  const t = messages[locale];
  const groups = getToolboxGroups(region, locale, import.meta.env.DEV);
  return (
    // The native open attribute may already change before island hydration.
    // React leaves it uncontrolled; preserve that early user interaction.
    <details data-tool-disclosure suppressHydrationWarning className={n.disclosure}>
      <summary suppressHydrationWarning aria-label={t.featuredTools} className={[n.control, n.trigger, compact && n.compactTrigger].filter(Boolean).join(' ')}>
        <span className={[!compact && n.mobileToolbox].filter(Boolean).join(' ')}><ToolboxIcon size={20} aria-hidden /></span>
        {!compact && <>
          <span className={n.toolboxLabel}><span className={n.labelFull}>{t.featuredTools}</span><span className={n.labelShort}>{t.featuredToolsShort}</span></span>
          <span className={n.chevron}><CaretDownIcon size={16} aria-hidden className={n.svg} /></span>
        </>}
      </summary>
      {/* The disclosure script may update aria/inert before hydration, too. */}
      <div data-tool-positioner suppressHydrationWarning className={[n.positioner, compact && n.compactPositioner].filter(Boolean).join(' ')}>
        <div data-tool-panel className={[n.panel, compact && n.compactPanel].filter(Boolean).join(' ')}>
          <div role="group" aria-label={toolboxCopy[locale].filters} className={n.filters}>
            <a href={localizedPath('/tools/', region, locale)} className={n.filter}>{t.browseAll}</a>
            {groups.map(group => <button key={group.id} type="button" data-tool-filter={group.id}
              suppressHydrationWarning aria-pressed={group.id === 'featured'} className={n.filter}>
              {group.label}
            </button>)}
          </div>
          <div className={n.groups}>
            {/* The shared native enhancer owns only these selection attributes.
                Keep them uncontrolled across early interaction and hydration. */}
            {groups.map(group => <section key={group.id} data-tool-group={group.id}
              suppressHydrationWarning hidden={group.id !== 'featured'} aria-label={group.label} className={n.tools}>
              {group.entries.length === 0 && <p className={n.empty}>{toolboxCopy[locale].empty}</p>}
              {group.entries.map(tool => {
                const icon = getToolIcon(tool.id);
                return <a key={tool.id} href={tool.href} aria-current={tool.id === currentToolId ? 'page' : undefined} className={n.tool}>
                  {icon ? <img data-tool-icon={tool.id} src={icon[32]} srcSet={`${icon[32]} 32w, ${icon[128]} 128w`} sizes="32px"
                    width={32} height={32} alt="" decoding="async" className={n.toolIcon} />
                    : <SquaresFourIcon data-tool-icon-fallback size={32} aria-hidden="true" className={n.toolIcon} />}
                  <span className={n.toolCopy}><span className={n.toolTitle}>{tool.title}</span>
                  <span className={n.description}>{tool.summary ?? tool.description}</span></span>
                </a>;
              })}
            </section>)}
          </div>
        </div>
      </div>
    </details>
  );
}
