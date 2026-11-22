export const maxJsonInput = 16 * 1024 ** 2;
const maxJsonOutput = 32 * 1024 ** 2;
const maxJsonNodes = 500_000;

export type JsonIndent = 0 | 2 | 4;
export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
export type SyntaxIssue =
  | 'empty' | 'comment' | 'trailingComma' | 'expectedKey' | 'expectedColon'
  | 'expectedComma' | 'expectedValue' | 'unclosedString' | 'invalidEscape'
  | 'controlCharacter' | 'invalidUnicode' | 'invalidNumber' | 'unclosedObject' | 'unclosedArray'
  | 'extraContent';
export type JsonIssue =
  | { code: SyntaxIssue; offset: number; line: number; column: number }
  | { code: 'inputLimit' | 'nodeLimit' | 'outputLimit' | 'resource' };

type Node = {
  kind: JsonKind;
  from: number;
  to: number;
  parent: number;
  index: number;
  key?: readonly [number, number];
  children?: number[];
};
export type JsonDocument = { source: string; nodes: Node[] };
export type JsonNode = Omit<Node, 'parent' | 'children'> & { id: number; count: number };

class JsonFailure extends Error {
  constructor(public readonly issue: JsonIssue) {
    super(issue.code);
  }
}

export function jsonIssue(error: unknown): JsonIssue {
  return error instanceof JsonFailure ? error.issue : { code: 'resource' };
}

/** Scan exactly the JSON grammar and index source ranges without converting values. */
export function parseJson(source: string): JsonDocument {
  if (source.length > maxJsonInput) throw new JsonFailure({ code: 'inputLimit' });
  const nodes: Node[] = [];
  const stack: number[] = [];
  const whitespace = /[ \t\r\n]*/y;
  const stringChunk = /[^"\\\u0000-\u001f]*/y;
  const unpairedSurrogate = /[\uD800-\uDFFF]/u;
  const hex = /[0-9a-fA-F]{4}/y;
  const number = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
  let position = 0;

  const fail = (code: SyntaxIssue, offset = position): never => {
    if (source.startsWith('//', offset) || source.startsWith('/*', offset))
      code = 'comment';
    let line = 1;
    let start = 0;
    for (let i = 0; i < offset; i++) {
      if (source[i] === '\r' && source[i + 1] === '\n') continue;
      if (source[i] === '\n' || source[i] === '\r') {
        line++;
        start = i + 1;
      }
    }
    throw new JsonFailure({ code, offset, line, column: offset - start + 1 });
  };

  const skip = () => {
    whitespace.lastIndex = position;
    whitespace.exec(source);
    position = whitespace.lastIndex;
  };

  const readString = () => {
    position++;
    while (position < source.length) {
      stringChunk.lastIndex = position;
      const chunk = stringChunk.exec(source)![0];
      const surrogate = chunk.search(unpairedSurrogate);
      if (surrogate !== -1) fail('invalidUnicode', position + surrogate);
      position = stringChunk.lastIndex;
      const end = source[position];
      if (end === '"') return ++position;
      if (end === undefined) break;
      if (end !== '\\') fail('controlCharacter');
      position++;
      const escape = source[position];
      if (escape === undefined) fail('unclosedString');
      if (escape === 'u') {
        hex.lastIndex = position + 1;
        if (!hex.test(source)) fail('invalidEscape');
        position = hex.lastIndex;
      } else {
        if (!'"\\/bfnrt'.includes(escape)) fail('invalidEscape');
        position++;
      }
    }
    return fail('unclosedString');
  };

  const readValue = (parent = -1, key?: Node['key']) => {
    const from = position;
    const char = source[position];
    let kind: JsonKind;
    if (char === '{' || char === '[') {
      kind = char === '{' ? 'object' : 'array';
      position++;
    } else if (char === '"') {
      kind = 'string';
      readString();
    } else if (char === '-' || (char >= '0' && char <= '9')) {
      kind = 'number';
      number.lastIndex = position;
      if (!number.test(source)) fail('invalidNumber');
      position = number.lastIndex;
      const next = source[position];
      if (next === '.' || next === 'e' || next === 'E' || (next >= '0' && next <= '9'))
        fail('invalidNumber');
    } else if (source.startsWith('true', position) || source.startsWith('false', position)) {
      kind = 'boolean';
      position += char === 't' ? 4 : 5;
    } else if (source.startsWith('null', position)) {
      kind = 'null';
      position += 4;
    } else {
      return fail('expectedValue');
    }

    if (nodes.length === maxJsonNodes) throw new JsonFailure({ code: 'nodeLimit' });
    const id = nodes.length;
    const siblings = nodes[parent]?.children;
    const node: Node = { kind, from, to: position, parent, index: siblings?.length ?? 0 };
    if (key) node.key = key;
    nodes.push(node);
    siblings?.push(id);
    if (kind === 'object' || kind === 'array') {
      node.children = [];
      stack.push(id);
    }
  };

  skip();
  if (position === source.length) fail('empty');
  readValue();
  while (stack.length) {
    skip();
    const id = stack[stack.length - 1];
    const node = nodes[id];
    const object = node.kind === 'object';
    const close = object ? '}' : ']';
    const unclosed = object ? 'unclosedObject' : 'unclosedArray';
    if (source[position] === close) {
      node.to = ++position;
      stack.pop();
      continue;
    }
    if (position === source.length) fail(unclosed);
    if (node.children!.length) {
      if (source[position] !== ',') fail('expectedComma');
      position++;
      skip();
      if (source[position] === close) fail('trailingComma');
      if (position === source.length) fail(unclosed);
    }
    let key: Node['key'];
    if (object) {
      const start = position;
      if (source[start] !== '"') fail('expectedKey');
      key = [start, readString()];
      skip();
      if (source[position] !== ':') fail('expectedColon');
      position++;
      skip();
    }
    readValue(id, key);
  }
  skip();
  if (position !== source.length) fail('extraContent');
  return { source, nodes };
}

/** Re-emit only tokens and structural whitespace. The explicit stack handles deep input. */
export function serializeJson({ source, nodes }: JsonDocument, indent: JsonIndent) {
  const blocks: string[] = [];
  let pieces: string[] = [];
  let length = 0;
  const append = (text: string) => {
    length += text.length;
    if (length > maxJsonOutput) throw new JsonFailure({ code: 'outputLimit' });
    pieces.push(text);
    if (pieces.length === 1024) {
      blocks.push(pieces.join(''));
      pieces = [];
    }
  };
  const line = (depth: number) => {
    if (indent) append('\n' + ' '.repeat(depth * indent));
  };
  const stack = [{ id: 0, next: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    const node = nodes[frame.id];
    const children = node.children;
    if (!children?.length) {
      if (children) append(node.kind === 'object' ? '{}' : '[]');
      else append(source.slice(node.from, node.to));
      stack.pop();
    } else if (frame.next < children.length) {
      if (!frame.next) append(source[node.from]);
      else append(',');
      line(stack.length);
      const id = children[frame.next++];
      const key = nodes[id].key;
      if (key) append(source.slice(...key) + (indent ? ': ' : ':'));
      stack.push({ id, next: 0 });
    } else {
      line(stack.length - 1);
      append(source[node.to - 1]);
      stack.pop();
    }
  }
  blocks.push(pieces.join(''));
  return blocks.join('');
}

export function formatJson(input: string, indent: JsonIndent) {
  return serializeJson(parseJson(input), indent);
}

export function jsonNode({ nodes }: JsonDocument, id: number): JsonNode {
  const { parent: _parent, children, ...node } = nodes[id];
  return { ...node, id, count: children?.length ?? 0 };
}

export const jsonPageSize = 40;
export function jsonChildren(document: JsonDocument, id: number, offset: number) {
  return (document.nodes[id].children ?? [])
    .slice(offset, offset + jsonPageSize)
    .map(child => jsonNode(document, child));
}

export function jsonPath({ nodes, source }: JsonDocument, id: number): string {
  const parts: string[] = [];
  for (let node = nodes[id]; node.parent !== -1; node = nodes[node.parent]) {
    if (!node.key) {
      parts.push('[' + node.index + ']');
      continue;
    }
    // Decode only the property label to select an unambiguous path notation.
    const name: string = JSON.parse(source.slice(...node.key));
    parts.push(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? '.' + name : '[' + JSON.stringify(name) + ']');
  }
  parts.push('$');
  return parts.reverse().join('');
}
