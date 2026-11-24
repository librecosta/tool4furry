# B15 Audio Trimmer validation

## B15-D1 Draft baseline

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

## B15-D2 production builds

D2 retains the D1 editing and chunked audio pipeline. The earlier sections record the Draft environment used by D1, including the OPFS substitute for the system file picker.

### MP3 distribution and replacement

The npm registry identifies `@mediabunny/mp3-encoder@1.66.3` as commit `d1bc613f0e0c563ef39e728d7e93db3179a5ad40`. The npm archive's integrity value matches `pnpm-lock.yaml`. The bundled `encode.worker.ts`, `shared.ts` and C bridge matched their Git blobs at that revision. The LAME 3.100 archive matched the upstream source checksum and the bundled LAME header matched the header in that archive. The native library is statically linked inside the Worker WASM. The upstream configuration disables the legacy decoder and command-line frontend.

| Artifact | SHA-256 |
| --- | --- |
| Unmodified LAME 3.100 source archive | `ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e` |
| Upstream LAME static object archive | `c4069fb06a840d0f23656d018e0bc81baf143d5b5de46b18cf2cf7a80534b9fd` |
| Installed and relinked standalone MP3 Worker | `29e83e875dd8c64d0557363952a75c51054014a42612101f324a2a2cf9127d38` |
| Installed and relinked MP3 WASM | `8cdb32adfc0fbf02bf530e1510c26d8f461d00ab763b76aa04e9df8db8563f6f` |
| Standalone MP3 Worker rebuilt entirely from source | `74f7480748a50993f64ee9e7da2c9e345098d857608f88f6025ed9a445b22fea` |
| MP3 WASM rebuilt entirely from source | `47318db82f181791cacc067552d8469c240bf991b7034a54642b4a56b1cc8245` |
| Installed FLAC WASM | `0f1275da2fa046d33d4e3cabeea7054b418c4f7faa699404e8a3658158f87357` |

The rebuild used Linux Emscripten 4.0.21 at compiler revision `d6f42310010ddec0753a69bab01a4b33aae255b7` and esbuild 0.25.1. Relinking the exact upstream object archive reproduced the npm Worker and embedded WASM byte-for-byte. Compiling LAME itself from the checked source archive generated a different, valid WASM binary with the same exports. The separate case using this binary verifies actual local replacement of the served Worker.

The workbench ships the full [NOTICE](../../../src/tools/audio-trimmer/audio-trimmer.NOTICE.txt) and a same-origin [rebuild kit](../../../src/tools/audio-trimmer/licenses/mp3-encoder-rebuild.tar.gz). The kit contains complete LAME source, the original objects, the corresponding Bridge and Worker source, license files, and [rebuild and local replacement steps](mp3-rebuild.md). The application and library bundle remain usable with the replacement by using the upstream Worker URL hook. The libFLAC source and bridge are pinned in the NOTICE. No third-party source file was modified for distribution.

### Official build interaction and downloads

Chromium 156 on Windows opened the CN Chinese build in Dark at 1280 px and the Global English build in Light at a 390 px emulated touch viewport. Both builds imported a 4:32.857 MP3 and supported dragging the real region handle, zooming to newly decoded waveform detail, auditioning the retained segments, pausing, looping, switching Keep and Remove, editing millisecond time and fades, and replacing the source. Neither viewport overflowed horizontally. Each build defaulted to MP3 at 192 kbps.

- [CN Dark, 1280 px](d2-cn-dark-1280.png)
- [Global Light, 390 px emulated touch](d2-global-light-390.png)
- [Browser observations, MIME checks, and ffprobe metadata](d2-chromium.json)

Both builds downloaded the following from the same 1.999 s selection with 48 kHz stereo input. ffprobe independently confirmed the container, codec, sample rate, channels and duration. Lossy container durations include encoder delay or padding.

| Output | Independently detected codec | Duration |
| --- | --- | ---: |
| MP3, 192 kbps | MP3 | 2.040000 s |
| WAV | PCM16 LE | 1.999000 s |
| FLAC | FLAC, 24-bit | 1.999000 s |
| M4A | AAC | 2.005333 s |
| OGG | Opus | 2.020000 s |

The CN build also opened a two-hour, 230,400,078-byte mono WAV at 16 kHz, downloaded its final three seconds and canceled a separate 27-minute MP3 export without a download. D1's near-512 MiB sample, PCM comparison across all 384,000 samples and OPFS direct-write verification cover unchanged code paths. Aggregate browser memory and the operating system save dialog remain unmeasured.

### Worker, CSP, and publication

Both static builds were served over local HTTP with `worker-src 'self'`. The document used hashes for its inline scripts. The media and codec Worker responses used `script-src 'self' 'wasm-unsafe-eval'` for compilation and the capability check. The browser recorded no CSP violations in the normal cases and made no external requests. MP3 and FLAC assets were first requested on export. A fresh Global session with WASM compilation forbidden in the media Worker disabled MP3 and FLAC and downloaded PCM16 WAV. A separate CN build copy loaded the Worker rebuilt entirely from LAME source and downloaded a valid 192 kbps MP3.

Both regional guards confirmed 42 tool detail pages, the four localized Audio Trimmer pages and their static discovery metadata, and on-demand delivery of tool CSS, media Worker, codec Workers, and license files. The eight remaining Draft tools, QR experiments, DEV Lab, and fixture assets stayed outside the public resource graph.

Firefox, Safari/WebKit, physical mobile devices, the native save dialog, aggregate browser peak memory, and the hosting providers' actual response headers remain outside this run. This is source publication eligibility.
