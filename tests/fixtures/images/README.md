# Synthetic image fixtures

Generated for this repository by `scripts/generate-image-fixtures.py` with Pillow 12.3.0, not copied from private projects. Covered by the repository's BSD-3-Clause license. Regeneration is optional and is never run by install/build/CI.

- `transparent.png`: 80×48 RGBA quadrants, including alpha 128 and 0.
- `static.jpg`, `progressive.jpg`, `static.webp`: real encoded variants.
- `orientation-1..8.jpg`: TIFF EXIF orientation values, including mirrors.
- `animated.png` / `animated.webp`: two real frames; must be rejected.
- `wrong-extension.jpg`: PNG bytes under a JPEG filename.
- `text-marker.png`: animation-looking text inside a normal tEXt chunk.
- `truncated.png`, `empty.png`, `unsupported.gif`, `over-*.png`: rejection cases. The GIF stub and oversized headers are not decode-success samples.

Run `python scripts/generate-image-fixtures.py --large` in a Python environment with Pillow to also create deterministic 16MP noise JPEG and solid/long-edge images outside the repository under `../.validation/converter-v04b/samples`. Do not copy those large files into production or git.

The optional photographic browser sample is separately attributed in the [historical implementation record](../../../docs/history/image-converter-v0.4-v0.6.md#b4--真实证据与限制); it is not stored here.
