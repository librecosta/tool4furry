import {
  acceptImage,
  detectCapabilities,
  type Capabilities,
} from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { mobileImageLimits, type ImageLimits } from '../image/limits';
import {
  failureCode,
  extension,
  type ImageSource,
  type ImageErrorCode,
} from '../image/types';
import { SerialJobs } from '../image-converter/serial-jobs';
import { planIntake, type IntakeSummary } from '../image-converter/intake';
import { batchTime, taskFilename } from '../file-naming';
import { fullCrop, type Size } from './geometry';
import {
  initialBatch,
  batchSize,
  ruleValue,
  type BatchSettings,
} from './batch';
import { previewSource, renderCrop } from './render';
import {
  ResizeSession,
  initialView,
  type ResizeView,
  type ResizeServices,
} from './session';

type ErrorCode = ImageErrorCode | 'resultBudget';
export type BatchTask = Readonly<{
  status: 'stale' | 'waiting' | 'processing' | 'success' | 'failed';
  target?: Size;
  result?: Blob;
  error?: ErrorCode;
  request: number;
}>;
export type ResizeFile = Readonly<{
  id: string;
  sequence: number;
  file: File;
  source?: ImageSource;
  intake: 'waiting' | 'validating' | 'ready' | 'failed';
  error?: ErrorCode;
  batch: BatchTask;
}>;
export type CollectionView = Readonly<{
  files: readonly ResizeFile[];
  selectedId?: string;
  mode: 'single' | 'batch';
  editor: ResizeView;
  settings: BatchSettings;
  capabilities?: Capabilities;
  intakeSummary?: IntakeSummary;
  zipStatus: 'idle' | 'packing';
  zipError?: 'budget' | 'changed' | 'failed';
}>;
export const initialCollection = (): CollectionView => ({
  files: [],
  mode: 'single',
  editor: initialView(),
  settings: initialBatch(),
  zipStatus: 'idle',
});
export type CollectionServices = {
  inspect: typeof acceptImage;
  preview: typeof previewSource;
  render: typeof renderCrop;
  capabilities: typeof detectCapabilities;
  single?: ResizeServices;
  pack?: (
    entries: readonly { name: string; blob: Blob }[],
    signal: AbortSignal,
  ) => Promise<Blob>;
};
const defaults: CollectionServices = {
  inspect: acceptImage,
  preview: previewSource,
  render: renderCrop,
  capabilities: detectCapabilities,
};

/** The collection owns all drafts. Their controllers share resources and ONE FIFO. */
export class ResizeCollection {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  private view = initialCollection();
  private files: readonly ResizeFile[] = [];
  private editors = new Map<string, ResizeSession>();
  private replacements = new Map<string, File>();
  private selectedId?: string;
  private mode: 'single' | 'batch' = 'single';
  private settings = initialBatch();
  private capabilities?: Capabilities;
  private previewRequest = 0;
  private sequence = 0;
  private dead = false;
  private time = batchTime(new Date());
  private intakeSummary?: IntakeSummary;
  private deliveryVersion = 0;
  private zipJob?: AbortController;
  private zipStatus: 'idle' | 'packing' = 'idle';
  private zipError?: 'budget' | 'changed' | 'failed';
  constructor(
    private changed: (view: CollectionView) => void,
    private services = defaults,
    readonly limits: ImageLimits = mobileImageLimits,
  ) {}
  get snapshot() {
    return this.view;
  }
  get editor() {
    return this.selectedId ? this.editors.get(this.selectedId) : undefined;
  }
  private find(id = this.selectedId) {
    return this.files.find((file) => file.id === id);
  }
  private publish() {
    if (this.dead) return;
    this.view = {
      files: this.files,
      selectedId: this.selectedId,
      mode: this.mode,
      editor: this.editor?.snapshot ?? initialView(),
      settings: this.settings,
      capabilities: this.capabilities,
      intakeSummary: this.intakeSummary,
      zipStatus: this.zipStatus,
      zipError: this.zipError,
    };
    this.changed(this.view);
  }
  private update(id: string, patch: Partial<ResizeFile>) {
    this.files = this.files.map((file) =>
      file.id === id ? { ...file, ...patch } : file,
    );
  }
  private changedDelivery() {
    this.deliveryVersion++;
    this.zipJob?.abort();
    this.zipError = undefined;
  }
  private admitted(except?: string) {
    return this.files
      .filter((item) => item.id !== except)
      .map((item) => ({
        file: {
          size: Math.max(
            item.file.size,
            this.replacements.get(item.id)?.size ?? 0,
          ),
        },
      }));
  }
  start() {
    let expired = false;
    this.jobs.schedule(
      'capabilities',
      async () => {
        try {
          const capabilities = await this.services.capabilities(
            this.resources,
            this.limits,
          );
          if (this.dead || expired) return;
          this.capabilities = capabilities;
          for (const editor of this.editors.values())
            editor.capabilities(capabilities);
          this.publish();
        } catch {
          this.publish();
        }
      },
      () => {
        expired = true;
        this.publish();
      },
    );
  }
  add(files: readonly File[]) {
    if (this.dead || !files.length) return;
    const plan = planIntake(files, this.admitted(), this.limits);
    this.intakeSummary = plan.summary;
    const first = !this.files.length;
    const additions = plan.accepted.map((file) => {
      const sequence = ++this.sequence;
      return {
        id: `resize-${sequence}`,
        sequence,
        file,
        intake: 'waiting',
        batch: { status: 'stale', request: 0 },
      } satisfies ResizeFile;
    });
    if (first) {
      this.time = batchTime(new Date());
      this.mode = additions.length > 1 ? 'batch' : 'single';
      this.selectedId = additions[0]?.id;
    }
    this.files = [...this.files, ...additions];
    this.changedDelivery();
    this.publish();
    for (const item of additions) this.inspect(item.id);
  }
  private inspect(id: string, retryBatch = false) {
    let expired = false;
    this.jobs.schedule(
      `intake:${id}`,
      async () => {
        const item = this.find(id);
        if (!item || this.dead) return;
        this.update(id, { intake: 'validating', error: undefined });
        this.publish();
        try {
          const source = await this.services.inspect(
            item.file,
            this.resources,
            this.limits,
          );
          if (this.dead || expired || !this.find(id)) return;
          this.update(id, { source, intake: 'ready', error: undefined });
          const editor = new ResizeSession(
            () => {
              if (!this.find(id) || this.dead) return;
              const source = this.editors.get(id)?.snapshot.source;
              const currentEditor = this.editors.get(id);
              if (
                currentEditor?.snapshot.preview &&
                (id !== this.selectedId || this.mode !== 'single')
              ) {
                currentEditor.preview();
                return;
              }
              if (source && source !== this.find(id)?.source) {
                this.update(id, { source, file: source.file });
                this.refreshTarget(id);
                this.changedDelivery();
              }
              this.publish();
            },
            this.services.single,
            this.limits,
            {
              resources: this.resources,
              jobs: this.jobs,
              key: id,
              acceptResult: (blob) => this.fitsResults(blob),
              loadSettled: (file) => {
                if (this.replacements.get(id) === file) this.replacements.delete(id);
              },
            },
          );
          this.editors.get(id)?.dispose();
          this.editors.set(id, editor);
          editor.restoreSource(source, this.capabilities);
          this.refreshTarget(id);
          if (this.find()?.intake === 'failed') this.selectedId = id;
          this.changedDelivery();
          this.publish();
          if (id === this.selectedId && this.mode === 'single')
            this.preparePreview();
          if (retryBatch) this.startBatch([id]);
        } catch (error) {
          if (!expired && this.find(id)) {
            this.update(id, {
              intake: 'failed',
              error: failureCode(error),
              batch: {
                status: 'failed',
                request: item.batch.request + 1,
                error: failureCode(error),
              },
            });
            this.changedDelivery();
            this.publish();
          }
        }
      },
      () => {
        expired = true;
        const item = this.find(id);
        if (item) {
          this.update(id, {
            intake: 'failed',
            error: 'timeout',
            batch: {
              status: 'failed',
              request: item.batch.request + 1,
              error: 'timeout',
            },
          });
          this.changedDelivery();
          this.publish();
        }
      },
    );
  }
  private preparePreview() {
    const request = ++this.previewRequest;
    this.jobs.cancel('preview');
    // At most ONE bounded preview Blob is retained in the collection.
    for (const editor of this.editors.values())
      if (editor.snapshot.preview) editor.preview();
    const item = this.find();
    this.publish();
    if (!item?.source || this.mode !== 'single') return;
    const source = item.source;
    const current = () =>
      !this.dead &&
      request === this.previewRequest &&
      this.selectedId === item.id &&
      this.mode === 'single';
    this.jobs.schedule(
      'preview',
      async () => {
        try {
          const preview = await this.services.preview(
            source,
            this.resources,
            this.limits,
          );
          if (current()) this.editor?.preview(preview);
        } catch (error) {
          if (current()) this.editor?.reportPreviewError(failureCode(error));
        }
      },
      () => {
        if (current()) {
          this.previewRequest++;
          this.editor?.reportPreviewError('timeout');
        }
      },
    );
  }
  select(id: string) {
    if (!this.find(id) || id === this.selectedId || this.dead) return;
    this.selectedId = id;
    this.preparePreview();
  }
  setMode(mode: 'single' | 'batch') {
    if (this.dead || mode === this.mode) return;
    this.mode = mode;
    this.preparePreview();
  }
  replace(file: File) {
    const item = this.find();
    if (!item || !this.editor || this.dead) return;
    const plan = planIntake([file], this.admitted(item.id), this.limits);
    this.intakeSummary = plan.summary;
    if (!plan.accepted.length) {
      this.publish();
      return;
    }
    this.replacements.set(item.id, file);
    this.previewRequest++;
    this.jobs.cancel('preview');
    this.jobs.cancel(`batch:${item.id}`);
    this.update(item.id, {
      batch: { status: 'stale', request: item.batch.request + 1 },
    });
    this.changedDelivery();
    this.editor.load(file);
    this.publish();
  }
  private fitsResults(blob: Blob) {
    // Separate from input admission. Fail explicitly, never evict another success.
    const retained = this.files.reduce(
      (sum, file) =>
        sum +
        (this.editors.get(file.id)?.snapshot.result?.size ?? 0) +
        (file.batch.result?.size ?? 0),
      0,
    );
    return retained + blob.size <= this.limits.totalBytes;
  }
  private refreshTarget(id: string) {
    const item = this.find(id);
    if (!item?.source) return;
    try {
      const target = batchSize(item.source, this.settings, this.limits);
      this.update(id, { batch: { ...item.batch, target, error: undefined } });
    } catch (error) {
      this.update(id, {
        batch: {
          ...item.batch,
          target: undefined,
          status: 'failed',
          error: failureCode(error),
        },
      });
    }
  }
  batchSettings(patch: Partial<BatchSettings>) {
    const settings = { ...this.settings, ...patch };
    ruleValue(settings, this.limits);
    if (
      !['png', 'jpeg', 'webp'].includes(settings.format) ||
      !Number.isInteger(settings.quality) ||
      settings.quality < 1 ||
      settings.quality > 100 ||
      !/^#[0-9a-f]{6}$/i.test(settings.background)
    )
      return;
    if (JSON.stringify(settings) === JSON.stringify(this.settings) || this.dead)
      return;
    this.settings = settings;
    this.cancelBatch();
    this.files = this.files.map((item) => ({
      ...item,
      batch: {
        status: item.intake === 'failed' ? 'failed' : 'stale',
        request: item.batch.request + 1,
        error: item.error,
      },
    }));
    for (const item of this.files) this.refreshTarget(item.id);
    this.changedDelivery();
    this.publish();
  }
  cancelBatch() {
    this.files = this.files.map((item) => {
      this.jobs.cancel(`batch:${item.id}`);
      return ['waiting', 'processing'].includes(item.batch.status)
        ? {
            ...item,
            batch: {
              status: 'stale',
              target: item.batch.target,
              request: item.batch.request + 1,
            } as BatchTask,
          }
        : item;
    });
    this.changedDelivery();
    this.publish();
  }
  startBatch(ids?: readonly string[]) {
    if (
      this.dead ||
      this.files.some((item) =>
        ['waiting', 'validating'].includes(item.intake),
      ) ||
      [...this.editors.values()].some(
        (editor) => editor.snapshot.status === 'loading',
      ) ||
      !this.capabilities?.[this.settings.format]?.supported
    )
      return;
    for (const item of this.files) {
      if (ids && !ids.includes(item.id)) continue;
      if (item.intake === 'failed') {
        if (ids) this.inspect(item.id);
        continue;
      }
      if (!item.source || !['stale', 'failed'].includes(item.batch.status))
        continue;
      this.refreshTarget(item.id);
      const refreshed = this.find(item.id)!;
      if (!refreshed.batch.target) continue;
      const request = item.batch.request + 1;
      const target = refreshed.batch.target;
      const output = { ...this.settings, ...target };
      const source = item.source;
      const current = () =>
        !this.dead && this.find(item.id)?.batch.request === request;
      this.update(item.id, { batch: { status: 'waiting', target, request } });
      this.changedDelivery();
      this.publish();
      this.jobs.schedule(
        `batch:${item.id}`,
        async () => {
          if (!current()) return;
          this.update(item.id, {
            batch: { status: 'processing', target, request },
          });
          this.changedDelivery();
          this.publish();
          try {
            const result = await this.services.render(
              source,
              fullCrop(source),
              output,
              this.resources,
              this.limits,
            );
            if (current()) {
              this.update(item.id, {
                batch: this.fitsResults(result)
                  ? { status: 'success', target, request, result }
                  : {
                      status: 'failed',
                      target,
                      request,
                      error: 'resultBudget',
                    },
              });
              this.changedDelivery();
              this.publish();
            }
          } catch (error) {
            if (current()) {
              this.update(item.id, {
                batch: {
                  status: 'failed',
                  target,
                  request,
                  error: failureCode(error),
                },
              });
              this.changedDelivery();
              this.publish();
            }
          }
        },
        () => {
          if (current()) {
            this.update(item.id, {
              batch: {
                status: 'failed',
                target,
                request: request + 1,
                error: 'timeout',
              },
            });
            this.changedDelivery();
            this.publish();
          }
        },
      );
    }
  }
  retry(id: string) {
    const item = this.find(id);
    if (!item || this.dead || ['waiting', 'validating'].includes(item.intake))
      return;
    if (item.intake === 'failed') this.inspect(id, this.mode === 'batch');
    else this.startBatch([id]);
  }
  filename(id: string) {
    const item = this.find(id)!;
    return taskFilename({
      time: this.time,
      sequence: item.sequence,
      source: item.file.name,
      extension: extension[this.settings.format],
      label: '',
    });
  }
  download(id: string) {
    const item = this.find(id);
    if (item?.batch.status === 'success' && item.batch.result)
      return { blob: item.batch.result, name: this.filename(id).name };
  }
  delivery() {
    const entries = this.files.flatMap((item) => {
      const result = this.download(item.id);
      return result ? [result] : [];
    });
    const pending = this.files.some(
      (item) =>
        ['waiting', 'validating'].includes(item.intake) ||
        ['stale', 'waiting', 'processing'].includes(item.batch.status),
    );
    return {
      entries,
      pending,
      failed: this.files.filter((item) => item.batch.status === 'failed')
        .length,
      allowed: this.files.length > 1 && !pending && entries.length > 0,
    };
  }
  async zip() {
    const state = this.delivery();
    if (!state.allowed || this.zipJob || this.dead) return;
    const version = this.deliveryVersion;
    const controller = new AbortController();
    this.zipJob = controller;
    this.zipStatus = 'packing';
    this.zipError = undefined;
    this.publish();
    try {
      const pack =
        this.services.pack ?? (await import('../image-converter/zip')).packZip;
      const blob = await pack(state.entries, controller.signal);
      if (
        this.dead ||
        controller.signal.aborted ||
        version !== this.deliveryVersion
      )
        throw new Error('changed');
      return { blob, name: `t4f-${this.time}.zip` };
    } catch (error) {
      this.zipError =
        controller.signal.aborted || version !== this.deliveryVersion
          ? 'changed'
          : error instanceof Error && error.message === 'budget'
            ? 'budget'
            : 'failed';
    } finally {
      this.zipJob = undefined;
      this.zipStatus = 'idle';
      this.publish();
    }
  }
  remove(id: string) {
    const index = this.files.findIndex((item) => item.id === id);
    if (index < 0 || this.dead) return;
    this.jobs.cancel(`intake:${id}`);
    this.jobs.cancel(`batch:${id}`);
    this.editors.get(id)?.dispose();
    this.editors.delete(id);
    this.replacements.delete(id);
    this.files = this.files.filter((item) => item.id !== id);
    if (id === this.selectedId) {
      const neighbours = [
        ...this.files.slice(index),
        ...this.files.slice(0, index).reverse(),
      ];
      this.selectedId = (
        neighbours.find((item) => item.intake === 'ready') ?? neighbours[0]
      )?.id;
      this.preparePreview();
    }
    this.changedDelivery();
    this.publish();
  }
  clear() {
    for (const item of this.files) {
      this.jobs.cancel(`intake:${item.id}`);
      this.jobs.cancel(`batch:${item.id}`);
    }
    this.previewRequest++;
    this.jobs.cancel('preview');
    for (const editor of this.editors.values()) editor.dispose();
    this.editors.clear();
    this.replacements.clear();
    this.files = [];
    this.selectedId = undefined;
    this.intakeSummary = undefined;
    this.changedDelivery();
    this.publish();
  }
  dispose() {
    this.dead = true;
    this.clear();
    this.jobs.dispose();
    this.view = initialCollection();
  }
}
