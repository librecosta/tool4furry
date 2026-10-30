# Restricted AVIF fixtures

Self-authored synthetic images only; no personal metadata or third-party artwork.

- `encoder-sdr.avif`: C2-A's 160×256 Canvas sRGB sample, jSquash 2.1.1 Q55/S6/420. Raw encoder output leaves nclx primaries/transfer unspecified; only the known-Canvas output qualification path may declare them as sRGB.
- `encoder-alpha.avif`: C2-A's 1024² synthetic transparency sample, Q55/S6/420/Alpha100. Same raw color signaling.
- `private.avif`: Pillow 12.3.0/libavif, 256×160 synthetic C2-B source, test EXIF/GPS/XMP, Orientation 1. Known synthetic sRGB nclx was explicitly set to 1/13 for the supported-input fixture.
- `rotated.avif`: same synthetic source with orientation 6; Pillow stores rotation as irot and removes the EXIF orientation. Tests require one native application of the transform, never a second Canvas rotation.
- `animated.avif`: two synthetic frames encoded by Pillow; must be rejected before decoding a first-frame substitute.

These fixtures cover a restricted static 8-bit SDR subset, not general HEIF, HDR, ICC AVIF, grids or animation. Test mutations cover bounded lengths, unsupported properties/color/depth, AV1 sequence and item extents. Native decode and independent Pillow comparisons are recorded separately; unit parsing alone is not decode evidence.
