import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ToolPageFrame from '../src/tools/ToolPageFrame';
import WorkbenchLab from '../src/lab/WorkbenchLab';
import { UiProvider } from '../src/ui/UiProvider';
import * as registry from '../src/tools/registry';
import { imageConverterDefinition } from '../src/tools/image-converter/definition';
import type { ToolDefinition } from '../src/tools/types';
import { messages } from '../src/i18n/messages';
import { setViewport } from './setup';

afterEach(() => vi.restoreAllMocks());

describe('product navigation', () => {
  it('lets keyboard users reach the compact canvas controls and return to their trigger', async () => {
    const user = userEvent.setup();
    render(<ToolPageFrame region="cn" mode="canvas" title="Canvas">Canvas content</ToolPageFrame>);
    const trigger = screen.getByRole('button', { name: messages.cn.navigationOptions });
    await user.click(trigger);
    const language = await screen.findByRole('link', { name: messages.cn.switchLanguage });
    await waitFor(() => expect(document.activeElement).toBe(language));
    expect(language.getAttribute('href')).toBe('https://tool4furry.com/tools/');
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
      <ToolPageFrame region="cn" mode="form" title="Tool">
        <input aria-label="Retained value" defaultValue="file loaded" />
      </ToolPageFrame>,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, ' and ready');
    await user.click(screen.getByRole('button', { name: messages.cn.switchDark }));
    expect(appearance).toBe('dark');
    expect(screen.getByRole('button', { name: messages.cn.switchLight }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('textbox')).toBe(input);
    expect(input.value).toBe('file loaded and ready');
    act(() => { appearance = 'light'; window.dispatchEvent(new Event('t4f:appearance')); });
    expect(screen.getByRole('button', { name: messages.cn.switchDark }).getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-account-slot]')?.matches('button, a, [tabindex]')).toBe(false);
    expect(screen.getByRole('link', { name: messages.cn.switchLanguage }).getAttribute('href')).toBe('https://tool4furry.com/tools/');
  });

  it('keeps form identity in content and lets the Astro intro own the sole H1', () => {
    const { container, rerender } = render(
      <ToolPageFrame region="cn" mode="form" title="Form identity">
        Workspace
      </ToolPageFrame>,
    );
    const header = container.querySelector('[data-tool-page-entry]')!;
    expect(header.querySelector('h1')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Form identity',
    );
    expect(
      screen.getByRole('navigation', { name: messages.cn.headerNav }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: messages.cn.tools }).textContent,
    ).toBe(messages.cn.tools);
    rerender(
      <ToolPageFrame
        region="cn"
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
    'shows an honest empty toolbox in %s with keyboard dismissal',
    async (region) => {
      const user = userEvent.setup();
      const t = messages[region];
      const { container } = render(
        <ToolPageFrame region={region} mode="canvas" title="Current identity">
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
      const trigger = screen.getByRole('button', { name: t.tools });
      await user.tab(); // Brand link and toolbox are separate focus targets.
      await user.tab();
      expect(document.activeElement).toBe(trigger);
      await user.keyboard('{Enter}');
      expect(await screen.findByText(t.empty)).toBeTruthy();
      expect(
        screen
          .getByRole('menu', { name: t.tools })
          .querySelectorAll(
            'a[href^="/tools/"]:not([href="/tools/"]), a[href^="/lab/"]',
          ),
      ).toHaveLength(0);
      expect(
        screen
          .getByRole('menuitem', { name: t.browseAll })
          .getAttribute('href'),
      ).toBe('/tools/');
      expect(
        screen.getByRole('menuitem', { name: t.back }).getAttribute('href'),
      ).toBe('/');
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('menuitem', { name: t.browseAll }),
        ),
      );
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      expect(document.activeElement).toBe(trigger);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'Current identity',
      );
    },
  );

  it('only links registry tools published for this region, using flat slugs', async () => {
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
        cn: { title: id, description: '' },
        global: { title: id, description: '' },
      },
    });
    const fixtures = [
      entry('draft', 'draft', ['cn']),
      entry('overseas', 'published', ['global']),
      entry('current', 'published', ['cn']),
    ];
    const original = registry.getPublishedTools;
    const published = vi
      .spyOn(registry, 'getPublishedTools')
      .mockImplementation((region) => original(region, fixtures));
    const user = userEvent.setup();
    render(
      <ToolPageFrame
        region="cn"
        mode="form"
        currentToolId="current"
        title="current"
      >
        Workspace
      </ToolPageFrame>,
    );
    await user.click(screen.getByRole('button', { name: messages.cn.tools }));
    const item = await screen.findByRole('menuitem', { name: 'current' });
    expect(item.getAttribute('href')).toBe('/tools/current-slug/');
    expect(item.getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText('draft')).toBeNull();
    expect(screen.queryByText('overseas')).toBeNull();
    expect(published).toHaveBeenCalledWith('cn');
    expect(registry.tools).toEqual([imageConverterDefinition]); // Fixtures never populate the real registry.
    expect(imageConverterDefinition.status).toBe('draft');
    expect(original('cn')).toEqual([]);
    expect(original('global')).toEqual([]);
  });

  it('separates DEV navigation from the toolbox and local canvas actions', async () => {
    setViewport();
    const user = userEvent.setup();
    const { container } = render(
      <UiProvider labels={messages.cn}>
        <WorkbenchLab region="cn" mode="canvas" />
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
    ]);
    expect(
      screen
        .getByRole('menuitem', { name: '画布' })
        .getAttribute('aria-current'),
    ).toBe('page');
  });
});
