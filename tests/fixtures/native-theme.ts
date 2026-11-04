import { compile } from 'sass-embedded';

// Read the actual compiled source of truth; never maintain a second color table.
export const themeCSS = compile('src/styles/tokens.scss').css;
function values(selector: string): Record<string, string> {
  const block = themeCSS.slice(themeCSS.indexOf(selector)).match(/\{([^}]+)\}/)?.[1];
  if (!block) throw new Error(`Missing native theme: ${selector}`);
  return Object.fromEntries([...block.matchAll(/--t4f-([\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [
    key.replace(/-([a-z\d])/g, (_, c: string) => c.toUpperCase()),
    value.replace(/\s+/g, '').replace(/^#[a-f\d]+$/i, hex => hex.toUpperCase()),
  ]));
}
export const neutralDarkValues = values(':root');
export const neutralLightValues = values('html[data-appearance=light]');
