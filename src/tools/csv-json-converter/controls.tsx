import { Popover } from '@base-ui/react/popover';
import { SlidersHorizontalIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { SelectField, type SelectOption } from '../../ui/SelectField';
import form from '../../workbench/form-tool-layout.module.scss';
import { tr } from '../general/ui';
import type { ToolProps } from '../types';
import { type CsvSettings, type Direction, type JsonSettings } from './settings';
import s from './tabular.module.scss';

type Labels = ToolProps['locale'];

export function Segments<T extends string>({ label, value, choices, onChange }: {
  label: string;
  value: T;
  choices: readonly (readonly [T, string])[];
  onChange: (next: T) => void;
}) {
  return <div className={form.segmented + ' ' + s.segments} role="group" aria-label={label}>
    {choices.map(([id, name]) => <Button key={id} size="sm" variant="ghost" aria-pressed={id === value}
      className={form.segment + (id === value ? ' ' + form.segmentSelected : '')}
      onClick={() => onChange(id)}>{name}</Button>)}
  </div>;
}

export function ConversionControls({ locale, direction, csv, json, onDirection, setCsv, setJson }: {
  locale: Labels;
  direction: Direction;
  csv: CsvSettings;
  json: JsonSettings;
  onDirection: (value: Direction) => void;
  setCsv: (values: Partial<CsvSettings>) => void;
  setJson: (values: Partial<JsonSettings>) => void;
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const fromCsv = direction === 'csv-json';
  const settings = fromCsv ? csv : json;
  const options: SelectOption[] = [
    { value: ',', label: t('逗号 (,)', 'Comma (,)') },
    { value: ';', label: t('分号 (;)', 'Semicolon (;)') },
    { value: '\t', label: 'Tab' },
    { value: '|', label: t('竖线 (|)', 'Pipe (|)') },
  ];
  if (fromCsv) options.unshift({ value: 'auto', label: t('自动检测分隔符', 'Auto-detect delimiter') });
  const more = t('更多设置', 'More settings');
  return <div className={s.toolbar}>
    <Segments label={t('转换方向', 'Conversion direction')} value={direction} onChange={onDirection}
      choices={[[ 'csv-json', 'CSV → JSON' ], ['json-csv', 'JSON → CSV']]} />
    <div className={s.inlineSelect}>
      <SelectField label={t('分隔符', 'Delimiter')} appearance="quiet" value={settings.delimiter} options={options}
        onValueChange={value => fromCsv ? setCsv({ delimiter: value as CsvSettings['delimiter'] })
          : setJson({ delimiter: value as JsonSettings['delimiter'] })} />
    </div>
    <CheckboxField label={fromCsv ? t('首行为表头', 'First row is headers') : t('输出表头', 'Include headers')}
      checked={settings.header} onCheckedChange={header => fromCsv ? setCsv({ header }) : setJson({ header })} />
    {fromCsv && <div className={s.inlineSelect}>
      <SelectField label={t('数据类型', 'Data types')} appearance="quiet" value={csv.infer ? 'infer' : 'string'}
        options={[{ value: 'string', label: t('保留字符串', 'Keep strings') }, { value: 'infer', label: t('智能推断', 'Infer types') }]}
        onValueChange={value => setCsv({ infer: value === 'infer' })} />
    </div>}
    <Popover.Root>
      <Popover.Trigger render={<Button variant="ghost" size="sm" className={s.more} />}>
        <SlidersHorizontalIcon size={17} aria-hidden="true" />{more}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className={s.positioner} sideOffset={7} align="end" collisionPadding={12}>
          <Popover.Popup className={s.options}>
            <Popover.Title className={s.optionTitle}>{more}</Popover.Title>
            {fromCsv ? <>
              <SelectField label={t('JSON 结构', 'JSON structure')} appearance="quiet" value={csv.shape}
                options={[{ value: 'objects', label: t('对象数组', 'Array of objects') }, { value: 'arrays', label: t('二维数组', 'Array of arrays') }]}
                onValueChange={value => setCsv({ shape: value as CsvSettings['shape'] })} />
              <SelectField label={t('空字段', 'Empty fields')} appearance="quiet" value={csv.emptyNull ? 'null' : 'empty'}
                options={[{ value: 'empty', label: t('空字符串', 'Empty string') }, { value: 'null', label: 'null' }]}
                onValueChange={value => setCsv({ emptyNull: value === 'null' })} />
              <SelectField label={t('JSON 缩进', 'JSON indentation')} appearance="quiet" value={String(csv.indent)}
                options={[{ value: '2', label: t('2 空格', '2 spaces') }, { value: '4', label: t('4 空格', '4 spaces') }, { value: '0', label: t('压缩', 'Minified') }]}
                onValueChange={value => setCsv({ indent: Number(value) as CsvSettings['indent'] })} />
              {csv.infer && <p className={s.hint}>{t('仅推断小写布尔值和可安全表示的十进制数字。', 'Infers lowercase booleans and safely representable decimal numbers.')}</p>}
            </> : <>
              <CheckboxField label={t('展开嵌套对象', 'Flatten nested objects')} checked={json.flatten}
                onCheckedChange={flatten => setJson({ flatten })} />
              <SelectField label={t('换行', 'Line endings')} appearance="quiet" value={json.newline === '\n' ? 'LF' : 'CRLF'}
                options={[{ value: 'CRLF', label: 'CRLF' }, { value: 'LF', label: 'LF' }]}
                onValueChange={value => setJson({ newline: value === 'LF' ? '\n' : '\r\n' })} />
              <CheckboxField label={t('添加 UTF-8 BOM', 'Add UTF-8 BOM')} checked={json.bom} onCheckedChange={bom => setJson({ bom })} />
              <CheckboxField label={t('Excel 公式注入防护', 'Excel formula protection')} checked={json.escapeFormulae}
                onCheckedChange={escapeFormulae => setJson({ escapeFormulae })}
                hint={t('给疑似公式的表头和数据字段加上单引号。', 'Prefixes formula-like headers and cells with an apostrophe.')} />
              <p className={s.hint}>{t('缺失字段和 null 均输出为空字段。', 'Missing fields and null both become empty CSV fields.')}</p>
            </>}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </div>;
}
