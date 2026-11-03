import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import go from 'highlight.js/lib/languages/go';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import { fail } from '../general/bounds';
import { canvasSize } from '../general/canvas-output';
export const languages = {
  typescript,
  javascript,
  go,
  python,
  rust,
  json,
  html: xml,
  css,
  bash,
};
for (const [name, grammar] of Object.entries(languages))
  hljs.registerLanguage(name, grammar);
export type CodeSettings = {
  language: keyof typeof languages;
  theme: 'dark' | 'light';
  title: string;
  lines: boolean;
  padding: number;
};
export function highlightCode(
  code: string,
  language: CodeSettings['language'],
) {
  if (
    !Object.hasOwn(languages, language) ||
    !code.trim() ||
    code.length > 20000 ||
    code.split('\n').length > 160 ||
    code.split('\n').some((line) => line.length > 1000)
  )
    fail(
      '请输入代码，最多 20000 字符、160 行，每行 1000 字符。',
      'Enter code, up to 20,000 characters, 160 lines and 1,000 characters per line.',
    );
  return hljs.highlight(code.replace(/\t/g, '    '), {
    language,
    ignoreIllegals: true,
  }).value;
}
type Span = { text: string; kind: string };
export function codeLines(html: string): Span[][] {
  const root = new DOMParser().parseFromString(
    `<pre>${html}</pre>`,
    'text/html',
  ).body.firstElementChild!;
  const lines: Span[][] = [[]];
  function visit(node: Node, kind = '') {
    if (node.nodeType === 3) {
      const parts = (node.textContent ?? '').split('\n');
      parts.forEach((text, i) => {
        if (i) lines.push([]);
        if (text) lines.at(-1)!.push({ text, kind });
      });
    } else if (node instanceof Element) {
      const next = node.className || kind;
      for (const child of node.childNodes) visit(child, next);
    }
  }
  visit(root);
  return lines;
}
const themes = {
  dark: {
    outer: '#343244',
    surface: '#20242D',
    text: '#E7EAF0',
    muted: '#929BAA',
    keyword: '#CBA6F7',
    string: '#A6D6A3',
    number: '#F3BC87',
    title: '#8EC9F0',
    comment: '#8A95A8',
  },
  light: {
    outer: '#E7E3F0',
    surface: '#FAFAFC',
    text: '#29303B',
    muted: '#737C89',
    keyword: '#8040A1',
    string: '#347546',
    number: '#A65B1C',
    title: '#275F9E',
    comment: '#697583',
  },
};
export function drawCode(
  canvas: HTMLCanvasElement,
  code: string,
  settings: CodeSettings,
) {
  if (
    ![16, 24, 32, 48, 64].includes(settings.padding) ||
    settings.title.length > 100
  )
    fail('无效内边距或标题过长。', 'Invalid padding or title too long.');
  const html = highlightCode(code, settings.language),
    lines = codeLines(html),
    theme = themes[settings.theme];
  if (!theme) throw new Error('theme');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const font =
    '16px ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace';
  ctx.font = font;
  const gutter = settings.lines
      ? ctx.measureText(String(lines.length)).width + 24
      : 0,
    pad = settings.padding;
  const logicalWidth =
    Math.ceil(
      Math.max(
        320,
        ...lines.map(
          (line) =>
            ctx.measureText(line.map((t) => t.text).join('')).width + gutter,
        ),
        ctx.measureText(settings.title).width + 36,
      ),
    ) +
    pad * 2 +
    32;
  const logicalHeight = lines.length * 24 + pad * 2 + 76;
  canvasSize(logicalWidth * 2, logicalHeight * 2);
  canvas.width = logicalWidth * 2;
  canvas.height = logicalHeight * 2;
  ctx.scale(2, 2);
  ctx.font = font;
  ctx.textBaseline = 'top';
  ctx.fillStyle = theme.outer;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = theme.surface;
  ctx.beginPath();
  ctx.roundRect(16, 16, logicalWidth - 32, logicalHeight - 32, 12);
  ctx.fill();
  ctx.fillStyle = theme.muted;
  ctx.font = '13px ui-monospace, monospace';
  ctx.fillText(settings.title || settings.language, pad + 16, pad + 16);
  ctx.font = font;
  lines.forEach((line, i) => {
    const y = pad + 52 + i * 24;
    let x = pad + 16;
    if (settings.lines) {
      ctx.fillStyle = theme.muted;
      ctx.fillText(String(i + 1), x, y);
      x += gutter;
    }
    for (const span of line) {
      const kind = span.kind;
      ctx.fillStyle = kind.includes('comment')
        ? theme.comment
        : kind.includes('keyword') || kind.includes('literal')
          ? theme.keyword
          : kind.includes('string') || kind.includes('attr')
            ? theme.string
            : kind.includes('number')
              ? theme.number
              : kind.includes('title') ||
                  kind.includes('name') ||
                  kind.includes('built_in')
                ? theme.title
                : theme.text;
      ctx.fillText(span.text, x, y);
      x += ctx.measureText(span.text).width;
    }
  });
  return { width: canvas.width, height: canvas.height };
}
