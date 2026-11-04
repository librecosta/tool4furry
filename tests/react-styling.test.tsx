import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { compile } from 'sass-embedded';
import { act, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import WorkbenchShell from '../src/workbench/WorkbenchShell';
import { messages } from '../src/lab/messages';
import { setViewport } from './setup';

const source = (file: string) => readFileSync(resolve(file), 'utf8');
const ui = readdirSync('src/ui').filter(file => file.endsWith('.tsx')).map(file => 'src/ui/' + file);
const migrated = [...ui, 'src/workbench/WorkbenchShell.tsx', 'src/tools/ToolPageFrame.tsx',
  'src/tools/ToolRuntime.tsx', 'src/components/site/ToolboxDisclosure.tsx', 'src/components/site/NavigationControls.tsx'];

describe('React native styling and legacy boundary', () => {
  it('compiles and resolves every public component class without StyleX base styling', () => {
    for (const file of migrated) {
      const text = source(file);
      if (!file.endsWith('/Button.tsx')) expect(text, file).not.toContain('@stylexjs/stylex');
      expect(text, file).not.toContain('stylex.create');
      for (const [, alias, module] of text.matchAll(/import (\w+) from '([^']+\.module\.scss)'/g)) {
        const css = compile(resolve(dirname(file), module)).css;
        const classes = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(([, name]) => name));
        for (const [, name] of text.replace(/^import .*$/gm, '').matchAll(new RegExp('\\b' + alias + '\\.(\\w+)', 'g'))) {
          expect(classes.has(name), `${file}: ${alias}.${name}`).toBe(true);
        }
      }
    }
    // Both rendering mechanisms import the exact same navigation asset.
    for (const name of ['NavigationControls', 'ToolboxDisclosure']) {
      for (const extension of ['tsx', 'astro']) {
        expect(source(`src/components/site/${name}.${extension}`)).toContain(`'./${name}.module.scss'`);
      }
    }
  });

  it('orders native controls below component variants and legacy tool overrides', () => {
    const order = "['reset', 'base', 't4f-controls', 't4f-ui']";
    expect(source('astro.config.mjs')).toContain('before: ' + order);
    expect(compile('src/styles/global.scss').css).toContain('@layer reset, base, t4f-controls, t4f-ui;');
    expect(compile('src/ui/controls.module.scss').css).toContain('@layer t4f-controls');
    expect(compile('src/ui/controls.module.scss').css).toContain('.invalid.invalid');
    expect(compile('src/ui/FileDropzone.module.scss').css).toContain('@layer t4f-ui');
    const button = source('src/ui/Button.tsx');
    expect(button).toContain('stylex.props(xstyle)');
    expect(button).not.toContain('stylex.props(controls.');
    expect(source('src/ui/Field.tsx')).toContain("export { fieldStyles } from './Field.legacy'");
    expect(source('src/ui/FileTaskList.tsx')).toContain("export { fileTaskStyles } from './FileTaskList.legacy'");
  });

  it('styles Base UI portal states without a workspace ancestor', () => {
    const select = compile('src/ui/SelectField.module.scss').css;
    expect(select).toContain('[data-selected]');
    expect(select).toContain('[data-highlighted]');
    expect(select).toContain('[data-disabled]');
    expect(select).toContain('var(--anchor-width)');
    expect(select).toContain('var(--available-height)');
    for (const name of ['SelectField', 'Tooltip', 'ConfirmDialog', 'FilePreviewDialog', 'Toast']) {
      const css = compile(`src/ui/${name}.module.scss`).css;
      expect(css).toContain('var(--t4f-surface-floating)');
      expect(css).toContain('var(--t4f-layer-');
      expect(css).not.toContain('[data-workbench]');
    }
    const motion = compile('src/styles/motion.module.scss').css;
    expect(motion).toContain('[data-starting-style]');
    expect(motion).toContain('[data-ending-style]');
    expect(motion).toContain('prefers-reduced-motion: reduce');
  });

  it('hydrates a narrow Canvas without replacing the workspace or parameter draft', async () => {
    const resize = setViewport(true);
    const view = <WorkbenchShell mode="canvas" labels={messages.en}
      right={<input aria-label="Parameter draft" defaultValue="source" />}>
      <input aria-label="Canvas state" defaultValue="kept" />
    </WorkbenchShell>;
    const host = document.createElement('div');
    host.innerHTML = renderToString(view);
    document.body.append(host);
    const canvas = host.querySelector('[data-canvas-viewport]');
    const main = host.querySelector('input');
    const errors: unknown[] = [];
    let root: Root | undefined;
    try {
      await act(async () => { root = hydrateRoot(host, view, { onRecoverableError: error => errors.push(error) }); });
      expect(errors).toEqual([]);
      expect(host.querySelector('[data-canvas-viewport]')).toBe(canvas);
      expect(host.querySelector('input[aria-label="Canvas state"]')).toBe(main);
      const opener = host.querySelector<HTMLButtonElement>('[aria-controls][aria-expanded]')!;
      expect(opener.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(opener);
      const draft = host.querySelector<HTMLInputElement>('input[aria-label="Parameter draft"]')!;
      expect(host.querySelector('[role="dialog"]')).toBeTruthy();
      draft.value = 'retained';
      act(() => resize(false));
      act(() => resize(true));
      expect(host.querySelectorAll('input[aria-label="Parameter draft"]')).toHaveLength(1);
      expect(host.querySelector('input[aria-label="Parameter draft"]')).toBe(draft);
      expect(draft.value).toBe('retained');
      const css = compile('src/workbench/WorkbenchShell.module.scss').css;
      expect(css).toContain('@media (max-width: 900px)');
      expect(css).toContain('height: 100dvh');
      expect(source('src/workbench/WorkbenchShell.tsx')).not.toContain('{compact &&');
    } finally {
      await act(async () => root?.unmount());
      host.remove();
    }
  });
});
