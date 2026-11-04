import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import controls from '../../ui/controls.module.scss';
import motion from '../../styles/motion.module.scss';
import s from './styles.module.scss';
import type { Labels } from './messages';
import type { PaletteSession, PaletteView } from './session';
import { shareDefaults, shareLayout, visibleColors, type Framing } from './render';
import { ShareCanvas } from './ShareCanvas';
import { ComposerControls } from './ComposerControls';

export function ShareDialog({session, view, t}: {session: PaletteSession; view: PaletteView; t: Labels}) {
  const [open, setOpen] = useState(false), [options, setOptions] = useState(shareDefaults);
  const [interacting, setInteracting] = useState(false);
  const [result, setResult] = useState<{blob: Blob; version: number; key: string}>();
  const [error, setError] = useState<string>();
  const generation = useRef(0), source = useRef<string | undefined>(undefined);
  const key = JSON.stringify(options), colors = useMemo(() => view.colors.map(color => color.hex), [view.colors]);
  const layout = useMemo(() => {
    try { return view.source && colors.length ? shareLayout(view.source.canvas, visibleColors(colors, options).length, options, session.limits) : undefined; }
    catch { return undefined; }
  }, [view.source, colors, key, session]);
  const current = !error && layout && result?.version === view.version && result.key === key && open && !interacting ? result : undefined;
  const active = useRef({open, key, version: view.version, interacting});
  active.current = {open, key, version: view.version, interacting};
  const failPreview = useCallback(() => setError(t.exportError), [t.exportError]);
  const onFrame = useCallback((frame: Framing) => setOptions(previous => ({...previous, frame})), []);
  const changeOpen = (next: boolean) => {
    if (next) {
      const changedSource = source.current !== view.source?.url;
      if (changedSource) setOptions(previous => ({...previous, frame: shareDefaults().frame}));
      source.current = view.source?.url;
    }
    setOpen(next);
  };
  useEffect(() => { if (open && source.current !== view.source?.url) setOpen(false); }, [view.source, open]);
  useEffect(() => {
    const ticket = ++generation.current;
    setResult(undefined); setError(undefined);
    if (!open || interacting || !view.source || !view.colors.length || !layout) return;
    const valid = () => generation.current === ticket && active.current.open && !active.current.interacting && active.current.key === key && session.snapshot().version === view.version;
    const timer = setTimeout(() => {
      void session.export(options, valid).then(blob => {
        if (!blob || !valid()) return;
        setResult({blob, version: view.version, key});
      }).catch(error => { if (valid()) setError(error.message === 'share-layout' ? t.layoutError : t.exportError); });
    }, 180);
    return () => { generation.current++; clearTimeout(timer); };
  }, [open, interacting, key, view.version, session, layout, t.exportError, t.layoutError]);
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger render={<Button variant="ghost" className={s.accent} disabled={!view.source || view.busy}/>}>{t.share}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className={[s.backdrop, motion.backdrop].filter(Boolean).join(' ')}/>
      <Dialog.Popup className={[s.dialog, s.composerDialog, motion.dialog].filter(Boolean).join(' ')}>
        <header className={s.row}>
          <div className={s.grow}><Dialog.Title className={s.heading}>{t.composer}</Dialog.Title><Dialog.Description className={s.muted}>PNG · {layout ? `${layout.width} × ${layout.height}` : '—'}</Dialog.Description></div>
          <Dialog.Close render={<IconButton label={t.close} variant="ghost" className={controls.dialogClose}><XIcon size={20} aria-hidden/></IconButton>}/>
        </header>
        {view.source && <div className={s.shareGrid}>
          {layout ? <ShareCanvas layout={layout} image={view.source.canvas} colors={colors} options={options} onFrame={onFrame} onInteraction={setInteracting} onError={failPreview} t={t}/> : <div/>}
          <ComposerControls image={view.source.canvas} layout={layout} colorCount={colors.length} options={options} change={setOptions} onFrame={onFrame} t={t}>
            {(!layout || error) && <p role="alert" className={s.error}>{!layout ? t.layoutError : error}</p>}
            <Button variant="ghost" className={s.accent} disabled={!current} loading={!!layout && !error && !current && !interacting} onClick={() => {
              if (current) session.download(current.blob, session.filename('share'));
            }}>{t.download}</Button>
          </ComposerControls>
        </div>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
