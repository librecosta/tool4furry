import { region } from './site';
import { languageLink } from '../site/language';

/** Local preview overrides never reach production links. */
export function pageLanguageLink(pathname: string) {
  return languageLink(pathname, region, undefined,
    import.meta.env.DEV ? import.meta.env.T4F_DEV_LANGUAGE_ORIGIN : undefined);
}
