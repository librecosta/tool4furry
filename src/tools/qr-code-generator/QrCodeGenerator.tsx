import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { ToolProps } from '../types';
import { TextField, TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, ErrorText, tr, Copy, saveBlob, useBlobUrl } from '../general/ui';
import s from '../general/ui.module.scss';
import { useJob } from '../general/use-job';
import { integer, fail } from '../general/bounds';
import { contrast, parseColor } from '../color-contrast/core';
import { qrPng } from './core';
import notice from './qrcode.NOTICE.txt?url';

const TerrainProbe = import.meta.env.DEV ? lazy(() => import('./graphics/TerrainProbe')) : null;

class ProbeBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p role="alert">{this.props.message}</p> : this.props.children;
  }
}

export default function QrCodeGenerator({ locale }: ToolProps) {
  const [text, setText] = useState(''),
    [size, setSize] = useState('512'),
    [fg, setFg] = useState('#202428'),
    [bg, setBg] = useState('#FFFFFF'),
    [probeOpen, setProbeOpen] = useState(false);
  const job = useJob<{
      png: Blob;
      svg: Blob;
    }>(locale),
    url = useBlobUrl(job.result?.png);
  const update = (setter: (v: string) => void) => (v: string) => {
    job.invalidate();
    setter(v);
  };
  return (
    <Frame locale={locale}>
      <span hidden data-qr-license={notice} />
      <TextAreaField
        label={tr(locale, '文本或网址', 'Text or URL')}
        rows={4}
        value={text}
        onChange={update(setText)}
      />
      <div className={s.columns}>
        <TextField
          label={tr(locale, '输出尺寸（像素）', 'Output size (pixels)')}
          value={size}
          onChange={update(setSize)}
        />
        <TextField
          label={tr(locale, '前景色 HEX', 'Foreground HEX')}
          value={fg}
          onChange={update(setFg)}
        />
        <TextField
          label={tr(locale, '背景色 HEX', 'Background HEX')}
          value={bg}
          onChange={update(setBg)}
        />
      </div>
      <Button
        variant="primary"
        loading={job.busy}
        onClick={() =>
          void job.run(async () => {
            const a = parseColor(fg),
              b = parseColor(bg);
            if (
              contrast(a, b) < 3 ||
              a.reduce((n, v) => n + v, 0) >= b.reduce((n, v) => n + v, 0)
            )
              fail(
                '请使用深色前景、浅色背景及至少 3:1 的对比度。',
                'Use a dark foreground, light background and at least 3:1 contrast.',
              );
            return qrPng(text, integer(size, 128, 2048), fg, bg);
          })
        }
      >
        {tr(locale, '生成二维码', 'Generate QR code')}
      </Button>
      <ErrorText error={job.error} />
      {job.result && url && (
        <>
          <img
            className={s.qr}
            src={url}
            width={Number(size)}
            height={Number(size)}
            alt={tr(locale, '生成的二维码', 'Generated QR code')}
          />
          <div className={s.row}>
            <Button onClick={() => saveBlob(job.result!.png, 'qr-code.png')}>
              {tr(locale, '下载 PNG', 'Download PNG')}
            </Button>
            <Button onClick={() => saveBlob(job.result!.svg, 'qr-code.svg')}>
              {tr(locale, '下载 SVG', 'Download SVG')}
            </Button>
          </div>
        </>
      )}
      <Copy locale={locale} value={text} />
      <Button
        onClick={() => {
          job.invalidate();
          setText('');
          setSize('512');
          setFg('#202428');
          setBg('#FFFFFF');
        }}
      >
        {tr(locale, '重置', 'Reset')}
      </Button>
      {TerrainProbe && (
        <div>
          <Button variant="ghost" size="sm" aria-expanded={probeOpen} onClick={() => setProbeOpen(open => !open)}>
            {probeOpen ? tr(locale, '关闭 3D 验证', 'Close 3D probe') : tr(locale, '打开 3D 验证', 'Open 3D probe')}
          </Button>
          {probeOpen && (
            <ProbeBoundary message={tr(locale, '3D 图形不可用。可以继续生成二维码。', '3D graphics are unavailable. You can still generate QR codes.')}>
              <Suspense fallback={<p role="status">{tr(locale, '正在加载 3D…', 'Loading 3D…')}</p>}>
                <TerrainProbe locale={locale} />
              </Suspense>
            </ProbeBoundary>
          )}
        </div>
      )}
    </Frame>
  );
}
