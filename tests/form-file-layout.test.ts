// @vitest-environment node
import { compile } from 'sass-embedded';
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
