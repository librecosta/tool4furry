import { useState } from 'react';
import type { ToolProps } from '../types';
import { TextField, TextAreaField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, ErrorText, tr, Copy, saveBlob, useBlobUrl,  } from '../general/ui';
import s from '../general/ui.module.scss';
import { useJob } from '../general/use-job';
import { integer, fail } from '../general/bounds';
import { contrast, parseColor } from '../color-contrast/core';
import { qrPng } from './core';
import notice from './qrcode.NOTICE.txt?url';
export default function QrCodeGenerator({ locale }: ToolProps) {
  const [text, setText] = useState(''),
    [size, setSize] = useState('512'),
    [fg, setFg] = useState('#202428'),
    [bg, setBg] = useState('#FFFFFF');
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
    </Frame>
  );
}
