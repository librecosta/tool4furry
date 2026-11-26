import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
export { default as jsonLanguageNotice } from './json-language.NOTICE.txt?url';

const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--t4f-accent)' },
  { tag: tags.string, color: 'var(--t4f-positive)' },
  { tag: tags.number, color: 'var(--t4f-warning)' },
  { tag: [tags.bool, tags.null], color: 'var(--t4f-info)' },
]);
// The sticky gutters must paint over horizontally scrolled code in Dark mode.
const background = EditorView.theme({
  '&.cm-editor, & .cm-gutters.cm-gutters-before': {
    backgroundColor: 'var(--t4f-workspace)',
    backgroundImage: 'linear-gradient(var(--t4f-input-surface), var(--t4f-input-surface))',
  },
});
export const jsonLanguage = [json(), syntaxHighlighting(highlight), background];
