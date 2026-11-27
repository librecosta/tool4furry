export const sampleCode = [
  '// A little more clarity.',
  'function greet(name: string) {',
  '  return "Hello, " + name;',
  '}',
  '',
  'const message = greet("World");',
  'console.log(message);',
].join('\n');

export const languages = {
  typescript: ['TypeScript', 'ts', 'mts', 'cts'], javascript: ['JavaScript', 'js', 'mjs', 'cjs'],
  jsx: ['JSX', 'jsx'], tsx: ['TSX', 'tsx'], go: ['Go', 'go'], rust: ['Rust', 'rs'],
  python: ['Python', 'py', 'pyw'], c: ['C', 'c', 'h'], cpp: ['C++', 'cpp', 'cc', 'cxx', 'hpp', 'hh'],
  csharp: ['C#', 'cs'], java: ['Java', 'java'], kotlin: ['Kotlin', 'kt', 'kts'], swift: ['Swift', 'swift'],
  html: ['HTML', 'html', 'htm'], css: ['CSS', 'css'], scss: ['SCSS', 'scss'],
  json: ['JSON', 'json'], yaml: ['YAML', 'yaml', 'yml'], toml: ['TOML', 'toml'], sql: ['SQL', 'sql'],
  bash: ['Bash', 'sh', 'bash', 'zsh'], powershell: ['PowerShell', 'ps1', 'psm1'],
  markdown: ['Markdown', 'md', 'markdown'], text: ['Plain Text', 'txt', 'text'],
} as const;
export type Language = keyof typeof languages;

export function languageForFile(name: string): Language {
  const extension = /\.([^.]+)$/.exec(name)?.[1].toLowerCase();
  return (Object.keys(languages) as Language[]).find(id =>
    (languages[id].slice(1) as readonly (string | undefined)[]).includes(extension)) ?? 'text';
}

export const themes = {
  'github-dark': 'GitHub Dark', 'github-light': 'GitHub Light', dracula: 'Dracula',
  nord: 'Nord', 'tokyo-night': 'Tokyo Night', 'one-dark-pro': 'One Dark Pro',
  'catppuccin-mocha': 'Catppuccin Mocha', 'catppuccin-latte': 'Catppuccin Latte',
  'solarized-dark': 'Solarized Dark', 'solarized-light': 'Solarized Light',
  'rose-pine-dawn': 'Rosé Pine Dawn', 'github-dark-dimmed': 'GitHub Dark Dimmed',
} as const;
export type SyntaxTheme = keyof typeof themes;
export type WindowStyle = 'macos' | 'windows' | 'minimal';
export type FontId = 'jetbrains' | 'fira' | 'plex' | 'system';
export type BackgroundKind = 'solid' | 'linear' | 'radial' | 'transparent' | 'image';
export type PhotoTarget = 'canvas' | 'window';
export type PhotoPlacement = { fit: 'contain' | 'cover'; zoom: number; x: number; y: number };
export const defaultPhotoPlacement: PhotoPlacement = { fit: 'contain', zoom: 100, x: 0, y: 0 };
export const maxPhotoZoom = 300;

export type WindowLayers = {
  baseVisible: boolean;
  baseOpacity: number;
  photoVisible: boolean;
  photoOpacity: number;
};
export const defaultWindowLayers: WindowLayers = { baseVisible: true, baseOpacity: 100, photoVisible: false, photoOpacity: 40 };

export type Background = {
  kind: BackgroundKind;
  first: string;
  second: string;
  angle: number;
};
export type CodeImageSettings = {
  theme: SyntaxTheme;
  background: Background;
  margin: number;
  style: WindowStyle;
  title: string;
  titleBar: boolean;
  shadow: boolean;
  radius: number;
  padding: number;
  lines: boolean;
  firstLine: number;
  font: FontId;
  fontSize: number;
  lineHeight: number;
  tabWidth: number;
  wrap: boolean;
  emphasized: string;
  added: string;
  removed: string;
  dim: boolean;
  size: 'auto' | 'custom' | '1:1' | '4:3' | '16:9' | '4:5';
  width: number;
  height: number;
};

type Appearance = Pick<CodeImageSettings, 'theme' | 'background' | 'margin' | 'style' | 'radius' | 'shadow' | 'padding'>;
const gradient = (first: string, second: string, angle = 138): Background => ({ kind: 'linear', first, second, angle });
export const palettes = [
  { name: 'Lilac & mint', zh: '丁香与薄荷', colors: gradient('#c5aedf', '#9ecbc7', 128) },
  { name: 'Peach & gold', zh: '桃粉与淡金', colors: gradient('#e8a7b5', '#f0ce93') },
  { name: 'Sage', zh: '灰绿', colors: gradient('#a7cac0', '#537b6f') },
  { name: 'Glacier blue', zh: '冰川蓝', colors: gradient('#c8dfe9', '#79a7c2') },
  { name: 'Linen', zh: '亚麻', colors: gradient('#f1eae0', '#d0c8ba') },
  { name: 'Graphite', zh: '石墨', colors: gradient('#5a5964', '#292931') },
];
export const presets = {
  Midnight: { theme: 'tokyo-night', background: gradient('#292242', '#6d5c9a', 145), margin: 48, style: 'macos', radius: 15, shadow: true, padding: 30 },
  Glacier: { theme: 'github-light', background: palettes[3].colors, margin: 44, style: 'macos', radius: 16, shadow: true, padding: 29 },
  Sunset: { theme: 'dracula', background: palettes[1].colors, margin: 46, style: 'macos', radius: 15, shadow: true, padding: 28 },
  Forest: { theme: 'solarized-dark', background: { kind: 'radial', first: '#9abd9f', second: '#31514b', angle: 138 }, margin: 50, style: 'macos', radius: 14, shadow: true, padding: 29 },
  Paper: { theme: 'rose-pine-dawn', background: palettes[4].colors, margin: 41, style: 'minimal', radius: 9, shadow: true, padding: 33 },
  Aurora: { theme: 'catppuccin-mocha', background: gradient('#3c4c79', '#93c6b7', 151), margin: 48, style: 'macos', radius: 14, shadow: true, padding: 30 },
  Monochrome: { theme: 'github-dark-dimmed', background: palettes[5].colors, margin: 40, style: 'windows', radius: 8, shadow: false, padding: 28 },
  Lavender: { theme: 'github-dark', background: palettes[0].colors, margin: 48, style: 'macos', radius: 15, shadow: true, padding: 30 },
} satisfies Record<string, Appearance>;
export type Preset = keyof typeof presets;
export const defaultPreset: Preset = 'Lavender';
export const defaults: CodeImageSettings = {
  ...presets[defaultPreset], title: 'greet.ts', titleBar: true,
  lines: true, firstLine: 1, font: 'jetbrains', fontSize: 16,
  lineHeight: 1.65, tabWidth: 4, wrap: true, emphasized: '3', added: '', removed: '', dim: false,
  size: 'auto', width: 960, height: 600,
};
export const scales = [1, 2, 3, 4] as const;
export type Scale = typeof scales[number];
export type OutputFormat = 'png' | 'svg' | 'jpeg' | 'webp';
