import type { Language, SyntaxTheme } from './settings';

export type HighlightToken = { text: string; color: string; style: number };
export type Highlight = { lines: HighlightToken[][]; surface: string; foreground: string; fallback?: boolean };
export type HighlightRequest = { id: number; source: string; language: Language; theme: SyntaxTheme };
export type HighlightResponse = { id: number; result: Highlight };
export const highlightBudget = 400_000;

export function plainHighlight(source: string, surface = '#20242f', foreground = '#e5ecf5'): Highlight {
  return {
    lines: source.split('\n').map(text => text ? [{ text, color: foreground, style: 0 }] : []),
    surface, foreground, fallback: true,
  };
}
