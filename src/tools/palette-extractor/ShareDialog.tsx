import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { motion } from '../../styles/motion';
import { styles as s } from './styles';
import type { Labels } from './messages';
import type { PaletteSession, PaletteView } from './session';
import { localDate, shareDefaults, templates, type Framing } from './render';
import { ShareCanvas } from './ShareCanvas';
import { ComposerControls } from './ComposerControls';

export function ShareDialog({session, view, t}: {session: PaletteSession; view: PaletteView; t: Labels}) {
  const [open, setOpen] = useState(false), [options, setOptions] = useState(shareDefaults);
  const [interacting, setInteracting] = useState(false), [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<{blob: Blob; version: number; key: string; canShare: boolean; file: File}>();
  const [error, setError] = useState<string>();
  const generation = useRef(0), source = useRef<string | undefined>(undefined);
  const key = JSON.stringify(options), colors = useMemo(() => view.colors.map(color => color.hex), [view.colors]);
  const current = result?.version === view.version && result.key === key && open && !interacting ? result : undefined;
  const active = useRef({open, key, version: view.version, interacting});
  active.current = {open, key, version: view.version, interacting};
  const failPreview = useCallback(() => setError(t.exportError), [t.exportError]);
  const onFrame = useCallback((frame: Framing) => setOptions(previous => ({...previous, frames: {...previous.frames, [previous.template]: frame}})), []);
  const changeOpen = (next: boolean) => {
    if (next) {
      const changedSource = source.current !== view.source?.url;
      setOptions(previous => ({...previous, date: localDate(), ...(changedSource ? {frames: shareDefaults().frames, title: view.source?.name.replace(/\.[^.]+$/, '').slice(0, 120) ?? ''} : {})}));
      source.current = view.source?.url;
    }
    setOpen(next);
  };
  useEffect(() => { if (open && source.current !== view.source?.url) setOpen(false); }, [view.source, open]);
  useEffect(() => {
    const ticket = ++generation.current;
    setResult(undefined); setError(undefined);
    if (!open || interacting || !view.source || !view.colors.length) return;
    const valid = () => generation.current === ticket && active.current.open && !active.current.interacting && active.current.key === key && session.snapshot().version === view.version;
    const timer = setTimeout(() => {
      void session.export(options, valid).then(blob => {
        if (!blob || !valid()) return;
        const file = new File([blob], session.filename(options.template), {type: 'image/png'});
        let canShare = false;
        try { canShare = !!navigator.share && !!navigator.canShare?.({files: [file]}); } catch { /* Download remains available. */ }
        setResult({blob, version: view.version, key, canShare, file});
      }).catch(() => { if (valid()) setError(t.exportError); });
    }, 180);
    return () => { generation.current++; clearTimeout(timer); };
  }, [open, interacting, key, view.version, session, t.exportError]);
  const share = async () => {
    if (!current || sharing) return;
    setSharing(true);
    try { await navigator.share({files: [current.file]}); }
    catch (error) { if ((error as {name?: string}).name !== 'AbortError') setError(t.shareError); }
    finally { setSharing(false); }
  };
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger render={<Button variant="ghost" xstyle={s.accent} disabled={!view.source || view.busy}/>}>{t.share}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop {...stylex.props(s.backdrop, motion.backdrop)}/>
      <Dialog.Popup {...stylex.props(s.dialog, s.composerDialog, motion.dialog)}>
        <header {...stylex.props(s.row)}>
          <div {...stylex.props(s.grow)}><Dialog.Title {...stylex.props(s.heading)}>{t.composer}</Dialog.Title><Dialog.Description {...stylex.props(s.muted)}>PNG · {templates[options.template].join(' × ')}</Dialog.Description></div>
          <Dialog.Close render={<Button variant="ghost" xstyle={s.secondary}/>}>{t.close}</Dialog.Close>
        </header>
        {view.source && <div {...stylex.props(s.shareGrid)}>
          <ShareCanvas image={view.source.canvas} colors={colors} options={options} onFrame={onFrame} onInteraction={setInteracting} onError={failPreview} t={t}/>
          <ComposerControls image={view.source.canvas} url={view.source.url} colors={colors} options={options} change={setOptions} onFrame={onFrame} t={t}/>
        </div>}
        <footer {...stylex.props(s.composerFooter)}>
          <p role={error ? 'alert' : 'status'} {...stylex.props(s.muted, s.grow, !!error && s.error)}>{error ?? (interacting ? t.adjusting : current ? t.ready : t.preparing)}</p>
          <div {...stylex.props(s.row)}>
            <Button variant="ghost" xstyle={s.accent} disabled={!current} onClick={() => {
              if (!current) return;
              const file = new File([current.blob], session.filename(options.template), {type: 'image/png'});
              setResult({...current, file}); session.download(current.blob, file.name);
            }}>{t.download}</Button>
            {current?.canShare && <Button variant="ghost" xstyle={s.secondary} disabled={sharing} onClick={share}>{t.systemShare}</Button>}
          </div>
        </footer>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
