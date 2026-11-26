import { createHighlighterCore, type LanguageRegistration } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import type { Language, SyntaxTheme } from './settings';
import { plainHighlight, type Highlight } from './highlight-data';

const grammars = {
  'typescript': () => import('@shikijs/langs/typescript'),
  'javascript': () => import('@shikijs/langs/javascript'),
  'jsx': () => import('@shikijs/langs/jsx'),
  'tsx': () => import('@shikijs/langs/tsx'),
  'go': () => import('@shikijs/langs/go'),
  'rust': () => import('@shikijs/langs/rust'),
  'python': () => import('@shikijs/langs/python'),
  'c': () => import('@shikijs/langs/c'),
  // The packaged C++ entry also pulls an optional GLSL embedding. Load the
  // audited Microsoft C++ grammar and macro injection without that resource.
  'cpp': async () => {
    const [c, cpp, macro] = await Promise.all([
      import('@shikijs/langs/c'), import('tm-grammars/grammars/cpp.json'),
      import('tm-grammars/grammars/cpp-macro.json'),
    ]);
    return [...c.default, cpp.default, macro.default] as LanguageRegistration[];
  },
  'csharp': () => import('@shikijs/langs/csharp'),
  'java': () => import('@shikijs/langs/java'),
  'kotlin': () => import('@shikijs/langs/kotlin'),
  'swift': () => import('@shikijs/langs/swift'),
  'html': () => import('@shikijs/langs/html'),
  'css': () => import('@shikijs/langs/css'),
  'scss': () => import('@shikijs/langs/scss'),
  'json': () => import('@shikijs/langs/json'),
  'yaml': () => import('@shikijs/langs/yaml'),
  'toml': () => import('@shikijs/langs/toml'),
  'sql': () => import('@shikijs/langs/sql'),
  'bash': () => import('@shikijs/langs/bash'),
  'powershell': () => import('@shikijs/langs/powershell'),
  'markdown': () => import('@shikijs/langs/markdown'),
};
const themeLoaders = {
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'github-light': () => import('@shikijs/themes/github-light'),
  'dracula': () => import('@shikijs/themes/dracula'),
  'nord': () => import('@shikijs/themes/nord'),
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
  'one-dark-pro': () => import('@shikijs/themes/one-dark-pro'),
  'catppuccin-mocha': () => import('@shikijs/themes/catppuccin-mocha'),
  'catppuccin-latte': () => import('@shikijs/themes/catppuccin-latte'),
  'solarized-dark': () => import('@shikijs/themes/solarized-dark'),
  'solarized-light': () => import('@shikijs/themes/solarized-light'),
  'rose-pine-dawn': () => import('@shikijs/themes/rose-pine-dawn'),
  'github-dark-dimmed': () => import('@shikijs/themes/github-dark-dimmed'),
};

const safeColor = (value: string | undefined, fallback: string) =>
  value && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;

let highlighter: ReturnType<typeof createHighlighterCore> | undefined;

export async function highlightCode(source: string, language: Language, theme: SyntaxTheme): Promise<Highlight> {
  try {
    const engine = await (highlighter ??= createHighlighterCore({ engine: createJavaScriptRegexEngine(), themes: [], langs: [] }));
    if (!engine.getLoadedThemes().includes(theme)) await engine.loadTheme(themeLoaders[theme]());
    const currentTheme = engine.getTheme(theme);
    const surface = safeColor(currentTheme.bg, '#20242f');
    const foreground = safeColor(currentTheme.fg, '#e5ecf5');
    if (language === 'text') return { ...plainHighlight(source, surface, foreground), fallback: false };
    try {
      if (!engine.getLoadedLanguages().includes(language)) await engine.loadLanguage(grammars[language]());
      const { tokens } = engine.codeToTokens(source, { lang: language, theme });
      const lines = tokens.map(line => line.map(token => ({
        text: token.content, color: safeColor(token.color, foreground), style: Math.max(0, token.fontStyle ?? 0),
      })));
      // Confirm the renderer receives each original character, including trailing blank lines.
      if (lines.map(line => line.map(token => token.text).join('')).join('\n') !== source) {
        return plainHighlight(source, surface, foreground);
      }
      return { lines, surface, foreground };
    } catch {
      return plainHighlight(source, surface, foreground);
    }
  } catch {
    return plainHighlight(source);
  }
}
