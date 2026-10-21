// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  intakeBudget,
  planIntake,
  sortedFolderFiles,
} from '../src/tools/image-converter/intake';
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
  it('counts existing and incoming files, partially accepting at the 20-file boundary', () => {
    const existing = Array.from({ length: 19 }, () => ({ file: file() }));
    const result = planIntake(
      [file('a.png'), file('b.png'), file('skip.txt')],
      existing,
    );
    expect(result.accepted.map((value) => value.name)).toEqual(['a.png']);
    expect(result.summary.rejected).toEqual({
      count: 1,
      type: 1,
      size: 0,
      total: 0,
    });
    expect(
      planIntake([file()], [...existing, { file: file() }]).accepted,
    ).toEqual([]);
  });
  it('enforces 100 MiB including existing and current imports, continuing past files that do not fit', () => {
    const result = planIntake(
      [
        file('large.png', 2 * mib),
        file('fits.png', mib),
        file('another.png', 1),
      ],
      Array.from({ length: 5 }, (_, index) => ({
        file: file('existing.png', (index === 4 ? 19 : 20) * mib),
      })),
    );
    expect(result.accepted.map((value) => value.name)).toEqual(['fits.png']);
    expect(result.summary.rejected.total).toBe(2);
    expect(intakeBudget.bytes).toBe(100 * mib);
  });
  it('skips unsupported types and oversize files before they reserve capacity', () => {
    const files = [
      file('skip.gif'),
      file('big.webp', 20 * mib + 1),
      file('exact.jpg', 20 * mib),
    ];
    const result = planIntake(files, []);
    expect(result.accepted).toEqual([files[2]]);
    expect(result.summary.rejected).toEqual({
      type: 1,
      size: 1,
      count: 0,
      total: 0,
    });
  });
  it('sorts nested relative paths deterministically, preserving duplicates and original File references', () => {
    const a = file('same.png', 1, 'folder/a/same.png');
    const b = file('same.png', 1, 'folder/b/deeper/same.png');
    const c = file('same.png', 1, 'folder/a/same.png');
    expect(sortedFolderFiles([b, a, c])).toEqual([a, c, b]);
    expect(a.webkitRelativePath).toBe('folder/a/same.png');
  });
});
