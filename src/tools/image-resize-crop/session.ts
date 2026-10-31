import { detectCapabilities, type Capabilities } from '../image/browser-codec';
import { ImageResources } from '../image/resources';
import { mobileImageLimits, type ImageLimits } from '../image/limits';
import {
  extension,
  failureCode,
  checkDimensions,
  type ImageSource,
  type ImageErrorCode,
} from '../image/types';
import { SerialJobs } from '../image-converter/serial-jobs';
import { batchTime, taskFilename, validFilenameLabel } from '../file-naming';
import {
  aspects,
  constrainCrop,
  fitAspect,
  fullCrop,
  outputForCrop,
  parseDimension,
  scaleCrop,
  type Aspect,
  type CropRect,
} from './geometry';
import { loadSource, renderCrop, type Output } from './render';

export type ResizeView = Readonly<{
  source?: ImageSource;
  preview?: Blob;
  crop?: CropRect;
  output: Output;
  aspect: Aspect;
  locked: boolean;
  customWidth?: number;
  status: 'empty' | 'loading' | 'editing' | 'exporting' | 'ready' | 'failed';
  result?: Blob;
  error?: ImageErrorCode;
  capabilities?: Capabilities;
  label: string;
  downloaded: boolean;
}>;
export const initialView = (): ResizeView => ({
  output: {
    width: 1,
    height: 1,
    format: 'png',
    quality: 85,
    background: '#FFFFFF',
  },
  aspect: 'free',
  locked: true,
  status: 'empty',
  label: '',
  downloaded: false,
});
export type ResizeServices = {
  load: typeof loadSource;
  render: typeof renderCrop;
  capabilities: typeof detectCapabilities;
};
const defaults: ResizeServices = {
  load: loadSource,
  render: renderCrop,
  capabilities: detectCapabilities,
};

// Single active source and draft. FIFO is reused, not the Converter's batch model.
export class ResizeSession {
  readonly resources = new ImageResources();
  readonly jobs = new SerialJobs();
  private view = initialView();
  private revision = 0;
  private sourceRequest = 0;
  private dead = false;
  private time = batchTime(new Date());
  constructor(
    private changed: (view: ResizeView) => void,
    private services = defaults,
    readonly limits: ImageLimits = mobileImageLimits,
  ) {}
  get snapshot() {
    return this.view;
  }
  private patch(patch: Partial<ResizeView>) {
    if (!this.dead) {
      this.view = { ...this.view, ...patch };
      this.changed(this.view);
    }
  }
  private edit(patch: Partial<ResizeView>) {
    this.revision++;
    this.jobs.cancel('export');
    this.patch({
      result: undefined,
      error: undefined,
      downloaded: false,
      status: this.view.source ? 'editing' : 'empty',
      ...patch,
    });
  }
  start() {
    this.jobs.schedule(
      'capabilities',
      async () => {
        try {
          this.patch({
            capabilities: await this.services.capabilities(
              this.resources,
              this.limits,
            ),
          });
        } catch {
          this.patch({ error: 'encode' });
        }
      },
      () => this.patch({ error: 'timeout' }),
    );
  }
  load(file: File) {
    if (this.dead) return;
    const request = ++this.sourceRequest;
    this.edit({ status: 'loading' });
    let expired = false;
    this.jobs.schedule(
      'load',
      async () => {
        try {
          const loaded = await this.services.load(
            file,
            this.resources,
            this.limits,
          );
          if (this.dead || expired || request !== this.sourceRequest) return;
          this.time = batchTime(new Date());
          this.edit({
            ...loaded,
            crop: fullCrop(loaded.source),
            output: {
              ...initialView().output,
              width: loaded.source.width,
              height: loaded.source.height,
            },
            customWidth: undefined,
            aspect: 'free',
            locked: true,
            label: '',
            status: 'editing',
          });
        } catch (error) {
          if (!expired && request === this.sourceRequest)
            this.patch({ status: 'failed', error: failureCode(error) });
        }
      },
      () => {
        expired = true;
        if (request === this.sourceRequest)
          this.patch({ status: 'failed', error: 'timeout' });
      },
    );
  }
  crop(rect: CropRect) {
    if (!this.view.source || this.view.status === 'loading') return;
    const crop = constrainCrop(rect, this.view.source);
    if (JSON.stringify(crop) === JSON.stringify(this.view.crop)) return;
    // Keep requested width; an over-budget derived height stays visible but blocks export.
    const width = this.view.customWidth ?? crop.width;
    const height =
      this.view.customWidth === undefined
        ? crop.height
        : Math.round((width * crop.height) / crop.width);
    this.edit({ crop, output: { ...this.view.output, width, height } });
  }
  aspect(aspect: Aspect) {
    if (
      !this.view.source ||
      !this.view.crop ||
      this.view.status === 'loading' ||
      !Object.hasOwn(aspects, aspect)
    )
      return;
    const ratio = aspects[aspect];
    const crop = ratio
      ? fitAspect(this.view.crop, ratio, this.view.source)
      : this.view.crop;
    this.crop(crop);
    this.patch({ aspect });
  }
  lock(locked: boolean) {
    this.patch({ locked });
  }
  dimensions(widthText: string, heightText: string, axis: 'width' | 'height') {
    if (!this.view.source || !this.view.crop || this.view.status === 'loading')
      return;
    let width = parseDimension(widthText),
      height = parseDimension(heightText);
    let crop = this.view.crop,
      aspect = this.view.aspect;
    if (this.view.locked) {
      if (axis === 'width')
        height = Math.round((width * crop.height) / crop.width);
      else width = Math.round((height * crop.width) / crop.height);
    } else {
      checkDimensions(width, height, this.limits);
      crop = fitAspect(crop, width / height, this.view.source);
      aspect = 'free';
    }
    checkDimensions(width, height, this.limits);
    this.edit({
      crop,
      aspect,
      customWidth: width,
      output: { ...this.view.output, width, height },
    });
  }
  scale(text: string) {
    if (!this.view.crop || this.view.status === 'loading') return;
    const size = scaleCrop(this.view.crop, text, this.limits);
    this.edit({
      customWidth: size.width,
      output: { ...this.view.output, ...size },
    });
  }
  natural() {
    if (!this.view.crop || this.view.status === 'loading') return;
    this.edit({
      customWidth: undefined,
      output: {
        ...this.view.output,
        ...outputForCrop(this.view.crop, undefined, this.limits),
      },
    });
  }
  output(patch: Partial<Pick<Output, 'format' | 'quality' | 'background'>>) {
    if (this.view.status === 'loading') return;
    const output = { ...this.view.output, ...patch };
    if (JSON.stringify(output) !== JSON.stringify(this.view.output))
      this.edit({ output });
  }
  label(label: string) {
    this.patch({ label });
  }
  filename() {
    return taskFilename({
      time: this.time,
      sequence: 1,
      source: this.view.source?.file.name ?? 'image',
      extension: extension[this.view.output.format],
      label: this.view.label,
    });
  }
  validOutput() {
    try {
      checkDimensions(
        this.view.output.width,
        this.view.output.height,
        this.limits,
      );
      return (
        !!this.view.capabilities?.[this.view.output.format]?.supported &&
        validFilenameLabel(this.view.label)
      );
    } catch {
      return false;
    }
  }
  export() {
    const { source, crop, output } = this.view;
    if (
      this.dead ||
      !source ||
      !crop ||
      this.view.status === 'loading' ||
      !this.validOutput()
    )
      return;
    const revision = ++this.revision;
    const current = () => !this.dead && revision === this.revision;
    this.patch({
      result: undefined,
      downloaded: false,
      error: undefined,
      status: 'exporting',
    });
    this.jobs.schedule(
      'export',
      async () => {
        try {
          const result = await this.services.render(
            source,
            crop,
            output,
            this.resources,
            this.limits,
          );
          if (current()) this.patch({ result, status: 'ready' });
        } catch (error) {
          if (current())
            this.patch({ status: 'failed', error: failureCode(error) });
        }
      },
      () => {
        if (current()) {
          this.revision++;
          this.patch({ status: 'failed', error: 'timeout' });
        }
      },
    );
  }
  download() {
    if (
      this.view.status !== 'ready' ||
      !this.view.result ||
      !this.validOutput()
    )
      return;
    return { blob: this.view.result, name: this.filename().name };
  }
  markDownloaded() {
    if (this.download()) this.patch({ downloaded: true });
  }
  clear() {
    this.sourceRequest++;
    this.revision++;
    this.jobs.cancel('load');
    this.jobs.cancel('export');
    this.patch({
      ...initialView(),
      source: undefined,
      crop: undefined,
      preview: undefined,
      result: undefined,
      error: undefined,
      customWidth: undefined,
      capabilities: this.view.capabilities,
    });
  }
  dispose() {
    this.dead = true;
    this.sourceRequest++;
    this.revision++;
    this.view = initialView();
    this.jobs.dispose();
  }
}
