import { tr } from '../general/ui';
import type { Locale } from '../../i18n/locale';
import type { ProcessingIssue } from './core';

const messages = {
  unicode: ['输入包含不完整的 Unicode 字符。', 'The input contains an incomplete Unicode character.'],
  urlEscape: ['URL 转义无效，请检查 % 后的两位十六进制字符。', 'Invalid URL escape. Check the two hexadecimal digits after each %.'],
  urlUtf8: ['URL 转义字节不是有效的 UTF-8 文本。', 'The escaped URL bytes are not valid UTF-8 text.'],
  base64Character: ['输入包含当前 Base64 字母表不允许的字符。', 'The input contains characters outside the selected Base64 alphabet.'],
  base64Padding: ['Base64 补齐无效，请检查末尾 = 的数量和位置。', 'Invalid Base64 padding. Check the number and position of the trailing = signs.'],
  base64Length: ['Base64 长度无效，请检查是否缺少字符。', 'Invalid Base64 length. Check for missing characters.'],
  base64Bits: ['Base64 尾部包含非零的补位比特。', 'The final Base64 character contains nonzero padding bits.'],
  base64Utf8: ['Base64 内容不是有效的 UTF-8 文本。', 'The Base64 data is not valid UTF-8 text.'],
  resource: ['文本超出当前设备的处理能力，请尝试缩短输入。', 'The text exceeds this device’s processing capacity. Try a shorter input.'],
  worker: ['无法在后台转换这段文本，请重试或缩短输入。', 'Background conversion failed. Retry or try a shorter input.'],
  timeout: ['转换超时，请尝试缩短输入。', 'Conversion timed out. Try a shorter input.'],
} satisfies Record<ProcessingIssue, [string, string]>;

export function codecIssue(locale: Locale, issue: ProcessingIssue) {
  return tr(locale, ...messages[issue]);
}
