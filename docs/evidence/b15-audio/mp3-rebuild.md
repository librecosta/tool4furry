# Rebuild or replace the Tool4Furry MP3 encoder

This kit contains the complete, unmodified LAME 3.100 source archive, the corresponding Mediabunny MP3 Worker sources and C bridge, their license files, and a build script. The native LAME library is statically linked into the WebAssembly module. The JavaScript Worker can be replaced independently of the Tool4Furry and Mediabunny application bundles.

## Rebuild

Extract this kit with `tar -xzf mp3-encoder-rebuild.tar.gz` and run one of the following from the extracted directory.

- With a Linux shell, Node.js/npm, GNU Make and Emscripten 4.0.21 already on the path, run `bash rebuild-mp3.sh`.
- With Docker, use the pinned Emscripten image. In a POSIX shell, run:

  ```sh
  docker run --rm --mount "type=bind,source=$PWD,destination=/work" -w /work \
    emscripten/emsdk:4.0.21@sha256:631841e7ee7a808bc2735a4f26aff3c1354119764df8459c38abfe2d0923dffb \
    bash ./rebuild-mp3.sh
  ```

  In PowerShell, use `$((Get-Location).Path)` in place of `$PWD` in the bind mount if needed.

The script checks the input archive, builds a fresh LAME static library with the legacy decoder and command-line frontend disabled, compiles the unmodified C bridge, and bundles the Worker with esbuild 0.25.1 from npm. It writes `mediabunny-mp3-encoder.worker.js` and the Emscripten glue module `lame.js` to the kit directory. To build modified LAME, repack your edited `lame-3.100/` directory as `lame-3.100.tar.gz` and set the script's expected source hash to the new archive's SHA-256. Keep the encoder Worker protocol and the bridge API compatible.

To relink using the exact native objects from the pinned Mediabunny source tree, run `RELINK_UPSTREAM_OBJECTS=1 bash rebuild-mp3.sh`, or pass `-e RELINK_UPSTREAM_OBJECTS=1` before the Docker image name. This path reproduces the published WASM hash. Building the native library from source is the default for rebuilding with your own changes.

## Use the rebuilt Worker

1. Build a local Tool4Furry checkout with `pnpm install --frozen-lockfile` and `pnpm build:cn` or `pnpm build:global`.
2. In the corresponding `dist/cn/_astro` or `dist/global/_astro`, find the existing `mediabunny-mp3-encoder.worker-*.js` file. Replace its contents with your generated `mediabunny-mp3-encoder.worker.js`, keeping the emitted filename. Use a fresh browser context or clear the local asset cache after replacing it.
3. Serve the build directory over local HTTP, open `/tools/audio-trimmer/`, and export an MP3. The Media Worker explicitly selects this sibling Worker via the upstream Worker URL hook. No change to the application bundle or its import paths is necessary. For a deployment enforcing CSP, the Audio Worker and codec Worker need same-origin Worker loading and WebAssembly compilation. See the publication contract for the policy lines verified locally.

To rebuild the entire Mediabunny JavaScript package, follow the upstream build guide using the pinned source tree below. The official same-origin Worker switch and local replacement step also work with a Worker rebuilt by that full package process.

## Source and rights

- [Mediabunny 1.66.3 corresponding source and build guide](https://github.com/Vanilagy/mediabunny/tree/d1bc613f0e0c563ef39e728d7e93db3179a5ad40/packages/mp3-encoder)
- [LAME 3.100 upstream archive](https://sourceforge.net/projects/lame/files/lame/3.100/lame-3.100.tar.gz/download), SHA-256 `ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e`
- [LAME license information](https://lame.sourceforge.io/license.txt). LAME is offered under GNU LGPL v2 or later. Its license and required notices are included with the archive and in `upstream/licenses/lame/`.
- [Tool4Furry source](https://github.com/librecosta/tool4furry), BSD-3-Clause. The license terms permit modification for your own use and reverse engineering for debugging those modifications to the LGPL-covered components. The supplied script and standalone Worker support exercising those rights locally.
