import { useState, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CaretDownIcon, CaretRightIcon, PlayIcon, QuestionIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { SelectField } from '../../ui/SelectField';
import { QuickReference } from './Inspector';
import { flagHelp, type Translate } from './reference';
import s from './workbench.module.scss';

function DetailsPopover({ label, icon, wide, children }: {
  label: string; icon?: ReactNode; wide?: boolean; children: ReactNode;
}) {
  return <Popover.Root>
    <Popover.Trigger render={<Button size="sm" variant="ghost" className={s.compactButton} />}>
      {label}{icon}
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Positioner className={s.positioner} sideOffset={8} align="end" collisionPadding={12}>
        <Popover.Popup className={s.popover} data-wide={wide || undefined}>
          <Popover.Title>{label}</Popover.Title>
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

const commonFlags = [
  ['g', '查找全部匹配', 'Find all matches', '继续查找后面的每一处匹配。', 'Continue searching after the first match.'],
  ['i', '忽略大小写', 'Ignore case', '例如将 Hello 和 hello 视为相同。', 'Treat Hello and hello as equivalent.'],
  ['m', '多行模式', 'Multiline', '让 ^ 和 $ 识别每一行的开头和结尾。', 'Let ^ and $ recognize each line’s start and end.'],
  ['s', '允许点号匹配换行', 'Match line breaks with dot', '让 . 可以跨行匹配。', 'Allow . to match across lines.'],
] as const;
const advancedFlags = [
  ['u', '按 Unicode 字符处理。', 'Work with Unicode code points.'],
  ['v', '使用 Unicode 集合及集合运算。', 'Enable Unicode sets and set operations.'],
  ['y', '仅从当前匹配位置继续查找。', 'Match only at the current search position.'],
  ['d', '显式返回匹配及捕获组的位置。', 'Include match and capture indices explicitly.'],
] as const;

export function MatchOptions({ flags, supported, toggle, t }: {
  flags: string; supported?: string; toggle: (flag: string) => void; t: Translate;
}) {
  const [advanced, setAdvanced] = useState(false);
  function option(flag: string, label: string, hint: string) {
    const unavailable = supported !== undefined && !supported.includes(flag);
    return <div className={s.flagOption} key={flag}>
      <CheckboxField label={label} checked={flags.includes(flag)} disabled={unavailable && !flags.includes(flag)}
        hint={unavailable ? t('当前浏览器不支持。', 'Unavailable in this browser.') : hint} onCheckedChange={() => toggle(flag)} />
      <code aria-hidden="true">{flag}</code>
    </div>;
  }
  return <DetailsPopover label={t('匹配选项', 'Match options')} icon={<CaretDownIcon />}>
    {commonFlags.map(([flag, zh, en, hintZh, hintEn]) => option(flag, t(zh, en), t(hintZh, hintEn)))}
    <Button size="sm" variant="ghost" className={s.advancedButton} aria-expanded={advanced}
      onClick={() => setAdvanced(value => !value)}>{t('高级匹配选项', 'Advanced options')}{advanced ? <CaretDownIcon /> : <CaretRightIcon />}</Button>
    {advanced && advancedFlags.map(([flag, zh, en]) => option(flag, t(...flagHelp[flag]), t(zh, en)))}
  </DetailsPopover>;
}

export function SyntaxHelp({ t, insert, replacement = false }: {
  t: Translate; insert: (value: string, replacement: boolean) => void; replacement?: boolean;
}) {
  const label = replacement ? t('替换语法', 'Replacement syntax') : t('语法帮助', 'Syntax help');
  return <DetailsPopover label={label} icon={!replacement && <QuestionIcon size={16} />} wide>
    <QuickReference t={t} initial={replacement ? 'replacement' : 'all'} insert={insert} />
  </DetailsPopover>;
}

export function ExecutionOptions({ t, live, setLive, timeout, setTimeoutChoice, run, busy, tests, elapsed, clear }: {
  t: Translate; live: boolean; setLive: (value: boolean) => void; timeout: number; setTimeoutChoice: (value: number) => void;
  run: () => void; busy: boolean; tests: boolean; elapsed?: number; clear: () => void;
}) {
  return <DetailsPopover label={t('执行详情', 'Execution details')} icon={<CaretRightIcon />}>
    <dl className={s.executionFacts}>
      <dt>{t('正则引擎', 'Engine')}</dt><dd>JavaScript RegExp</dd>
      <dt>{t('索引单位', 'Indices')}</dt><dd>UTF-16</dd>
      {elapsed !== undefined && <><dt>{t('执行耗时', 'Execution time')}</dt><dd>{elapsed.toFixed(2)} ms</dd></>}
    </dl>
    {!tests && <CheckboxField label={t('实时匹配', 'Live matching')} checked={live} onCheckedChange={setLive} />}
    <SelectField label={t('手动执行超时', 'Manual run timeout')} appearance="quiet" value={String(timeout)}
      options={[1500, 3000, 5000].map(value => ({ value: String(value), label: value / 1000 + ' s' }))}
      onValueChange={value => { if (value) setTimeoutChoice(Number(value)); }} />
    <p className={s.note}>{t('实时匹配的时限为 1.5 秒。最多保留 10,000 条匹配，测试文本上限为 2 Mi UTF-16 单元。',
      'Live matching stops after 1.5 seconds. Up to 10,000 matches are retained. Test text is limited to 2 Mi UTF-16 code units.')}</p>
    <div className={s.actions}>
      {!tests && live && <Button size="sm" variant="secondary" disabled={busy} onClick={run}><PlayIcon />{t('运行', 'Run')}</Button>}
      <Popover.Close render={<Button size="sm" variant="ghost" onClick={clear} />}>{t('清空工作区', 'Clear workspace')}</Popover.Close>
    </div>
  </DetailsPopover>;
}
