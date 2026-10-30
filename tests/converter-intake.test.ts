// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  planIntake,
  sortedFolderFiles,
} from '../src/tools/image-converter/intake';
import {
  desktopImageLimits,
  mobileImageLimits,
} from '../src/tools/image/limits';
const mib = 1024 ** 2;
const file = (name = 'image.png', size = 1, path = '') => {
  const value = new File(['x'], name);
  Object.defineProperties(value, {
    size: { value: size },
    webkitRelativePath: { value: path },
  });
  return value;
};
describe('bounded image intake (metadata only)', () => {
  it('accepts the four intended formats without admitting additional image types', () => {
    const result = planIntake(['a.png', 'b.jpg', 'c.webp', 'd.avif', 'e.gif', 'f.bmp', 'g.heic', 'h.svg'].map(name => file(name)), []);
    expect(result.accepted.map(value => value.name)).toEqual(['a.png', 'b.jpg', 'c.webp', 'd.avif']);
    expect(result.summary.rejected.type).toBe(4);
  });
  it.each([desktopImageLimits, mobileImageLimits])(
    'partially accepts at the $files-file boundary, counting existing tasks',
    (limits) => {
      const existing = Array.from({ length: limits.files - 1 }, () => ({
        file: file(),
      }));
      const result = planIntake(
        [file('a.png'), file('b.png'), file('skip.txt')],
        existing,
        limits,
      );
      expect(result.accepted.map((value) => value.name)).toEqual(['a.png']);
      expect(result.summary.rejected).toEqual({
        count: 1,
        type: 1,
        size: 0,
        total: 0,
      });
      expect(
        planIntake([file()], [...existing, { file: file() }], limits).accepted,
      ).toEqual([]);
    },
  );
  it.each([desktopImageLimits, mobileImageLimits])(
    'enforces $totalBytes bytes across existing and current imports',
    (limits) => {
      const result = planIntake(
        [
          file('large.png', 2 * mib),
          file('fits.png', mib),
          file('another.png', 1),
        ],
        Array.from({ length: 5 }, (_, index) => ({
          file: file(
            'existing.png',
            index === 4 ? limits.totalBytes - 4 * 10 * mib - mib : 10 * mib,
          ),
        })),
        limits,
      );
      expect(result.accepted.map((value) => value.name)).toEqual(['fits.png']);
      expect(result.summary.rejected.total).toBe(2);
    },
  );
  it.each([desktopImageLimits, mobileImageLimits])(
    'skips unsupported/oversize files without reserving capacity ($files)',
    (limits) => {
      const files = [
        file('skip.gif'),
        file('big.webp', limits.bytes + 1),
        file('exact.jpg', limits.bytes),
      ];
      const result = planIntake(files, [], limits);
      expect(result.accepted).toEqual([files[2]]);
      expect(result.summary.rejected).toEqual({
        type: 1,
        size: 1,
        count: 0,
        total: 0,
      });
    },
  );
  it('sorts nested relative paths deterministically, preserving duplicates and original File references', () => {
    const a = file('same.png', 1, 'folder/a/same.png');
    const b = file('same.png', 1, 'folder/b/deeper/same.png');
    const c = file('same.png', 1, 'folder/a/same.png');
    expect(sortedFolderFiles([b, a, c])).toEqual([a, c, b]);
    expect(a.webkitRelativePath).toBe('folder/a/same.png');
  });
});
