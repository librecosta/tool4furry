import { useSyncExternalStore } from 'react';
import { SunIcon, MoonIcon, UserIcon, GithubLogoIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { Region } from '../../config/region';
import type { LanguageLink } from '../../site/language';
import { messages } from '../../i18n/messages';
import {
  currentAppearance, subscribeAppearance, toggleAppearance,
} from '../../styles/appearance';
import { navigationStyles as n } from '../../styles/navigation';

const serverAppearance = () => undefined;

export function NavigationControls({ region, link }: {
  region: Region;
  link: LanguageLink;
}) {
  const t = messages[region];
  const appearance = useSyncExternalStore(
    subscribeAppearance, currentAppearance, serverAppearance,
  );
  const label = appearance === undefined
    ? t.appearanceControl
    : appearance === 'light' ? t.switchDark : t.switchLight;
  return (
    <div data-navigation-controls {...stylex.props(n.actions)}>
      <a
        data-language-link href={link.href} hrefLang={link.hreflang}
        aria-label={t.switchLanguage} {...stylex.props(n.control)}
      >
        <span aria-hidden {...stylex.props(n.currentLanguage)}>{link.current} / </span>
        <span lang={link.hreflang}>{link.target}</span>
      </a>
      <a href="https://github.com/librecosta/tool4furry" target="_blank" rel="noopener noreferrer" aria-label={t.github} {...stylex.props(n.control)}>
        <GithubLogoIcon size={20} aria-hidden />
      </a>
      <button
        type="button" data-appearance-toggle="react" aria-label={label} title={label}
        aria-pressed={appearance === undefined ? undefined : appearance === 'light'}
        disabled={appearance === undefined}
        onClick={toggleAppearance} {...stylex.props(n.control)}
      >
        <span data-appearance-icon="light" {...stylex.props(n.appearanceIcon)}><SunIcon size={20} aria-hidden {...stylex.props(n.svg)} /></span>
        <span data-appearance-icon="dark" {...stylex.props(n.appearanceIcon)}><MoonIcon size={20} aria-hidden {...stylex.props(n.svg)} /></span>
      </button>
      <span
        data-account-slot role="img" aria-label={t.accountReserved}
        {...stylex.props(n.account)}
      >
        <UserIcon size={20} aria-hidden />
      </span>
    </div>
  );
}
