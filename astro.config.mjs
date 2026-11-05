import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import react from '@astrojs/react';
import { parseRegion, regions } from './src/config/region.ts';
import { tools } from './src/tools/registry.ts';
import { assertToolLoaderContract, toolBuildDefines } from './src/tools/build-availability.ts';

const region = parseRegion(process.env.SITE_REGION);
const toolDefines = toolBuildDefines(tools, region);
assertToolLoaderContract(tools, readFileSync(new URL('./src/tools/loaders.ts', import.meta.url), 'utf8'));

export default defineConfig({
  output: 'static',
  site: regions[region].site,
  outDir: `./dist/${region}`,
  cacheDir: `./node_modules/.astro/${region}`,
  build: { inlineStylesheets: 'never' },
  integrations: [react()],
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
