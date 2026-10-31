import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  CopyIcon,
  EyedropperIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button, IconButton } from '../../ui/Button';
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

function ColorRow({
  color,
  index,
  length,
  session,
  pick,
  copy,
  t,
}: {
  color: Swatch;
  index: number;
  length: number;
  session: PaletteSession;
  pick: (id: string) => void;
  copy: (text: string) => void;
  t: Labels;
}) {
  const [value, setValue] = useState(color.hex),
    [error, setError] = useState(false);
  useEffect(() => {
    setValue(color.hex);
    setError(false);
  }, [color.hex]);
  return (
    <li data-swatch={color.id} {...stylex.props(s.colorRow)}>
      <div
        {...stylex.props(s.chip)}
        style={{ backgroundColor: color.hex }}
        aria-label={color.hex}
        role="img"
      />
      <div {...stylex.props(s.stack)}>
        <div {...stylex.props(s.row)}>
          <form
            {...stylex.props(s.hex)}
            onSubmit={(e) => {
              e.preventDefault();
              setError(!session.edit(color.id, value));
            }}
          >
            <input
              aria-label={`${t.hex} ${index + 1}`}
              value={value}
              spellCheck={false}
              maxLength={7}
              aria-invalid={error || undefined}
              {...stylex.props(controls.input)}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              onBlur={() => setError(!session.edit(color.id, value))}
            />
          </form>
          <IconButton
            label={`${t.copy} ${index + 1}`}
            onClick={() => copy(color.hex)}
          >
            <CopyIcon size={20} />
          </IconButton>
          <IconButton
            label={`${t.pick} ${index + 1}`}
            onClick={() => pick(color.id)}
          >
            <EyedropperIcon size={20} />
          </IconButton>
        </div>
        {error && (
          <p role="alert" {...stylex.props(s.error)}>
            {t.invalid}
          </p>
        )}
        <div {...stylex.props(s.row)}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copy(rgbText(color.hex))}
            aria-label={`${t.rgb} ${index + 1}`}
          >
            RGB
          </Button>
          <IconButton
            label={`${t.up} ${index + 1}`}
            variant="ghost"
            disabled={!index}
            onClick={() => session.move(color.id, -1)}
          >
            <ArrowUpIcon size={18} />
          </IconButton>
          <IconButton
            label={`${t.down} ${index + 1}`}
            variant="ghost"
            disabled={index === length - 1}
            onClick={() => session.move(color.id, 1)}
          >
            <ArrowDownIcon size={18} />
          </IconButton>
          <IconButton
            label={`${t.remove} ${index + 1}`}
            variant="ghost"
            disabled={length === 1}
            onClick={() => session.remove(color.id)}
          >
            <TrashIcon size={18} />
          </IconButton>
        </div>
      </div>
    </li>
  );
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
                pixels={view.source.pixels}
                url={view.source.url}
                target={target}
                cancel={cancelPick}
                t={t}
                onPick={(id, hex) => {
                  session?.edit(id, hex);
                  cancelPick();
                }}
              />
              {target && <Button onClick={cancelPick}>{t.cancel}</Button>}
            </>
          ) : (
            !view.busy && <p {...stylex.props(s.muted)}>{t.empty}</p>
          )}
        </div>
        <div {...stylex.props(s.panel)}>
          <h2 {...stylex.props(s.heading)}>{t.palette}</h2>
          <label {...stylex.props(s.field)}>
            {t.mode}
            <select
              {...stylex.props(controls.input)}
              value={view.mode}
              disabled={!view.source || view.busy}
              onChange={(e) => extract(e.target.value as Mode, view.count)}
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {t[mode]}
                </option>
              ))}
            </select>
          </label>
          <label {...stylex.props(s.field)}>
            {t.count}
            <select
              {...stylex.props(controls.input)}
              value={view.count}
              disabled={!view.source || view.busy}
              onChange={(e) => extract(view.mode, +e.target.value)}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i + 3}>
                  {i + 3}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!view.source || view.busy}
            onClick={() => extract(view.mode, view.count)}
          >
            {t.extract}
          </Button>
          <ol
            aria-label={t.palette}
            {...stylex.props(s.stack)}
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {view.colors.map(
              (color, index) =>
                session && (
                  <ColorRow
                    key={color.id}
                    {...{ color, index, session, t, copy }}
                    length={view.colors.length}
                    pick={setTarget}
                  />
                ),
            )}
          </ol>
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
              <Dialog.Backdrop {...stylex.props(s.backdrop)} />
              <Dialog.Popup {...stylex.props(s.dialog, s.smallDialog)}>
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
