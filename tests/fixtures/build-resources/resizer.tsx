import { ResourceFixture } from './shared';
import './resizer.css';
const createWorker = () => new Worker(new URL('./resizer.worker.ts', import.meta.url), { type: 'module' });
export default function ResizerFixture() {
  return <ResourceFixture name="resizer-private" createWorker={createWorker} />;
}
