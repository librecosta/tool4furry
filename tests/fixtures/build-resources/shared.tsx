import { useEffect, useState } from 'react';

// A real shared client dependency of the eligible fixture tools, not a marker
// exported from an otherwise unreachable module.
export function ResourceFixture({ name, createWorker }: { name: string; createWorker: () => Worker }) {
  const [result, setResult] = useState('waiting');
  useEffect(() => {
    const worker = createWorker();
    worker.onmessage = event => setResult(String(event.data));
    worker.onerror = () => setResult('worker failed');
    worker.postMessage('run');
    return () => worker.terminate();
  }, [createWorker]);
  return <div className={`e2b-${name}`} data-build-resource={name}>
    <p>e2b-shared-published-v1</p><output>{result}</output>
  </div>;
}
