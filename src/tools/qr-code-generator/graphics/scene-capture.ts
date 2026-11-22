import type { Camera, Scene, WebGLRenderer } from 'three';

export type DioramaCapture = () => Promise<Blob>;

function copyFrame(gl: WebGLRenderer, scene: Scene, camera: Camera) {
  const input = gl.domElement;
  if (gl.getContext().isContextLost() || !input.width || !input.height) throw new Error('Diorama frame unavailable');
  const sample = document.createElement('canvas');
  const scale = Math.min(1, 2048 / Math.max(input.width, input.height));
  sample.width = Math.max(1, Math.floor(input.width * scale));
  sample.height = Math.max(1, Math.floor(input.height * scale));
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Diorama capture unavailable');
  try {
    // Copy within the same task that renders the frame so preserveDrawingBuffer stays disabled.
    gl.render(scene, camera);
    context.drawImage(input, 0, 0, sample.width, sample.height);
    return { sample, context };
  } catch (error) {
    sample.width = sample.height = 1;
    throw error;
  }
}

export async function captureDiorama(gl: WebGLRenderer, scene: Scene, camera: Camera) {
  const { sample } = copyFrame(gl, scene, camera);
  try {
    return await new Promise<Blob>((resolve, reject) => {
      sample.toBlob(blob => blob?.type === 'image/png'
        ? resolve(blob) : reject(new Error('Diorama PNG unavailable')), 'image/png');
    });
  } finally {
    sample.width = sample.height = 1;
  }
}

export async function scanDiorama(gl: WebGLRenderer, scene: Scene, camera: Camera, content: string, signal: AbortSignal) {
  const { default: decode } = await import('jsqr');
  signal.throwIfAborted();
  const { sample, context } = copyFrame(gl, scene, camera);
  try {
    const { data, width, height } = context.getImageData(0, 0, sample.width, sample.height);
    const result = decode(data, width, height, { inversionAttempts: 'dontInvert' });
    const bytes = new TextEncoder().encode(content);
    return result?.data === content && result.binaryData.length === bytes.length &&
      result.binaryData.every((byte, i) => byte === bytes[i]);
  } finally {
    sample.width = sample.height = 1;
  }
}
