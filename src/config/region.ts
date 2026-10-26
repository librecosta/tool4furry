export type Region = 'cn' | 'global';
export function parseRegion(value: string | undefined): Region {
  if (value === undefined || value === 'cn') return 'cn';
  if (value === 'global') return 'global';
  throw new Error(`Unsupported SITE_REGION: ${value}`);
}
export const regions = {
  cn: { defaultLocale: 'zh', site: 'https://tool4furry.cn' },
  global: { defaultLocale: 'en', site: 'https://tool4furry.com' },
} as const;
export { devOrigins } from './dev-origins.mjs';
