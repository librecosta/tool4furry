# Privacy fixtures

The original C2-A fixtures are self-authored 256×160 quadrants generated with Pillow 12.3.0; no real personal data or third-party artwork. `C2A_TEST_*` fields and GPS 1°2′3″N / 4°5′6″E are deliberately fictional canaries. Covered by the repository license; never production assets. The separate manual JPEG is described below.

- `private.jpg`: baseline, Orientation=6, EXIF camera/time/author/copyright/GPS, XMP, Photoshop APP13 IPTC, COM, generated sRGB ICC.
- `private.png`: Orientation=6, EXIF/GPS, tEXt/zTXt/iTXt/XMP and the same ICC.
- `private.webp`: Orientation=1, EXIF/GPS/XMP/ICCP. Derived from the C2-A normal-direction fixture.
- `alpha-lossy.webp` / `alpha-lossless.webp`: the same synthetic quadrants with an Alpha ramp, EXIF=1, XMP and ICC, encoded with Pillow quality 85 / lossless. Verify both ALPH+VP8 and VP8L.
- `palette.png`: 80×48 indexed pixels, palette and tRNS (0/128/255).

Tests derive all eight JPEG directions, progressive/multi-scan metadata, CRC/ICC/RIFF failures, unknown structures and a bounded inflate bomb in memory. No regeneration step, Python dependency or downloaded WASM is required by tests/builds.

## EXIF Metadata 手动验收 JPEG

文件：[`manual-exif.jpg`](manual-exif.jpg)，仓库路径为 `tests/fixtures/images/metadata/manual-exif.jpg`。这是本仓库生成的合成色块/方向标记图，EXIF 真实写入 JPEG APP1 中；设备、时间及坐标均为虚构测试值，不来自真实用户或相机。沿用仓库 BSD-3-Clause 许可，仅供本地验收，不放入 `public/`、不由站点源码导入。

| EXIF 字段 | 原始值 |
| --- | --- |
| `DateTimeOriginal` | `2020:01:02 03:04:05`（未附带时区） |
| `Make` | `Tool4Furry Fixture` |
| `Model` | `Synthetic Camera` |
| `Orientation` | `6`（顺时针旋转 90° 显示） |
| `GPSLatitude` / `GPSLatitudeRef` | `1, 2, 3` / `N`，即 1°2′3″N |
| `GPSLongitude` / `GPSLongitudeRef` | `4, 5, 6` / `E`，即 4°5′6″E |

1. 启动 `pnpm dev`，打开 CN `http://127.0.0.1:4321/tools/exif-metadata/` 或 Global `http://127.0.0.1:4322/tools/exif-metadata/`，选择或拖入此 JPEG。检查拍摄时间、设备品牌/型号、方向及 GPS 字段；拍摄时间和 GPS 应带隐私标记。
2. 点击「清理元数据 / Remove metadata」，检查清理后设备、时间和 GPS 均显示「已移除 / Removed」。**方向 6 应保留**，这是避免图片侧倒所需的显示信息。原始像素为 640×400，按方向显示为 400×640；预览中 `TOP / UPRIGHT` 应始终位于上方。
3. 下载清理后的 JPEG，再导入该下载文件：应只剩方向字段，图片仍可正常预览，构图和画质不变。保留原始示例重新导入时，全部示例字段应仍存在。
