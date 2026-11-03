import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { ToolProps } from '../types';
import { TextAreaField } from '../../ui/TextField';
import { SelectField } from '../../ui/SelectField';
import { Button } from '../../ui/Button';
import {
  Frame,
  tr,
  s,
  TextDelivery,
  ErrorText,
  errorText,
} from '../general/ui';
import { example, renderMarkdown } from './core';
import notice from './dependencies.NOTICE.txt?url';
import './markdown.css';
export default function MarkdownEditor({ locale }: ToolProps) {
  const [text, setText] = useState(example),
    [mode, setMode] = useState('split'),
    [html, setHtml] = useState(''),
    [error, setError] = useState<string>();
  useEffect(() => {
    try {
      setHtml(renderMarkdown(text));
      setError(undefined);
    } catch (e) {
      setHtml('');
      setError(errorText(e, locale));
    }
  }, [text, locale]);
  return (
    <Frame locale={locale}>
      <span hidden data-markdown-license={notice} />
      <SelectField
        label={tr(locale, '视图', 'View')}
        value={mode}
        onValueChange={setMode}
        options={[
          {
            value: 'split',
            label: tr(locale, '编辑与预览', 'Editor and preview'),
          },
          { value: 'edit', label: tr(locale, '编辑', 'Edit') },
          { value: 'preview', label: tr(locale, '预览', 'Preview') },
        ]}
      />
      <div {...stylex.props(mode === 'split' ? s.columns : s.stack)}>
        {mode !== 'preview' && (
          <TextAreaField
            label="Markdown"
            rows={22}
            maxLength={100000}
            value={text}
            onChange={setText}
          />
        )}
        {mode !== 'edit' && (
          <section
            aria-label={tr(locale, 'Markdown 预览', 'Markdown preview')}
            {...stylex.props(s.panel, s.scroll)}
          >
            <div
              className="t4f-markdown-preview"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </section>
        )}
      </div>
      <ErrorText error={error} />
      <div {...stylex.props(s.row)}>
        <TextDelivery
          locale={locale}
          value={text}
          filename="document.md"
          mime="text/markdown;charset=utf-8"
        />
        <Button onClick={() => setText('')}>
          {tr(locale, '清空', 'Clear')}
        </Button>
        <Button onClick={() => setText(example)}>
          {tr(locale, '载入示例', 'Load example')}
        </Button>
      </div>
    </Frame>
  );
}
