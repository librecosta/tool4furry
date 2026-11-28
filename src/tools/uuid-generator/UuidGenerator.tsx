import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { ErrorText, errorText, Frame, tr } from '../general/ui';
import type { ToolProps } from '../types';
import { formatUuid, randomUuid } from './core';
import { Choices, UuidCopy, UuidRows, versionPurpose } from './controls';
import s from './workbench.module.scss';

const Advanced = lazy(() => import('./Advanced'));
const quantities = [1, 5, 10, 50] as const;
type QuickVersion = 'v4' | 'v7';
type QuickCount = typeof quantities[number];

export default function UuidGenerator({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [mode, setMode] = useState('quick');
  const [advancedVisited, visitAdvanced] = useState(false);
  const [quickVersion, setQuickVersion] = useState<QuickVersion>('v4');
  const [count, setCount] = useState<QuickCount>(1);
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(true);
  const revision = useRef(0);
  const initialized = useRef(false);

  async function regenerate(version: QuickVersion, amount: QuickCount) {
    const task = ++revision.current;
    setWorking(true);
    setError(undefined);
    setValues([]);
    try {
      const create = version === 'v4' ? randomUuid : (await import('./time-v7')).timeOrderedUuid;
      if (task !== revision.current) return;
      setValues(Array.from({ length: amount }, () => formatUuid(create())));
    } catch (cause) {
      if (task === revision.current) setError(errorText(cause, locale));
    } finally {
      if (task === revision.current) setWorking(false);
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void regenerate('v4', 1);
    }
    // Initial random generation belongs to the browser mount, not the build.
  }, []);

  return <Frame locale={locale}>
    <Tabs.Root className={s.workspace} data-uuid-workbench value={mode} onValueChange={value => {
      setMode(value as string);
      if (value === 'advanced') visitAdvanced(true);
    }}>
      <div className={s.toolbar}>
        <Tabs.List className={s.topTabs} aria-label={t('模式', 'Mode')}>
          <Tabs.Tab value="quick">{t('快速模式', 'Quick')}</Tabs.Tab>
          <Tabs.Tab value="advanced">{t('高级模式', 'Advanced')}</Tabs.Tab>
        </Tabs.List>
        {mode === 'advanced' && <span className={s.muted}>RFC 9562</span>}
      </div>
      <Tabs.Panel value="quick" keepMounted className={s.quick}>
        <div className={s.quickBody} aria-busy={working}>
          <Choices<QuickVersion> label={t('UUID 版本', 'UUID version')} value={quickVersion}
            items={[{ value: 'v4', label: t('UUID v4 · 随机', 'UUID v4 · Random') },
              { value: 'v7', label: t('UUID v7 · 时间排序', 'UUID v7 · Time-ordered') }]}
            onChange={value => { if (value !== quickVersion) { setQuickVersion(value); void regenerate(value, count); } }} />
          <p className={s.muted}>{versionPurpose(quickVersion, t)}</p>
          <div className={count === 1 ? s.quickValue : s.quickResults} data-uuid-quick-result>
            {count === 1 && values[0] ? <code>{values[0]}</code>
              : values.length ? <UuidRows values={values} t={t} />
                : <span className={s.muted} role="status">{working ? t('正在生成…', 'Generating…') : '—'}</span>}
          </div>
          <div className={s.actions}>
            <Button disabled={working} onClick={() => void regenerate(quickVersion, count)}>
              <ArrowClockwiseIcon size={20} aria-hidden="true" />{t('重新生成', 'Regenerate')}
            </Button>
            <UuidCopy label={count === 1 ? t('复制 UUID', 'Copy UUID') : t('复制全部', 'Copy all')}
              value={values.length ? () => values.join('\n') : undefined} t={t} />
          </div>
          <ErrorText error={error} />
        </div>
        <div className={s.quickFooter}>
          <span className={s.muted}>{t('生成数量', 'Quantity')}</span>
          <Choices<QuickCount> label={t('生成数量', 'Quantity')} value={count}
            items={quantities.map(value => ({ value, label: value }))}
            onChange={value => { if (value !== count) { setCount(value); void regenerate(quickVersion, value); } }} />
          <span className={s.local}><i aria-hidden="true" />{t('浏览器本地生成', 'Generated in your browser')}</span>
        </div>
      </Tabs.Panel>
      <Tabs.Panel value="advanced" keepMounted>
        {advancedVisited && <Suspense fallback={<p className={s.loading} role="status">{t('正在加载…', 'Loading…')}</p>}>
          <Advanced locale={locale} />
        </Suspense>}
      </Tabs.Panel>
    </Tabs.Root>
  </Frame>;
}
