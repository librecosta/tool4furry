import { regions, type Region } from '../config/region';
import type { ToolDefinition } from './types';
import ts from 'typescript';

// Build-time only; never import from Registry or client modules.
// Keep the literal define at each loader's import branch so Vite
// can discard unavailable imports before discovering their private dependencies.
export function toolAvailabilityConstant(id: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    throw new Error(`Invalid tool id for build availability: ${id}`);
  return `import.meta.env.T4F_TOOL_${id.replaceAll('-', '_').toUpperCase()}_AVAILABLE`;
}

export function toolBuildDefines(registry: readonly ToolDefinition[], region: Region) {
  if (!Object.hasOwn(regions, region)) throw new Error(`Invalid build region: ${region}`);
  const defines: Record<string, string> = {};
  for (const tool of registry) {
    const constant = toolAvailabilityConstant(tool.id);
    if (Object.hasOwn(defines, constant))
      throw new Error(`Conflicting tool availability constant: ${constant}`);
    if (!['draft', 'published'].includes(tool.status) || !tool.regions.length ||
        new Set(tool.regions).size !== tool.regions.length ||
        tool.regions.some(value => !Object.hasOwn(regions, value)))
      throw new Error(`Invalid publication metadata: ${tool.id}`);
    defines[constant] = JSON.stringify(tool.status === 'published' && tool.regions.includes(region));
  }
  return defines;
}

// Build-only source check, not a loader generator. Fail copy/paste flag mistakes
// (including in Draft entries) before they can pull private assets into Vite.
export function assertToolLoaderContract(registry: readonly ToolDefinition[], source: string) {
  const file = ts.createSourceFile('loaders.ts', source, ts.ScriptTarget.Latest, true);
  let entries: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'toolLoaders' &&
        node.initializer && ts.isObjectLiteralExpression(node.initializer)) entries = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!entries) throw new Error('Expected explicit toolLoaders object');
  const ids = new Set(registry.map(tool => tool.id));
  const seen = new Set<string>();
  const text = (node: ts.Node) => node.getText(file).replace(/\s+/g, '');
  for (const entry of entries.properties) {
    if (!ts.isPropertyAssignment(entry) ||
        (!ts.isStringLiteral(entry.name) && !ts.isIdentifier(entry.name)))
      throw new Error('Expected explicit loader property');
    const id = entry.name.text;
    if (!ids.has(id) || seen.has(id)) throw new Error(`Unregistered or duplicate loader: ${id}`);
    seen.add(id);
    const value = entry.initializer;
    if (ts.isIdentifier(value) && value.text === 'undefined') continue;
    const fail = () => { throw new Error(`Invalid static loader gate/import: ${id}`); };
    if (!ts.isConditionalExpression(value)) { fail(); continue; }
    const condition = value.condition;
    if (!ts.isBinaryExpression(condition) || condition.operatorToken.kind !== ts.SyntaxKind.BarBarToken ||
        text(condition.left) !== 'import.meta.env.DEV' || text(condition.right) !== toolAvailabilityConstant(id) ||
        text(value.whenFalse) !== 'undefined') fail();
    const load = value.whenTrue;
    if (!ts.isArrowFunction(load) || load.parameters.length || !ts.isCallExpression(load.body) ||
        load.body.expression.kind !== ts.SyntaxKind.ImportKeyword || load.body.arguments.length !== 1 ||
        !ts.isStringLiteral(load.body.arguments[0]) || !load.body.arguments[0].text.startsWith('.')) fail();
  }
}
