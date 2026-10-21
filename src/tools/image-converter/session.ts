import {
  createProcessingState,
  setToolMode,
  setRecommendedPreset,
  restoreRecommended,
  updateSettings,
  replaceSource,
  clearSource,
  beginRequest,
  completeRequest,
  failRequest,
  cancelRequest,
  downloadableResult,
  type ProcessingState,
  type ProcessingSnapshot,
  type ToolMode,
} from '../processing-state';
import {
  acceptImage,
  encodeImage,
  detectCapabilities,
  type Capabilities,
} from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import {
  failureCode,
  ImageFailure,
  mime,
  extension,
  type ImageFormat,
  type ImageSource,
  type ImageResult,
  type ImageErrorCode,
} from '../image/types';
import {
  recommendations,
  sameSettings,
  validSettings,
  type EncodeSettings,
} from './presets';
import { batchTime, taskFilename, validFilenameLabel } from '../file-naming';
import { SerialJobs } from './serial-jobs';

export type ConverterServices = {
  accept: typeof acceptImage;
  encode: typeof encodeImage;
  capabilities: typeof detectCapabilities;
};
type ImageState = ProcessingState<EncodeSettings, ImageResult>;
export type ConverterTask = Readonly<{
  id: string;
  sequence: number;
  file: File;
  source?: ImageSource;
  status: 'validating' | 'queued' | 'processing' | 'ready' | 'stale' | 'error';
  processing: ImageState;
  validationRevision: number;
  error?: ImageErrorCode;
  errorDetail?: string;
}>;
export type ConverterView = Readonly<{
  batch: Readonly<{ id: string; time: string }>;
  tasks: readonly ConverterTask[];
  // Single-import UI projection. The batch remains the authoritative task owner.
  processing: ImageState;
  source?: ImageSource;
  candidate?: string;
  inputError?: ImageErrorCode;
  errorDetail?: string;
  capabilities?: Capabilities;
  checkingCapabilities: boolean;
  capabilityError?: ImageErrorCode;
  label: string;
}>;
const defaults: ConverterServices = {
  accept: acceptImage,
  encode: encodeImage,
  capabilities: detectCapabilities,
};
export class ConverterSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  private live = true;
  private selection = 0;
  private sequence = 0;
  private capabilityRevision = 0;
  private auto = new Set<string>();
  private shared: ImageState = createProcessingState(recommendations.webp);
  private preferences = {
    webp: recommendations.webp.settings,
    jpeg: recommendations.jpeg.settings,
    png: recommendations.png.settings,
  };
  private labelPreference = '';
  private view: ConverterView;
  constructor(
    private emit: (view: ConverterView) => void,
    private services: ConverterServices = defaults,
  ) {
    this.view = {
      batch: { id: crypto.randomUUID(), time: batchTime(new Date()) },
      tasks: [],
      processing: this.shared,
      checkingCapabilities: true,
      label: '',
    };
  }
  get snapshot() {
    return this.view;
  }
  private patch(patch: Partial<ConverterView> = {}) {
    if (!this.live) return;
    const next = { ...this.view, ...patch };
    const first = next.tasks.find((task) => task.source);
    this.view = {
      ...next,
      processing: first?.processing ?? this.shared,
      source: first?.source,
    };
    this.emit(this.view);
  }
  private task(id?: string) {
    return this.view.tasks.find((task) => task.id === id);
  }
  private update(id: string, change: (task: ConverterTask) => ConverterTask) {
    this.patch({
      tasks: this.view.tasks.map((task) =>
        task.id === id ? change(task) : task,
      ),
    });
  }
  private createTask(file: File): ConverterTask {
    const sequence = ++this.sequence;
    return {
      id: `${this.view.batch.id}-${sequence}`,
      sequence,
      file,
      status: 'validating',
      processing: this.shared,
      validationRevision: 0,
    };
  }
  start() {
    this.retryCapabilities();
  }
  retryCapabilities() {
    const token = ++this.capabilityRevision;
    this.patch({ checkingCapabilities: true, capabilityError: undefined });
    this.jobs.schedule(
      'capabilities',
      async () => {
        try {
          const capabilities = await this.services.capabilities(this.resources);
          if (!this.live || token !== this.capabilityRevision) return;
          if (
            !capabilities[this.shared.settings.format].supported &&
            capabilities.png.supported
          )
            this.applyControls(
              restoreRecommended(
                setRecommendedPreset(this.shared, recommendations.png),
                sameSettings,
              ),
            );
          this.patch({ capabilities, checkingCapabilities: false });
          if (this.shared.mode === 'quick')
            this.view.tasks
              .filter(
                (task) =>
                  task.source && ['queued', 'stale'].includes(task.status),
              )
              .forEach((task) => this.auto.add(task.id));
          this.consumeAuto();
        } catch (error) {
          if (token === this.capabilityRevision)
            this.patch({
              checkingCapabilities: false,
              capabilityError: failureCode(error),
            });
        }
      },
      () => {
        if (token === this.capabilityRevision) {
          ++this.capabilityRevision;
          this.patch({
            checkingCapabilities: false,
            capabilityError: 'timeout',
          });
        }
      },
    );
  }
  // B3-B1 core entry point; the production Dropzone still calls single-file select().
  add(files: readonly File[]) {
    if (!this.live) return [];
    const tasks = files.map((file) => this.createTask(file));
    this.patch({ tasks: [...this.view.tasks, ...tasks] });
    tasks.forEach((task) => this.validate(task.id));
    return tasks.map((task) => task.id);
  }
  private validate(id: string) {
    const task = this.task(id);
    if (!task) return;
    const revision = task.validationRevision + 1;
    this.update(id, (current) => ({
      ...current,
      status: 'validating',
      validationRevision: revision,
      error: undefined,
      errorDetail: undefined,
    }));
    const current = () =>
      this.live &&
      this.task(id)?.validationRevision === revision &&
      this.task(id)?.status === 'validating';
    this.jobs.schedule(
      `accept:${id}`,
      async () => {
        try {
          const source = await this.services.accept(task.file, this.resources);
          if (!current()) return;
          this.update(id, (value) => ({
            ...value,
            source,
            status: 'queued',
            processing: replaceSource(this.shared),
          }));
          if (this.shared.mode === 'quick') this.auto.add(id);
          this.consumeAuto();
        } catch (error) {
          if (current())
            this.update(id, (value) => ({
              ...value,
              status: 'error',
              error: failureCode(error),
              errorDetail:
                error instanceof ImageFailure ? error.detail : undefined,
            }));
        }
      },
      () => {
        if (current())
          this.update(id, (value) => ({
            ...value,
            status: 'error',
            error: 'timeout',
          }));
      },
    );
  }
  // Two-phase replacement keeps a valid old task when a candidate fails validation.
  select(file: File) {
    const token = ++this.selection;
    const task = this.createTask(file);
    this.patch({
      candidate: file.name,
      inputError: undefined,
      errorDetail: undefined,
    });
    this.jobs.schedule(
      'candidate',
      async () => {
        try {
          const source = await this.services.accept(file, this.resources);
          if (!this.live || token !== this.selection) return;
          this.view.tasks.forEach((old) => this.cancelJobs(old.id));
          this.auto.clear();
          this.patch({
            tasks: [
              {
                ...task,
                source,
                processing: replaceSource(this.shared),
                status: 'queued',
              },
            ],
            candidate: undefined,
          });
          if (this.shared.mode === 'quick') this.auto.add(task.id);
          this.consumeAuto();
        } catch (error) {
          if (token === this.selection) {
            this.patch({
              candidate: undefined,
              inputError: failureCode(error),
              errorDetail: error instanceof ImageFailure ? error.detail : '',
            });
            this.consumeAuto();
          }
        }
      },
      () => {
        if (token === this.selection) {
          ++this.selection;
          this.patch({ candidate: undefined, inputError: 'timeout' });
        }
      },
    );
  }
  private consumeAuto() {
    if (
      this.view.checkingCapabilities ||
      !this.view.capabilities ||
      this.view.candidate
    )
      return;
    if (
      this.shared.mode !== 'quick' ||
      !this.view.capabilities[this.shared.settings.format].supported
    )
      return;
    const pending = [...this.auto];
    this.auto.clear();
    pending.forEach((id) => this.generate(id));
  }
  private applyControls(next: ImageState) {
    this.shared = next;
    const tasks = this.view.tasks.map((task): ConverterTask => {
      let processing = setRecommendedPreset(
        setToolMode(task.processing, next.mode),
        next.preset,
      );
      const before = processing;
      processing = updateSettings(
        processing,
        next.settings,
        sameSettings,
        next.validSettings,
      );
      if (processing !== before) {
        this.jobs.cancel(`encode:${task.id}`);
        // Release obsolete output Blobs rather than accumulating stale images per task.
        const stale = !!task.processing.result || task.status === 'stale';
        processing = {
          ...processing,
          result: undefined,
          status: stale ? 'stale' : 'idle',
        };
        return {
          ...task,
          processing,
          status: !task.source ? task.status : stale ? 'stale' : 'queued',
          error: !task.source ? task.error : undefined,
        };
      }
      return { ...task, processing };
    });
    this.patch({ tasks });
  }
  mode(mode: ToolMode) {
    if (mode === this.shared.mode) return;
    this.auto.clear();
    this.applyControls(setToolMode(this.shared, mode));
    if (mode === 'advanced') this.patch({ label: this.labelPreference });
  }
  format(format: ImageFormat) {
    if (
      this.view.checkingCapabilities ||
      !this.view.capabilities?.[format].supported
    )
      return;
    const settings =
      this.shared.mode === 'quick'
        ? recommendations[format].settings
        : this.preferences[format];
    this.applyControls(
      updateSettings(
        setRecommendedPreset(this.shared, recommendations[format]),
        settings,
        sameSettings,
        validSettings(settings),
      ),
    );
    if (this.shared.mode === 'quick') {
      this.view.tasks
        .filter(
          (task) =>
            task.source && ['queued', 'stale', 'error'].includes(task.status),
        )
        .forEach((task) => this.auto.add(task.id));
      this.consumeAuto();
    }
  }
  settings(settings: EncodeSettings) {
    this.preferences[settings.format] = settings;
    this.applyControls(
      updateSettings(
        this.shared,
        settings,
        sameSettings,
        validSettings(settings),
      ),
    );
    if (this.shared.mode === 'quick') {
      this.view.tasks
        .filter(
          (task) => task.source && ['queued', 'stale'].includes(task.status),
        )
        .forEach((task) => this.auto.add(task.id));
      this.consumeAuto();
    }
  }
  restore() {
    const next = restoreRecommended(this.shared, sameSettings);
    this.preferences[next.settings.format] = next.settings;
    this.applyControls(next);
    if (this.shared.mode === 'quick') {
      this.view.tasks
        .filter(
          (task) =>
            task.source && ['queued', 'stale', 'error'].includes(task.status),
        )
        .forEach((task) => this.auto.add(task.id));
      this.consumeAuto();
    }
  }
  label(label: string) {
    if (validFilenameLabel(label)) this.labelPreference = label;
    this.patch({ label });
  }
  filename(id = this.view.tasks[0]?.id) {
    const task = this.task(id);
    return taskFilename({
      time: this.view.batch.time,
      sequence: task?.sequence ?? this.sequence + 1,
      source: task?.file.name ?? 'image.png',
      extension: extension[this.shared.settings.format],
      label: this.shared.mode === 'advanced' ? this.view.label : '',
    });
  }
  generate(id?: string) {
    const targets = id
      ? this.view.tasks.filter((task) => task.id === id)
      : this.view.tasks;
    targets.forEach((task) => this.enqueue(task));
  }
  private enqueue(task: ConverterTask) {
    const source = task.source,
      before = task.processing;
    if (
      !source ||
      this.view.candidate ||
      this.view.checkingCapabilities ||
      !this.view.capabilities?.[before.settings.format].supported ||
      !validSettings(before.settings) ||
      ['processing', 'validating'].includes(task.status) ||
      before.active
    )
      return;
    const processing = beginRequest(before),
      snapshot = processing.active!;
    const passthrough =
      before.mode === 'quick' &&
      source.info.format === snapshot.settings.format;
    this.update(task.id, (current) => ({
      ...current,
      status: 'queued',
      processing,
      error: undefined,
    }));
    this.jobs.schedule(
      `encode:${task.id}`,
      async () => {
        if (!this.current(task.id, snapshot)) return;
        this.update(task.id, (current) => ({
          ...current,
          status: 'processing',
        }));
        try {
          const blob = passthrough
            ? source.blob
            : await this.services.encode(
                source,
                snapshot.settings,
                this.resources,
              );
          if (!this.current(task.id, snapshot)) return;
          const result: ImageResult = {
            kind: passthrough ? 'passthrough' : 'encoded',
            blob,
            mime: mime[snapshot.settings.format],
            width: source.width,
            height: source.height,
            bytes: blob.size,
            suggestedFilename: taskFilename({
              time: this.view.batch.time,
              sequence: task.sequence,
              source: task.file.name,
              extension: extension[snapshot.settings.format],
            }).name,
          };
          this.update(task.id, (current) => ({
            ...current,
            status: 'ready',
            processing: completeRequest(current.processing, snapshot, result),
          }));
        } catch (error) {
          if (this.current(task.id, snapshot))
            this.fail(task.id, snapshot, failureCode(error));
        }
      },
      () => {
        if (this.current(task.id, snapshot))
          this.fail(task.id, snapshot, 'timeout');
      },
    );
  }
  private fail(
    id: string,
    snapshot: ProcessingSnapshot<EncodeSettings>,
    error: ImageErrorCode,
  ) {
    this.update(id, (task) => ({
      ...task,
      status: 'error',
      error,
      processing: {
        ...failRequest(task.processing, snapshot, error),
        result: undefined,
      },
    }));
  }
  private current(id: string, snapshot: ProcessingSnapshot<EncodeSettings>) {
    const state = this.task(id)?.processing;
    return (
      this.live &&
      state?.status === 'processing' &&
      !!state.active &&
      state.sourceRevision === snapshot.sourceRevision &&
      state.settingsRevision === snapshot.settingsRevision &&
      state.requestId === snapshot.requestId
    );
  }
  download(id = this.view.tasks[0]?.id) {
    const task = this.task(id);
    return this.view.candidate || !task
      ? undefined
      : downloadableResult(task.processing);
  }
  retry(id: string) {
    const task = this.task(id);
    if (!task || !['error', 'stale', 'queued'].includes(task.status)) return;
    if (!task.source) this.validate(id);
    else this.generate(id);
  }
  cancel(id: string) {
    this.cancelJobs(id);
    this.update(id, (task) => ({
      ...task,
      status: 'error',
      error: 'cancelled',
      validationRevision: task.validationRevision + 1,
      processing: {
        ...cancelRequest(task.processing),
        result: undefined,
        status: 'error',
        error: 'cancelled',
      },
    }));
  }
  private cancelJobs(id: string) {
    this.auto.delete(id);
    this.jobs.cancel(`accept:${id}`);
    this.jobs.cancel(`encode:${id}`);
  }
  rejectSelection(code: ImageErrorCode) {
    ++this.selection;
    this.jobs.cancel('candidate');
    this.patch({ candidate: undefined, inputError: code });
    this.consumeAuto();
  }
  remove(id?: string) {
    if (!id) {
      ++this.selection;
      this.jobs.cancel('candidate');
    }
    this.view.tasks
      .filter((task) => !id || task.id === id)
      .forEach((task) => this.cancelJobs(task.id));
    this.patch({
      tasks: id ? this.view.tasks.filter((task) => task.id !== id) : [],
      ...(!id
        ? {
            candidate: undefined,
            inputError: undefined,
            errorDetail: undefined,
          }
        : {}),
    });
  }
  dispose() {
    this.live = false;
    ++this.selection;
    ++this.capabilityRevision;
    this.auto.clear();
    this.jobs.dispose();
    this.view = {
      ...this.view,
      tasks: [],
      source: undefined,
      candidate: undefined,
      processing: clearSource(this.shared),
    };
  }
}
