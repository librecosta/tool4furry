import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { TextField } from '../../ui/TextField';
import { controls } from '../../styles/controls';
import { styles as s } from './styles';
import type { Labels } from './messages';
import type { PaletteSession, PaletteView } from './session';
import { templates, type Template, type ShareOptions } from './render';

export function ShareDialog({
  session,
  view,
  t,
}: {
  session: PaletteSession;
  view: PaletteView;
  t: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ShareOptions>({
    template: 'character',
    title: '',
    signature: true,
  });
  const [result, setResult] = useState<{
    blob: Blob;
    url: string;
    version: number;
    key: string;
    canShare: boolean;
  }>();
  const [error, setError] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const generation = useRef(0);
  const key = JSON.stringify(options);
  const current =
    result?.version === view.version && result.key === key && open
      ? result
      : undefined;
  // Invalidated synchronously during render, before an effect or async PNG finishes.
  const active = useRef({ open, key, version: view.version });
  active.current = { open, key, version: view.version };
  useEffect(() => {
    const ticket = ++generation.current;
    setResult(undefined);
    setError(undefined);
    if (!open || !view.source || !view.colors.length) return;
    let url: string | undefined;
    const valid = () =>
      generation.current === ticket &&
      active.current.open &&
      active.current.key === key &&
      session.snapshot().version === view.version;
    const timer = setTimeout(() => {
      void session
        .export(options, valid)
        .then((blob) => {
          if (!blob || !valid()) return;
          url = session.resources.url(blob);
          const file = new File([blob], 'tool4furry-palette.png', {
            type: 'image/png',
          });
          let canShare = false;
          try {
            canShare =
              !!navigator.share && !!navigator.canShare?.({ files: [file] });
          } catch {
            /* Download remains available. */
          }
          setResult({ blob, url, version: view.version, key, canShare });
        })
        .catch((error) => {
          if (import.meta.env.DEV) console.warn('Palette export:', error);
          if (valid()) setError(t.exportError);
        });
    }, 180);
    return () => {
      generation.current++;
      clearTimeout(timer);
      if (url) session.resources.revoke(url);
    };
  }, [open, key, view.version, session, t]);
  const share = async () => {
    if (!current || sharing) return;
    const file = new File([current.blob], 'tool4furry-palette.png', {
      type: 'image/png',
    });
    // Invoke synchronously from activation: PNG is prepared BEFORE this click.
    setSharing(true);
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError')
        setError(t.shareError);
    } finally {
      setSharing(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button xstyle={s.accent} disabled={!view.source || view.busy} />
        }
      >
        {t.share}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop {...stylex.props(s.backdrop)} />
        <Dialog.Popup {...stylex.props(s.dialog)}>
          <div {...stylex.props(s.row)}>
            <Dialog.Title {...stylex.props(s.heading, s.grow)}>
              {t.share}
            </Dialog.Title>
            <Dialog.Close render={<Button />}>{t.close}</Dialog.Close>
          </div>
          <Dialog.Description {...stylex.props(s.muted)}>
            PNG · {templates[options.template].join(' × ')}
          </Dialog.Description>
          <div {...stylex.props(s.shareGrid)}>
            <div aria-busy={!current && !error} {...stylex.props(s.stack)}>
              {current ? (
                <img
                  src={current.url}
                  alt={options.title || t.palette}
                  draggable={false}
                  {...stylex.props(s.preview)}
                />
              ) : (
                <p role="status">{error ?? t.preparing}</p>
              )}
            </div>
            <div {...stylex.props(s.stack)}>
              <label {...stylex.props(s.field)}>
                {t.template}
                <select
                  {...stylex.props(controls.input)}
                  value={options.template}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      template: e.target.value as Template,
                    })
                  }
                >
                  <option value="character">01 — Character Study</option>
                  <option value="gallery">02 — Gallery</option>
                  <option value="story">03 — Color Story</option>
                </select>
              </label>
              <TextField
                label={t.title}
                value={options.title}
                maxLength={120}
                onChange={(title) => setOptions({ ...options, title })}
              />
              <CheckboxField
                label={t.signature}
                checked={options.signature}
                onCheckedChange={(signature) =>
                  setOptions({ ...options, signature })
                }
              />
              <Button
                xstyle={s.accent}
                disabled={!current}
                onClick={() =>
                  current &&
                  session.download(
                    current.blob,
                    `t4f-palette-${options.template}.png`,
                  )
                }
              >
                {t.download}
              </Button>
              {current?.canShare && (
                <Button disabled={sharing} onClick={share}>
                  {t.systemShare}
                </Button>
              )}
              {error && (
                <p role="alert" {...stylex.props(s.error)}>
                  {error}
                </p>
              )}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
