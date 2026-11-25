import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { CaretLeftIcon, CaretRightIcon, XIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { ErrorText, tr } from '../general/ui';
import type { ToolProps } from '../types';
import type { WorkRequest, WorkResponse } from './protocol';
import { columnPageSize, editorLimit, pageSizes, type TablePage, type TableResult } from './settings';
import s from './tabular.module.scss';

export function TablePreview({ worker, result, locale }: {
  worker: Worker;
  result: TableResult;
  locale: ToolProps['locale'];
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [size, setSize] = useState<number>(50);
  const [offset, setOffset] = useState(0);
  const [column, setColumn] = useState(0);
  const [page, setPage] = useState<TablePage>();
  const [error, setError] = useState<string>();
  const [cell, setCell] = useState<{ row: number; column: number }>();
  const [value, setValue] = useState<string>();
  const [part, setPart] = useState(0);
  const next = useRef(0);

  useEffect(() => {
    const id = ++next.current;
    setPage(undefined);
    setError(undefined);
    const receive = ({ data }: MessageEvent<WorkResponse>) => {
      if (data.type === 'page' && data.id === id) setPage(data.page);
      else if (data.type === 'error' && data.id === id) setError(tr(locale, data.zh, data.en));
    };
    worker.addEventListener('message', receive);
    worker.postMessage({ type: 'page', id, offset, size, column, width: columnPageSize } satisfies WorkRequest);
    return () => worker.removeEventListener('message', receive);
  }, [offset, size, column, worker, locale]);

  useEffect(() => {
    setValue(undefined);
    setPart(0);
    if (!cell) return;
    const id = ++next.current;
    const receive = ({ data }: MessageEvent<WorkResponse>) => {
      if (data.type === 'cell' && data.id === id) setValue(data.value);
      else if (data.type === 'error' && data.id === id) {
        setError(tr(locale, data.zh, data.en));
        setCell(undefined);
      }
    };
    worker.addEventListener('message', receive);
    worker.postMessage({ type: 'cell', id, ...cell } satisfies WorkRequest);
    return () => worker.removeEventListener('message', receive);
  }, [cell, worker, locale]);

  function navigate(previous: string, following: string, label: string, onPrev: () => void, onNext: () => void,
    prevDisabled: boolean, nextDisabled: boolean) {
    return <div className={s.navigation} role="group" aria-label={label}>
      <IconButton size="sm" variant="ghost" label={previous} onClick={onPrev} disabled={prevDisabled}>
        <CaretLeftIcon size={16} aria-hidden="true" />
      </IconButton>
      <span>{label}</span>
      <IconButton size="sm" variant="ghost" label={following} onClick={onNext} disabled={nextDisabled}>
        <CaretRightIcon size={16} aria-hidden="true" />
      </IconButton>
    </div>;
  }

  const totalParts = Math.ceil((value?.length ?? 0) / editorLimit);
  const cellSlice = (index: number) => {
    const boundary = index * editorLimit;
    return boundary && /[\uD800-\uDBFF]/.test(value?.[boundary - 1] ?? '') ? boundary - 1 : boundary;
  };
  return <div className={s.tabularPreview}>
    <div className={s.tableScroll} tabIndex={0} aria-label={t('表格预览', 'Table preview')}>
      {page ? <table className={s.table}>
        <thead><tr><th scope="col">#</th>{page.headers.map((header, index) => (
          <th key={index} scope="col"><button type="button" onClick={() => setCell({ row: -1, column: column + index })}>{header || '—'}</button></th>
        ))}</tr></thead>
        <tbody>{page.rows.map((row, rowIndex) => <tr key={offset + rowIndex}>
          <th scope="row">{offset + rowIndex + 1}</th>
          {row.map((entry, index) => <td key={index}><button type="button"
            onClick={() => setCell({ row: offset + rowIndex, column: column + index })}
            aria-label={t('查看第 ' + (offset + rowIndex + 1) + ' 行第 ' + (column + index + 1) + ' 列', 'View row ' + (offset + rowIndex + 1) + ', column ' + (column + index + 1))}
          >{entry || '—'}</button></td>)}
        </tr>)}</tbody>
      </table> : <p className={s.hint} role="status">{error ? '' : t('正在读取表格…', 'Loading table…')}</p>}
      {page && !page.rows.length && <p className={s.empty}>{t('没有数据记录', 'No records')}</p>}
      <ErrorText error={error} />
    </div>
    <div className={s.pagination}>
      <div className={s.inlineSelect}><SelectField label={t('每页行数', 'Rows per page')} appearance="quiet"
        options={pageSizes.map(rows => ({ value: String(rows), label: t(rows + ' 行/页', rows + ' rows/page') }))}
        value={String(size)} onValueChange={rows => { setSize(Number(rows)); setOffset(0); }} /></div>
      {navigate(t('上一页', 'Previous page'), t('下一页', 'Next page'),
        (result.records ? offset + 1 : 0) + '–' + Math.min(offset + size, result.records) + ' / ' + result.records,
        () => setOffset(offset - size), () => setOffset(offset + size), offset === 0, offset + size >= result.records)}
      {result.columns > columnPageSize && navigate(t('上一组列', 'Previous columns'), t('下一组列', 'Next columns'),
        t('列 ', 'Columns ') + (column + 1) + '–' + Math.min(result.columns, column + columnPageSize),
        () => setColumn(column - columnPageSize), () => setColumn(column + columnPageSize),
        column === 0, column + columnPageSize >= result.columns)}
    </div>
    <Dialog.Root open={!!cell} onOpenChange={open => { if (!open) setCell(undefined); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={s.backdrop} />
        <Dialog.Popup className={s.cellDialog}>
          <div className={s.dialogHeader}>
            <Dialog.Title>{cell?.row === -1 ? t('完整表头', 'Full header') : t('完整单元格', 'Full cell')}</Dialog.Title>
            <Dialog.Close render={<Button aria-label={t('关闭', 'Close')} size="sm" variant="ghost" />}>
              <XIcon size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          {value === undefined ? <p role="status">{t('正在加载…', 'Loading…')}</p>
            : <textarea className={s.cellValue} aria-label={t('单元格内容', 'Cell value')} readOnly
                value={value.slice(cellSlice(part), cellSlice(part + 1))} />}
          {totalParts > 1 && navigate(t('上一段', 'Previous part'), t('下一段', 'Next part'),
            (part + 1) + ' / ' + totalParts, () => setPart(part - 1), () => setPart(part + 1), part === 0, part + 1 >= totalParts)}
          <Button size="sm" variant="ghost" disabled={value === undefined || totalParts > 1}
            onClick={event => { (event.currentTarget.closest('[role=dialog]')?.querySelector('textarea'))?.select(); }}>
            {t('选择内容', 'Select value')}
          </Button>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
