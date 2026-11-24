import { describe, expect, it } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo } from '@codemirror/commands';
import { insertNewlineContinueMarkup, markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { example, renderMarkdown } from '../src/tools/markdown-editor/core';
import { formatCommand } from '../src/tools/markdown-editor/commands';
import { exportName, htmlDocument, readMarkdown } from '../src/tools/markdown-editor/delivery';
import { interpolate } from '../src/tools/markdown-editor/scrollSync';

async function rendered(source: string, options?: Parameters<typeof renderMarkdown>[1]) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = await renderMarkdown(source, options);
  return wrapper;
}

describe('Markdown rendering and delivery', () => {
  it('renders the English sample with GFM, highlighting, math and mapped source lines', async () => {
    const el = await rendered(example, { preview: true });
    expect(el.querySelector('h1')?.textContent).toBe('A little more clarity.');
    expect(el.querySelector('h2')?.closest('[data-md-line]')?.getAttribute('data-md-line')).toBe('5');
    expect(el.querySelector('input[type=checkbox][disabled][checked]')).not.toBeNull();
    expect(el.querySelector('blockquote')?.textContent).toContain('Every detail matters.');
    expect(el.querySelector('table td')?.textContent).toBe('Editor');
    expect(el.querySelector('pre .hljs-keyword')?.textContent).toBe('const');
    expect(el.querySelector('button[data-md-copy]')).not.toBeNull();
    expect(el.querySelectorAll('math')).toHaveLength(2);
    expect(el.querySelector('.katex-html [style]')).not.toBeNull();
    expect(el.querySelector('.md-alert-tip svg')).not.toBeNull();
  });

  it('keeps reference links, maps blocks across definitions and ignores unknown code languages', async () => {
    const source = '[docs]: https://example.org/help\n\n# 中文\n\n[See docs][docs]\n\n```made-up\n<example>\n```\n\n$$x^2$$\n\n## Again\n';
    const el = await rendered(source, { preview: true });
    expect(el.querySelector('h1')?.parentElement?.dataset.mdLine).toBe('3');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://example.org/help');
    expect(el.querySelector('pre code')?.textContent).toBe('<example>');
    expect(el.querySelector('.md-code-label')?.textContent).toContain('made-up');
    expect(el.querySelector('h2')?.parentElement?.dataset.mdLine).toBe('13');
    expect(el.querySelector('.md-math-block math')).not.toBeNull();
  });

  it('recognizes the five exact alert forms and keeps ordinary quotes', async () => {
    const kinds = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
    const source = kinds.map(kind => `> [!${kind}]\n> **Details**\n> \n> - One`).join('\n\n') +
      '\n\n> [!NOTE] and inline words\n\n> A regular quote\n';
    const el = await rendered(source);
    expect([...el.querySelectorAll('.md-alert')].map(item => item.querySelector('strong')?.textContent)).toEqual(kinds.map(() => 'Details'));
    expect(el.querySelectorAll('blockquote')).toHaveLength(2);
    expect(el.querySelectorAll('.md-alert svg')).toHaveLength(5);
  });

  it('leaves money, escaped delimiters, and code alone and keeps broken math local', async () => {
    const source = `The prices are $5 and $10. Escaped: \\$x$. Inline code: \`$x^2$\`. Good: $2+2$.

$$
\\sqrt{2}
$$

$\\notAFunction{x}$

\`\`\`plain
$$noMath$$
\`\`\``;
    const el = await rendered(source);
    expect([...el.querySelectorAll('math annotation')].map(node => node.textContent)).toEqual(['2+2', '\\sqrt{2}']);
    expect(el.querySelector('.md-math-source')?.textContent).toContain('notAFunction');
    expect(el.querySelector('pre code')?.textContent).toBe('$$noMath$$');
    expect(el.textContent).toContain('The prices are $5 and $10. Escaped: $x$.');
  });

  it('blocks author HTML, active resources, unsafe protocols and untrusted math even with consent', async () => {
    const source = String.raw`![A useful alt](https://example.org/picture.png)

![Data](data:image/png;base64,AA) ![Relative](/picture.png) ![Mixed](//example.org/mixed)

[bad](javascript:alert%281%29) [ok](https://example.org/)

<img src="https://example.org/raw" onerror="alert(1)"><form><input></form><svg onload="alert(1)"></svg>
<iframe src="https://example.org/"></iframe><style>body{background:url(https://example.org/)}</style>

$\includegraphics{https://example.org/bad.png}$
`;
    const off = await rendered(source, { preview: true });
    expect(off.querySelectorAll('img')).toHaveLength(0);
    expect(off.querySelector('.md-image-placeholder')?.textContent).toBe('A useful alt');
    const on = await rendered(source, { preview: true, allowImages: true });
    expect([...on.querySelectorAll('img')].map(image => image.src)).toEqual(['https://example.org/picture.png']);
    expect(on.querySelector('img')?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(on.querySelector('iframe,form,style,svg,[onload],[onerror],[href^="javascript:"]')).toBeNull();
    expect(on.querySelector('a[href^="https:"]')).not.toBeNull();
    const outbound = await rendered(source, { allowImages: true });
    expect(outbound.querySelector('img')).toBeNull();
  });

  it('decodes UTF-8 strictly, keeps file basenames and makes offline HTML with native math', async () => {
    expect(await readMarkdown(new File(['# 中文 😀'], 'Notes.MARKDOWN'))).toBe('# 中文 😀');
    await expect(readMarkdown(new File(['unexpected'], 'Notes.txt.exe'))).rejects.toThrow('Choose');
    await expect(readMarkdown(new File([Uint8Array.of(0xff)], 'bad.txt'))).rejects.toThrow('UTF-8');
    expect(exportName('Notes.MARKDOWN', 'html')).toBe('Notes.html');
    expect(exportName('journal.txt', 'md')).toBe('journal.md');
    expect(exportName('笔记 2026.html', 'md')).toBe('笔记 2026.md');
    expect(exportName('笔记 2026.html', 'html')).toBe('笔记 2026.html');
    const html = htmlDocument(await renderMarkdown(example), 'A <b> document', 'en');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('title')?.textContent).toBe('A <b> document');
    expect(doc.querySelector('meta[charset]')?.getAttribute('charset')).toBe('utf-8');
    expect(doc.querySelector('meta[http-equiv]')?.getAttribute('content')).toContain("default-src 'none'");
    expect(doc.querySelector('main math')).not.toBeNull();
    expect(doc.querySelector('.katex-html,script,link,img,[data-md-copy]')).toBeNull();
    await expect(renderMarkdown('x'.repeat(1_200_001))).rejects.toThrow('budget');
  });
});

describe('CodeMirror Markdown commands', () => {
  function editor(text: string, from: number, to = from) {
    return new EditorView({ state: EditorState.create({
      doc: text, selection: EditorSelection.single(from, to), extensions: [history(), markdown({ extensions: [GFM] })],
    }) });
  }

  it('wraps the actual selection, preserves it and uses undo and redo', () => {
    const view = editor('before selected after', 7, 15);
    try {
      formatCommand('bold')(view);
      expect(view.state.doc.toString()).toBe('before **selected** after');
      expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe('selected');
      undo(view);
      expect(view.state.doc.toString()).toBe('before selected after');
      redo(view);
      expect(view.state.doc.toString()).toBe('before **selected** after');
    } finally { view.destroy(); }
  });

  it('replaces existing headings, formats selected lines and continues a Markdown list', () => {
    const view = editor('# One\nTwo\nThree', 2, 9);
    try {
      formatCommand(3)(view);
      expect(view.state.doc.toString()).toBe('### One\n### Two\nThree');
      view.dispatch({ selection: { anchor: 0, head: 15 } });
      formatCommand('task')(view);
      expect(view.state.doc.toString()).toBe('- [ ] ### One\n- [ ] ### Two\nThree');
      const row = view.state.doc.line(2);
      view.dispatch({ selection: { anchor: row.to } });
      expect(insertNewlineContinueMarkup(view)).toBe(true);
      expect(view.state.doc.toString()).toMatch(/- \[ \] +\nThree$/);
    } finally { view.destroy(); }
  });

  it('edits links, ticks, and block templates at the selection rather than the end', async () => {
    const view = editor('before a]b after', 7, 10);
    try {
      formatCommand('link')(view);
      expect(view.state.doc.toString()).toBe('before [a\\]b](https://) after');
      expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe('https://');
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'First\nSecond' }, selection: { anchor: 6 } });
      formatCommand('rule')(view);
      expect((await rendered(view.state.doc.toString())).querySelector('hr')).not.toBeNull();
      formatCommand('table')(view);
      expect((await rendered(view.state.doc.toString())).querySelector('table')).not.toBeNull();
    } finally { view.destroy(); }
  });

  it('uses local anchors and maps back through the same unequal-height segments', () => {
    const points: [number, number][] = [[0, 0], [100, 240], [280, 300], [350, 630]];
    expect(interpolate(points, 190, 0)).toBe(270);
    expect(interpolate(points, 270, 1)).toBe(190);
    expect(interpolate(points, -20, 1)).toBe(0);
    expect(interpolate(points, 700, 1)).toBe(350);
  });
});
