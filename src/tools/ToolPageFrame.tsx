import type { ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { DotsThreeIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { Region } from '../config/region';
import type { WorkspaceMode } from './types';
import { messages } from '../i18n/messages';
import { controls as c } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
import { menuStyles as menu } from '../styles/menu';
import { siteStyles as site } from '../styles/site';
import { navigationStyles as n } from '../styles/navigation';
import { NavigationControls } from '../components/site/NavigationControls';
import { ToolboxDisclosure } from '../components/site/ToolboxDisclosure';
import { languageLink, type LanguageLink } from '../site/language';

// Product navigation belongs to page composition, never to a tool's local modes.
export default function ToolPageFrame({
  region,
  mode,
  title,
  currentToolId,
  debug,
  children,
  intro,
  navigation,
}: {
  region: Region;
  mode: WorkspaceMode;
  title: string;
  currentToolId?: string;
  debug?: ReactNode;
  children: ReactNode;
  intro?: ReactNode;
  navigation?: LanguageLink;
}) {
  const t = messages[region];
  const floating = mode === 'canvas' && !intro;
  const alternate = navigation ?? languageLink('/tools/', region);
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
                n.brand,
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
              <span {...stylex.props(n.brandFull)}>Tool4Furry</span>
              <span aria-hidden {...stylex.props(n.brandShort)}>T4F</span>
            </a>
            <ToolboxDisclosure region={region} currentToolId={currentToolId} compact={floating} />
          </div>
          {floating && (
            <h1 title={title} {...stylex.props(s.title)}>
              {title}
            </h1>
          )}
          {!floating && (
            <div {...stylex.props(n.actions)}>
              <NavigationControls region={region} link={alternate} />
              {debug && <div {...stylex.props(n.debug)}>{debug}</div>}
            </div>
          )}
          {floating && debug}
          {floating && (
            <Popover.Root>
              <Popover.Trigger
                aria-label={t.navigationOptions}
                {...stylex.props(n.control)}
              >
                <DotsThreeIcon size={22} aria-hidden />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  align="end" sideOffset={8} collisionPadding={16}
                  {...stylex.props(menu.positioner)}
                >
                  <Popover.Popup
                    aria-label={t.navigationOptions}
                    {...stylex.props(menu.popup)}
                  >
                    <NavigationControls region={region} link={alternate} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          )}
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
    zIndex: { default: tokens.layerDock, ':has(details[open])': tokens.layerFloating },
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
    backgroundColor: tokens.navBackground,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    pointerEvents: 'auto',
  },
  brand: { paddingInline: tokens.space8, flexShrink: 0 },
  canvasLinks: { display: 'flex', alignItems: 'center', gap: tokens.space4 },
  elevated: { boxShadow: tokens.shadowSoft },
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
