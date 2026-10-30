# Privacy fixtures

Self-authored C2-A 256×160 quadrants, Pillow 12.3.0; no real personal data or third-party artwork. `C2A_TEST_*` fields and GPS 1°2′3″N / 4°5′6″E are deliberately fictional canaries. Covered by the repository license; never production assets.

- `private.jpg`: baseline, Orientation=6, EXIF camera/time/author/copyright/GPS, XMP, Photoshop APP13 IPTC, COM, generated sRGB ICC.
- `private.png`: Orientation=6, EXIF/GPS, tEXt/zTXt/iTXt/XMP and the same ICC.
- `private.webp`: Orientation=1, EXIF/GPS/XMP/ICCP. Derived from the C2-A normal-direction fixture.
- `alpha-lossy.webp` / `alpha-lossless.webp`: the same synthetic quadrants with an Alpha ramp, EXIF=1, XMP and ICC, encoded with Pillow quality 85 / lossless. Verify both ALPH+VP8 and VP8L.
- `palette.png`: 80×48 indexed pixels, palette and tRNS (0/128/255).

Tests derive all eight JPEG directions, progressive/multi-scan metadata, CRC/ICC/RIFF failures, unknown structures and a bounded inflate bomb in memory. No regeneration step, Python dependency or downloaded WASM is required by tests/builds.
