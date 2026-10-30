// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { ConverterSession } from '../src/tools/image-converter/session';
import { acceptImage, encodeImage, prepareQuickOutput, orientedSize } from '../src/tools/image/browser-codec';
import { inspectImage } from '../src/tools/image/inspect-image';
import { deliverySnapshot, deliveryState } from '../src/tools/image-converter/delivery';
import { packZip } from '../src/tools/image-converter/zip';

describe('privacy-qualified Session delivery (real containers; decoding boundary stubbed)', () => {
  it('packages only sanitized current results, keeps names out of encoding, and revokes old policy eligibility', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async (blob: Blob) => ({ ...orientedSize(await inspectImage(blob)), close() {} })));
    const source = await readFile(new URL('./fixtures/images/metadata/private.png', import.meta.url));
    const session = new ConverterSession(() => {}, {
      accept: acceptImage, encode: encodeImage, quick: prepareQuickOutput,
      capabilities: async () => ({ png: { supported: true }, jpeg: { supported: true }, webp: { supported: true } }),
    });
    session.start(); await vi.waitFor(() => expect(session.snapshot.checkingCapabilities).toBe(false));
    session.format('png');
    session.add([new File([source], '同名.png'), new File([source], '同名.png')]);
    await vi.waitFor(() => expect(session.snapshot.tasks.every(t => t.status === 'ready')).toBe(true));
    const originals = session.snapshot.tasks.map(t => t.source!.blob);
    const results = session.snapshot.tasks.map(t => session.download(t.id)!);
    expect(results.every(r => r.kind === 'cleaned' && r.metadataPolicy === 'privacy-v1')).toBe(true);
    session.mode('advanced'); session.label('作品');
    expect(session.snapshot.tasks.map(t => session.download(t.id)!.blob)).toEqual(results.map(r => r.blob));
    const snapshot = deliverySnapshot(session)!;
    const zip = await packZip(snapshot.entries, new AbortController().signal);
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files)).toEqual(snapshot.entries.map(e => e.name));
    for (let i = 0; i < results.length; i++) {
      expect(files[snapshot.entries[i].name]).toEqual(new Uint8Array(await results[i].blob.arrayBuffer()));
      expect(Buffer.from(files[snapshot.entries[i].name]).includes(Buffer.from('C2A_TEST_'))).toBe(false);
      expect(Buffer.from(await originals[i].arrayBuffer()).equals(source)).toBe(true);
    }
    Object.assign(results[0], { metadataPolicy: 'unverified' });
    expect(session.download(session.snapshot.tasks[0].id)).toBeUndefined();
    expect(deliveryState(session).entries).toHaveLength(1);
    session.remove(); expect(snapshot.current()).toBe(false);
    session.dispose();
    expect(session.resources.bitmapsClosed).toBe(session.resources.bitmapsCreated);
  });
});
