import s from './FormDemo.module.scss';
import { useState, type ReactNode } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import WorkbenchShell from '../workbench/WorkbenchShell';
import type { LabMessages as Messages } from './messages';
import c from '../ui/controls.module.scss';
import { simulateText } from './demo-logic';
import { Button } from '../ui/Button';
import { TextField, TextAreaField } from '../ui/TextField';
import { CheckboxField } from '../ui/CheckboxField';
export default function FormDemo({
  t,
  header,
}: {
  t: Messages;
  header: ReactNode;
}) {
  const [text, setText] = useState(t.sampleText);
  const [prefix, setPrefix] = useState('✦ ');
  const [uppercase, setUppercase] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState(false);
  return (
    <WorkbenchShell
      mode="form"
      labels={t}
      header={header}
      right={
        <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.output}>
          <h2 className={c.heading}>{t.output}</h2>
          <output aria-live="polite" className={s.output}>
            {result ?? t.outputHint}
          </output>
        </section>
      }
    >
      <form
        className={[c.card, c.stack].filter(Boolean).join(' ')}
        onSubmit={(event) => {
          event.preventDefault();
          const next = simulateText(text, prefix, uppercase);
          setError(next === null);
          setResult(next);
        }}
      >
        <TextAreaField
          label={t.input}
          rows={5}
          maxLength={2000}
          value={text}
          error={error ? t.required : undefined}
          onChange={(value) => {
            setText(value);
            setError(false);
          }}
        />
        <TextField
          label={t.prefix}
          maxLength={40}
          value={prefix}
          onChange={setPrefix}
        />
        <CheckboxField
          label={t.uppercase}
          checked={uppercase}
          onCheckedChange={setUppercase}
        />
        <Button type="submit" variant="primary">
          {t.run}
          <ArrowRightIcon size={18} aria-hidden />
        </Button>
        <p className={c.muted}>{t.formNote}</p>
      </form>
    </WorkbenchShell>
  );
}
