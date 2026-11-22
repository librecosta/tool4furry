import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../../ui/Button';
import { TextAreaField, TextField } from '../../ui/TextField';
import { TextEditor } from '../../ui/text-editor/TextEditor';
import { ErrorText, tr } from '../general/ui';
import dialog from '../../ui/ConfirmDialog.module.scss';
import controls from '../../ui/controls.module.scss';
import motion from '../../styles/motion.module.scss';
import s from './subtitle.module.scss';

type EditState = { dirty: boolean; error?: string };
export type SubtitleDraft = EditState & (
  | { kind: 'paste' | 'source'; value: string }
  | { kind: 'cue'; index: number; start: string; end: string; text: string }
);

export default function SubtitleEditor({ draft, open, locale, change, hide, cancel, apply }: {
  draft: SubtitleDraft;
  open: boolean;
  locale: Locale;
  change: (draft: SubtitleDraft) => void;
  hide: () => void;
  cancel: () => void;
  apply: () => void;
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const title = draft.kind === 'cue'
    ? t('编辑第 ' + (draft.index + 1) + ' 条字幕', 'Edit cue ' + (draft.index + 1))
    : draft.kind === 'source' ? t('查看 / 编辑源码', 'View / edit source') : t('粘贴字幕文本', 'Paste subtitle text');
  const update = (next: SubtitleDraft) => change({ ...next, dirty: true, error: undefined });

  return (
    <Dialog.Root open={open} onOpenChange={next => { if (!next) hide(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialog.backdrop + ' ' + motion.backdrop} />
        <Dialog.Popup className={[dialog.popup, s.dialog, motion.dialog].join(' ')}>
          <header className={s.sectionHeading}>
            <Dialog.Title className={s.dialogTitle}>{title}</Dialog.Title>
            <Dialog.Close render={<IconButton variant="ghost" label={t('关闭', 'Close')} className={controls.dialogClose}>
              <XIcon size={20} aria-hidden />
            </IconButton>} />
          </header>
          <Dialog.Description className={s.muted}>
            {draft.kind === 'cue'
              ? t('这里编辑原始时间。整体调整会应用到预览和导出。', 'Edit the original times here. The overall shift applies to preview and export.')
              : draft.kind === 'source'
                ? t('源码使用原字幕格式和原始时间，应用后更新字幕列表。', 'The source uses the original format and times. Apply it to update the cue list.')
                : t('粘贴 SRT 或 WebVTT 文本，工具会自动识别格式。', 'Paste SRT or WebVTT text to detect its format automatically.')}
          </Dialog.Description>
          {draft.kind === 'cue'
            ? <>
              <div className={s.cueFields}>
                <TextField label={t('开始时间', 'Start time')} placeholder="00:00:00.000" spellCheck={false} value={draft.start}
                  onChange={start => update({ ...draft, start })} />
                <TextField label={t('结束时间', 'End time')} placeholder="00:00:00.000" spellCheck={false} value={draft.end}
                  onChange={end => update({ ...draft, end })} />
              </div>
              <TextAreaField label={t('字幕文字', 'Cue text')} rows={4} value={draft.text} onChange={text => update({ ...draft, text })} />
            </>
            : <TextEditor ariaLabel={t('字幕源码', 'Subtitle source')} value={draft.value} onChange={value => update({ ...draft, value })} className={s.sourceEditor} />}
          <ErrorText error={draft.error} />
          <div className={dialog.actions}>
            <Button variant="ghost" onClick={cancel}>{t('取消', 'Cancel')}</Button>
            <Button variant="primary" onClick={apply}>{draft.kind === 'cue' ? t('保存字幕', 'Save cue') : t('应用', 'Apply')}</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
