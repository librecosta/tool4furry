import { LocalError } from '../general/bounds';
import { escapeHtml } from './core';
import typography from './article.css?raw';

export const defaultName = 'document.md';

export function exportName(filename: string, format: 'md' | 'html') {
  return (filename.replace(/\.(?:md|markdown|txt|html?)$/i, '') || 'document') + '.' + format;
}

export async function readMarkdown(file: File) {
  if (!/\.(?:md|markdown|txt)$/i.test(file.name)) {
    throw new LocalError('请选择 .md、.markdown 或 .txt 文件。', 'Choose a .md, .markdown or .txt file.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new LocalError('无法读取文件，请确认文件使用 UTF-8 编码。', 'Could not read the file. Make sure it uses UTF-8 encoding.');
  }
}

export function htmlDocument(html: string, title: string, locale: 'zh' | 'en') {
  return `<!doctype html>
<html lang="${locale === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#fff;color:#202428;font:16px/1.65 system-ui,sans-serif}main{box-sizing:border-box;max-width:55rem;margin:auto;padding:clamp(1rem,5vw,3rem)}${typography}</style>
</head>
<body><main data-markdown-article>${html}</main></body>
</html>
`;
}
