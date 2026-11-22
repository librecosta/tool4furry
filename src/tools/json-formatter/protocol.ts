import {
  jsonChildren, jsonIssue, jsonNode, jsonPath, parseJson, serializeJson,
  type JsonDocument, type JsonIndent, type JsonIssue, type JsonNode,
} from './core';

export type FormatResult =
  | { root: JsonNode; output: string; issue?: never }
  | { root?: JsonNode; output?: never; issue: JsonIssue };

export type JsonOperation =
  | { kind: 'format'; source?: string; indent: JsonIndent; revision: number }
  | { kind: 'children'; node: number; offset: number; revision: number }
  | { kind: 'path'; node: number; revision: number };
export type JsonRequest = JsonOperation & { id: number };
export type JsonResponse = { id: number } & (
  | { kind: 'format'; result: FormatResult }
  | { kind: 'children'; nodes: JsonNode[] }
  | { kind: 'path'; path: string }
  | { kind: 'failure' }
);

export function createJsonWorkerHandler() {
  let parsed: { revision: number; document: JsonDocument } | undefined;
  return (request: JsonRequest): JsonResponse => {
    const { id, revision } = request;
    if (request.kind === 'format') {
      let root: JsonNode | undefined;
      try {
        if (request.source !== undefined) {
          parsed = undefined;
          parsed = { revision, document: parseJson(request.source) };
        }
        if (parsed?.revision !== revision) return { id, kind: 'failure' };
        root = jsonNode(parsed.document, 0);
        const output = serializeJson(parsed.document, request.indent);
        return { id, kind: 'format', result: { root, output } };
      } catch (error) {
        return { id, kind: 'format', result: { root, issue: jsonIssue(error) } };
      }
    }
    if (parsed?.revision !== revision) return { id, kind: 'failure' };
    const { document } = parsed;
    if (request.kind === 'children') {
      return { id, kind: 'children', nodes: jsonChildren(document, request.node, request.offset) };
    }
    return { id, kind: 'path', path: jsonPath(document, request.node) };
  };
}
