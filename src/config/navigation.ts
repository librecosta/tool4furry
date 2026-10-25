import { region } from './site';
import { languageLink } from '../site/language';

export function pageLanguageLink(pathname: string) {
  return languageLink(pathname, region, undefined, import.meta.env.DEV);
}
