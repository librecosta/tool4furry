import wasmURL from './editor.wasm?url';
self.onmessage = async () => {
  const { instance } = await WebAssembly.instantiateStreaming(fetch(wasmURL));
  self.postMessage(`editor-private:${(instance.exports.answer as () => number)()}`);
};
export {};
