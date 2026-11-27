export const limits = {
  pattern: 16 * 1024,
  text: 2 * 1024 ** 2,
  replacement: 64 * 1024,
  records: 10_000,
  captureUnits: 4 * 1024 ** 2,
  scan: 100_000,
  output: 16 * 1024 ** 2,
  separator: 1024,
  diff: 24 * 1024,
  preview: 64 * 1024,
  testText: 128 * 1024,
  testData: 1024 ** 2,
  tests: 40,
  astNodes: 4096,
  astDepth: 64,
  diagramNodes: 180,
  defaultTimeout: 1500,
  maxTimeout: 5000,
  testTimeout: 1000,
} as const;

export const flagsOrder = 'dgimsuvy';
export type Mode = 'match' | 'replace' | 'extract' | 'tests';
export type Range = readonly [number, number];
export type ExtractFormat = 'txt' | 'json' | 'csv';
export type ExtractSettings = {
  group: number | string;
  unique: boolean;
  separator: string;
  format: ExtractFormat;
};
export type Assertion = 'match' | 'no-match' | 'count' | 'replace';
export type TestCase = { id: number; text: string; assertion: Assertion; expected: string };
export type TestResult = {
  id: number;
  status: 'pass' | 'fail' | 'error';
  actual?: string;
  truncated?: boolean;
  issue?: Issue;
};

export type RegexRequest = {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  mode?: Mode;
  extract?: ExtractSettings;
  cases?: TestCase[];
};
export type RegexMatch = {
  index: number;
  end: number;
  value: string;
  groups: (string | null)[];
  named: Record<string, string | null>;
  ranges?: (Range | null)[];
  namedRanges?: Record<string, Range | null>;
};
export type DiffPart = { value: string; added?: boolean; removed?: boolean };
export type RegexResult = {
  matches: RegexMatch[];
  /** Null means the scan stopped before establishing an exact total. */
  count: number | null;
  partial: boolean;
  elapsed: number;
  replaced?: string;
  diff?: DiffPart[];
  extraction?: { value: string; rows: number; absent: number };
  tests?: TestResult[];
  issue?: Issue;
};

export type IssueCode =
  | 'syntax' | 'flags' | 'pattern-limit' | 'text-limit' | 'replacement-limit'
  | 'output-limit' | 'scan-limit' | 'capture-limit' | 'test-limit' | 'test-time'
  | 'test-expected' | 'extract-group' | 'separator-limit' | 'worker' | 'timeout' | 'cancelled';
export type Issue = { code: IssueCode; position?: number };
export class RegexIssue extends Error {
  readonly issue: Issue;
  constructor(code: IssueCode, position?: number) {
    super(code === 'timeout' ? 'Expression timed out' : code === 'cancelled' ? 'Cancelled' : code);
    this.issue = { code, position };
  }
}

export type NodeKind =
  | 'pattern' | 'sequence' | 'character' | 'escape' | 'class' | 'range' | 'set'
  | 'property' | 'quantifier' | 'group' | 'capture' | 'assertion' | 'backreference';
export type ExpressionNode = {
  from: number;
  to: number;
  kind: NodeKind;
  children: ExpressionNode[];
  group?: number;
  name?: string;
  detail?: string;
  min?: number;
  max?: number;
  greedy?: boolean;
};
export type Capture = { index: number; name?: string };
export type Analysis = {
  supported: string;
  indices: boolean;
  literal?: string;
  root?: ExpressionNode;
  captures?: Capture[];
  nodes?: number;
  limited?: 'budget' | 'parser';
  issue?: Issue;
};

export type AnalysisRequest = { kind: 'analyze'; pattern: string; flags: string };
export type WorkerRequest = RegexRequest | AnalysisRequest;
export type WorkerResponse = { result: RegexResult | Analysis } | { error: Issue };
