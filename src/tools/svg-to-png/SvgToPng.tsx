import { useMemo, useState } from 'react';
import type { ToolProps } from '../types';
import { TextField, TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { Frame, Picker, ErrorText, errorText, tr, useBlobUrl, saveBlob,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { fail } from '../general/bounds';
import { useJob } from '../general/use-job';
import { readSvg, svgOutputSize, rasterizeSvg } from './core';
export default function SvgToPng({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [width, setWidth] = useState(''),
    [height, setHeight] = useState(''),
    [scale, setScale] = useState('1'),
    [transparent, setTransparent] = useState(true),
    [bg, setBg] = useState('#FFFFFF');
  const job = useJob<Blob>(locale),
    importJob = useJob<void>(locale);
  const parsed = useMemo(() => {
    if (!input) return {};
    try {
      return { svg: readSvg(input) };
    } catch (e) {
      return { error: errorText(e, locale) };
    }
  }, [input, locale]);
  const sourceBlob = useMemo(
      () =>
        parsed.svg
          ? new Blob([parsed.svg.xml], { type: 'image/svg+xml' })
          : undefined,
      [parsed.svg],
    ),
    url = useBlobUrl(sourceBlob),
    output = useBlobUrl(job.result);
  const change = (text: string) => {
    job.invalidate();
    importJob.invalidate();
    setInput(text);
    setScale('1');
    try {
      const svg = readSvg(text);
      setWidth(String(svg.width));
      setHeight(String(svg.height));
    } catch {
      setWidth('');
      setHeight('');
    }
  };
  const dimension = (value: string, which: 'width' | 'height') => {
    job.invalidate();
    setScale('');
    if (which === 'width') setWidth(value);
    else setHeight(value);
    if (parsed.svg && /^\d+$/.test(value) && +value > 0 && +value <= 8192) {
      if (which === 'width')
        setHeight(
          String(
            Math.max(
              1,
              Math.round((+value * parsed.svg.height) / parsed.svg.width),
            ),
          ),
        );
      else
        setWidth(
          String(
            Math.max(
              1,
              Math.round((+value * parsed.svg.width) / parsed.svg.height),
            ),
          ),
        );
    }
  };
  return (
    <Frame locale={locale}>
      <Picker
        locale={locale}
        multiple={false}
        accept=".svg,image/svg+xml"
        disabled={importJob.busy || job.busy}
        onFiles={(files) => {
          job.invalidate();
          void importJob.run(async (signal) => {
            if (files[0].size > 256 * 1024)
              fail('SVG 上限 256 KiB。', 'SVG limit: 256 KiB.');
            const text = await files[0].text();
            if (!signal.aborted) change(text);
          });
        }}
      />
      <TextAreaField
        label={tr(locale, 'SVG 源码', 'SVG source')}
        rows={8}
        maxLength={262144}
        value={input}
        onChange={change}
      />
      <ErrorText error={parsed.error ?? importJob.error ?? job.error} />
      {parsed.svg && (
        <>
          <p>
            {parsed.svg.width} × {parsed.svg.height}
            {parsed.svg.viewBox && ` · viewBox ${parsed.svg.viewBox}`}
          </p>
          {url && (
            <img
              src={url}
              width={parsed.svg.width}
              height={parsed.svg.height}
              alt={tr(locale, 'SVG 预览', 'SVG preview')}
              className={s.canvas}
            />
          )}
          <div className={s.columns}>
            <TextField
              label={tr(locale, '输出宽度', 'Output width')}
              value={width}
              onChange={(v) => dimension(v, 'width')}
            />
            <TextField
              label={tr(locale, '输出高度', 'Output height')}
              value={height}
              onChange={(v) => dimension(v, 'height')}
            />
            <TextField
              label={tr(locale, '缩放倍数', 'Scale factor')}
              value={scale}
              onChange={(v) => {
                job.invalidate();
                setScale(v);
                if (/^\d+(?:\.\d+)?$/.test(v) && +v > 0 && +v <= 16) {
                  setWidth(
                    String(Math.max(1, Math.round(parsed.svg!.width * +v))),
                  );
                  setHeight(
                    String(Math.max(1, Math.round(parsed.svg!.height * +v))),
                  );
                }
              }}
            />
            <CheckboxField
              label={tr(locale, '透明背景', 'Transparent background')}
              checked={transparent}
              onCheckedChange={(v) => {
                job.invalidate();
                setTransparent(v);
              }}
            />
            {!transparent && (
              <TextField
                label={tr(locale, '背景颜色 HEX', 'Background HEX')}
                value={bg}
                onChange={(v) => {
                  job.invalidate();
                  setBg(v);
                }}
              />
            )}
          </div>
          <Button
            variant="primary"
            loading={job.busy}
            onClick={() =>
              void job.run((signal) => {
                const size = svgOutputSize(parsed.svg!, width, height);
                if (
                  scale &&
                  (!/^\d+(?:\.\d+)?$/.test(scale) || +scale <= 0 || +scale > 16)
                )
                  fail('无效缩放倍数。', 'Invalid scale factor.');
                return rasterizeSvg(
                  parsed.svg!,
                  size.width,
                  size.height,
                  transparent ? undefined : bg,
                  signal,
                );
              })
            }
          >
            {tr(locale, '生成 PNG', 'Generate PNG')}
          </Button>
        </>
      )}
      {job.result && output && (
        <>
          <img
            src={output}
            alt={tr(locale, 'PNG 结果', 'PNG output')}
            className={s.canvas}
          />
          <Button onClick={() => saveBlob(job.result!, 'converted.png')}>
            {tr(locale, '下载 PNG', 'Download PNG')}
          </Button>
        </>
      )}
      <Button onClick={() => change('')}>
        {tr(locale, '清空 / 取消', 'Clear / cancel')}
      </Button>
    </Frame>
  );
}
