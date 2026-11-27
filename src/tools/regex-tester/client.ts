import {
  limits, RegexIssue, type Analysis, type AnalysisRequest, type RegexRequest, type RegexResult,
  type WorkerRequest, type WorkerResponse,
} from './protocol';

function validateRequest(request: WorkerRequest) {
  if (request.pattern.length > limits.pattern) throw new RegexIssue('pattern-limit');
  if (request.flags.length > 8) throw new RegexIssue('flags');
  if ('kind' in request) return;
  if (request.text.length > limits.text) throw new RegexIssue('text-limit');
  if (request.replacement.length > limits.replacement) throw new RegexIssue('replacement-limit');
  if (request.extract && request.extract.separator.length > limits.separator) throw new RegexIssue('separator-limit');
  if (request.cases && (request.cases.length > limits.tests ||
      request.cases.reduce((size, test) => size + test.text.length + test.expected.length, 0) > limits.testData))
    throw new RegexIssue('test-limit');
}

function run(request: WorkerRequest, signal: AbortSignal, timeout: number): Promise<RegexResult | Analysis> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new RegexIssue('cancelled')); return; }
    let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, settled = false;
    const finish = (error?: unknown, value?: RegexResult | Analysis) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      worker?.terminate();
      if (error) reject(error); else resolve(value!);
    };
    const cancel = () => finish(new RegexIssue('cancelled'));
    signal.addEventListener('abort', cancel, { once: true });
    try {
      validateRequest(request);
      worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module', name: 't4f-regex' });
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if ('result' in data) finish(undefined, data.result);
        else finish(new RegexIssue(data.error.code, data.error.position));
      };
      worker.onerror = event => { event.preventDefault(); finish(new RegexIssue('worker')); };
      worker.onmessageerror = () => finish(new RegexIssue('worker'));
      // Includes startup, execution and structured-clone delivery.
      timer = setTimeout(() => finish(new RegexIssue('timeout')), timeout);
      worker.postMessage(request);
    } catch (error) {
      finish(error instanceof RegexIssue ? error : new RegexIssue('worker'));
    }
  });
}

export function runRegex(request: RegexRequest, signal: AbortSignal, timeout = Number(limits.defaultTimeout)): Promise<RegexResult> {
  const deadline = Number.isFinite(timeout) ? Math.max(limits.defaultTimeout, Math.min(limits.maxTimeout, timeout)) : limits.defaultTimeout;
  return run(request, signal, deadline) as Promise<RegexResult>;
}

export function runAnalysis(request: AnalysisRequest, signal: AbortSignal): Promise<Analysis> {
  return run(request, signal, limits.defaultTimeout) as Promise<Analysis>;
}
