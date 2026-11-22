import type { Locale } from '../../i18n/locale';
import { tr } from '../general/ui';
import type { JsonIssue } from './core';
import { JsonWorkerError } from './processing';

const messages: Record<JsonIssue['code'], readonly [string, string]> = {
  empty: ['请输入 JSON。', 'Enter some JSON.'],
  comment: ['JSON 不允许注释。', 'JSON comments are not allowed.'],
  trailingComma: ['末尾不能有多余逗号。', 'Remove the trailing comma.'],
  expectedKey: ['对象字段名必须使用双引号。', 'Use a double-quoted object key.'],
  expectedColon: ['字段名后缺少冒号。', 'Add a colon after the property name.'],
  expectedComma: ['相邻项之间缺少逗号。', 'Add a comma between items.'],
  expectedValue: ['此处需要一个 JSON 值。', 'A JSON value is required here.'],
  unclosedString: ['字符串未闭合。', 'Close the string with a double quote.'],
  invalidEscape: ['字符串包含无效的转义。', 'This string contains an invalid escape.'],
  controlCharacter: ['字符串中的控制字符必须转义。', 'Escape control characters inside the string.'],
  invalidUnicode: ['字符串包含不完整的 Unicode 字符。', 'This string contains an incomplete Unicode character.'],
  invalidNumber: ['数字格式无效。', 'This number has an invalid format.'],
  unclosedObject: ['对象未闭合。', 'Close the object with a brace.'],
  unclosedArray: ['数组未闭合。', 'Close the array with a bracket.'],
  extraContent: ['顶层 JSON 值后存在多余内容。', 'Remove extra content after the root value.'],
  inputLimit: ['输入不能超过 16,777,216 个 UTF-16 代码单元。', 'Input must be at most 16,777,216 UTF-16 code units.'],
  nodeLimit: ['JSON 超过 50 万个值，无法建立结构索引。', 'This JSON exceeds 500,000 values and cannot be indexed.'],
  outputLimit: ['格式化结果超过内存预算，请尝试压缩。', 'Formatted output exceeds the memory budget. Try Minify.'],
  resource: ['设备资源不足，无法处理此 JSON。', 'This device could not process the JSON with its available resources.'],
};

export function issueMessage(locale: Locale, issue: JsonIssue) {
  return tr(locale, ...messages[issue.code]);
}

export function workerMessage(locale: Locale, error: unknown) {
  if (error instanceof JsonWorkerError && error.code === 'unavailable')
    return tr(locale, '此浏览器不支持后台 JSON 处理。', 'This browser does not support background JSON processing.');
  if (error instanceof JsonWorkerError && error.code === 'timeout')
    return tr(locale, 'JSON 处理超时，请缩小输入范围。', 'JSON processing timed out. Try a smaller input.');
  return tr(locale, '后台 JSON 处理失败，请重试。', 'Background JSON processing failed. Try again.');
}
