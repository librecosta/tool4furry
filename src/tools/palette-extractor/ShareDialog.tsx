import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';
import { XIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { controls } from '../../styles/controls';
import { motion } from '../../styles/motion';
import { styles as s } from './styles';
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
    <Dialog.Trigger render={<Button variant="ghost" xstyle={s.accent} disabled={!view.source || view.busy}/>}>{t.share}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop {...stylex.props(s.backdrop, motion.backdrop)}/>
      <Dialog.Popup {...stylex.props(s.dialog, s.composerDialog, motion.dialog)}>
        <header {...stylex.props(s.row)}>
          <div {...stylex.props(s.grow)}><Dialog.Title {...stylex.props(s.heading)}>{t.composer}</Dialog.Title><Dialog.Description {...stylex.props(s.muted)}>PNG · {layout ? `${layout.width} × ${layout.height}` : '—'}</Dialog.Description></div>
          <Dialog.Close render={<IconButton label={t.close} variant="ghost" xstyle={controls.dialogClose}><XIcon size={20} aria-hidden/></IconButton>}/>
        </header>
        {view.source && <div {...stylex.props(s.shareGrid)}>
          {layout ? <ShareCanvas layout={layout} image={view.source.canvas} colors={colors} options={options} onFrame={onFrame} onInteraction={setInteracting} onError={failPreview} t={t}/> : <div/>}
          <ComposerControls image={view.source.canvas} layout={layout} colorCount={colors.length} options={options} change={setOptions} onFrame={onFrame} t={t}>
            {(!layout || error) && <p role="alert" {...stylex.props(s.error)}>{!layout ? t.layoutError : error}</p>}
            <Button variant="ghost" xstyle={s.accent} disabled={!current} loading={!!layout && !error && !current && !interacting} onClick={() => {
              if (current) session.download(current.blob, session.filename('share'));
            }}>{t.download}</Button>
          </ComposerControls>
        </div>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
