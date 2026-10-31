import { defaultLocale, localizedPath } from '../src/i18n/locale';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ToolPageFrame from '../src/tools/ToolPageFrame';
import WorkbenchLab from '../src/lab/WorkbenchLab';
import { UiProvider } from '../src/ui/UiProvider';
import * as registry from '../src/tools/registry';
import { imageResizeCropDefinition } from '../src/tools/image-resize-crop/definition';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import { paletteExtractorDefinition } from '../src/tools/palette-extractor/definition';
import type { ToolDefinition } from '../src/tools/types';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { ToolboxDisclosure } from '../src/components/site/ToolboxDisclosure';
import { fixtureTools } from './fixtures/tools';
import { messages } from '../src/i18n/messages';
import { setViewport } from './setup';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('product navigation', () => {
  it.each(['form', 'canvas'] as const)('uses one decorative symbol and one responsive wordmark in %s navigation', mode => {
    render(<ToolPageFrame region="cn" locale="zh" mode={mode} title="Tool">Workspace</ToolPageFrame>);
    const brand = screen.getByRole('link', { name: `Tool4Furry · ${messages.zh.home}` });
    expect(brand.querySelectorAll('[data-brand-symbol][aria-hidden="true"]')).toHaveLength(1);
    expect(brand.querySelectorAll('[data-brand-wordmark]')).toHaveLength(1);
    expect(brand.querySelector('[data-brand-wordmark]')?.textContent).toBe('Tool4Furry');
    expect(brand.querySelector('img')).toBeNull();
  });

  it.each([['cn', 'en'], ['global', 'zh']] as const)('renders %s navigation in independent locale %s', (region, locale) => {
    const { container } = render(<ToolPageFrame region={region} locale={locale} mode="form" title="Tool">Workspace</ToolPageFrame>);
    expect(screen.getByRole('navigation', { name: messages[locale].headerNav })).toBeTruthy();
    expect(screen.getByRole('link', { name: `Tool4Furry · ${messages[locale].home}` }).getAttribute('href')).toBe(localizedPath('/', region, locale));
    expect(container.querySelector('[data-language-link]')?.getAttribute('href')).toBe('/tools/');
  });
  it('uses the shared featured order and homepage cap, without moving the current tool first', async () => {
    vi.stubEnv('DEV', true);
    const entries = fixtureTools(12);
    vi.spyOn(registry, 'getAvailableTools').mockReturnValue(entries);
    const user = userEvent.setup();
    const { container } = render(<ToolPageFrame region="cn" locale="zh" mode="form" title="Current" currentToolId="fixture-12">Workspace</ToolPageFrame>);
    await user.click(screen.getByLabelText(messages.zh.featuredTools, { selector: 'summary' }));
    expect([...container.querySelectorAll('[data-tool-panel] a:not([href="/tools/"])')].map(link => link.getAttribute('href')))
      .toEqual(entries.slice(0, 9).map(tool => `/tools/${tool.slug}/`));
    expect(container.querySelector('[data-tool-panel] [aria-current]')).toBeNull();
    expect(screen.getByRole('link', { name: messages.zh.browseAll }).getAttribute('href')).toBe('/tools/');
  });
  it.each([false, true])('preserves disclosure enhancement before hydration (closing=%s)', async closing => {
    const host = document.createElement('div');
    host.innerHTML = renderToString(<ToolboxDisclosure region="cn" locale="zh" />);
    document.body.append(host);
    const details = host.querySelector('details')!;
    details.open = true;
    if (closing) details.dataset.toolMotion = 'closing';
    details.querySelector('summary')!.setAttribute('aria-expanded', String(!closing));
    const positioner = details.querySelector('[data-tool-positioner]')!;
    positioner.setAttribute('aria-hidden', String(closing));
    positioner.toggleAttribute('inert', closing);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: Root | undefined;
    try {
      await act(async () => { root = hydrateRoot(host, <ToolboxDisclosure region="cn" locale="zh" />); });
      expect(host.querySelector('details')!.open).toBe(true);
      expect(positioner.hasAttribute('inert')).toBe(closing);
      expect(details.querySelector('summary')!.getAttribute('aria-expanded')).toBe(String(!closing));
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      host.remove();
    }
  });
  it('lets keyboard users reach the compact canvas controls and return to their trigger', async () => {
    const user = userEvent.setup();
    render(<ToolPageFrame region="cn" locale="zh" mode="canvas" title="Canvas">Canvas content</ToolPageFrame>);
    const trigger = screen.getByRole('button', { name: messages.zh.navigationOptions });
    await user.click(trigger);
    const language = await screen.findByRole('link', { name: messages.zh.switchLanguage });
    await waitFor(() => expect(document.activeElement).toBe(language));
    expect(language.getAttribute('href')).toBe('/en/tools/');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('uses the shared appearance controller without replacing tool content or focusing the account slot', async () => {
    let appearance: 'light' | 'dark' = 'light';
    vi.stubGlobal('t4fAppearance', {
      get: () => appearance,
      toggle: () => {
        appearance = appearance === 'light' ? 'dark' : 'light';
        window.dispatchEvent(new Event('t4f:appearance'));
      },
    });
    const user = userEvent.setup();
    const { container } = render(
      <ToolPageFrame region="cn" locale="zh" mode="form" title="Tool">
        <input aria-label="Retained value" defaultValue="file loaded" />
      </ToolPageFrame>,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, ' and ready');
    await user.click(screen.getByRole('button', { name: messages.zh.switchDark }));
    expect(appearance).toBe('dark');
    expect(screen.getByRole('button', { name: messages.zh.switchLight }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('file loaded and ready');
    act(() => { appearance = 'light'; window.dispatchEvent(new Event('t4f:appearance')); });
    expect(screen.getByRole('button', { name: messages.zh.switchDark }).getAttribute('aria-pressed')).toBe('true');
    const account = screen.getByRole('img', { name: messages.zh.accountReserved });
    expect(account.matches('button, a, [tabindex]')).toBe(false);
    expect(account.querySelector('svg')?.getAttribute('width')).toBe('20');
    expect(account.querySelector('svg')?.getAttribute('height')).toBe('20');
    const controls = container.querySelector('[data-navigation-controls]')!;
    expect([...controls.children].map(element => element.tagName)).toEqual(['A', 'A', 'BUTTON', 'SPAN']);
    expect(controls.children[1].getAttribute('href')).toBe('https://github.com/librecosta/tool4furry');
    expect(controls.children[1].getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByRole('link', { name: messages.zh.switchLanguage }).getAttribute('href')).toBe('/en/tools/');
  });

  it('keeps form identity in content and lets the Astro intro own the sole H1', () => {
    const { container, rerender } = render(
      <ToolPageFrame region="cn" locale="zh" mode="form" title="Form identity">
        Workspace
      </ToolPageFrame>,
    );
    const header = container.querySelector('[data-tool-page-entry]')!;
    expect(header.querySelector('h1')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Form identity',
    );
    expect(
      screen.getByRole('navigation', { name: messages.zh.headerNav }),
    ).toBeTruthy();
    expect(container.querySelector('summary')!.getAttribute('aria-label')).toBe(messages.zh.featuredTools);
    rerender(
      <ToolPageFrame
        region="cn" locale="zh"
        mode="form"
        title="Form identity"
        intro={<h1>Static intro</h1>}
      >
        Workspace
      </ToolPageFrame>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText('Form identity')).toBeNull();
    expect(container.querySelectorAll('[data-tool-page-entry]')).toHaveLength(1);
  });

  it.each(['cn', 'global'] as const)(
    'keeps the native empty production toolbox and ordinary catalog link in %s',
    async (region) => {
      vi.stubEnv('DEV', false);
      vi.spyOn(registry, 'getAvailableTools').mockReturnValue([]);
      const user = userEvent.setup();
      const t = messages[defaultLocale(region)];
      const { container } = render(
        <ToolPageFrame region={region} locale={defaultLocale(region)} mode="canvas" title="Current identity">
          Workspace
        </ToolPageFrame>,
      );
      expect(container.querySelectorAll('[data-tool-page-entry]')).toHaveLength(
        1,
      );
      expect(
        screen
          .getByRole('link', { name: `Tool4Furry · ${t.home}` })
          .getAttribute('href'),
      ).toBe('/');
      const trigger = container.querySelector('summary')!;
      await user.tab(); // Brand link and toolbox are separate focus targets.
      await user.tab();
      expect(document.activeElement).toBe(trigger);
      await user.click(trigger); // jsdom does not implement native summary Enter activation.
      expect(await screen.findByText(t.empty)).toBeTruthy();
      expect(
        screen
          .getByText(t.empty).closest('[data-tool-panel]')!
          .querySelectorAll(
            'a[href^="/tools/"]:not([href="/tools/"]), a[href^="/lab/"]',
          ),
      ).toHaveLength(0);
      expect(
        screen
          .getByRole('link', { name: t.browseAll })
          .getAttribute('href'),
      ).toBe('/tools/');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(container.querySelector('details')?.open).toBe(true);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('link', { name: t.browseAll }));
      await user.click(trigger);
      expect(container.querySelector('details')?.open).toBe(false);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'Current identity',
      );
    },
  );

  it.each([false, true])('links only available regional tools with DEV=%s, using flat slugs', async (dev) => {
    vi.stubEnv('DEV', dev);
    const entry = (
      id: string,
      status: ToolDefinition['status'],
      regions: ToolDefinition['regions'],
    ): ToolDefinition => ({
      id,
      slug: `${id}-slug`,
      status,
      regions,
      category: 'images',
      group: 'image-processing',
      mode: 'form',
      copy: {
        zh: { title: id, description: '' },
        en: { title: id, description: '' },
      },
    });
    const fixtures = [
      entry('draft', 'draft', ['cn']),
      entry('overseas', 'published', ['global']),
      entry('current', 'published', ['cn']),
    ];
    const original = registry.getAvailableTools;
    const available = vi
      .spyOn(registry, 'getAvailableTools')
      .mockImplementation((region, dev) => original(region, dev, fixtures));
    const user = userEvent.setup();
    render(
      <ToolPageFrame
        region="cn" locale="zh"
        mode="form"
        currentToolId="current"
        title="current"
      >
        Workspace
      </ToolPageFrame>,
    );
    await user.click(screen.getByLabelText(messages.zh.featuredTools, { selector: 'summary' }));
    const item = await screen.findByRole('link', { name: 'current' });
    expect(item.getAttribute('href')).toBe('/tools/current-slug/');
    expect(item.getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('link', { name: 'draft' })?.getAttribute('href') ?? null)
      .toBe(dev ? '/tools/draft-slug/' : null);
    expect(screen.queryByText('overseas')).toBeNull();
    expect(available).toHaveBeenCalledWith('cn', dev, registry.tools);
    expect([...document.querySelectorAll('[data-tool-panel] a[aria-current], [data-tool-panel] a[href$="draft-slug/"]')].map(link => link.getAttribute('href'))).toEqual(dev ? ['/tools/draft-slug/', '/tools/current-slug/'] : ['/tools/current-slug/']);
    expect(registry.tools).toEqual([imageConverterDefinition, imageResizeCropDefinition, paletteExtractorDefinition]); // Fixtures never populate the real registry.
    expect(imageConverterDefinition.status).toBe('published');
    expect(original('cn', false)).toEqual([imageConverterDefinition, imageResizeCropDefinition]);
    expect(original('global', false)).toEqual([imageConverterDefinition, imageResizeCropDefinition]);
  });

  it.each([{ region: 'cn', dev: false }, { region: 'global', dev: false }, { region: 'cn', dev: true }, { region: 'global', dev: true }] as const)('links the real Published Converter in the $region toolbox (DEV=$dev)', async ({ region, dev }) => {
    vi.stubEnv('DEV', dev);
    const user = userEvent.setup();
    render(<ToolPageFrame region={region} locale={defaultLocale(region)} mode="form" currentToolId="image-converter" title="Converter">Workspace</ToolPageFrame>);
    await user.click(screen.getByLabelText(messages[defaultLocale(region)].featuredTools, { selector: 'summary' }));
    const item = await screen.findByRole('link', { name: name => name.startsWith(imageConverterDefinition.copy[defaultLocale(region)].title) });
    expect(item.getAttribute('href')).toBe('/tools/image-converter/');
    expect(item.getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText(messages[defaultLocale(region)].empty)).toBeNull();
    expect(imageConverterDefinition.status).toBe('published');
  });

  it('separates DEV navigation from the toolbox and local canvas actions', async () => {
    setViewport();
    const user = userEvent.setup();
    const { container } = render(
      <UiProvider labels={messages.zh}>
        <WorkbenchLab region="cn" locale="zh" mode="canvas" />
      </UiProvider>,
    );
    expect(container.querySelectorAll('[data-tool-page-entry]')).toHaveLength(
      1,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'DEMO · 画布',
    );
    expect(screen.getByRole('button', { name: '选择' })).toBeTruthy();
    expect(container.querySelectorAll('a[href^="/lab/"]')).toHaveLength(0);
    await user.click(
      screen.getByRole('button', { name: '开发预览 · DEV ONLY' }),
    );
    const menu = await screen.findByRole('menu', {
      name: '开发预览 · DEV ONLY',
    });
    expect(
      [...menu.querySelectorAll('a')].map((link) => link.getAttribute('href')),
    ).toEqual([
      '/lab/canvas',
      '/lab/form',
      '/lab/batch',
      '/lab/ui',
      '/lab/files',
      '/lab/hero-effects',
    ]);
    expect(
      screen
        .getByRole('menuitem', { name: '画布' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });
});
