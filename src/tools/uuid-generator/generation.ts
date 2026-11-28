import { MAX, NIL, parse, v1, v3, v5, v6 } from 'uuid';
import { fail } from '../general/bounds';
import { checkCount, decodeUuid, mapUuidBatch, randomUuid, uuidLimits, uuidLines, type GenerationVersion, type UuidBatch } from './core';
import { timeOrderedUuid } from './time-v7';

export const namespaces = {
  DNS: v5.DNS,
  URL: v5.URL,
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  'X.500': '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

export type GenerationSettings = {
  version: GenerationVersion;
  count: number;
  namespace: string;
  names: string;
  multiline: boolean;
};

export async function generateBatch(settings: GenerationSettings): Promise<UuidBatch> {
  const { version, count, namespace, names, multiline } = settings;
  if (version === 'nil' || version === 'max')
    return { version, values: [parse(version === 'nil' ? NIL : MAX)] };
  if (version === 'v3' || version === 'v5') {
    const ns = namespace.length <= 45 ? decodeUuid(namespace) : undefined;
    if (!ns) fail('请输入 128 位命名空间 UUID。', 'Enter a 128-bit namespace UUID.');
    const inputs = multiline ? uuidLines(names) : [names];
    if (!inputs.length) fail('请输入至少一个名称。', 'Enter at least one name.');
    const encoder = new TextEncoder();
    const encoded = inputs.map(name => {
      if (name.length > uuidLimits.nameBytes) failName();
      const bytes = encoder.encode(name);
      if (bytes.length > uuidLimits.nameBytes) failName();
      return bytes;
    });
    const hash = version === 'v3' ? v3 : v5;
    return { version, values: await mapUuidBatch(encoded, value => hash(value, ns, new Uint8Array(16))) };
  }
  checkCount(count);
  if (!globalThis.crypto?.getRandomValues)
    fail('浏览器不支持安全随机数。', 'Secure random numbers are unavailable.');
  const values = await mapUuidBatch(Array.from({ length: count }), () => {
    if (version === 'v4') return randomUuid();
    if (version === 'v7') return timeOrderedUuid();
    return (version === 'v1' ? v1 : v6)(undefined, new Uint8Array(16));
  });
  return { version, values };
}

function failName(): never {
  return fail('每个名称最多 4 KiB UTF-8。', 'Each name is limited to 4 KiB of UTF-8.');
}
