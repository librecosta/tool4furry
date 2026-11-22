import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import react from '@astrojs/react';
import { parseRegion, regions } from './src/config/region.ts';
import { tools } from './src/tools/registry.ts';
import { assertToolLoaderContract, toolBuildDefines } from './src/tools/build-availability.ts';

const region = parseRegion(process.env.SITE_REGION);
const toolDefines = toolBuildDefines(tools, region);
assertToolLoaderContract(tools, readFileSync(new URL('./src/tools/loaders.ts', import.meta.url), 'utf8'));

const editorStyleOwners = {
  JsonFormatter: ['json-formatter'],
  SubtitleTools: ['subtitle-tools'],
  UrlBase64: ['url-base64'],
  TextEditor: ['json-formatter', 'subtitle-tools', 'text-cleaner', 'text-diff', 'url-base64'],
  TextWorkbench: ['json-formatter', 'text-cleaner', 'text-diff', 'url-base64'],
};
const scopeEditorStyles = {
  name: 'scope-tool-editor-styles',
  hooks: {
    // Astro collects styles for the entire dynamic [slug] route. Keep the
    // emitted stylesheets and Vite preload graph, but scope their first-paint links.
    'astro:build:done': async ({ dir, pages }) => {
      await Promise.all(pages.map(async ({ pathname }) => {
        const slug = pathname.match(/(?:^|\/)tools\/([^/]+)\/?$/)?.[1];
        const tool = tools.find(tool => tool.slug === slug);
        if (!tool) return;
        const destination = new URL(pathname.replace(/^\/|\/$/g, '') + '/index.html', dir);
        const html = await readFile(destination, 'utf8');
        const headEnd = html.indexOf('</head>');
        const head = html.slice(0, headEnd);
        const scoped = head.replace(
          /<link rel="stylesheet" href="\/_astro\/(JsonFormatter|SubtitleTools|UrlBase64|TextEditor|TextWorkbench)\.[\w-]+\.css">/g,
          (link, stem) => editorStyleOwners[stem].includes(tool.id) ? link : '',
        );
        if (scoped !== head) await writeFile(destination, scoped + html.slice(headEnd));
      }));
    },
  },
};

export default defineConfig({
  output: 'static',
  site: regions[region].site,
  outDir: `./dist/${region}`,
  cacheDir: `./node_modules/.astro/${region}`,
  build: { inlineStylesheets: 'never' },
  integrations: [react(), scopeEditorStyles],
  vite: {
    // Discover lazy worker/editor dependencies before users begin work in DEV;
    // late optimizer discovery can reload a workspace or invalidate module URLs.
    // Prebundling does not preload it in the browser or change the production graph.
    optimizeDeps: { include: ['hash-wasm', '@codemirror/state', '@codemirror/view', '@codemirror/commands', 'diff'], exclude: ['@jsquash/avif/codec/enc/avif_enc.js', '@jsquash/avif/meta.js'] },
    // Vite discovers dynamic imports before cross-module status checks fold away.
    // This is a projection of Registry metadata, never a second release setting.
    define: toolDefines,
    cacheDir: `./node_modules/.vite/${region}`,
    server: { strictPort: true },
    plugins: [
      {
        // Astro scans islands even when getStaticPaths() is empty. Do not emit
        // the unused Lab hydration entry into either production artifact.
        name: 'exclude-lab-client-entry',
        apply: 'build',
        applyToEnvironment: (environment) => environment.name === 'client',
        options(options) {
          if (!Array.isArray(options.input))
            throw new Error('Expected Astro client entry array');
          return {
            ...options,
            input: options.input.filter(
              (id) =>
                !id.replaceAll('\\', '/').endsWith('/src/lab/LabRuntime.tsx'),
            ),
          };
        },
      },
    ],
  },
});
