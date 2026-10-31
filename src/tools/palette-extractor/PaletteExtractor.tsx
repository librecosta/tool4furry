import { useCallback, useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import {
  CopyIcon,
  EyedropperIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DotsThreeIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button, IconButton } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { Tooltip } from '../../ui/Tooltip';
import { motion } from '../../styles/motion';
import { TextField } from '../../ui/TextField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/Toast';
import { controls } from '../../styles/controls';
import type { ToolProps } from '../types';
import { PaletteSession, type PaletteView } from './session';
import {
  modes,
  normalizeHex,
  rgbText,
  type Mode,
  type Swatch,
} from './palette';
import { messages, type Labels } from './messages';
import { styles as s } from './styles';
import { ImageSampler, type SamplePreview } from './ImageSampler';
import { ShareDialog } from './ShareDialog';
import notice from './colorthief.NOTICE.txt?url';

export function ColorRow({ color, preview, index, length, session, pick, selected, picking, select, copy, t }: {
  color: Swatch; index: number; length: number; session: PaletteSession;
  preview?: SamplePreview;
  pick: (id: string) => void; selected: boolean; picking?: boolean; select?: (id: string) => void; copy: (text: string) => void; t: Labels;
}) {
  const [value, setValue] = useState(color.hex), [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => { setValue(color.hex); setError(false); }, [color.hex]);
  const actions = [
    { label: t.rgb, icon: CopyIcon, run: () => copy(rgbText(color.hex)), text: 'RGB' },
    { label: t.up, icon: ArrowUpIcon, run: () => session.move(color.id, -1), disabled: !index },
    { label: t.down, icon: ArrowDownIcon, run: () => session.move(color.id, 1), disabled: index === length - 1 },
    { label: t.remove, icon: TrashIcon, run: () => session.remove(color.id), disabled: length === 1 },
  ];
  return <li data-swatch={color.id} data-selected={selected || undefined} data-picking={picking || undefined} onFocus={() => select?.(color.id)} {...stylex.props(s.colorRow, motion.selection, selected && s.selected)}>
    <button type="button" {...stylex.props(s.chip)} style={{ backgroundColor: preview?.hex ?? color.hex }} aria-label={`${t.selectColor} ${index + 1} · ${color.hex}`} aria-pressed={selected} onClick={() => select?.(color.id)}/>
    <form {...stylex.props(s.hex)} onSubmit={event => { event.preventDefault(); setError(!session.edit(color.id, value)); }}>
      <input aria-label={`${t.hex} ${index + 1}`} value={preview && !editing && value === color.hex ? preview.hex : value} spellCheck={false} maxLength={7} aria-invalid={error || undefined} aria-description={error ? t.invalid : undefined}
        {...stylex.props(controls.input, s.hexInput, error && controls.invalid)}
        onFocus={() => setEditing(true)} onChange={event => { setValue(event.target.value); setError(false); }} onBlur={() => { setEditing(false); setError(!session.edit(color.id, value)); }}/>
    </form>
    {error && <span role="alert" {...stylex.props(s.srOnly)}>{t.invalid}</span>}
    <div {...stylex.props(s.rowActions)}>
      <Tooltip content={t.copy}><IconButton label={`${t.copy} ${index + 1}`} variant="ghost" xstyle={s.tool} onClick={() => copy(color.hex)}><CopyIcon size={20}/></IconButton></Tooltip>
      <Tooltip content={t.pick}><IconButton label={`${t.pick} ${index + 1}`} variant="ghost" aria-pressed={!!picking} xstyle={[s.tool, motion.selection, picking && s.selected]} onClick={() => pick(color.id)}><EyedropperIcon size={20}/></IconButton></Tooltip>
      <div {...stylex.props(s.secondaryActions)}>{actions.map(action => <Tooltip key={action.label} content={action.label}><IconButton label={`${action.label} ${index + 1}`} variant="ghost" xstyle={s.tool} disabled={action.disabled} onClick={action.run}>{action.text ?? <action.icon size={18}/>}</IconButton></Tooltip>)}</div>
      <Popover.Root>
        <Popover.Trigger render={<IconButton label={`${t.more} ${index + 1}`} variant="ghost" xstyle={[s.tool, s.more]}><DotsThreeIcon size={22}/></IconButton>}/>
        <Popover.Portal><Popover.Positioner sideOffset={6} collisionPadding={8} {...stylex.props(s.popoverPositioner)}><Popover.Popup aria-label={t.more} {...stylex.props(s.popover, motion.dialog)}>{actions.map(action => <Popover.Close key={action.label} render={<Button variant="ghost" disabled={action.disabled} onClick={action.run}/>}><action.icon size={18}/>{action.label}</Popover.Close>)}</Popover.Popup></Popover.Positioner></Popover.Portal>
      </Popover.Root>
    </div>
  </li>;
}

export function PaletteParameters({ mode, count, disabled, extract, t }: {
  mode: Mode; count: number; disabled: boolean; extract: (mode: Mode, count: number) => void; t: Labels;
}) {
  return <div {...stylex.props(s.parameters)}>
    <div {...stylex.props(s.direction)}><SelectField appearance="quiet" label={t.mode} value={mode} disabled={disabled} onValueChange={value => extract(value as Mode, count)} options={modes.map(value => ({ value, label: t[value] }))}/></div>
    <fieldset disabled={disabled} {...stylex.props(s.counts)}>
      <legend {...stylex.props(s.legend)}>{t.count}</legend>
      <div {...stylex.props(s.row)}>{Array.from({ length: 8 }, (_, i) => i + 3).map(n => <label key={n} {...stylex.props(s.count, motion.selection, count === n && s.selected, disabled && s.disabled)}>
        <input type="radio" aria-label={String(n)} name="palette-target-count" value={n} checked={count === n} onChange={() => extract(mode, n)} {...stylex.props(s.radio)}/><span aria-hidden="true">{n}</span>
      </label>)}</div>
    </fieldset>
    <Button variant="ghost" disabled={disabled} onClick={() => extract(mode, count)}>{t.extract}</Button>
  </div>;
}

export function AddColor({ disabled, add, t }: { disabled: boolean; add: (hex: string) => boolean; t: Labels }) {
  const [open, setOpen] = useState(false), [value, setValue] = useState('#808080'), [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (next) { setValue('#808080'); setError(false); } }}>
    <Popover.Trigger render={<Button variant="ghost" disabled={disabled}/>}>{t.add}</Popover.Trigger>
    <Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} {...stylex.props(s.popoverPositioner)}>
      <Popover.Popup aria-label={t.add} initialFocus={input} {...stylex.props(s.popover, s.addColor, motion.dialog)}>
        <form {...stylex.props(s.stack)} onSubmit={event => { event.preventDefault(); if (!normalizeHex(value)) { setError(true); input.current?.focus(); } else if (add(value)) setOpen(false); }}>
          <div {...stylex.props(s.row)}>
            <span aria-hidden="true" {...stylex.props(s.addPreview)} style={{ backgroundColor: normalizeHex(value) ?? 'transparent' }}/>
            <div {...stylex.props(s.addInput)}><TextField ref={input} label={t.hex} value={value} maxLength={7} error={error ? t.invalid : undefined} onChange={next => { setValue(next); setError(false); }}/></div>
          </div>
          <div {...stylex.props(s.row)}><Button type="submit" variant="ghost" xstyle={s.accent}>{t.add}</Button><Popover.Close render={<Button variant="ghost"/>}>{t.cancel}</Popover.Close></div>
        </form>
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}

export default function PaletteExtractor({ locale }: ToolProps) {
  const t = messages[locale],
    { notify } = useToast();
  const [session, setSession] = useState<PaletteSession>();
  const [view, setView] = useState<PaletteView>({
    mode: 'balanced',
    count: 6,
    colors: [],
    busy: false,
    dirty: false,
    version: 0,
  });
  const [target, setTarget] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [samplePreview, setSamplePreview] = useState<SamplePreview>();
  const [pending, setPending] = useState<{ mode: Mode; count: number }>();
  const [saving, setSaving] = useState(false);
  const cancelPick = useCallback(() => { setTarget(undefined); setSamplePreview(undefined); }, []);
  const startPick = (id: string) => { setSelected(id); setTarget(id); };
  const exportVersion = useRef(0);
  useEffect(() => {
    const owner = new PaletteSession();
    setSession(owner);
    setView(owner.snapshot());
    const unsubscribe = owner.subscribe(() => setView(owner.snapshot()));
    return () => {
      exportVersion.current++;
      unsubscribe();
      owner.dispose();
    };
  }, []);
  useEffect(() => {
    setTarget(undefined);
    setSelected(undefined);
    setSamplePreview(undefined);
  }, [view.source]);
  useEffect(() => {
    if (target && !view.colors.some((c) => c.id === target))
      setTarget(undefined);
    if (selected && !view.colors.some(c => c.id === selected)) setSelected(undefined);
  }, [target, selected, view.colors]);
  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => notify({ title: t.copied, type: 'success' }))
      .catch(() => notify({ title: t.copyError, type: 'error' }));
    if (!navigator.clipboard) notify({ title: t.copyError, type: 'error' });
  };
  const extract = (mode: Mode, count: number) => {
    if (view.dirty) setPending({ mode, count });
    else {
      setTarget(undefined);
      session?.extract(mode, count);
    }
  };
  const png = async () => {
    if (!session || saving) return;
    setSaving(true);
    const ticket = ++exportVersion.current,
      version = view.version;
    try {
      const blob = await session.export(
        undefined,
        () => ticket === exportVersion.current,
      );
      if (blob && session.snapshot().version === version)
        session.download(blob, session.filename('basic'));
    } catch {
      notify({ title: t.exportError, type: 'error' });
    } finally {
      setSaving(false);
    }
  };
  const labels = {
    parameters: t.palette,
    close: t.close,
    showParameters: t.palette,
    hideParameters: t.palette,
    showTools: t.import,
    hideTools: t.import,
    main: t.palette,
    toolbar: t.palette,
  };
  return (
    <WorkbenchShell mode="form" formWidth="wide" labels={labels}>
      <link rel="license" href={notice} />
      <div data-palette-extractor {...stylex.props(s.layout)}>
        <div {...stylex.props(s.stack)}>
          <FileDropzone
            label={t.import}
            appearance={view.source ? 'compact' : 'expanded'}
            disabled={!session}
            accept="image/png,image/jpeg,image/webp,image/avif,.png,.jpg,.jpeg,.webp,.avif"
            maxFiles={1}
            maxSizeBytes={session?.limits.bytes}
            issueMessages={{ type: t.error, count: t.error, size: t.error }}
            onFilesReceived={(files) => {
              if (files[0]) session?.import(files[0]);
            }}
          />
          <details {...stylex.props(s.help)}>
            <summary>{t.fileDetails}</summary>
            <p {...stylex.props(s.muted)}>{t.limits}</p>
            {session &&
              <p {...stylex.props(s.muted)}>{`≤ ${session.limits.bytes / 1024 ** 2} MiB · ${session.limits.pixels / 1e6} MP · ${session.limits.edge}px`}</p>}
          </details>
          <PaletteParameters mode={view.mode} count={view.count} disabled={!view.source || view.busy} {...{ extract, t }}/>
          {view.busy && <p role="status">{t.loading}</p>}
          {view.error && (
            <p role="alert" {...stylex.props(s.error)}>
              {view.error === 'transparent'
                ? t.transparent
                : view.error === 'timeout'
                  ? t.timeout
                  : t.error}
            </p>
          )}
          {view.source ? (
            <>
              <ImageSampler
                key={view.source.url}
                pixels={view.source.pixels}
                url={view.source.url}
                target={target}
                selected={selected}
                colors={view.colors}
                onTarget={startPick}
                onSelect={setSelected}
                onPreview={setSamplePreview}
                cancel={cancelPick}
                t={t}
                onPick={(id, _hex, point) => {
                  if (session && session.snapshot().source === view.source && point) session.sample(id, point.x, point.y);
                  setSelected(id);
                  cancelPick();
                }}
              />
            </>
          ) : (
            !view.busy && <p {...stylex.props(s.muted)}>{t.empty}</p>
          )}
        </div>
        <section aria-label={t.palette} {...stylex.props(s.stack)}>
          <h2 {...stylex.props(s.heading)}>{t.palette}</h2>
          <ol
            aria-label={t.palette}
            {...stylex.props(s.colorList)}
          >
            {view.colors.map(
              (color, index) =>
                session && (
                  <ColorRow
                    key={color.id}
                    {...{ color, index, session, t, copy }}
                    length={view.colors.length}
                    selected={selected === color.id}
                    preview={samplePreview?.url === view.source?.url && samplePreview?.id === color.id ? samplePreview : undefined}
                    picking={target === color.id}
                    select={setSelected}
                    pick={startPick}
                  />
                ),
            )}
          </ol>
          <div {...stylex.props(s.row)}>
          <AddColor disabled={!view.source || view.colors.length >= 10} add={hex => session?.add(hex) ?? false} t={t}/>
          <Button
            variant="ghost"
            disabled={!view.colors.length}
            onClick={() => copy(view.colors.map((c) => c.hex).join('\n'))}
          >
            {t.all}
          </Button>
          <Button
            variant="ghost"
            disabled={!view.colors.length}
            loading={saving}
            onClick={() => void png()}
          >
            {t.png}
          </Button>
          {session && <ShareDialog session={session} view={view} t={t} />}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(undefined);
        }}
        title={t.overwrite}
        description={t.overwriteBody}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        danger={false}
        trigger={
          <button hidden type="button">
            {t.extract}
          </button>
        }
        onConfirm={() => {
          if (pending) {
            cancelPick();
            session?.extract(pending.mode, pending.count);
          }
          setPending(undefined);
        }}
      />
    </WorkbenchShell>
  );
}
