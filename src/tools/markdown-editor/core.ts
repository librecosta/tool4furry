import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { boundedText } from '../general/bounds';
export const example = `# Tool4Furry

Write **Markdown**, preview it locally, and save your work.

- [x] Headings, lists and links
- [ ] Your next idea

| Tool | Runs |
| --- | --- |
| Markdown Editor | In your browser |

\`\`\`typescript
const hello = 'Hello, world!';
\`\`\`

[Markdown guide](https://www.markdownguide.org/)
`;
export function renderMarkdown(input: string) {
  boundedText(input, 100000);
  // Images/iframes are omitted: preview must not request user-supplied URLs.
  return DOMPurify.sanitize(marked.parse(input, { gfm: true, async: false }), {
    ALLOWED_TAGS: [
      'p',
      'br',
      'hr',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'del',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'input',
    ],
    ALLOWED_ATTR: [
      'href',
      'title',
      'checked',
      'disabled',
      'type',
      'align',
      'start',
    ],
    FORBID_ATTR: ['style', 'id', 'name'],
  });
}
