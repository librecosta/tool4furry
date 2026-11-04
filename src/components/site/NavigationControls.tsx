import { type Locale } from '../../i18n/locale';
import { useSyncExternalStore } from 'react';
import { SunIcon, MoonIcon, UserIcon, GithubLogoIcon } from '@phosphor-icons/react';
import type { Region } from '../../config/region';
import type { LanguageLink } from '../../site/language';
import { messages } from '../../i18n/messages';
import {
  currentAppearance, subscribeAppearance, toggleAppearance,
} from '../../styles/appearance';
import n from './NavigationControls.module.scss';

const serverAppearance = () => undefined;

export function NavigationControls({ locale, link }: {
  region: Region; locale: Locale;
  link: LanguageLink;
}) {
  const t = messages[locale];
  const appearance = useSyncExternalStore(
    subscribeAppearance, currentAppearance, serverAppearance,
  );
  const label = appearance === undefined
    ? t.appearanceControl
    : appearance === 'light' ? t.switchDark : t.switchLight;
  return (
    <div data-navigation-controls className={n.actions}>
      <a
        data-language-link href={link.href} hrefLang={link.hreflang}
        aria-label={t.switchLanguage} className={[n.control, n.controlMotion].filter(Boolean).join(' ')}
      >
        <span aria-hidden className={n.currentLanguage}>{link.current}</span>
        <span aria-hidden className={n.targetLanguage}> / </span>
        <span lang={link.hreflang} className={n.targetLanguage}>{link.target}</span>
      </a>
      <a href="https://github.com/librecosta/tool4furry" target="_blank" rel="noopener noreferrer" aria-label={t.github} className={[n.control, n.controlMotion, n.github].filter(Boolean).join(' ')}>
        <GithubLogoIcon size={20} aria-hidden />
      </a>
      <button
        type="button" data-appearance-toggle="react" aria-label={label} title={label}
        aria-pressed={appearance === undefined ? undefined : appearance === 'light'}
        disabled={appearance === undefined}
        onClick={event => toggleAppearance(event.currentTarget)} className={[n.control, n.controlMotion].filter(Boolean).join(' ')}
      >
        <span data-appearance-icon="light" className={n.appearanceIcon}><SunIcon size={20} aria-hidden className={n.svg} /></span>
        <span data-appearance-icon="dark" className={n.appearanceIcon}><MoonIcon size={20} aria-hidden className={n.svg} /></span>
      </button>
      <span
        data-account-slot role="img" aria-label={t.accountReserved}
        className={n.account}
      >
        <UserIcon size={20} aria-hidden />
      </span>
    </div>
  );
}
