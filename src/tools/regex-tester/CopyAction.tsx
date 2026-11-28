import { useEffect, useState } from 'react';
import { CopyIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import type { Translate } from './reference';
import s from './workbench.module.scss';

export function CopyAction({ label, value, t }: {
  label: string; value?: string | (() => string); t: Translate;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string }>();

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
      setFeedback(undefined);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  async function copy() {
    if (value === undefined) return;
    let message: string;
    try {
      await navigator.clipboard.writeText(typeof value === 'function' ? value() : value);
      message = t('已复制', 'Copied');
    } catch {
      message = t('无法访问剪贴板。', 'Clipboard access failed.');
    }
    setFeedback({ message });
    setOpen(true);
  }

  return <Tooltip borderless content={feedback ? <span role="status">{feedback.message}</span> : label}
    open={open && value !== undefined} onOpenChange={setOpen}>
    <IconButton size="sm" variant="ghost" className={s.compactButton} label={label}
      disabled={value === undefined} onClick={copy}><CopyIcon size={16} /></IconButton>
  </Tooltip>;
}
