import { localizedPath, type Locale } from '../i18n/locale';
import type { ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { DotsThreeIcon } from '@phosphor-icons/react';
import type { Region } from '../config/region';
import type { WorkspaceMode } from './types';
import { messages } from '../i18n/messages';
import c from '../ui/controls.module.scss';
import menu from '../styles/menu.module.scss';
import site from '../layouts/SiteLayout.module.scss';
import brand from '../components/site/Brand.module.scss';
import introStyles from '../components/site/ToolIntro.module.scss';
import n from '../components/site/NavigationControls.module.scss';
import s from './ToolPageFrame.module.scss';
import { NavigationControls } from '../components/site/NavigationControls';
import { ToolboxDisclosure } from '../components/site/ToolboxDisclosure';
import { languageLink, type LanguageLink } from '../site/language';

// Product navigation belongs to page composition, never to a tool's local modes.
export default function ToolPageFrame({
  region,
  locale,
  mode,
  title,
  currentToolId,
  debug,
  children,
  intro,
  navigation,
}: {
  region: Region; locale: Locale;
  mode: WorkspaceMode;
  title: string;
  currentToolId?: string;
  debug?: ReactNode;
  children: ReactNode;
  intro?: ReactNode;
  navigation?: LanguageLink;
}) {
  const t = messages[locale];
  const floating = mode === 'canvas' && !intro;
  const alternate = navigation ?? languageLink(localizedPath('/tools/', region, locale), region);
  return (
    <div className={[s.frame, floating && s.canvasFrame].filter(Boolean).join(' ')}>
      <header
        data-tool-page-entry
        className={[
          !floating && site.productHeader,
          !floating && site.fullBleed,
          floating && s.header,
          floating && s.floating,
        ].filter(Boolean).join(' ')}
      >
        <nav
          aria-label={t.headerNav}
          className={[
            !floating && site.fluid,
            !floating && site.nav,
            floating && s.entry,
            floating && s.elevated,
          ].filter(Boolean).join(' ')}
        >
          <div
            className={[
              !floating && site.navLinks,
              floating && s.canvasLinks,
            ].filter(Boolean).join(' ')}
          >
            <a
              href={localizedPath('/', region, locale)}
              aria-label={`Tool4Furry · ${t.home}`}
              className={[
                !floating && brand.brand,
                brand.navigationBrand,
                floating && c.button,
                floating && c.ghost,
                floating && s.brand,
              ].filter(Boolean).join(' ')}
            >
              <span
                data-brand-symbol aria-hidden="true"
                className={[brand.symbol, !floating && brand.mark].filter(Boolean).join(' ')}
              />
              <span data-brand-wordmark className={brand.brandFull}>Tool4Furry</span>
              <span aria-hidden className={brand.brandShort}>T4F</span>
            </a>
            <ToolboxDisclosure region={region} locale={locale} currentToolId={currentToolId} compact={floating} />
          </div>
          {floating && (
            <h1 title={title} className={s.title}>
              {title}
            </h1>
          )}
          {!floating && (
            <div className={n.actions}>
              <NavigationControls region={region} locale={locale} link={alternate} />
              {debug && <div className={s.debug}>{debug}</div>}
            </div>
          )}
          {floating && debug}
          {floating && (
            <Popover.Root>
              <Popover.Trigger
                aria-label={t.navigationOptions}
                className={n.control}
              >
                <DotsThreeIcon size={22} aria-hidden />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  align="end" sideOffset={8} collisionPadding={16}
                  className={menu.positioner}
                >
                  <Popover.Popup
                    aria-label={t.navigationOptions}
                    className={[menu.popup, n.chrome].filter(Boolean).join(' ')}
                  >
                    <NavigationControls region={region} locale={locale} link={alternate} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          )}
        </nav>
      </header>
      {!intro && !floating && (
        <div className={[site.fluid, introStyles.toolIntro].filter(Boolean).join(' ')}>
          <h1 className={introStyles.toolTitle}>{title}</h1>
        </div>
      )}
      {intro}
      {children}
    </div>
  );
}
