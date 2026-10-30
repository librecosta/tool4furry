import wasmURL from './resizer.wasm?url';
self.onmessage = async () => {
  const { instance } = await WebAssembly.instantiateStreaming(fetch(wasmURL));
  self.postMessage(`resizer-private:${(instance.exports.answer as () => number)()}`);
};
export {};
