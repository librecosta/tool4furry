import type { ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { ToolboxIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { Region } from '../config/region';
import type { WorkspaceMode } from './types';
import { getPublishedTools } from './registry';
import { getSwitcherTools } from '../site/catalog';
import { messages } from '../i18n/messages';
import { controls as c } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
import { menuStyles as menu } from '../styles/menu';
import { siteStyles as site } from '../styles/site';

// Product navigation belongs to page composition, never to a tool's local modes.
export default function ToolPageFrame({
  region,
  mode,
  title,
  currentToolId,
  debug,
  children,
  intro,
}: {
  region: Region;
  mode: WorkspaceMode;
  title: string;
  currentToolId?: string;
  debug?: ReactNode;
  children: ReactNode;
  intro?: ReactNode;
}) {
  const t = messages[region];
  const published = getPublishedTools(region);
  const shortcuts = getSwitcherTools(published, currentToolId);
  const floating = mode === 'canvas' && !intro;
  return (
    <div {...stylex.props(s.frame)}>
      <header
        data-tool-page-entry
        {...stylex.props(
          !floating && site.productHeader,
          !floating && site.fullBleed,
          floating && s.header,
          floating && s.floating,
        )}
      >
        <nav
          aria-label={t.headerNav}
          {...stylex.props(
            !floating && site.fluid,
            !floating && site.nav,
            floating && s.entry,
            floating && s.elevated,
          )}
        >
          <div
            {...stylex.props(
              !floating && site.navLinks,
              floating && s.canvasLinks,
            )}
          >
            <a
              href="/"
              aria-label={`Tool4Furry · ${t.home}`}
              {...stylex.props(
                !floating && site.brand,
                floating && c.button,
                floating && c.ghost,
                floating && s.brand,
              )}
            >
              <img
                src="/brand/tool4furry-mark.svg"
                alt=""
                width={24}
                height={24}
                {...stylex.props(!floating && site.mark)}
              />
              Tool4Furry
            </a>
            <Menu.Root>
              <Menu.Trigger
                aria-label={t.tools}
                {...stylex.props(c.button, c.ghost, s.icon)}
              >
                <ToolboxIcon size={20} aria-hidden />
                {!floating && <span>{t.tools}</span>}
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  {...stylex.props(menu.positioner)}
                >
                  <Menu.Popup aria-label={t.tools} {...stylex.props(menu.popup)}>
                    <Menu.Group>
                      <Menu.GroupLabel {...stylex.props(menu.label)}>
                        {t.tools}
                      </Menu.GroupLabel>
                      {published.length === 0 && (
                        <p {...stylex.props(menu.note)}>{t.empty}</p>
                      )}
                      {shortcuts.map((tool) => (
                        <Menu.LinkItem
                          key={tool.id}
                          href={`/tools/${tool.slug}/`}
                          aria-current={
                            tool.id === currentToolId ? 'page' : undefined
                          }
                          {...stylex.props(menu.item)}
                        >
                          {tool.copy[region].title}
                        </Menu.LinkItem>
                      ))}
                      <Menu.LinkItem href="/tools/" {...stylex.props(menu.item)}>
                        {t.browseAll}
                      </Menu.LinkItem>
                      <Menu.LinkItem href="/" {...stylex.props(menu.item)}>
                        {t.back}
                      </Menu.LinkItem>
                    </Menu.Group>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
          {floating && (
            <h1 title={title} {...stylex.props(s.title)}>
              {title}
            </h1>
          )}
          {debug}
        </nav>
      </header>
      {!intro && !floating && (
        <div {...stylex.props(site.fluid, site.toolIntro)}>
          <h1 {...stylex.props(site.toolTitle)}>{title}</h1>
        </div>
      )}
      {intro}
      {children}
    </div>
  );
}

const s = stylex.create({
  frame: { position: 'relative', minWidth: 0 },
  header: {
    padding: tokens.space16,
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(16px, env(safe-area-inset-right))',
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    maxWidth: {
      default: 'calc(100% - 160px)',
      '@media (max-width: 900px)': '100%',
    },
    zIndex: tokens.layerDock,
    pointerEvents: 'none',
  },
  entry: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space4,
    width: 'fit-content',
    maxWidth: '100%',
    minWidth: 0,
    padding: tokens.space4,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    pointerEvents: 'auto',
  },
  brand: { paddingInline: tokens.space8, flexShrink: 0 },
  canvasLinks: { display: 'flex', alignItems: 'center', gap: tokens.space4 },
  elevated: { boxShadow: tokens.shadowSoft },
  icon: { paddingInline: tokens.space8, flexShrink: 0 },
  title: {
    minWidth: 0,
    margin: 0,
    paddingInline: tokens.space8,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: 14,
    fontWeight: 600,
  },
});
