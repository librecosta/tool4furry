import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import react from '@astrojs/react';
import stylex from '@stylexjs/unplugin';
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
    // These are already ESM. Lazy worker discovery must not re-optimize the
    // client graph and reload a workspace containing the user's files in DEV.
    optimizeDeps: { exclude: ['@jsquash/avif/codec/enc/avif_enc.js', '@jsquash/avif/meta.js'] },
    // Vite discovers dynamic imports before cross-module status checks fold away.
    // This is a projection of Registry metadata, never a second release setting.
    define: toolDefines,
    cacheDir: `./node_modules/.vite/${region}`,
    server: { strictPort: true },
    plugins: [
      stylex.vite({
        dev: process.env.NODE_ENV === 'development',
        devMode: 'css-only',
        runtimeInjection: false,
        useCSSLayers: { before: ['reset', 'base'] },
      }),
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
