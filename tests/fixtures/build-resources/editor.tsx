import { ResourceFixture } from './shared';
import './editor.css';
const createWorker = () => new Worker(new URL('./editor.worker.ts', import.meta.url), { type: 'module' });
export default function EditorFixture() {
  return <ResourceFixture name="editor-private" createWorker={createWorker} />;
}
