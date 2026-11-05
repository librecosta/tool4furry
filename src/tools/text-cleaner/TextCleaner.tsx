import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CopyIcon, DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { CheckboxField } from '../../ui/CheckboxField';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { TextEditorPane } from '../../ui/text-editor/TextEditorPane';
import { TextWorkbench } from '../../ui/text-editor/TextWorkbench';
import { ErrorText, Frame, errorText, saveBlob, tr } from '../general/ui';
import {
  cleanText,
  textStats,
  defaults,
  cleanedDownloadName,
  type CleanOptions,
} from './core';
import form from '../../workbench/form-tool-layout.module.scss';
import s from './cleaner.module.scss';

type Result = {
  input: string;
  options: Readonly<CleanOptions>;
  output: string;
  before: ReturnType<typeof textStats>;
  after: ReturnType<typeof textStats>;
  error?: string;
};
export default function TextCleaner({ locale }: ToolProps) {
  const [input, setInput] = useState(''),
    [advanced, setAdvanced] = useState(false);
  const [options, setOptions] = useState<CleanOptions>({ ...defaults });
  const active = advanced ? options : defaults;
  const [result, setResult] = useState<Result>(() => ({
    input: '',
    options: defaults,
    output: '',
    before: textStats(''),
    after: textStats(''),
  }));
  const [message, setMessage] = useState('');
  const feedback = useRef(0);
  const current = result.input === input && result.options === active;
  const enabled = current && !!result.output && !result.error;
  useEffect(() => {
    feedback.current++;
    setMessage('');
    const timer = setTimeout(
      () => {
        try {
          const output = cleanText(input, active);
          setResult({
            input,
            options: active,
            output,
            before: textStats(input),
            after: textStats(output),
          });
        } catch (error) {
          setResult({
            input,
            options: active,
            output: '',
            before: textStats(''),
            after: textStats(''),
            error: errorText(error, locale),
          });
        }
      },
      input.length > 100_000 ? 120 : 0,
    );
    return () => {
      clearTimeout(timer);
      feedback.current++;
    };
  }, [input, active, locale]);
  const update = <K extends keyof CleanOptions>(
    key: K,
    value: CleanOptions[K],
  ) => setOptions((previous) => ({ ...previous, [key]: value }));
  const stats = (value: ReturnType<typeof textStats>) =>
    value.characters
      ? tr(
          locale,
          `${value.characters.toLocaleString(locale)} 字符 · ${value.lines.toLocaleString(locale)} 行`,
          `${value.characters.toLocaleString(locale)} characters · ${value.lines.toLocaleString(locale)} lines`,
        )
      : '';
  const copy = async () => {
    if (!enabled) return;
    const token = ++feedback.current;
    try {
      await navigator.clipboard.writeText(result.output);
      if (token === feedback.current)
        setMessage(tr(locale, '已复制', 'Copied'));
    } catch {
      if (token === feedback.current)
        setMessage(
          tr(
            locale,
            '复制失败，请手动选择复制。',
            'Copy failed. Select and copy the result manually.',
          ),
        );
    }
  };
  const action = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    disabled: boolean,
  ) => (
    <Tooltip content={label}>
      <IconButton
        label={label}
        variant="ghost"
        size="sm"
        className={s.icon}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
  return (
    <Frame locale={locale}>
      <div data-text-cleaner>
        <TextWorkbench
          toolbar={
            <div className={s.toolbar}>
              <div
                className={form.segmented}
                role="group"
                aria-label={tr(locale, '清理模式', 'Cleaning mode')}
              >
                {[false, true].map((value) => (
                  <Button
                    key={String(value)}
                    variant="ghost"
                    className={[
                      form.segment,
                      value === advanced && form.segmentSelected,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={value === advanced}
                    onClick={() => setAdvanced(value)}
                  >
                    {value
                      ? tr(locale, '高级', 'Advanced')
                      : tr(locale, '快速', 'Quick')}
                  </Button>
                ))}
              </div>
              {advanced && (
                <div className={s.rules}>
                  <fieldset className={s.group}>
                    <legend>{tr(locale, '空白处理', 'Whitespace')}</legend>
                    <CheckboxField
                      label={tr(
                        locale,
                        '清理行尾空白',
                        'Trim trailing whitespace',
                      )}
                      checked={options.trimEnd}
                      onCheckedChange={(value) => update('trimEnd', value)}
                    />
                    <CheckboxField
                      label={tr(
                        locale,
                        '清理行首空白',
                        'Trim leading whitespace',
                      )}
                      checked={options.trimStart}
                      onCheckedChange={(value) => update('trimStart', value)}
                    />
                  </fieldset>
                  <fieldset className={s.group}>
                    <legend>{tr(locale, '空行处理', 'Blank lines')}</legend>
                    {(['keep', 'collapse', 'remove'] as const).map(
                      (value, index) => (
                        <label key={value} className={s.radio}>
                          <input
                            type="radio"
                            name="cleaner-blank-lines"
                            value={value}
                            checked={options.blankLines === value}
                            onChange={() => update('blankLines', value)}
                          />
                          <span>
                            {tr(
                              locale,
                              ['保留空行', '合并连续空行', '删除空行'][index],
                              ['Keep', 'Collapse consecutive', 'Remove'][index],
                            )}
                          </span>
                        </label>
                      ),
                    )}
                  </fieldset>
                  <fieldset className={s.group}>
                    <legend>{tr(locale, '换行符', 'Line endings')}</legend>
                    {(['lf', 'crlf'] as const).map((value) => (
                      <label key={value} className={s.radio}>
                        <input
                          type="radio"
                          name="cleaner-line-ending"
                          value={value}
                          checked={options.lineEnding === value}
                          onChange={() => update('lineEnding', value)}
                        />
                        <span>{value.toUpperCase()}</span>
                      </label>
                    ))}
                  </fieldset>
                </div>
              )}
            </div>
          }
        >
          <TextEditorPane
            title={tr(locale, '原始文本', 'Original text')}
            actions={action(
              tr(locale, '清空文本', 'Clear text'),
              <TrashIcon size={18} aria-hidden="true" />,
              () => setInput(''),
              !input,
            )}
            status={input && current ? stats(result.before) : ''}
          >
            <TextEditor
              ariaLabel={tr(locale, '原始文本', 'Original text')}
              value={input}
              onChange={setInput}
              placeholder={tr(
                locale,
                '在这里输入或粘贴文本…',
                'Type or paste text here…',
              )}
            />
          </TextEditorPane>
          <TextEditorPane
            title={tr(locale, '清理结果', 'Cleaned text')}
            busy={!current}
            actions={
              <>
                {action(
                  tr(locale, '复制结果', 'Copy result'),
                  <CopyIcon size={18} aria-hidden="true" />,
                  () => void copy(),
                  !enabled,
                )}
                {action(
                  tr(locale, '下载 TXT', 'Download TXT'),
                  <DownloadSimpleIcon size={18} aria-hidden="true" />,
                  () => {
                    if (enabled)
                      saveBlob(
                        new Blob([result.output], {
                          type: 'text/plain;charset=utf-8',
                        }),
                        cleanedDownloadName(),
                      );
                  },
                  !enabled,
                )}
              </>
            }
            status={
              !current && input
                ? tr(locale, '处理中…', 'Updating…')
                : input
                  ? stats(result.after)
                  : ''
            }
          >
            <TextEditor
              ariaLabel={tr(locale, '清理结果', 'Cleaned text')}
              value={input ? result.output : ''}
              readOnly
              placeholder={tr(
                locale,
                '清理后的文本显示在这里',
                'Cleaned text appears here',
              )}
            />
          </TextEditorPane>
        </TextWorkbench>
        <ErrorText error={current ? result.error : undefined} />
        {!!message && (
          <p role="status" className={s.feedback}>
            {message}
          </p>
        )}
      </div>
    </Frame>
  );
}
