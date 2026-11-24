#!/usr/bin/env bash
# Rebuild the standalone @mediabunny/mp3-encoder 1.66.3 Worker.
set -euo pipefail
cd -- "$(dirname -- "$0")"

expected_source=ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e
printf '%s  %s\n' "$expected_source" lame-3.100.tar.gz | sha256sum --check -
emcc --version | grep -F ' 4.0.21 '

# Build in a fresh directory so old objects cannot be accidentally reused.
build=$(mktemp -d)
trap 'rm -rf -- "$build"' EXIT
tar -xzf lame-3.100.tar.gz -C "$build"
mkdir -p "$build/worker/build" "$build/worker/lib"
cp -R upstream/src "$build/worker/"
cp "$build/lame-3.100/include/lame.h" "$build/worker/lib/lame.h"
if [[ ${RELINK_UPSTREAM_OBJECTS:-0} == 1 ]]; then
  expected_objects=c4069fb06a840d0f23656d018e0bc81baf143d5b5de46b18cf2cf7a80534b9fd
  printf '%s  %s\n' "$expected_objects" upstream/build/libmp3lame.a | sha256sum --check -
  cp upstream/build/libmp3lame.a "$build/worker/build/"
else
  (
    cd "$build/lame-3.100"
    emconfigure ./configure \
      CFLAGS="-DNDEBUG -DNO_STDIO -O3 -msimd128" \
      --disable-dependency-tracking --disable-shared --disable-gtktest \
      --disable-analyzer-hooks --disable-decoder --disable-frontend
    emmake make -j"${JOBS:-2}"
  )
  cp "$build/lame-3.100/libmp3lame/.libs/libmp3lame.a" "$build/worker/build/"
fi
(
  cd "$build/worker"
  emcc src/lame-bridge.c build/libmp3lame.a \
    -s MODULARIZE=1 -s EXPORT_ES6=1 -s SINGLE_FILE=1 \
    -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web,worker \
    -s EXPORTED_RUNTIME_METHODS=cwrap,HEAPU8 -s EXPORTED_FUNCTIONS=_malloc,_free \
    -msimd128 -O3 -o build/lame.js
  npm --registry=https://registry.npmjs.org exec --yes --package=esbuild@0.25.1 -- \
    esbuild src/encode.worker.ts --bundle --minify --target=es2017 --format=esm \
    --define:import.meta.url='""' --legal-comments=none \
    --outfile=mediabunny-mp3-encoder.worker.js
)
cp "$build/worker/mediabunny-mp3-encoder.worker.js" "$build/worker/build/lame.js" .
sha256sum mediabunny-mp3-encoder.worker.js lame.js
