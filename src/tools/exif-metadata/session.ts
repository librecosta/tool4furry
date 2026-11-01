import { acceptImage, decodeChecked } from '../image/browser-codec';
import { cleanImageMetadata } from '../image/metadata';
import { ImageResources } from '../image/resources';
import { resolveImageLimits, type ImageLimits } from '../image/limits';
import { extension, mime, type ImageSource } from '../image/types';
import { batchTime, taskFilename } from '../file-naming';
import { SerialJobs } from '../image-converter/serial-jobs';
import { readMetadata, type MetadataView } from './read-metadata';

export type MetadataState = {
  source?: ImageSource; sourceUrl?: string; before?: MetadataView;
  output?: {blob: Blob; url: string; after: MetadataView; changed: boolean};
  busy: boolean; error?: 'input' | 'clean' | 'timeout';
};
export class MetadataSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  readonly limits: ImageLimits;
  private view: MetadataState = {busy: false};
  private generation = 0;
  private listeners = new Set<() => void>();
  private time = batchTime(new Date());
  private sequence = 0;
  constructor(limits?: ImageLimits) {
    this.limits = limits ?? resolveImageLimits({userAgent: navigator.userAgent, coarsePointer: matchMedia('(pointer: coarse)').matches});
  }
  snapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<MetadataState>) { this.view = {...this.view, ...patch}; this.listeners.forEach(fn => fn()); }
  clear() {
    this.generation++;
    this.jobs.cancel('import'); this.jobs.cancel('clean');
    if (this.view.sourceUrl) this.resources.revoke(this.view.sourceUrl);
    if (this.view.output) this.resources.revoke(this.view.output.url);
    this.view = {busy: false}; this.listeners.forEach(fn => fn());
  }
  import(file: File) {
    this.clear(); const ticket = this.generation; this.sequence++;
    const valid = () => ticket === this.generation && !this.jobs.disposed;
    this.update({busy: true});
    this.jobs.schedule('import', async () => {
      try {
        const source = await acceptImage(file, this.resources, this.limits);
        if (source.info.format === 'avif') throw new Error('unsupported');
        const before = await readMetadata(source.blob, this.limits);
        if (valid()) this.update({source, before, sourceUrl: this.resources.url(source.blob), busy: false});
      } catch { if (valid()) this.update({busy: false, error: 'input'}); }
    }, () => { if (valid()) { this.generation++; this.update({busy: false, error: 'timeout'}); } });
  }
  clean() {
    const source = this.view.source;
    if (!source || this.view.busy || this.jobs.disposed) return;
    if (this.view.output) this.resources.revoke(this.view.output.url);
    this.update({output: undefined, error: undefined, busy: true});
    const ticket = this.generation, valid = () => ticket === this.generation && !this.jobs.disposed;
    this.jobs.schedule('clean', async () => {
      try {
        const cleaned = await cleanImageMetadata(source.blob, this.limits.bytes, this.limits);
        if (cleaned.blob.type !== mime[source.info.format]) throw new Error('mime');
        const bitmap = await decodeChecked(cleaned.blob, cleaned.info, this.resources, this.limits);
        this.resources.close(bitmap);
        const after = await readMetadata(cleaned.blob, this.limits);
        if (valid()) this.update({output: {blob: cleaned.blob, url: this.resources.url(cleaned.blob), after, changed: cleaned.changed}, busy: false});
      } catch { if (valid()) this.update({error: 'clean', busy: false}); }
    }, () => { if (valid()) { this.generation++; this.update({error: 'timeout', busy: false}); } });
  }
  download() {
    const {source, output} = this.view;
    if (!source || !output || this.view.busy) return;
    const filename = taskFilename({time: this.time, sequence: this.sequence, source: source.file.name, extension: extension[source.info.format], label: 'cleaned'});
    if (filename.error) return;
    const anchor = document.createElement('a'); anchor.href = output.url; anchor.download = filename.name;
    document.body.append(anchor); anchor.click(); anchor.remove();
  }
  dispose() { this.clear(); this.jobs.dispose(); this.listeners.clear(); }
}
