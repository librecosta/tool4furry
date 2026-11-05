// @vitest-environment node
import { compile } from 'sass-embedded';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the existing Wide Form geometry and a single shared responsive recipe for file workspaces', () => {
  const shell = compile('src/workbench/WorkbenchShell.module.scss').css;
  const form = compile('src/workbench/form-tool-layout.module.scss').css;
  expect(shell).toMatch(/\.formWide\s*\{[^}]*max-width:\s*1400px/);
  expect(form).toMatch(/\.container\s*\{[^}]*max-width:\s*960px/);
  expect(form).toMatch(/\.columns\.columns\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 350px/);
  expect(form).toMatch(/@media \(max-width: 1050px\)\s*\{\s*\.columns\.columns\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  expect(form).toMatch(/\.expanded\s*\{\s*max-width:\s*none/);
  expect(form).toMatch(/\.actions\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  // Converter's separate import/result slots retain their original placement.
  expect(form).toMatch(/\.aside\.aside\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1\s*\/\s*span 3/);
  expect(form).toMatch(/\.main\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*2/);
});

it('owns the Converter panel, header and segmented visuals as well as the responsive columns', () => {
  const form = compile('src/workbench/form-tool-layout.module.scss').css;
  expect(form).toMatch(/\.settingsPanel\s*\{[^}]*gap:\s*var\(--t4f-space-16\);[^}]*padding:\s*var\(--t4f-space-16\);[^}]*background-color:\s*var\(--t4f-surface-panel\);[^}]*border-radius:\s*var\(--t4f-radius-lg\)/);
  expect(form).toMatch(/\.settingsTitle\s*\{[^}]*font-size:\s*18px;[^}]*font-weight:\s*600/);
  expect(form).toMatch(/\.segmented\s*\{[^}]*padding:\s*var\(--t4f-space-4\);[^}]*background-color:\s*var\(--t4f-input-surface\)/);
  expect(form).toMatch(/\.segment\s*\{[^}]*min-height:\s*44px;[^}]*background-color:\s*transparent/);
  expect(form).toContain('prefers-reduced-motion: reduce');
  const converter = compile('src/tools/image-converter/converter.styles.module.scss').css;
  // No duplicate panel values or preprocessor-specific composition bridge remains.
  expect(converter).not.toContain('composes:');
  expect(converter).not.toMatch(/\.settings\s*\{[^}]*background/);
  for (const file of ['image-converter/ImageConverter', 'batch-file-renamer/BatchFileRenamer', 'zip-manager/ZipManager']) {
    const source = readFileSync(`src/tools/${file}.tsx`, 'utf8');
    expect(source).toContain("import form from '../../workbench/form-tool-layout.module.scss'");
    expect(source).toContain('form.settingsPanel');
    expect(source).toContain('form.settingsHeader');
    expect(source).toContain('form.settingsTitle');
  }
  const renamer = compile('src/tools/batch-file-renamer/renamer.module.scss').css;
  expect(renamer).toContain('container-type: inline-size');
  expect(renamer).toMatch(/\.numberFields\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  expect(renamer).toMatch(/@container \(min-width: 600px\)[\s\S]*\.advanced\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  expect(renamer).toMatch(/\.nameInput\s*\{[^}]*max-width:\s*100%/);
});
