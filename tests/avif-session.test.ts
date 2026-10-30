// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ConverterSession, type ConverterServices } from '../src/tools/image-converter/session';
import { desktopImageLimits } from '../src/tools/image/limits';
import { recommendations, sameSettings } from '../src/tools/image-converter/presets';
const caps = { png: { supported: true }, jpeg: { supported: true }, webp: { supported: true }, avif: { supported: true } };
function setup() {
  const accept: ConverterServices['accept'] = async file => ({ file, blob: file, width: 10, height: 10, info: { format: 'avif', width: 10, height: 10, orientation: 1 } });
  const encode = vi.fn<ConverterServices['encode']>(async () => new Blob(['encoded']));
  const quick = vi.fn<ConverterServices['quick']>();
  const capabilities = vi.fn<ConverterServices['capabilities']>(async () => caps);
  const session = new ConverterSession(() => {}, { accept, encode, quick, capabilities }, desktopImageLimits);
  session.start(); return { session, encode, quick, capabilities };
}
const settled = (session: ConverterSession) => vi.waitFor(() => expect(session.snapshot.checkingCapabilities).toBe(false));
describe('AVIF settings and result qualification', () => {
  it('freezes Q55/S6 policy, includes 444 in equality and preserves native recommendations', () => {
    expect(recommendations.avif.settings).toMatchObject({ quality: 55, avif444: false });
    expect(sameSettings(recommendations.avif.settings, { ...recommendations.avif.settings, avif444: true })).toBe(false);
    expect(recommendations.webp.settings.quality).toBe(85); expect(recommendations.jpeg.settings.quality).toBe(88);
  });
  it('re-encodes AVIF same-format Quick; naming does not encode and 444 invalidates output', async () => {
    const { session, encode, quick } = setup(); await settled(session); session.format('avif');
    session.add([new File(['avif'], 'art.avif')]);
    await vi.waitFor(() => expect(session.snapshot.tasks[0].status).toBe('ready'));
    expect(quick).not.toHaveBeenCalled(); expect(encode).toHaveBeenCalledOnce();
    expect(session.download()?.kind).toBe('encoded'); expect(session.filename().name).toMatch(/\.avif$/);
    session.mode('advanced'); session.label('作品'); expect(encode).toHaveBeenCalledOnce();
    session.settings({ ...session.snapshot.controls.settings, avif444: true }); expect(session.download()).toBeUndefined();
    expect(session.snapshot.tasks[0].status).toBe('stale'); expect(encode).toHaveBeenCalledOnce();
    session.generateAll(); await vi.waitFor(() => expect(encode).toHaveBeenCalledTimes(2)); session.dispose();
  });
  it('capability retries never replace a user-selected AVIF with PNG', async () => {
    const { session, capabilities } = setup(); await settled(session); session.format('avif');
    capabilities.mockResolvedValue({ ...caps, avif: { supported: false } }); session.retryCapabilities(); await settled(session);
    expect(session.snapshot.controls.settings.format).toBe('avif'); session.dispose();
  });
  it('budgets the entire AVIF task at 30s without releasing a pending native operation early', async () => {
    vi.useFakeTimers();
    const { session, encode } = setup();
    try {
      await vi.advanceTimersByTimeAsync(0);
      session.format('avif');
      let finish!: () => void, aborted = false;
      encode.mockImplementationOnce((_source, _settings, _resources, _limits, operation) => new Promise(resolve => {
        finish = () => resolve(new Blob(['late']));
        operation!.signal!.addEventListener('abort', () => { aborted = true; });
      }));
      session.add([new File(['a'], 'a.avif'), new File(['b'], 'b.avif')]);
      await vi.advanceTimersByTimeAsync(0);
      expect(encode).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(30000);
      expect(session.snapshot.tasks[0].error).toBe('avifTimeout');
      expect(aborted).toBe(true); expect(encode).toHaveBeenCalledOnce();
      expect(session.download(session.snapshot.tasks[0].id)).toBeUndefined();
      finish(); await vi.advanceTimersByTimeAsync(0);
      expect(encode).toHaveBeenCalledTimes(2);
      expect(session.snapshot.tasks[0].status).toBe('error');
      expect(session.snapshot.tasks[1].status).toBe('ready');
      expect(session.jobs.maxActive).toBe(1);
    } finally { session.dispose(); vi.useRealTimers(); }
  });
});
