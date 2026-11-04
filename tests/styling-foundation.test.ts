import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { compile } from 'sass-embedded';
import { describe, expect, it } from 'vitest';
import { neutralDarkValues, neutralLightValues } from '../src/styles/tokens.stylex';

const sourceRoot = resolve('src');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
const source = (file: string) => readFileSync(file, 'utf8');
const variable = (key: string) => '--t4f-' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()).replace(/([a-z])(\d+)/g, '$1-$2');
const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase().replace(/\d*\.\d+/g, number => String(Number(number)));

describe('V0.9-A native styling foundation', () => {
  it('compiles the global SCSS with every native token equal to the retained React theme', () => {
    const css = compile(join(sourceRoot, 'styles/global.scss')).css;
    for (const [selector, values] of [[':root', neutralDarkValues], ['html[data-appearance=light]', neutralLightValues]] as const) {
      const block = css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/)?.[1];
      expect(block, selector).toBeTruthy();
      const actual = Object.fromEntries([...block!.matchAll(/(--t4f-[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, normalize(value)]));
      expect(Object.keys(actual).sort()).toEqual(Object.keys(values).map(variable).sort());
      for (const [key, value] of Object.entries(values)) expect(actual[variable(key)], selector + ' ' + key).toBe(normalize(value));
    }
    expect(css.indexOf('@layer reset, base;')).toBeLessThan(css.indexOf('@layer base {'));
    expect(css).toContain('DM Sans Variable');
    expect(css).toContain('html[data-appearance=light] [data-appearance-icon=dark]');
  });

  it('resolves every static Astro class through its owned SCSS module, without a StyleX component binding', () => {
    for (const file of files(sourceRoot).filter(file => file.endsWith('.astro'))) {
      const astro = source(file);
      if (!file.endsWith('SiteLayout.astro')) expect(astro, file).not.toContain('@stylexjs/stylex');
      const module = astro.match(/import styles from '([^']+\.module\.scss)'/);
      if (!module) continue;
      const css = compile(resolve(dirname(file), module[1])).css;
      const classes = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(([, name]) => name));
      for (const [, name] of astro.matchAll(/\bstyles\.(\w+)/g)) expect(classes.has(name), file + ' styles.' + name).toBe(true);
      for (const [, name] of css.matchAll(/var\((--t4f-[\w-]+)/g)) {
        expect([...Object.keys(neutralDarkValues).map(variable), '--t4f-font-sans', '--t4f-font-mono'], file + ' ' + name).toContain(name);
      }
    }
    const controller = source(join(sourceRoot, 'site/catalog-controller.ts'));
    expect(controller).toContain('ToolsCatalog.module.scss');
    expect(controller).not.toContain('stylex');
    const catalogCSS = compile(join(sourceRoot, 'components/site/ToolsCatalog.module.scss')).css;
    for (const [, name] of controller.matchAll(/\bstyles\.(\w+)/g)) expect(catalogCSS).toContain('.' + name + ' {');
  });

  it('keeps only the root theme bridge and existing DEV patch in the Astro layout', () => {
    const layout = source(join(sourceRoot, 'layouts/SiteLayout.astro'));
    expect(layout).toContain('stylex.attrs(theme.style).class');
    expect(layout).toContain('data-appearance={theme.appearance}');
    expect(layout).toContain("import '../styles/global.scss'");
    expect(layout).toContain('/src/styles/stylex-dev-css.ts');
    expect(layout).not.toMatch(/styles\/(?:site|navigation|catalog)['"]/);
    expect(layout).not.toContain('tokens.focus');
  });
});
