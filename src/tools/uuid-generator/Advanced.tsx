import { lazy, Suspense, useState } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { NumberStepper } from '../../ui/NumberStepper';
import { SelectField } from '../../ui/SelectField';
import { TextAreaField, TextField } from '../../ui/TextField';
import { ErrorText, errorText, saveBlob, tr } from '../general/ui';
import type { ToolProps } from '../types';
import { Choices, formatOptions, PageControls, UuidCopy, UuidRows, versionLabel, versionPurpose, visibleRows, type Translate } from './controls';
import { formatUuid, versions, uuidLimits, type GenerationVersion, type Representation, type UuidBatch } from './core';
import { createUuidNamer, deliveryFormats, mime, serializeUuids, type DeliveryFormat, type Separator } from './delivery';
import { generateBatch, namespaces } from './generation';
import uuidNotice from './uuid.NOTICE.txt?url&no-inline';
import s from './workbench.module.scss';

const Inspect = lazy(() => import('./Inspect'));

export default function Advanced({ locale }: Pick<ToolProps, 'locale'>) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [visitedInspect, visit] = useState(false);
  const [namer] = useState(createUuidNamer);
  return <Tabs.Root defaultValue="generate" data-uuid-license-url={uuidNotice}
    onValueChange={value => { if (value === 'inspect') visit(true); }}>
    <Tabs.List className={s.subTabs} aria-label={t('高级功能', 'Advanced tools')}>
      <Tabs.Tab value="generate">{t('生成 UUID', 'Generate')}</Tabs.Tab>
      <Tabs.Tab value="inspect">{t('验证与解析', 'Validate & Inspect')}</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="generate" keepMounted><Generate locale={locale} t={t} namer={namer} /></Tabs.Panel>
    <Tabs.Panel value="inspect" keepMounted>
      {visitedInspect && <Suspense fallback={<p className={s.loading} role="status">{t('正在加载…', 'Loading…')}</p>}>
        <Inspect locale={locale} t={t} namer={namer} />
      </Suspense>}
    </Tabs.Panel>
  </Tabs.Root>;
}

function Generate({ locale, t, namer }: { locale: ToolProps['locale']; t: Translate; namer: ReturnType<typeof createUuidNamer> }) {
  const [version, setVersion] = useState<GenerationVersion>('v4');
  const [count, setCount] = useState(1);
  const [namespace, setNamespace] = useState('DNS');
  const [custom, setCustom] = useState('');
  const [names, setNames] = useState({ single: '', batch: '' });
  const [nameMode, setNameMode] = useState<'single' | 'batch'>('single');
  const [representation, setRepresentation] = useState<Representation>('standard');
  const [delivery, setDelivery] = useState<DeliveryFormat>('txt');
  const [separator, setSeparator] = useState<Separator>('line');
  const [batch, setBatch] = useState<UuidBatch>();
  const [page, setPage] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  const named = version === 'v3' || version === 'v5';
  const special = version === 'nil' || version === 'max';
  const format = { txt: t('文本', 'TXT'), json: 'JSON', csv: 'CSV', sql: 'SQL' };
  const representations = formatOptions(t);
  const resultLabel = batch && t(
    batch.values.length.toLocaleString(locale) + ' 个 ' + versionLabel(batch.version),
    batch.values.length.toLocaleString(locale) + ' × ' + versionLabel(batch.version),
  );
  const values = batch?.values.slice(page * visibleRows, (page + 1) * visibleRows).map(value => formatUuid(value, representation));
  const serialize = () => serializeUuids(batch!.values.map(value => formatUuid(value, representation)), delivery, separator);
  async function generate() {
    setWorking(true);
    setError(undefined);
    try {
      const next = await generateBatch({ version, count, namespace: namespace === 'custom' ? custom : namespaces[namespace as keyof typeof namespaces],
        names: names[nameMode], multiline: nameMode === 'batch' });
      setBatch(next);
      setPage(0);
    } catch (cause) {
      setError(errorText(cause, locale));
    } finally {
      setWorking(false);
    }
  }
  return <div className={s.generate}>
    <form className={s.settings} onSubmit={event => { event.preventDefault(); if (!working) void generate(); }}>
      <h2>{t('生成设置', 'Generation settings')}</h2>
      <SelectField label={t('UUID 版本', 'UUID version')} value={version}
        options={versions.map(value => ({ value, label: versionLabel(value) }))} onValueChange={value => value && setVersion(value as GenerationVersion)} />
      <p className={s.muted}>{versionPurpose(version, t)}</p>
      {named ? <>
        <SelectField label={t('命名空间', 'Namespace')} value={namespace}
          options={[...Object.keys(namespaces).map(value => ({ value, label: value })), { value: 'custom', label: t('自定义', 'Custom') }]}
          onValueChange={value => value && setNamespace(value)} />
        {namespace === 'custom' && <TextField label={t('命名空间 UUID', 'Namespace UUID')} value={custom} onChange={setCustom} spellCheck={false} />}
        <Choices label={t('名称输入', 'Name input')} value={nameMode} onChange={setNameMode}
          items={[{ value: 'single', label: t('单个名称', 'Single name') }, { value: 'batch', label: t('每行一个', 'One per line') }]} />
        {nameMode === 'single' ? <TextField label={t('名称', 'Name')} value={names.single} spellCheck={false}
          onChange={single => setNames(previous => ({ ...previous, single }))} />
          : <TextAreaField label={t('名称列表', 'Names')} value={names.batch} rows={4} spellCheck={false}
            onChange={batch => setNames(previous => ({ ...previous, batch }))} />}
        <p className={s.muted}>{t('保留名称中的空白和大小写。哈希仅用于确定性 UUID 生成。', 'Name spacing and case are preserved. Hashes are used for deterministic UUID generation only.')}</p>
      </> : !special && <NumberStepper label={t('生成数量', 'Quantity')} min={1} max={uuidLimits.records} value={count}
        decreaseLabel={t('减少数量', 'Decrease quantity')} increaseLabel={t('增加数量', 'Increase quantity')} onValueChange={setCount} />}
      <SelectField label={t('UUID 表示格式', 'UUID representation')} value={representation} options={representations}
        onValueChange={value => value && setRepresentation(value as Representation)} />
      <Button variant="primary" type="submit" loading={working}>{t('生成 UUID', 'Generate UUIDs')}</Button>
      <ErrorText error={error} />
    </form>
    <section className={s.results} aria-label={t('生成结果', 'Generated results')} aria-busy={working}>
      <header className={s.bar}><h2>{t('生成结果', 'Generated results')}</h2>
        <span className={s.muted} role="status" data-uuid-count>{working ? t('正在生成…', 'Generating…') : resultLabel}</span></header>
      <div className={s.formats}>
        <Choices label={t('交付格式', 'Delivery format')} value={delivery} onChange={setDelivery}
          items={deliveryFormats.map(value => ({ value, label: format[value] }))} />
        {delivery === 'txt' && <SelectField label={t('TXT 分隔符', 'TXT separator')} value={separator}
          options={[{ value: 'line', label: t('一行一个', 'One per line') }, { value: 'comma', label: t('逗号', 'Comma') }, { value: 'space', label: t('空格', 'Space') }]}
          onValueChange={value => value && setSeparator(value as Separator)} />}
      </div>
      <div className={s.resultBody}>{values ? <UuidRows values={values} offset={page * visibleRows} t={t} />
        : <p className={s.empty}>{t('生成后在这里查看 UUID。', 'Generated UUIDs appear here.')}</p>}</div>
      <footer className={s.resultFooter}>
        <PageControls total={batch?.values.length ?? 0} {...{ page, setPage, t }} />
        <div className={s.actions}>
          <Button disabled={!batch || working} onClick={() => batch &&
            saveBlob(new Blob([serialize()], { type: mime[delivery] }), namer('uuid-' + batch.version, delivery))}>
            <DownloadSimpleIcon size={17} aria-hidden="true" />{t('下载 ', 'Download ') + delivery.toUpperCase()}
          </Button>
          <UuidCopy label={t('复制全部', 'Copy all')} value={batch ? serialize : undefined} disabled={working} t={t} />
        </div>
      </footer>
    </section>
  </div>;
}
