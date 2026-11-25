import { fail } from '../general/bounds';
import { outputLimit } from './settings';
import { jsonIssue, parseJson, type JsonDocument } from '../json-formatter/core';

export function validUnicode(text: string) {
  if (/[\uD800-\uDFFF]/u.test(text))
    fail('输入包含无法写入 UTF-8 的孤立代理字符。', 'Input contains an unpaired surrogate that cannot be written to UTF-8.');
  return text;
}

export function jsonRows(text: string, flatten: boolean) {
  let doc: JsonDocument;
  try {
    doc = parseJson(text);
  } catch (error) {
    const issue = jsonIssue(error);
    if (issue.code === 'inputLimit') fail('JSON 输入上限为 16 Mi UTF-16 代码单元。', 'JSON input is limited to 16 Mi UTF-16 code units.');
    if (issue.code === 'nodeLimit') fail('JSON 超过 500,000 个解析节点。', 'JSON exceeds 500,000 parsed nodes.');
    if ('line' in issue) fail(
      'JSON 无效（第 ' + issue.line + ' 行，第 ' + issue.column + ' 列）。',
      'Invalid JSON at line ' + issue.line + ', column ' + issue.column + '.',
    );
    throw error;
  }
  const { nodes, source } = doc;
  const names = new Map<number, string>();
  for (const node of nodes) {
    if (node.kind !== 'object') continue;
    const seen = new Set<string>();
    for (const id of node.children!) {
      const name: string = JSON.parse(source.slice(...nodes[id].key!));
      if (seen.has(name)) fail('JSON 中存在重复属性 ' + JSON.stringify(name) + '。', 'Duplicate JSON property ' + JSON.stringify(name) + '.');
      seen.add(name);
      names.set(id, name);
    }
  }

  const cell = (id: number): string => {
    const node = nodes[id];
    const raw = source.slice(node.from, node.to);
    if (node.kind === 'null') return '';
    if (node.kind === 'string') return validUnicode(JSON.parse(raw));
    return raw;
  };
  const root = nodes[0];
  const records = root.kind === 'object' ? [0] : root.kind === 'array' ? root.children! : undefined;
  const first = records?.length ? nodes[records[0]].kind : 'object';
  if (!records || (first !== 'array' && first !== 'object') || records.some(id => nodes[id].kind !== first))
    return fail('JSON 必须是对象、对象数组或规则二维数组。', 'Use a JSON object, an array of objects, or a rectangular array.');

  if (first === 'array') {
    const width = nodes[records[0]].children!.length;
    if (!width) noColumns();
    const bad = records.findIndex(id => nodes[id].children!.length !== width);
    if (bad !== -1) rowWidthError(bad + 1, width, nodes[records[bad]].children!.length);
    return {
      columns: Array.from({ length: width }, (_, index) => columnName(index)),
      records: records.length,
      *rows() {
        for (const id of records) yield nodes[id].children!.map(cell);
      },
    };
  }

  const columns = new Map<string, string | undefined>();
  let headerUnits = 0;
  const entries = records.map(id => {
    const fields = new Map<string, number>();
    const stack = [{ ids: nodes[id].children!, next: 0, prefix: '', path: '' }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.next === frame.ids.length) {
        stack.pop();
        continue;
      }
      const child = frame.ids[frame.next++];
      const key = validUnicode(names.get(child)!);
      const name = frame.prefix + key;
      const path = flatten ? frame.path + JSON.stringify(key) : undefined;
      if (flatten && nodes[child].kind === 'object' && nodes[child].children!.length) {
        stack.push({ ids: nodes[child].children!, next: 0, prefix: name + '.', path: path! });
        continue;
      }
      if (fields.has(name) || (columns.has(name) && columns.get(name) !== path)) {
        fail('展开后的字段路径冲突 ' + JSON.stringify(name) + '。', 'Flattened field path collision at ' + JSON.stringify(name) + '.');
      }
      if (!columns.has(name)) {
        headerUnits += name.length + 1;
        if (headerUnits > outputLimit)
          fail('展开后的表头超过资源预算。', 'The flattened headers exceed the resource budget.');
        columns.set(name, path);
      }
      fields.set(name, child);
    }
    return fields;
  });
  if (records.length && !columns.size) noColumns();
  const headers = [...columns.keys()];
  return {
    columns: headers,
    records: records.length,
    *rows() {
      for (const fields of entries) yield headers.map(name => {
        const id = fields.get(name);
        return id === undefined ? '' : cell(id);
      });
    },
  };
}

export const columnName = (index: number) => 'column_' + (index + 1);

function noColumns(): never {
  return fail('记录没有可导出的列。', 'Records have no columns to export.');
}

export function rowWidthError(record: number, expected: number, actual: number): never {
  return fail(
    '第 ' + record + ' 条记录有 ' + actual + ' 个字段，应为 ' + expected + ' 个。',
    'Record ' + record + ' has ' + actual + ' fields; expected ' + expected + '.',
  );
}
