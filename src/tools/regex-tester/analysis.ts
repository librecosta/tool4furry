import { RegExpParser, RegExpSyntaxError, RegExpValidator, type AST } from '@eslint-community/regexpp';
import { compile, supportedFlags } from './core';
import { limits, RegexIssue, type Analysis, type Capture, type ExpressionNode } from './protocol';

class AstBudget extends Error {}
const version = { ecmaVersion: 2025 } as const;

function parse(source: string, flags: string) {
  let depth = 0, work = 0;
  // Stop inside the parser before it can build a deeply nested or wide AST.
  const add = () => { if (++work > limits.astNodes) throw new AstBudget(); };
  const enter = () => { add(); if (++depth > limits.astDepth) throw new AstBudget(); };
  const leave = () => { depth--; };
  const options = { unicode: flags.includes('u'), unicodeSets: flags.includes('v') };
  new RegExpValidator({
    ...version,
    onGroupEnter: enter, onGroupLeave: leave,
    onCapturingGroupEnter: enter, onCapturingGroupLeave: leave,
    onLookaroundAssertionEnter: enter, onLookaroundAssertionLeave: leave,
    onCharacterClassEnter: enter, onCharacterClassLeave: leave,
    onClassStringDisjunctionEnter: enter, onClassStringDisjunctionLeave: leave,
    onAlternativeEnter: add, onStringAlternativeEnter: add,
    onCharacter: add, onAnyCharacterSet: add, onEscapeCharacterSet: add,
    onUnicodePropertyCharacterSet: add, onQuantifier: add, onBackreference: add,
    onEdgeAssertion: add, onWordBoundaryAssertion: add,
    onCharacterClassRange: add, onClassIntersection: add, onClassSubtraction: add,
  }).validatePattern(source, 0, source.length, options);
  return new RegExpParser(version).parsePattern(source, 0, source.length, options);
}

function serialize(pattern: AST.Pattern) {
  const captures: Capture[] = [];
  let nodes = 0;
  function node(input: AST.Node, depth: number): ExpressionNode {
    if (++nodes > limits.astNodes || depth > limits.astDepth) throw new AstBudget();
    const child = (next: AST.Node) => node(next, depth + 1);
    const base = { from: input.start, to: input.end, children: [] };
    switch (input.type) {
      case 'Pattern': return { ...base, kind: 'pattern', children: input.alternatives.map(child) };
      case 'Alternative':
      case 'StringAlternative':
        return { ...base, kind: 'sequence', children: input.elements.map(child) };
      case 'CapturingGroup': {
        const { index, name } = { index: captures.length + 1, name: input.name ?? undefined };
        captures.push({ index, name });
        return { ...base, kind: 'capture', group: index, name, children: input.alternatives.map(child) };
      }
      case 'Group':
        return { ...base, kind: 'group', detail: input.modifiers?.raw, children: input.alternatives.map(child) };
      case 'Assertion':
        return {
          ...base, kind: 'assertion',
          detail: ('negate' in input && input.negate ? 'not-' : '') + input.kind,
          children: 'alternatives' in input ? input.alternatives.map(child) : [],
        };
      case 'Character':
        return { ...base, kind: input.raw.startsWith('\\') ? 'escape' : 'character' };
      case 'CharacterClass':
        return { ...base, kind: 'class', detail: input.negate ? 'negated' : undefined, children: input.elements.map(child) };
      case 'ExpressionCharacterClass':
        return { ...base, kind: 'class', detail: input.negate ? 'negated' : undefined, children: [child(input.expression)] };
      case 'CharacterClassRange':
        return { ...base, kind: 'range', children: [child(input.min), child(input.max)] };
      case 'CharacterSet':
        return input.kind === 'property'
          ? { ...base, kind: 'property', detail: input.key + (input.value ? '=' + input.value : '') }
          : { ...base, kind: 'set', detail: ('negate' in input && input.negate ? 'not-' : '') + input.kind };
      case 'ClassIntersection':
      case 'ClassSubtraction':
        return { ...base, kind: 'set', detail: input.type === 'ClassIntersection' ? 'intersection' : 'subtraction',
          children: [child(input.left), child(input.right)] };
      case 'ClassStringDisjunction':
        return { ...base, kind: 'set', detail: 'strings', children: input.alternatives.map(child) };
      case 'Quantifier':
        return { ...base, kind: 'quantifier', min: input.min, max: input.max, greedy: input.greedy, children: [child(input.element)] };
      case 'Backreference':
        return { ...base, kind: 'backreference', detail: String(input.ref) };
      default:
        return { ...base, kind: 'character' };
    }
  }
  const root = node(pattern, 0);
  return { root, captures, nodes };
}

export function analyzePattern(pattern: string, flags: string): Analysis {
  const supported = supportedFlags();
  const result: Analysis = { supported, indices: supported.includes('d') };
  try {
    result.literal = compile(pattern, flags).toString();
  } catch (error) {
    if (!(error instanceof RegexIssue)) throw error;
    result.issue = error.issue;
    if (result.issue.code !== 'syntax') return result;
  }
  try {
    const parsed = parse(pattern, flags);
    return result.issue ? result : { ...result, ...serialize(parsed) };
  } catch (error) {
    if (result.issue && error instanceof RegExpSyntaxError) {
      return { ...result, issue: { code: 'syntax', position: error.index } };
    }
    return { ...result, limited: error instanceof AstBudget || error instanceof RangeError ? 'budget' : 'parser' };
  }
}
