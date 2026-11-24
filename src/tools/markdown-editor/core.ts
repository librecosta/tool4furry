import DOMPurify from 'dompurify';
import { Marked, type Token, type Tokens, type TokenizerAndRendererExtension } from 'marked';
import { LocalError } from '../general/bounds';

export const example = `# A little more clarity.

Write your **ideas**. Make them real.

## Getting started

- [x] Write in Markdown
- [ ] Preview your document
- [ ] Share something wonderful

> Every detail matters.

\`\`\`typescript
const hello = 'Hello, world!';
\`\`\`

| View | Purpose |
| --- | --- |
| Editor | Write and revise |
| Preview | Read the finished page |

> [!TIP]
> Use the split view to see changes as you write.

A circle has an area of $A = \\pi r^2$.

$$
\\sum_{n=1}^{4} n = 10
$$

[Markdown guide](https://www.markdownguide.org/)
`;

export const autoPreviewLimit = 160_000;
const renderSourceLimit = 1_200_000;
const renderHtmlLimit = 2_000_000;
const renderTokenLimit = 8_000;

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => entities[character]);
const alerts = {
  NOTE: ['Note', '备注'], TIP: ['Tip', '提示'], IMPORTANT: ['Important', '重要'],
  WARNING: ['Warning', '警告'], CAUTION: ['Caution', '注意'],
} as const;
// Regular Phosphor 2.1.10 glyphs for sanitized preview and offline HTML.
const alertIcons = {
  NOTE: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z',
  TIP: 'M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z',
  IMPORTANT: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z',
  WARNING: 'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z',
  CAUTION: 'M188,88a27.75,27.75,0,0,0-12,2.71V60a28,28,0,0,0-41.36-24.6A28,28,0,0,0,80,44v6.71A27.75,27.75,0,0,0,68,48,28,28,0,0,0,40,76v76a88,88,0,0,0,176,0V116A28,28,0,0,0,188,88Zm12,64a72,72,0,0,1-144,0V76a12,12,0,0,1,24,0v44a8,8,0,0,0,16,0V44a12,12,0,0,1,24,0v68a8,8,0,0,0,16,0V60a12,12,0,0,1,24,0v68.67A48.08,48.08,0,0,0,120,176a8,8,0,0,0,16,0,32,32,0,0,1,32-32,8,8,0,0,0,8-8V116a12,12,0,0,1,24,0Z',
};

const inlineMath = /^\$(?![\s$])((?:\\[^\n]|[^\\$\n\x60])+?(?<!\s))\$(?![\d$])/u;
const currencyProse = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[.,!?;:][ \t]|[ \t]+[A-Za-z]{2,}\b)/;
const blockMath = /^ {0,3}\$\$[ \t]*(?:\n([\s\S]+?)\n {0,3}\$\$[ \t]*(?=\n|$)|([^\n$]+?)\$\$[ \t]*(?=\n|$))(?:\n|$)/u;

const mathExtensions = (render: (text: string, block: boolean) => string): TokenizerAndRendererExtension[] => [
  {
    name: 'mathBlock',
    level: 'block',
    start(source) { return /^ {0,3}\$\$[^\n]*\n?/m.exec(source)?.index; },
    tokenizer(source) {
      const match = blockMath.exec(source);
      if (match) return { type: 'mathBlock', raw: match[0], text: (match[1] ?? match[2]).trim() };
    },
    renderer(token) { return `<div class="md-math-block">${render(token.text, true)}</div>`; },
  },
  {
    name: 'mathInline',
    level: 'inline',
    start(source) { return source.indexOf('$'); },
    tokenizer(source, tokens) {
      const match = inlineMath.exec(source);
      if (match && !/[\p{L}\p{N}_$]$/u.test(tokens.at(-1)?.raw ?? '') && !currencyProse.test(match[1])) {
        return { type: 'mathInline', raw: match[0], text: match[1] };
      }
    },
    renderer(token) { return render(token.text, false); },
  },
];

function remoteImage(href: string) {
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const url = new URL(href);
    return url.username || url.password ? null : url.href;
  } catch {
    return null;
  }
}

const sanitizer = typeof window === 'undefined' ? null : DOMPurify(window);
const mathLengths = /^(?:height|width|min-width|top|left|margin-left|margin-right|margin-top|margin-bottom|vertical-align|padding-left|border-(?:(?:bottom|top|left|right)-)?width|font-size):\s*-?(?:\d+(?:\.\d+)?|\.\d+)(?:em|ex|px|%|pt)?$/i;
const mathColors = /^(?:color|background-color|border-color):\s*(?:#[a-f\d]{3,8}|[a-z]{1,24})$/i;
// Only KaTeX's generated spans can reach this hook. Raw author HTML is discarded.
sanitizer?.addHook('uponSanitizeAttribute', (node, attribute) => {
  if (attribute.attrName !== 'style') return;
  const allowed = node.nodeName === 'SPAN' ? attribute.attrValue.split(';')
    .map(rule => rule.trim()).filter(rule => mathLengths.test(rule) || mathColors.test(rule)) : [];
  attribute.attrValue = allowed.join(';');
  attribute.keepAttr = allowed.length > 0;
});

const tags = [
  'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'del', 'blockquote',
  'ul', 'ol', 'li', 'a', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'aside',
  'button', 'img', 'svg', 'path', 'line', 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn',
  'mtext', 'mfrac', 'msup', 'msub', 'msubsup', 'msqrt', 'mroot', 'mover', 'munder', 'munderover',
  'mtable', 'mtr', 'mtd', 'mstyle', 'mspace', 'mpadded', 'mphantom', 'menclose', 'mmultiscripts',
  'mprescripts', 'none',
];
const attributes = [
  'class', 'role', 'href', 'title', 'aria-label', 'aria-hidden', 'checked', 'disabled', 'type', 'align', 'start',
  'src', 'alt', 'loading', 'decoding', 'referrerpolicy', 'style', 'data-md-line', 'data-md-copy',
  'xmlns', 'encoding', 'display', 'width', 'height', 'depth', 'mathvariant', 'mathcolor', 'stretchy',
  'symmetric', 'fence', 'separator', 'accent', 'accentunder', 'minsize', 'maxsize',
  'lspace', 'rspace', 'displaystyle', 'scriptlevel', 'columnalign', 'columnspacing', 'rowspacing',
  'rowalign', 'columnlines', 'rowlines', 'columnspan', 'rowspan', 'notation', 'form', 'linethickness',
  'voffset', 'viewBox', 'preserveAspectRatio', 'd', 'x1', 'y1', 'x2', 'y2', 'fill', 'stroke',
  'stroke-width', 'stroke-linecap', 'stroke-linejoin',
];

const anchorOffset = (source: string, token: Token, cursor: number) => {
  let offset = source.indexOf(token.raw, cursor);
  // Marked consumes link definitions without emitting a top-level token.
  while (offset > cursor && source[offset - 1] !== '\n') offset = source.indexOf(token.raw, offset + 1);
  return offset < 0 ? cursor : offset;
};
const lineBreaks = (text: string) => (text.match(/\n/g) ?? []).length;

function budgetError() {
  return new LocalError('此文档超出 HTML 渲染预算，仍可编辑或导出 Markdown。', 'This document exceeds the HTML rendering budget. You can still edit or export Markdown.');
}

export async function renderMarkdown(input: string, {
  preview = false, allowImages = false, locale = 'en',
}: { preview?: boolean; allowImages?: boolean; locale?: 'en' | 'zh' } = {}) {
  if (input.length > renderSourceLimit) throw budgetError();
  const source = input.replace(/\r\n?/g, '\n');
  const compiler = new Marked({ gfm: true, async: false });
  let katex: typeof import('katex').default | undefined;
  let highlighter: typeof import('./highlight') | undefined;
  let highlightedLength = 0, renderedMath = 0;

  compiler.use({
    extensions: mathExtensions((value, block) => {
      const literal = `<code class="md-math-source">${escapeHtml(block ? `$$${value}$$` : `$${value}$`)}</code>`;
      if (!katex || value.length > 4000 || ++renderedMath > 500) return literal;
      try {
        return katex.renderToString(value, {
          output: preview ? 'htmlAndMathml' : 'mathml', displayMode: block, throwOnError: true,
          strict: 'error', trust: false, maxExpand: 100, maxSize: 30,
        });
      } catch {
        return literal;
      }
    }),
    renderer: {
      // Only Markdown tokens create elements. Author HTML cannot enter the DOM.
      html() { return ''; },
      image({ href, text }) {
        const url = preview && allowImages ? remoteImage(href) : null;
        const alt = escapeHtml(text);
        if (url) return `<img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
        const label = locale === 'zh' ? '图片占位' : 'Image placeholder';
        return `<span class="md-image-placeholder" role="img" aria-label="${label}${alt ? ` (${alt})` : ''}">${alt || label}</span>`;
      },
      code({ text, lang }) {
        const language = lang?.trim().split(/\s+/, 1)[0]?.slice(0, 32);
        const label = escapeHtml(language || (locale === 'zh' ? '纯文本' : 'Plain text'));
        const canHighlight = language && text.length <= 30_000 && highlightedLength + text.length <= 80_000;
        if (canHighlight) highlightedLength += text.length;
        const code = (canHighlight && highlighter?.highlight(text, language)) || escapeHtml(text);
        const copy = locale === 'zh' ? '复制代码' : 'Copy code';
        return `<div class="md-code"><div class="md-code-label"><span>${label}</span>${
          preview ? `<button type="button" data-md-copy="true">${copy}</button>` : ''
        }</div><pre><code>${code}</code></pre></div>`;
      },
      blockquote(token) {
        const match = /^ {0,3}>[ \t]?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/.exec(token.raw);
        if (!match) return false;
        const kind = match[1] as keyof typeof alerts;
        const [en, zh] = alerts[kind];
        const body = token.text.replace(/^\[![A-Z]+\][ \t]*(?:\n|$)/, '');
        const lexer = new compiler.Lexer(compiler.defaults);
        lexer.tokens.links = links;
        const icon = `<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${alertIcons[kind]}"></path></svg>`;
        return `<aside class="md-alert md-alert-${kind.toLowerCase()}"><p class="md-alert-label">${icon}${locale === 'zh' ? zh : en}</p>${this.parser.parse(lexer.lex(body))}</aside>`;
      },
    },
  });
  const tokens = compiler.lexer(source);
  const links = tokens.links;
  let count = 0, needsMath = false, needsHighlight = false;
  compiler.walkTokens(tokens, (token) => {
    if (++count > renderTokenLimit) throw budgetError();
    if (token.type === 'mathInline' || token.type === 'mathBlock') needsMath = true;
    if (token.type === 'code' && (token as Tokens.Code).lang) needsHighlight = true;
  });
  await Promise.all([
    needsMath && (preview ? import('./math-preview') : import('katex')).then(module => { katex = module.default; }),
    needsHighlight && import('./highlight').then(module => { highlighter = module; }),
  ]);

  const parser = new compiler.Parser(compiler.defaults);
  let line = 1, cursor = 0, length = 0;
  const html = preview ? tokens.map((token) => {
    const offset = anchorOffset(source, token, cursor);
    line += lineBreaks(source.slice(cursor, offset));
    const start = line;
    line += lineBreaks(token.raw);
    cursor = offset + token.raw.length;
    if (token.type === 'space' || token.type === 'def') return '';
    const html = parser.parse([token]);
    length += html.length;
    if (length > renderHtmlLimit) throw budgetError();
    return html && `<div data-md-line="${start}">${html}</div>`;
  }).join('') : parser.parse(tokens);
  if (html.length > renderHtmlLimit) throw budgetError();
  if (!sanitizer?.isSupported) throw new Error('Markdown sanitizing is unavailable.');
  return sanitizer.sanitize(html, {
    ALLOWED_TAGS: tags, ALLOWED_ATTR: attributes, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: preview && allowImages ? [] : ['img'],
  });
}
