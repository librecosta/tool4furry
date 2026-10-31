import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
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
import { ImageSampler } from './ImageSampler';
import { ShareDialog } from './ShareDialog';
import notice from './colorthief.NOTICE.txt?url';

export function ColorRow({ color, index, length, session, pick, selected, copy, t }: {
  color: Swatch; index: number; length: number; session: PaletteSession;
  pick: (id: string) => void; selected: boolean; copy: (text: string) => void; t: Labels;
}) {
  const [value, setValue] = useState(color.hex), [error, setError] = useState(false);
  useEffect(() => { setValue(color.hex); setError(false); }, [color.hex]);
  const actions = [
    { label: t.rgb, icon: CopyIcon, run: () => copy(rgbText(color.hex)), text: 'RGB' },
    { label: t.up, icon: ArrowUpIcon, run: () => session.move(color.id, -1), disabled: !index },
    { label: t.down, icon: ArrowDownIcon, run: () => session.move(color.id, 1), disabled: index === length - 1 },
    { label: t.remove, icon: TrashIcon, run: () => session.remove(color.id), disabled: length === 1 },
  ];
  return <li data-swatch={color.id} data-picking={selected || undefined} {...stylex.props(s.colorRow, motion.selection, selected && s.selected)}>
    <div {...stylex.props(s.chip)} style={{ backgroundColor: color.hex }} aria-label={color.hex} role="img"/>
    <form {...stylex.props(s.hex)} onSubmit={event => { event.preventDefault(); setError(!session.edit(color.id, value)); }}>
      <input aria-label={`${t.hex} ${index + 1}`} value={value} spellCheck={false} maxLength={7} aria-invalid={error || undefined} aria-description={error ? t.invalid : undefined}
        {...stylex.props(controls.input, s.hexInput, error && controls.invalid)}
        onChange={event => { setValue(event.target.value); setError(false); }} onBlur={() => setError(!session.edit(color.id, value))}/>
    </form>
    {error && <span role="alert" {...stylex.props(s.srOnly)}>{t.invalid}</span>}
    <div {...stylex.props(s.rowActions)}>
      <Tooltip content={t.copy}><IconButton label={`${t.copy} ${index + 1}`} variant="ghost" xstyle={s.tool} onClick={() => copy(color.hex)}><CopyIcon size={20}/></IconButton></Tooltip>
      <Tooltip content={t.pick}><IconButton label={`${t.pick} ${index + 1}`} variant="ghost" aria-pressed={selected} xstyle={[s.tool, motion.selection, selected && s.selected]} onClick={() => pick(color.id)}><EyedropperIcon size={20}/></IconButton></Tooltip>
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
    <div {...stylex.props(s.direction)}><SelectField label={t.mode} value={mode} disabled={disabled} onValueChange={value => extract(value as Mode, count)} options={modes.map(value => ({ value, label: t[value] }))}/></div>
    <fieldset disabled={disabled} {...stylex.props(s.counts)}>
      <legend {...stylex.props(s.legend)}>{t.count}</legend>
      <div {...stylex.props(s.row)}>{Array.from({ length: 8 }, (_, i) => i + 3).map(n => <label key={n} {...stylex.props(s.count, motion.selection, count === n && s.selected, disabled && s.disabled)}>
        <input type="radio" aria-label={String(n)} name="palette-target-count" value={n} checked={count === n} onChange={() => extract(mode, n)} {...stylex.props(s.radio)}/><span aria-hidden="true">{n}</span>
      </label>)}</div>
    </fieldset>
    <Button disabled={disabled} onClick={() => extract(mode, count)}>{t.extract}</Button>
  </div>;
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
  const [pending, setPending] = useState<{ mode: Mode; count: number }>();
  const [adding, setAdding] = useState(false),
    [newColor, setNewColor] = useState('#808080');
  const [saving, setSaving] = useState(false);
  const cancelPick = useCallback(() => setTarget(undefined), []);
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
  }, [view.source]);
  useEffect(() => {
    if (target && !view.colors.some((c) => c.id === target))
      setTarget(undefined);
  }, [target, view.colors]);
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
        session.download(blob, 't4f-palette.png');
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
          <p {...stylex.props(s.muted)}>
            {t.limits}
            {session &&
              ` ≤ ${session.limits.bytes / 1024 ** 2} MiB · ${session.limits.pixels / 1e6} MP · ${session.limits.edge}px`}
          </p>
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
              <div {...stylex.props(s.row)}>
                <p {...stylex.props(s.muted, s.grow)}>{view.source.name}</p>
                <Button
                  onClick={() => {
                    session?.clear();
                    cancelPick();
                  }}
                >
                  {t.clear}
                </Button>
              </div>
              <ImageSampler
                key={view.source.url}
                pixels={view.source.pixels}
                url={view.source.url}
                target={target}
                colors={view.colors}
                onTarget={setTarget}
                cancel={cancelPick}
                t={t}
                onPick={(id, hex) => {
                  if (session && session.snapshot().source === view.source) session.edit(id, hex);
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
                    selected={target === color.id}
                    pick={setTarget}
                  />
                ),
            )}
          </ol>
          <div {...stylex.props(s.row)}>
          <Dialog.Root
            open={adding}
            onOpenChange={(open) => {
              setAdding(open);
              if (open) setNewColor('#808080');
            }}
          >
            <Dialog.Trigger
              render={
                <Button disabled={!view.source || view.colors.length >= 10} />
              }
            >
              {t.add}
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop {...stylex.props(s.backdrop, motion.backdrop)} />
              <Dialog.Popup {...stylex.props(s.dialog, s.smallDialog, motion.dialog)}>
                <Dialog.Title>{t.add}</Dialog.Title>
                <Dialog.Description>{t.hex}</Dialog.Description>
                <form
                  {...stylex.props(s.stack)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (session?.add(newColor)) setAdding(false);
                  }}
                >
                  <TextField
                    label={t.hex}
                    value={newColor}
                    maxLength={7}
                    onChange={setNewColor}
                  />
                  <Button type="submit" disabled={!normalizeHex(newColor)}>
                    {t.save}
                  </Button>
                  <Dialog.Close render={<Button />}>{t.cancel}</Dialog.Close>
                </form>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
          <Button
            disabled={!view.colors.length}
            onClick={() => copy(view.colors.map((c) => c.hex).join('\n'))}
          >
            {t.all}
          </Button>
          <Button
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
