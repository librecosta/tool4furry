import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { TextAreaField, TextField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { CheckboxField } from '../../ui/CheckboxField';
import { Button } from '../../ui/Button';
import { Frame, tr, s, ErrorText, errorText, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { encodeCanvas } from '../general/canvas-output';
import { drawCode, languages, type CodeSettings } from './core';
import notice from './highlight.NOTICE.txt?url';
export default function CodeImageGenerator({ locale }: ToolProps) {
  const [code, setCode] = useState(
      'const greet = (name: string) => {\n  return `Hello, ${name}!`;\n};',
    ),
    [settings, setSettings] = useState<CodeSettings>({
      language: 'typescript',
      theme: 'dark',
      title: 'hello.ts',
      lines: true,
      padding: 32,
    }),
    [error, setError] = useState<string>(),
    [size, setSize] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null),
    job = useJob<Blob>(locale);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      void document.fonts.ready.then(() => {
        if (!alive || !canvas.current) return;
        try {
          const dimensions = drawCode(canvas.current, code, settings);
          setSize(`${dimensions.width} × ${dimensions.height}`);
          setError(undefined);
        } catch (e) {
          canvas.current.width = canvas.current.height = 1;
          setSize('');
          setError(errorText(e, locale));
        }
      });
    }, 120);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, settings, locale]);
  useEffect(
    () => () => {
      if (canvas.current) canvas.current.width = canvas.current.height = 0;
    },
    [],
  );
  const update = (patch: Partial<CodeSettings>) => {
    job.invalidate();
    setSettings({ ...settings, ...patch });
    setSize('');
  };
  return (
    <Frame locale={locale}>
      <span hidden data-code-license={notice} />
      <div {...stylex.props(s.columns)}>
        <TextAreaField
          label={tr(locale, '代码', 'Code')}
          rows={16}
          maxLength={20000}
          value={code}
          onChange={(v) => {
            job.invalidate();
            setCode(v);
            setSize('');
          }}
        />
        <div {...stylex.props(s.stack)}>
          <div {...stylex.props(s.columns)}>
            <SelectField
              label={tr(locale, '语言', 'Language')}
              value={settings.language}
              onValueChange={(v) =>
                update({ language: v as CodeSettings['language'] })
              }
              options={Object.keys(languages).map((value) => ({
                value,
                label: (
                  {
                    typescript: 'TypeScript',
                    javascript: 'JavaScript',
                    go: 'Go',
                    python: 'Python',
                    rust: 'Rust',
                    json: 'JSON',
                    html: 'HTML',
                    css: 'CSS',
                    bash: 'Bash',
                  } as Record<string, string>
                )[value],
              }))}
            />
            <SelectField
              label={tr(locale, '图片主题', 'Image theme')}
              value={settings.theme}
              onValueChange={(v) => update({ theme: v as 'dark' | 'light' })}
              options={[
                { value: 'dark', label: tr(locale, '暗色', 'Dark') },
                { value: 'light', label: tr(locale, '亮色', 'Light') },
              ]}
            />
          </div>
          <TextField
            label={tr(locale, '展示标题', 'Display title')}
            value={settings.title}
            maxLength={100}
            onChange={(v) => update({ title: v })}
          />
          <SelectField
            label={tr(locale, '内边距', 'Padding')}
            value={String(settings.padding)}
            onValueChange={(v) => update({ padding: +v })}
            options={[16, 24, 32, 48, 64].map((v) => ({
              value: String(v),
              label: `${v}px`,
            }))}
          />
          <CheckboxField
            label={tr(locale, '显示行号', 'Show line numbers')}
            checked={settings.lines}
            onCheckedChange={(v) => update({ lines: v })}
          />
        </div>
      </div>
      <ErrorText error={error ?? job.error} />
      <canvas
        ref={canvas}
        aria-label={tr(locale, '代码分享图预览', 'Code image preview')}
        {...stylex.props(s.canvas)}
      />
      <p {...stylex.props(s.note)}>{size}</p>
      <div {...stylex.props(s.row)}>
        <Button
          variant="primary"
          loading={job.busy}
          disabled={!size || !!error}
          onClick={() =>
            void job.run(async () => {
              const target = document.createElement('canvas');
              try {
                drawCode(target, code, settings);
                return await encodeCanvas(target);
              } finally {
                target.width = target.height = 0;
              }
            })
          }
        >
          {tr(locale, '生成 PNG', 'Generate PNG')}
        </Button>
        {job.result && (
          <Button onClick={() => saveBlob(job.result!, 'code.png')}>
            {tr(locale, '下载 PNG', 'Download PNG')}
          </Button>
        )}
        <Button
          onClick={() => {
            job.invalidate();
            setCode('');
            setSize('');
          }}
        >
          {tr(locale, '清空', 'Clear')}
        </Button>
      </div>
    </Frame>
  );
}
