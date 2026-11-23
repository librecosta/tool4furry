import { useCallback, useEffect, useRef, useState } from 'react';
import { DownloadSimpleIcon, ImageIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField } from '../../ui/TextField';
import { saveBlob, useBlobUrl } from '../../tools/general/ui';
import { errorCorrectionLevels } from '../../tools/qr-code-generator/recipe/types';
import { defaultParameters, dithers, limits, outputSizes, type Issue, type Method, type Parameters } from './fusion';
import type { FusionResult, RunMessage, RunResult, Scan } from './fusion.worker';
import chromatic from './samples/source_chromatic.png?url&no-inline';
import graphic from './samples/source_graphic.png?url&no-inline';
import qrNotice from '../../tools/qr-code-generator/qrcode.NOTICE.txt?url';
import decoderNotice from '../../tools/qr-code-generator/art/jsqr.NOTICE.txt?url&no-inline';
import s from './image-fusion.module.scss';

const samples = {
  chromatic: { url: chromatic, label: ['柔和彩色', 'Chromatic'], name: 'source_chromatic.png' },
  graphic: { url: graphic, label: ['高对比度几何', 'Graphic'], name: 'source_graphic.png' },
} as const;
type Source = keyof typeof samples | File;
type Translate = (zh: string, en: string) => string;
const localize = (t: Translate, [zh, en]: readonly [string, string]) => t(zh, en);
const methodLabels = { blend: 'Blend', halftone: 'Colored Halftone', hybrid: 'Hybrid' } as const;
const conditionLabels = {
  native: ['原尺寸', 'Native'], half: ['缩至 ½', '½ scale'], quarter: ['缩至 ¼', '¼ scale'],
  blur07: ['模糊 0.7 px', 'Blur 0.7 px'], blur12: ['模糊 1.2 px', 'Blur 1.2 px'], jpeg70: ['JPEG 70', 'JPEG 70'],
} as const;
const statusLabels = {
  pass: ['通过', 'Pass'], fail: ['未读回原文', 'No match'], error: ['错误', 'Error'], skipped: ['不可用', 'Unavailable'],
} as const;
const issueLabels = {
  fileType: ['请选择 PNG、JPEG 或 WebP 图像。', 'Choose a PNG, JPEG or WebP image.'],
  fileSize: ['文件超过 20 MiB。', 'The file is larger than 20 MiB.'],
  imageSize: ['图像超过 4,000 万像素。', 'The image exceeds 40 million pixels.'],
  image: ['无法读取图像。', 'The image could not be read.'],
  content: ['请输入有效的二维码内容，最多 2,000 个 UTF-16 代码单元。', 'Enter valid QR content of up to 2,000 UTF-16 code units.'],
  capacity: ['内容超出选定纠错等级的二维码容量。', 'The content exceeds QR capacity at the selected error correction level.'],
  density: ['当前尺寸无法为每个模块保留至少 2 px。请增大尺寸或缩短内容。', 'Choose a larger size or shorten the content to allow 2 px per module.'],
  browser: ['当前浏览器不支持实验所需的后台 Canvas。', 'This browser does not support the worker canvas used by the lab.'],
  processing: ['处理失败或超时。请尝试较小尺寸。', 'Processing failed or timed out. Try a smaller output size.'],
} as const satisfies Record<Issue, readonly [string, string]>;

function ImageTile({ title, blob, pixelated = false, detail }: {
  title: string; blob?: Blob; pixelated?: boolean; detail?: RunResult['detail'] & { outputSize: number };
}) {
  const url = useBlobUrl(blob);
  return <figure className={s.figure}>
    <figcaption>{title}</figcaption>
    <div className={s.image} data-pixelated={pixelated || undefined}>
      {url ? <img src={url} alt={title} /> : <ImageIcon size={32} aria-hidden />}
      {url && detail && <span className={s.crop} aria-hidden style={{
        top: `${detail.start * 100 / detail.outputSize}%`, left: `${detail.start * 100 / detail.outputSize}%`,
        width: `${detail.size * 100 / detail.outputSize}%`, height: `${detail.size * 100 / detail.outputSize}%`,
      }} />}
    </div>
  </figure>;
}

function MethodCard({ data, current, onSelect, t }: { data: FusionResult; current: boolean; onSelect: () => void; t: Translate }) {
  const url = useBlobUrl(data.png);
  const passed = data.scans.filter(scan => scan.status === 'pass').length;
  const attempted = data.scans.filter(scan => scan.status !== 'skipped').length;
  return <button type="button" className={s.method} aria-pressed={current} onClick={onSelect}>
    {url && <img src={url} alt="" />}
    <span><strong>{methodLabels[data.method]}</strong>
      <span className={s.methodStats}>{t(`${passed}/${attempted} 通过`, `${passed}/${attempted} passed`)} · {data.renderMs} ms</span>
    </span>
  </button>;
}

function Range({ name, value, min, max, onChange }: { name: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className={s.range}>
    <span>{name} <span>{value}%</span></span>
    <input type="range" min={min} max={max} value={value} aria-valuetext={`${value}%`}
      onChange={event => onChange(event.currentTarget.valueAsNumber)} />
  </label>;
}

function Report({ result, t }: { result: RunResult; t: Translate }) {
  return <div className={s.report}>
    <h2>{t('软件解码', 'Software decoding')}</h2>
    <p>{t('jsQR 1.4.0 比较文本与 UTF-8 字节。时间包含图像变换与解码。', 'jsQR 1.4.0 checks text and UTF-8 bytes. Times include image transforms and decoding.')}</p>
    <div className={s.tableClip} role="region" tabIndex={0} aria-label={t('解码结果表', 'Decoder results table')}>
      <table>
        <thead><tr><th scope="col">{t('条件', 'Condition')}</th>
          {result.results.map(item => <th key={item.method} scope="col">{methodLabels[item.method]}</th>)}</tr></thead>
        <tbody>
          {result.results[0].scans.map((scan, i) => <tr key={scan.condition}>
            <th scope="row">{localize(t, conditionLabels[scan.condition])}</th>
            {result.results.map(item => {
              const { status, milliseconds }: Scan = item.scans[i];
              return <td key={item.method} data-status={status}>{localize(t, statusLabels[status])} <small>{milliseconds} ms</small></td>;
            })}
          </tr>)}
          <tr><th scope="row">{t('色彩 MAE（0–255）', 'Color MAE (0–255)')}</th>
            {result.results.map(item => <td key={item.method}>{item.mae}</td>)}</tr>
        </tbody>
      </table>
    </div>
    <p>{t('MAE 仅比较符号区域的 RGB 差异。解码结果来自数字图像，实体扫码需另测。', 'MAE measures RGB differences inside the symbol. Physical scanning requires separate tests.')}</p>
  </div>;
}

function downloadJson(data: unknown, name: string) {
  saveBlob(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }), name);
}

export default function ImageFusionLab({ locale }: { locale: Locale }) {
  const t: Translate = (zh, en) => locale === 'zh' ? zh : en;
  const [options, setOptions] = useState(defaultParameters);
  const [source, setSource] = useState<Source>('chromatic');
  const [method, setMethod] = useState<Method>('hybrid');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Issue>();
  const [finished, setFinished] = useState<{ result: RunResult; options: Parameters; source: Source }>();
  const request = useRef<AbortController>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = useCallback(async (parameters: Parameters, image: Source) => {
    request.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    request.current = controller;
    setError(undefined);
    setBusy(true);
    let worker: Worker | undefined;
    let timer: number | undefined;
    try {
      const builtin = typeof image === 'string' ? samples[image] : undefined;
      const input = builtin ? await fetch(builtin.url, { signal }).then(response => {
        if (!response.ok) throw new Error('Could not load the bundled image');
        return response.blob();
      }) : image as File;
      signal.throwIfAborted();
      if (typeof Worker === 'undefined') {
        setError('browser');
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const instance = new Worker(new URL('./fusion.worker.ts', import.meta.url), { type: 'module' });
        worker = instance;
        signal.addEventListener('abort', () => resolve(), { once: true });
        timer = window.setTimeout(() => reject(new Error('Fusion timed out')), 90_000);
        instance.onerror = reject;
        instance.onmessageerror = reject;
        instance.onmessage = ({ data }: MessageEvent<RunMessage>) => {
          if (signal.aborted) return;
          if ('result' in data) setFinished({ result: data.result, options: parameters, source: image });
          else setError(data.issue);
          resolve();
        };
        instance.postMessage({ source: input, sourceName: builtin?.name ?? (image as File).name, options: parameters });
      });
    } catch {
      if (!signal.aborted) setError('processing');
    } finally {
      window.clearTimeout(timer);
      worker?.terminate();
      if (request.current === controller) {
        request.current = null;
        if (!signal.aborted) setBusy(false);
      }
    }
  }, []);
  useEffect(() => {
    void run(defaultParameters, 'chromatic');
    return () => request.current?.abort();
  }, [run]);

  function cancel() {
    request.current?.abort();
    setBusy(false);
  }
  function update(next: Partial<Parameters>) {
    cancel();
    setError(undefined);
    setOptions(current => ({ ...current, ...next }));
  }
  function choose(value: Source) {
    cancel();
    setError(undefined);
    setSource(value);
  }

  const result = finished?.result;
  const selected = result?.results.find(item => item.method === method);
  const stale = !!finished && (finished.options !== options || finished.source !== source);
  const params = { formatVersion: 1, source: result?.image, parameters: result?.options };
  const report = result && { ...params, decoder: 'jsQR 1.4.0', matrix: result.matrix, detail: result.detail,
    processingMs: result.processingMs, results: result.results.map(({ method, scans, renderMs, mae }) => ({ method, scans, renderMs, mae })) };
  const ditherNames = {
    none: t('不抖动', 'None'), ordered: t('有序 Bayer', 'Ordered Bayer'), floyd: 'Floyd–Steinberg',
  };

  return <div className={s.lab} data-image-fusion-lab>
    <aside className={s.parameters} aria-label={t('实验参数', 'Experiment parameters')}>
      <h2>{t('实验参数', 'Experiment parameters')}</h2>
      <div className={s.source}>
        <SelectField label={t('图像来源', 'Image source')} value={typeof source === 'string' ? source : 'file'}
          options={[
            ...Object.entries(samples).map(([value, sample]) => ({ value, label: localize(t, sample.label) })),
            ...(typeof source === 'string' ? [] : [{ value: 'file', label: source.name }]),
          ]} onValueChange={value => { if (value === 'chromatic' || value === 'graphic') choose(value); }} />
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            if (file) choose(file);
            event.currentTarget.value = '';
          }} aria-label={t('本地图像', 'Local image')} />
        <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
          <ImageIcon size={17} aria-hidden />{t('选择本地图像', 'Choose local image')}
        </Button>
      </div>
      <TextAreaField label={t('二维码内容', 'QR content')} value={options.content} maxLength={limits.contentLength}
        rows={2} onChange={content => update({ content })} />
      <div className={s.ranges}>
        {([
          ['anchor', t('中心约束比例', 'Center anchor')],
          ['strength', t('约束强度', 'Constraint strength')],
          ['contrast', t('目标对比度', 'Target contrast')],
        ] as const).map(([key, label]) =>
          <Range key={key} name={label} value={options[key]} min={limits[key][0]} max={limits[key][1]}
            onChange={value => update({ [key]: value })} />)}
      </div>
      <SelectField label={t('抖动', 'Dithering')} value={options.dither}
        options={dithers.map(value => ({ value, label: ditherNames[value] }))}
        onValueChange={dither => { if (dither === 'none' || dither === 'ordered' || dither === 'floyd') update({ dither }); }} />
      <div className={s.pair}>
        <SelectField label={t('纠错等级', 'Error correction')} value={options.ecc}
          options={errorCorrectionLevels.map(value => ({ value, label: value }))}
          onValueChange={value => {
            const ecc = errorCorrectionLevels.find(level => level === value);
            if (ecc) update({ ecc });
          }} />
        <SelectField label={t('输出尺寸', 'Output size')} value={String(options.size)}
          options={outputSizes.map(size => ({ value: String(size), label: `${size} px` }))}
          onValueChange={value => { if (value) update({ size: Number(value) }); }} />
      </div>
      <label className={s.check}><input type="checkbox" checked={options.adaptive}
        onChange={event => update({ adaptive: event.currentTarget.checked })} />
        {t('局部自适应亮度约束', 'Adaptive local luminance')}
      </label>
      <p className={s.note}>{t('PNG、JPEG、WebP。图像留在当前浏览器。Blend 对整格约束，不使用中心比例和抖动。',
        'PNG, JPEG or WebP. Images stay in your browser. Blend constrains whole modules and ignores the anchor and dither settings.')}</p>
      {busy ? <Button variant="secondary" onClick={cancel}>{t('取消实验', 'Cancel run')}</Button>
        : <Button variant="primary" onClick={() => void run(options, source)}>{t('运行三种算法', 'Run all three methods')}</Button>}
      {error && <p className={s.error} role="alert">{localize(t, issueLabels[error])}</p>}
    </aside>
    <section className={s.results} aria-label={t('图像对照', 'Image comparison')}>
      <header className={s.resultsHeader}>
        <div><h2>{t('图像对照', 'Image comparison')}</h2>
          <p role="status">{busy ? t('正在生成并解码三种图像…', 'Rendering and decoding all three methods…')
            : stale ? t('参数已编辑，当前仍显示上一次的结果。', 'Settings have changed. Showing the previous run.')
            : result ? t(`${result.options.size} px · QR V${result.matrix.version} · 每模块 ${result.matrix.modulePx} px · 总耗时 ${result.processingMs} ms`,
              `${result.options.size} px · QR V${result.matrix.version} · ${result.matrix.modulePx} px/module · ${result.processingMs} ms total`)
            : t('运行实验后查看图像与解码结果。', 'Run the comparison to see the images and decode results.')}</p>
        </div>
      </header>
      <div className={s.triptych}>
        <ImageTile title={t('原始图像', 'Source image')} blob={result?.source} />
        <ImageTile title={t('生成结果', 'Rendered result')} blob={selected?.png} detail={result && { ...result.detail, outputSize: result.options.size }} />
        <ImageTile title={t('中央 7 × 7 模块', 'Center 7 × 7 modules')} blob={selected?.detail} pixelated />
      </div>
      {result && <>
        <div className={s.methods} role="group" aria-label={t('选择算法查看细节', 'Choose a method to inspect')}>
          {result.results.map(data => <MethodCard key={data.method} data={data} current={data.method === method}
            onSelect={() => setMethod(data.method)} t={t} />)}
        </div>
        <div className={s.downloads}>
          <Button variant="primary" size="sm" disabled={!selected || stale || busy}
            onClick={() => selected && saveBlob(selected.png, `fusion-${method}.png`)}>
            <DownloadSimpleIcon size={16} aria-hidden />{t('下载所选 PNG', 'Download selected PNG')}
          </Button>
          <Button size="sm" disabled={stale || busy} onClick={() => downloadJson(params, 'fusion-parameters.json')}>
            {t('参数 JSON', 'Parameters JSON')}
          </Button>
          <Button size="sm" disabled={stale || busy} onClick={() => report && downloadJson(report, 'fusion-results.json')}>
            {t('结果 JSON', 'Results JSON')}
          </Button>
        </div>
        <Report result={result} t={t} />
      </>}
      <footer className={s.notices}><a href={qrNotice}>qrcode MIT</a><a href={decoderNotice}>jsQR Apache-2.0</a></footer>
    </section>
  </div>;
}
