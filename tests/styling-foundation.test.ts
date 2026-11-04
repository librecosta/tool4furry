import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { compile, initCompiler } from 'sass-embedded';
import { describe, expect, it } from 'vitest';
import { themeCSS } from './fixtures/native-theme';

const sourceRoot = resolve('src');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
const source = (file: string) => readFileSync(file, 'utf8');
const nativeFiles = files(sourceRoot);

describe('V0.9 native styling foundation', () => {
  it('preserves every approved Dark/Light token in the compiled source of truth', () => {
    // Baselines cover all 67 original tokens per appearance without copying their
    // values into another runtime/test color table. Contrast tests read the SCSS.
    for (const [selector, hash] of [
      [':root', 'd042076da163c31137ffa1a0632fd1f381ab65ed8adbb84a30b8d0ff475b7544'],
      ['html[data-appearance=light]', 'b0c638c35baace6c0e700103e04c08158f502d85d2015934796e84d5112536c7'],
    ]) {
      const block = themeCSS.slice(themeCSS.indexOf(selector)).match(/\{([^}]+)\}/)?.[1];
      expect(block, selector).toBeTruthy();
      const values = [...block!.matchAll(/(--t4f-[\w-]+):\s*([^;]+);/g)]
        .map(([, key, value]) => [key, value.replace(/\s+/g, '').toLowerCase()])
        .sort(([a], [b]) => a.localeCompare(b));
      expect(values).toHaveLength(67);
      expect(createHash('sha256').update(JSON.stringify(values)).digest('hex'), selector).toBe(hash);
    }
    const css = compile('src/styles/global.scss').css;
    expect(css.indexOf('@layer reset, base, t4f-controls, t4f-ui, t4f-tools;')).toBeLessThan(css.indexOf('@layer base {'));
    expect(css).toContain('DM Sans Variable');
    expect(css).toContain('html[data-appearance=light] [data-appearance-icon=dark]');
  });

  it('compiles every owned module and resolves static classes and theme variables for Astro, tools and Lab', () => {
    const compiler = initCompiler();
    try {
      const cache = new Map<string, string>();
      const cssFor = (file: string) => {
        if (!cache.has(file)) cache.set(file, compiler.compile(file).css);
        return cache.get(file)!;
      };
      const variables = new Set([...themeCSS.matchAll(/(--t4f-[\w-]+):/g)].map(([, key]) => key));
      variables.add('--t4f-font-sans'); variables.add('--t4f-font-mono');
      for (const file of nativeFiles.filter(file => /\.(astro|tsx)$/.test(file))) {
        const text = source(file);
        for (const [, alias, module] of text.matchAll(/import (\w+) from '([^']+\.module\.scss)'/g)) {
          const css = cssFor(resolve(dirname(file), module));
          const classes = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(([, name]) => name));
          for (const [, name] of text.replace(/^import .*$/gm, '').matchAll(new RegExp('\\b' + alias + '\\.(\\w+)', 'g'))) {
            expect(classes.has(name), file + ' ' + alias + '.' + name).toBe(true);
          }
          for (const [, name] of css.matchAll(/var\((--t4f-[\w-]+)/g)) expect(variables.has(name), file + ' ' + name).toBe(true);
        }
      }
      for (const file of nativeFiles.filter(file => file.endsWith('.module.scss'))) cssFor(file);
      const controller = source(join(sourceRoot, 'site/catalog-controller.ts'));
      expect(controller).toContain('ToolsCatalog.module.scss');
      const catalogCSS = cssFor(join(sourceRoot, 'components/site/ToolsCatalog.module.scss'));
      for (const [, name] of controller.matchAll(/\bstyles\.(\w+)/g)) expect(catalogCSS).toContain('.' + name + ' {');
    } finally {
      compiler.dispose();
    }
  });

  it('retires all source, plugin, dependency and theme-class bridges while retaining synchronous theme restoration', () => {
    const forbidden = /@stylexjs|stylex\.(props|attrs|create)|\bxstyle\b|tokens\.stylex|Field\.legacy|FileTaskList\.legacy|virtual:stylex|stylex-dev-css/;
    for (const file of [...nativeFiles.filter(file => /\.(astro|tsx?|js|scss)$/.test(file)), 'astro.config.mjs', 'vitest.config.ts', 'package.json', 'pnpm-lock.yaml']) {
      expect(source(file), file).not.toMatch(forbidden);
    }
    const layout = source(join(sourceRoot, 'layouts/SiteLayout.astro'));
    expect(layout).toContain('data-appearance={theme.appearance}');
    expect(layout).toContain("import '../styles/global.scss'");
    expect(layout).toMatch(/<head>[\s\S]*<script is:inline id="t4f-appearance"/);
    expect(layout).not.toMatch(/data-dark=|data-light=/);
    const appearance = source(join(sourceRoot, 'styles/appearance-controller.js'));
    expect(appearance).toContain('root.dataset.appearance = value');
    expect(appearance).not.toContain('root.classList');
  });
});
