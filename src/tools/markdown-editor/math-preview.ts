import stylesheet from 'katex/dist/katex.css?url&no-inline';

// Astro collects CSS imports for every tool detail page. Load this stylesheet
// from the browser-only formula preview so exports and other routes skip it.
if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesheet;
  document.head.append(link);
}

export { default } from 'katex';
