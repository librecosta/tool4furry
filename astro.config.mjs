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

const toolStyleOwners = {
  JsonFormatter: ['json-formatter'],
  SubtitleTools: ['subtitle-tools'],
  UrlBase64: ['url-base64'],
  TimestampConverter: ['timestamp-converter'],
  ColorContrast: ['color-contrast'],
  AudioTrimmer: ['audio-trimmer'],
  MarkdownEditor: ['markdown-editor'],
  VideoFrameExtractor: ['video-frame-extractor'],
  CsvJsonConverter: ['csv-json-converter'],
  CodeImageGenerator: ['code-image-generator'],
  SvgConverter: ['svg-converter'],
  RegexTester: ['regex-tester'],
  CreativeAssetPicker: [], // Vite loads this stylesheet when a consumer opens the picker.
  'react-colorful': ['color-contrast', 'image-watermark', 'palette-extractor'],
  TextEditor: ['json-formatter', 'subtitle-tools', 'text-cleaner', 'text-diff', 'url-base64', 'csv-json-converter', 'code-image-generator', 'svg-converter', 'regex-tester'],
  TextWorkbench: ['json-formatter', 'text-cleaner', 'text-diff', 'url-base64', 'csv-json-converter'],
};
const scopeToolStyles = {
  name: 'scope-tool-styles',
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
          /<link rel="stylesheet" href="\/_astro\/(JsonFormatter|SubtitleTools|UrlBase64|TimestampConverter|ColorContrast|AudioTrimmer|MarkdownEditor|VideoFrameExtractor|CsvJsonConverter|CodeImageGenerator|SvgConverter|RegexTester|CreativeAssetPicker|react-colorful|TextEditor|TextWorkbench)\.[\w-]+\.css">/g,
          (link, stem) => toolStyleOwners[stem].includes(tool.id) ? link : '',
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
  integrations: [react(), scopeToolStyles],
  vite: {
    // Audio export loads the selected encoder from a module Worker.
    worker: { format: 'es' },
    // Discover lazy worker/editor dependencies before users begin work in DEV;
    // late optimizer discovery can reload a workspace or invalidate module URLs.
    // Prebundling does not preload it in the browser or change the production graph.
    optimizeDeps: {
      include: ['hash-wasm', '@codemirror/state', '@codemirror/view', '@codemirror/commands', 'diff',
        'mediabunny', 'wavesurfer.js', 'wavesurfer.js/dist/plugins/regions.js', 'wavesurfer.js/dist/plugins/timeline.js',
        '@mediabunny/mp3-encoder', '@mediabunny/flac-encoder', 'imagetracerjs'],
      exclude: ['@jsquash/avif/codec/enc/avif_enc.js', '@jsquash/avif/meta.js'],
    },
    // Vite discovers dynamic imports before cross-module status checks fold away.
    // This is a projection of Registry metadata, never a second release setting.
    define: toolDefines,
    cacheDir: `./node_modules/.vite/${region}`,
    server: { strictPort: true },
    plugins: [
      {
        // Assert module ownership even when the bundler merges an experiment into a shared chunk.
        name: 'guard-image-fusion-lab',
        apply: 'build',
        generateBundle(_, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type !== 'chunk') continue;
            for (const id of Object.keys(chunk.modules)) {
              if (id.replaceAll('\\', '/').includes('/src/lab/image-fusion/'))
                this.error('Image Fusion Lab leaked into ' + chunk.fileName + ': ' + id);
            }
          }
        },
      },
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
      {
        // Check actual emitted client modules, including dependencies merged into shared chunks.
        name: 'guard-private-tool-resources',
        apply: 'build',
        applyToEnvironment: environment => environment.name === 'client',
        generateBundle: {
          order: 'post',
          handler(_, bundle) {
            const qrAvailable = toolDefines['import.meta.env.T4F_TOOL_QR_CODE_GENERATOR_AVAILABLE'] === 'true';
            const audioAvailable = toolDefines['import.meta.env.T4F_TOOL_AUDIO_TRIMMER_AVAILABLE'] === 'true';
            const videoAvailable = toolDefines['import.meta.env.T4F_TOOL_VIDEO_FRAME_EXTRACTOR_AVAILABLE'] === 'true';
            const markdownAvailable = toolDefines['import.meta.env.T4F_TOOL_MARKDOWN_EDITOR_AVAILABLE'] === 'true';
            const codeImageAvailable = toolDefines['import.meta.env.T4F_TOOL_CODE_IMAGE_GENERATOR_AVAILABLE'] === 'true';
            const svgConverterAvailable = toolDefines['import.meta.env.T4F_TOOL_SVG_CONVERTER_AVAILABLE'] === 'true';
            const regexAvailable = toolDefines['import.meta.env.T4F_TOOL_REGEX_TESTER_AVAILABLE'] === 'true';
            const uuidAvailable = toolDefines['import.meta.env.T4F_TOOL_UUID_GENERATOR_AVAILABLE'] === 'true';
            const audioPrivate = /\/(?:src\/tools\/audio-trimmer\/(?!definition\.ts$)|node_modules\/(?:mediabunny|wavesurfer\.js|@mediabunny)\/)/;
            const qrPrivate = /\/(?:src\/tools\/qr-code-generator\/(?!definition\.ts$)|node_modules\/(?:qrcode|jsqr)\/)/;
            const markdownPrivate = /\/(?:src\/tools\/markdown-editor\/(?!definition\.ts$)|node_modules\/(?:@codemirror\/lang-markdown|@lezer\/markdown|dompurify|marked|katex)\/)/;
            const codeImagePrivate = /\/(?:src\/(?:tools\/code-image-generator\/(?!definition\.ts$)|assets\/code-image-presets\/)|node_modules\/(?:@shikijs|@fontsource\/(?:jetbrains-mono|fira-code|ibm-plex-mono)|tm-grammars|oniguruma-to-es|oniguruma-parser)\/)/;
            const svgConverterPrivate = /\/(?:src\/tools\/svg-converter\/(?!definition\.ts$)|node_modules\/(?:imagetracerjs|css-tree|@codemirror\/lang-xml|@lezer\/xml)\/)/;
            const sourcePath = id => id.replaceAll('\\', '/').split('?')[0];
            const creativePath = /(?:^|\/)src\/(?:assets\/creative|ui\/creative-assets)\//;
            const emitted = new Set(Object.values(bundle).flatMap(item => item.type === 'chunk' ? Object.keys(item.modules) : []));
            const publishedOwners = new Set(tools.filter(tool => tool.status === 'published' && tool.regions.includes(region)).map(tool => tool.id));
            const creativeModules = [...emitted].filter(id => creativePath.test(sourcePath(id)));
            const hasPublishedOwner = (id, seen) => {
              if (seen.has(id)) return false;
              seen.add(id);
              const owner = sourcePath(id).match(/\/src\/tools\/([^/]+)\//)?.[1];
              if (owner && publishedOwners.has(owner)) return true;
              const module = this.getModuleInfo(id);
              return [...(module?.importers ?? []), ...(module?.dynamicImporters ?? [])]
                .some(parent => emitted.has(parent) && hasPublishedOwner(parent, seen));
            };
            for (const id of creativeModules)
              if (!hasPublishedOwner(id, new Set()))
                this.error('Creative collection module without a published consumer: ' + id);
            for (const item of Object.values(bundle))
              if (item.type === 'asset' && item.originalFileNames?.some(path => creativePath.test(sourcePath(path))) && !creativeModules.length)
                this.error('Creative collection asset without a published consumer: ' + item.fileName);
            for (const chunk of Object.values(bundle)) {
              if (chunk.type !== 'chunk') continue;
              for (const id of Object.keys(chunk.modules)) {
                const source = id.replaceAll('\\', '/');
                if (markdownPrivate.test(source) &&
                    (!markdownAvailable || !/(?:^|\/)(?:MarkdownEditor|math-preview|katex|highlight)\.[\w-]+\.js$/.test(chunk.fileName))) {
                  this.error('Markdown private module in ' + chunk.fileName + ': ' + source);
                }
                if (!markdownAvailable && !svgConverterAvailable && source.includes('/node_modules/@codemirror/search/')) {
                  this.error('CodeMirror search module without an available consumer: ' + source);
                }
                if (!videoAvailable && /\/src\/tools\/video-frame-extractor\/(?!definition\.ts$)/.test(source)) {
                  this.error('Video Frame Extractor Draft implementation in ' + chunk.fileName + ': ' + source);
                }
                if (!codeImageAvailable && codeImagePrivate.test(source)) {
                  this.error('Code Image Generator Draft module in ' + chunk.fileName + ': ' + source);
                }
                if (!svgConverterAvailable && svgConverterPrivate.test(source)) {
                  this.error('SVG Converter Draft module in ' + chunk.fileName + ': ' + source);
                }
                if (!regexAvailable && /\/(?:src\/tools\/regex-tester\/(?!definition\.ts$)|node_modules\/@eslint-community\/regexpp\/)/.test(source)) {
                  this.error('Regex Tester Draft module in ' + chunk.fileName + ': ' + source);
                }
                if (!uuidAvailable && /\/(?:src\/tools\/uuid-generator\/(?!definition\.ts$)|node_modules\/uuid\/)/.test(source)) {
                  this.error('UUID Generator Draft module in ' + chunk.fileName + ': ' + source);
                }
                if (!audioAvailable && audioPrivate.test(source)) {
                  this.error('Audio Trimmer Draft implementation in ' + chunk.fileName + ': ' + source);
                }
                if (/\/(?:node_modules\/(?:three|@react-three\/fiber)|src\/tools\/qr-code-generator\/graphics)\//.test(source) ||
                    (!qrAvailable && qrPrivate.test(source))) {
                  this.error('QR Draft implementation or graphics in ' + chunk.fileName + ': ' + source);
                }
              }
            }
          },
        },
      },
    ],
  },
});
