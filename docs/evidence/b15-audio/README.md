# B15-D1 Audio Trimmer validation

## Chromium workspace

Chromium 156.0.8078.4 ran on Windows. The browser opened the CN Chinese page in Dark at 1280 px and the Global English page in Light at a 390 px emulated touch viewport. Both used a generated 4-minute, 32-second MP3. The test moved a real selection handle, zoomed to freshly decoded detail, sought into a removed interval, looped retained audio, switched modes, edited precise time and fades, downloaded output, and replaced the file. Neither viewport showed page-level horizontal overflow. A separate Light capture uses the 848 px reference width.

- [CN Dark, 1280 px](cn-dark-1280.png)
- [Global Light, 390 px emulated touch](global-light-390.png)
- [Light, 848 px reference width](light-848-reference.png)
- [Browser measurements and independent output probes](chromium.json)

## Local processing and performance

| Generated input | File size | File selection to complete waveform | Tail (3 s) WAV export |
| --- | ---: | ---: | ---: |
| 04:32.857 MP3, 48 kHz stereo | 6.25 MiB | 3.141 s | — |
| 30:00.021 MP3, 44.1 kHz mono | 20.60 MiB | 9.993 s | 0.696 s |
| 02:00:00.000 WAV, 16 kHz mono | 219.73 MiB | 4.282 s | 0.597 s |
| 46:36.000 WAV, 48 kHz stereo | 511.96 MiB | 10.819 s | 0.726 s |

The first decoded peaks arrived 0.191–0.426 s after the Worker started analysis on these files. The Window's sampled JS heap after overview generation was approximately 68 MiB on both large WAV files. This measurement covers the window's JS heap alone. Worker heap, native decoder buffers, and total process peak are outside that measurement.

The large-output case wrote a 27-minute PCM16 stereo WAV of 311,040,044 bytes in 16.434 s. The test supplied an actual Chromium origin-private filesystem handle in place of the platform chooser, then read the RIFF header and compared the declared length with the stored file size. A separate export was canceled and produced no download. Generated inputs and downloaded audio stay in the ignored local evidence directory.

## Export checks

Actual browser downloads for a 1.999 s, 48 kHz stereo selection were inspected with ffprobe build 2296078397. The measured durations of lossy containers include encoder delay or padding.

| File | Independently detected codec | Measured duration |
| --- | --- | ---: |
| MP3, 192 kbps (DEV) | MP3 | 2.040000 s |
| WAV | Signed little-endian PCM16 | 1.999000 s |
| FLAC | FLAC, 24-bit | 1.999000 s |
| M4A | AAC | 2.005333 s |
| OGG | Opus | 2.020000 s |

FFmpeg also read all 192,000 stereo frames of a four-second Remove-mode WAV. An independent calculation checked all 384,000 sample values, both retained spans in order, and the 6,000-frame fade-in and 12,000-frame fade-out. Every value matched within one 16-bit quantization step. A browser run with same-origin Worker and explicitly permitted WASM compilation also exported FLAC from the packaged encoder Worker. The test observed no external HTTP requests.

## Distribution boundary

The [tool NOTICE](../../../src/tools/audio-trimmer/audio-trimmer.NOTICE.txt) includes the complete license texts and exact package/source references for Mediabunny, its extensions and WaveSurfer. The local MP3 test used the upstream LAME WASM. The wrapper, build script and prebuilt native library were identified, but the exact corresponding LAME source, reproducible build inputs and a working replacement or relink have yet to be verified. MP3 stays gated to DEV. This audit remains a blocker for distributing MP3 in B15-D2. [Pinned upstream encoder source](https://github.com/Vanilagy/mediabunny/tree/d1bc613f0e0c563ef39e728d7e93db3179a5ad40/packages/mp3-encoder).

Audio Trimmer retains its Draft status. The CN and Global build guards exclude the tool's route, private media dependencies, Worker, WASM and notice. Firefox, Safari/WebKit, physical phones, the native save dialog and aggregate Worker/native peak memory remain unverified.
