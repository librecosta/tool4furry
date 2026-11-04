import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { ToolProps } from '../types';
import { TextField } from '../../ui/TextField';
import { Button } from '../../ui/Button';
import { Frame, ErrorText, errorText, tr, Copy } from '../general/ui';
import s from '../general/ui.module.scss';
import { parseColor, colorValues, contrast } from './core';
import notice from '../palette-extractor/react-colorful.NOTICE.txt?url';
export default function ColorContrast({ locale }: ToolProps) {
  const [foreground, setForeground] = useState('#202428'),
    [background, setBackground] = useState('#FFFFFF');
  let colors: ReturnType<typeof colorValues>[] | undefined,
    ratio = 0,
    error;
  try {
    const a = parseColor(foreground),
      b = parseColor(background);
    colors = [colorValues(a), colorValues(b)];
    ratio = contrast(a, b);
  } catch (e) {
    error = errorText(e, locale);
  }
  return (
    <Frame locale={locale}>
      <span hidden data-color-license={notice} />
      <div className={s.columns}>
        {([foreground, background] as const).map((value, i) => (
          <div
            key={i}
            role="group"
            aria-label={tr(
              locale,
              i ? '背景色' : '前景色',
              i ? 'Background' : 'Foreground',
            )}
            className={s.stack}
          >
            <TextField
              label={tr(
                locale,
                i ? '背景色（HEX / RGB / HSL）' : '前景色（HEX / RGB / HSL）',
                i
                  ? 'Background (HEX / RGB / HSL)'
                  : 'Foreground (HEX / RGB / HSL)',
              )}
              value={value}
              onChange={i ? setBackground : setForeground}
            />
            <HexColorPicker
              color={colors?.[i].hex ?? '#000000'}
              onChange={i ? setBackground : setForeground}
            />
            {colors &&
              Object.values(colors[i]).map((v) => (
                <div key={v} className={s.row}>
                  <code>{v}</code>
                  <Copy locale={locale} value={v} />
                </div>
              ))}
          </div>
        ))}
      </div>
      <ErrorText error={error} />
      {colors && (
        <>
          <div
            style={{
              color: colors[0].hex,
              backgroundColor: colors[1].hex,
              padding: 24,
            }}
          >
            {tr(
              locale,
              '文字预览：创作源于每一个细节。',
              'Text preview: creativity begins with the details.',
            )}
          </div>
          <p role="status">
            {tr(locale, '对比度', 'Contrast')}: {ratio.toFixed(2)}:1
          </p>
          <ul>
            {[
              [tr(locale, '普通文字 AA', 'Normal text AA'), 4.5],
              [tr(locale, '普通文字 AAA', 'Normal text AAA'), 7],
              [tr(locale, '大号文字 AA', 'Large text AA'), 3],
              [tr(locale, '大号文字 AAA', 'Large text AAA'), 4.5],
            ].map(([label, min]) => (
              <li key={label}>
                {label}:{' '}
                {ratio >= Number(min)
                  ? tr(locale, '通过', 'Pass')
                  : tr(locale, '不通过', 'Fail')}{' '}
                ({min}:1)
              </li>
            ))}
          </ul>
        </>
      )}
      <Button
        onClick={() => {
          setForeground('#202428');
          setBackground('#FFFFFF');
        }}
      >
        {tr(locale, '重置', 'Reset')}
      </Button>
    </Frame>
  );
}
