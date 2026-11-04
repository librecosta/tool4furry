import s from './UILab.module.scss';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QuestionIcon } from '@phosphor-icons/react';
import WorkbenchShell from '../workbench/WorkbenchShell';
import { Button, IconButton } from '../ui/Button';
import { TextField, TextAreaField } from '../ui/TextField';
import { SelectField } from '../ui/SelectField';
import { CheckboxField } from '../ui/CheckboxField';
import { SliderField } from '../ui/SliderField';
import { Tooltip } from '../ui/Tooltip';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast, type ToastType } from '../ui/Toast';
import c from '../ui/controls.module.scss';
import type { LabMessages } from './messages';

export default function UILab({
  t,
  header,
}: {
  t: LabMessages;
  header: ReactNode;
}) {
  const [clicks, setClicks] = useState(0);
  const [name, setName] = useState(t.sampleLabel);
  const [notes, setNotes] = useState('');
  const [choice, setChoice] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [intensity, setIntensity] = useState(40);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toast = useToast();
  const options = [
    { value: 'green', label: t.green },
    { value: 'orange', label: t.orange },
    { value: 'blue', label: t.blue },
    { value: 'unavailable', label: t.optionDisabled, disabled: true },
  ];
  const clickButton = (title: string) => {
    setClicks((n) => n + 1);
    toast.notify({ id: 'button-feedback', title });
  };
  const toastNames: Record<ToastType, string> = {
    success: t.successToast,
    info: t.infoToast,
    warning: t.warningToast,
    error: t.errorToast,
  };
  return (
    <WorkbenchShell mode="custom" labels={t} header={header}>
      <div data-ui-lab className={c.stack}>
        <p className={c.muted}>{t.uiIntro}</p>
        <div className={s.grid}>
          <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.buttons}>
            <h2 className={c.heading}>{t.buttons}</h2>
            <div className={c.row}>
              <Button variant="primary" onClick={() => clickButton(t.primary)}>
                {t.primary}
              </Button>
              <Button onClick={() => clickButton(t.secondary)}>
                {t.secondary}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clickButton(t.ghost)}
              >
                {t.ghost}
              </Button>
              <Button disabled>{t.disabled}</Button>
              <Tooltip content={t.helpDetail}>
                <IconButton
                  label={t.help}
                  onClick={() =>
                    toast.notify({ id: 'help', title: t.helpOpened })
                  }
                >
                  <QuestionIcon size={20} aria-hidden="true" />
                </IconButton>
              </Tooltip>
            </div>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                timer.current = setTimeout(() => {
                  setLoading(false);
                  setClicks((n) => n + 1);
                  toast.notify({ type: 'success', title: t.successToast });
                }, 1000);
              }}
            >
              {t.loadingDemo}
            </Button>
            <p role="status">
              {t.clicks}: {clicks}
            </p>
            <ConfirmDialog
              open={open}
              onOpenChange={setOpen}
              title={t.confirmTitle}
              description={t.confirmDescription}
              confirmLabel={t.confirm}
              cancelLabel={t.cancel}
              danger
              trigger={<Button variant="danger">{t.confirmTrigger}</Button>}
              onConfirm={() => {
                setConfirmed((n) => n + 1);
                toast.notify({ type: 'success', title: t.successToast });
              }}
            />
            <p role="status">
              {t.confirmed}: {confirmed}
            </p>
          </section>
          <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.fields}>
            <h2 className={c.heading}>{t.fields}</h2>
            <form
              noValidate
              className={c.stack}
              onSubmit={(event) => {
                event.preventDefault();
                const invalid = name.trim().length < 2;
                setError(invalid);
                if (!invalid) toast.notify({ type: 'success', title: t.valid });
              }}
            >
              <TextField
                label={t.demoName}
                hint={t.nameHint}
                required
                value={name}
                onChange={(value) => {
                  setName(value);
                  setError(false);
                }}
                error={error ? t.nameError : undefined}
              />
              <TextAreaField
                label={t.notes}
                placeholder={t.notesPlaceholder}
                value={notes}
                onChange={setNotes}
              />
              <SelectField
                label={t.choice}
                placeholder={t.choose}
                value={choice}
                onValueChange={setChoice}
                options={options}
              />
              <CheckboxField
                label={t.enabled}
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <SliderField
                label={t.intensity}
                value={intensity}
                onValueChange={setIntensity}
                step={5}
                unit="%"
              />
              <Button type="submit" variant="primary">
                {t.validate}
              </Button>
            </form>
            <div className={s.values}>
              <strong>{t.values}</strong>
              <pre className={s.pre}>
                {JSON.stringify(
                  { name, notes, choice, enabled, intensity },
                  null,
                  2,
                )}
              </pre>
            </div>
          </section>
          <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.feedback}>
            <h2 className={c.heading}>{t.feedback}</h2>
            <p className={c.muted}>{t.toastDetail}</p>
            <div className={c.row}>
              {(['success', 'info', 'warning', 'error'] as const).map(
                (type) => (
                  <Button
                    key={type}
                    onClick={() =>
                      toast.notify({
                        id: `ui-${type}`,
                        type,
                        title: toastNames[type],
                        description: t.toastDetail,
                      })
                    }
                  >
                    {toastNames[type]}
                  </Button>
                ),
              )}
            </div>
          </section>
          <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.disabled}>
            <h2 className={c.heading}>{t.disabled}</h2>
            <TextField
              label={t.demoName}
              value={t.sampleLabel}
              onChange={() => {}}
              disabled
            />
            <TextAreaField
              label={t.notes}
              value={t.formNote}
              onChange={() => {}}
              disabled
            />
            <SelectField
              label={t.choice}
              value="green"
              onValueChange={() => {}}
              options={options}
              disabled
            />
            <CheckboxField
              label={t.enabled}
              checked
              onCheckedChange={() => {}}
              disabled
            />
            <SliderField
              label={t.intensity}
              value={40}
              onValueChange={() => {}}
              disabled
            />
          </section>
        </div>
      </div>
    </WorkbenchShell>
  );
}
