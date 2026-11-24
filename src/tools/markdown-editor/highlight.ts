import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';

const highlighter = hljs.newInstance();
for (const [name, grammar] of Object.entries({ javascript, typescript, json, bash, python, xml, css, markdown })) {
  highlighter.registerLanguage(name, grammar);
}

export function highlight(source: string, language: string) {
  if (!highlighter.getLanguage(language)) return null;
  try {
    return highlighter.highlight(source, { language, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}
