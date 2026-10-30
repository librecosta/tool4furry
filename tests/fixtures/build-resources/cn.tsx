import { ResourceFixture } from './shared';
import './cn.css';
const createWorker = () => new Worker(new URL('./cn.worker.ts', import.meta.url), { type: 'module' });
export default function CnFixture() {
  return <ResourceFixture name="cn-private" createWorker={createWorker} />;
}
