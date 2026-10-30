// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ConverterSession, type ConverterServices } from '../src/tools/image-converter/session';
import { recommendations, sameSettings, validSettings } from '../src/tools/image-converter/presets';
import { ImageFailure } from '../src/tools/image/types';
import { deliverySnapshot, deliveryState } from '../src/tools/image-converter/delivery';

function setup() {
  const encode = vi.fn<ConverterServices['encode']>(async (source, settings) => {
    if (settings.preserveAuthorship && source.info.format !== 'jpeg') throw new ImageFailure('metadataSource');
    return new Blob(['encoded']);
  });
  const quick = vi.fn<ConverterServices['quick']>(async source => ({ blob: source.blob, info: source.info, changed: false, metadataPolicy: 'privacy-v1', kind: 'passthrough' }));
  const session = new ConverterSession(() => {}, {
    accept: async file => ({ file, blob: file, width: 2, height: 2, info: { format: file.name.endsWith('.jpg') ? 'jpeg' : 'png', width: 2, height: 2, orientation: 1 } }),
    encode, quick, capabilities: async () => ({ png: { supported: true }, jpeg: { supported: true }, webp: { supported: true }, avif: { supported: true } }),
  }); session.start(); return { session, encode, quick };
}
const done = (s: ConverterSession) => vi.waitFor(() => expect(s.snapshot.tasks.every(t => ['ready', 'error'].includes(t.status))).toBe(true));

describe('effective metadata strategy is part of the result/version contract', () => {
  it('includes policy in equality/validation and all recommended presets turn it off', () => {
    for (const preset of Object.values(recommendations)) {
      expect(preset.settings.preserveAuthorship).not.toBe(true);
      expect(sameSettings(preset.settings, { ...preset.settings, preserveAuthorship: true })).toBe(false);
    }
    expect(validSettings({ ...recommendations.avif.settings, preserveAuthorship: true })).toBe(false);
  });
  it('isolates unsupported sources, qualifies downloads/ZIP, and restores privacy automatically in Quick', async () => {
    const { session, encode, quick } = setup();
    await vi.waitFor(() => expect(session.snapshot.checkingCapabilities).toBe(false));
    session.mode('advanced'); session.format('jpeg');
    session.add([new File(['a'], 'a.jpg'), new File(['b'], 'b.png')]);
    await vi.waitFor(() => expect(session.snapshot.tasks.every(t => t.source)).toBe(true));
    session.settings({ ...session.snapshot.controls.settings, quality: 77, preserveAuthorship: true });
    session.generateAll(); await done(session);
    expect(session.snapshot.tasks.map(t => t.status)).toEqual(['ready', 'error']);
    expect(session.snapshot.tasks[1].error).toBe('metadataSource');
    expect(session.download()?.metadataPolicy).toBe('author-rights-v1'); expect(quick).not.toHaveBeenCalled();
    expect(encode.mock.calls[0][1].quality).toBe(77);
    const snapshot = deliverySnapshot(session)!; expect(snapshot.entries).toHaveLength(1);
    session.label('label'); expect(encode).toHaveBeenCalledTimes(2);
    session.mode('quick'); expect(session.download()).toBeUndefined(); expect(snapshot.current()).toBe(false);
    await done(session);
    expect(session.snapshot.tasks.every(t => session.download(t.id)?.metadataPolicy === 'privacy-v1')).toBe(true);
    expect(session.snapshot.controls.settings.quality).toBe(77);
    session.mode('advanced'); expect(session.snapshot.controls.settings.preserveAuthorship).toBe(true);
    expect(deliveryState(session).entries).toHaveLength(0); // old privacy result cannot satisfy preservation
    session.restore(); expect(session.snapshot.controls.settings.preserveAuthorship).not.toBe(true);
    session.generateAll(); await done(session); const calls = encode.mock.calls.length;
    session.mode('quick'); session.mode('advanced'); expect(encode).toHaveBeenCalledTimes(calls);
    session.dispose();
  });
  it('ignores late results after a policy change and keeps per-format preservation preferences', async () => {
    const { session, encode } = setup(); await vi.waitFor(() => expect(session.snapshot.checkingCapabilities).toBe(false));
    session.mode('advanced'); session.add([new File(['a'], 'a.jpg')]);
    await vi.waitFor(() => expect(session.snapshot.tasks[0].source).toBeDefined());
    let finish!: (b: Blob) => void;
    encode.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    session.generateAll(); await vi.waitFor(() => expect(encode).toHaveBeenCalledOnce());
    session.settings({ ...session.snapshot.controls.settings, preserveAuthorship: true });
    finish(new Blob(['obsolete'])); await vi.waitFor(() => expect(session.jobs.active).toBe(false));
    expect(session.download()).toBeUndefined();
    session.format('avif'); expect(session.snapshot.controls.settings.preserveAuthorship).not.toBe(true);
    session.format('webp'); expect(session.snapshot.controls.settings.preserveAuthorship).toBe(true);
    session.dispose();
  });
});
