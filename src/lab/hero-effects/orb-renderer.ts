import { animate, motionValue } from 'motion';
import { clamp, fibonacciShell, orbLayout, qualities, type Quality } from './geometry';
import type { Renderer } from './useScene';

// Original shaders. Only the public Motion demo's visual behavior is referenced.
const vertexBody = `
precision highp float;
ATTR vec4 a_point;
uniform vec2 u_resolution, u_center, u_rotation;
uniform float u_radius, u_time, u_press, u_reveal, u_dpr;
VARY vec3 v_color;
VARY float v_alpha;
void main() {
  vec3 p = a_point.xyz;
  float yaw = u_rotation.x + u_time * 0.065 + sin(p.y * 2.4 + u_time * 0.15) * (0.018 + u_press * 0.12);
  float pitch = u_rotation.y + 0.12;
  p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
  p.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * p.yz;
  p.y *= 1.0 - u_press * 0.09;
  float perspective = 3.5 / (3.5 - p.z);
  vec2 pixel = u_center + vec2(p.x, -p.y) * u_radius * u_reveal * perspective;
  vec2 clip = pixel / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = (1.0 + a_point.w * 0.75) * u_dpr * perspective;
  float front = smoothstep(-0.8, 0.95, p.z);
  float rim = pow(1.0 - abs(p.z), 4.0);
  v_color = mix(vec3(0.12, 0.34, 0.65), vec3(0.77, 0.91, 1.0), front);
  v_color += vec3(0.04, 0.10, 0.14) * rim;
  v_alpha = (0.12 + front * 0.53 + rim * 0.23) * u_reveal;
}`;
const fragmentBody = `
precision mediump float;
VARY vec3 v_color;
VARY float v_alpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  COLOR = vec4(v_color, (1.0 - smoothstep(0.3, 1.0, d)) * v_alpha);
}`;

export function createOrbRenderer(canvas: HTMLCanvasElement, quality: Quality, overlay: boolean): Renderer {
  const options = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' as const };
  const gl2 = canvas.getContext('webgl2', options) as WebGL2RenderingContext | null;
  const gl = gl2 ?? canvas.getContext('webgl', options) as WebGLRenderingContext | null;
  if (!gl) throw new Error('WebGL unavailable');
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
  const releaseGL = () => { if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.splice(0).forEach(shader => gl.deleteShader(shader)); buffer = program = null; };
  try {
    const compile = (type: number, body: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader allocation failed');
      shaders.push(shader); gl.shaderSource(shader, body); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed');
      return shader;
    };
    const vertex = (gl2 ? '#version 300 es\n#define ATTR in\n#define VARY out\n' : '#define ATTR attribute\n#define VARY varying\n') + vertexBody;
    const fragment = gl2 ? '#version 300 es\n#define VARY in\n#define COLOR fragColor\nprecision mediump float;\nout vec4 fragColor;\n' + fragmentBody : '#define VARY varying\n#define COLOR gl_FragColor\n' + fragmentBody;
    program = gl.createProgram();
    if (!program) throw new Error('Program allocation failed');
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program link failed');
    shaders.splice(0).forEach(shader => { gl.detachShader(program!, shader); gl.deleteShader(shader); });
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, fibonacciShell(qualities[quality].particles), gl.STATIC_DRAW);
  } catch (error) { releaseGL(); throw error; }
  const count = qualities[quality].particles;
  const point = gl.getAttribLocation(program, 'a_point');
  const uniforms = Object.fromEntries(['resolution', 'center', 'rotation', 'radius', 'time', 'press', 'reveal', 'dpr'].map(name => [name, gl.getUniformLocation(program!, `u_${name}`)]));
  const yaw = motionValue(0), pitch = motionValue(0), press = motionValue(0), reveal = motionValue(0.78);
  const values = [yaw, pitch, press, reveal];
  let width = 1, height = 1, dpr = 1, enabled: boolean | undefined, dragging: number | null = null, originX = 0, originY = 0, disposed = false;
  const spring = (value: typeof yaw, target: number) => animate(value, target, { type: 'spring', stiffness: 85, damping: 18, mass: 0.8 });
  const home = () => { if (!enabled) return; dragging = null; spring(yaw, 0); spring(pitch, 0); spring(press, 0); };
  const move = (event: PointerEvent) => {
    if (!enabled) return;
    const rect = canvas.getBoundingClientRect();
    if (dragging !== null && dragging !== event.pointerId) return;
    spring(yaw, clamp(dragging !== null ? (event.clientX - originX) / 190 : ((event.clientX - rect.left) / width - 0.5) * 0.42, -1.4, 1.4));
    spring(pitch, clamp(dragging !== null ? (event.clientY - originY) / 240 : ((event.clientY - rect.top) / height - 0.5) * 0.24, -0.65, 0.65));
  };
  const down = (event: PointerEvent) => {
    if (!enabled || event.button !== 0 || dragging !== null) return;
    dragging = event.pointerId; originX = event.clientX; originY = event.clientY;
    canvas.setPointerCapture(event.pointerId); spring(press, 1);
  };
  const up = (event: PointerEvent) => {
    if (dragging !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    home();
  };
  const leave = () => { if (dragging === null) home(); };
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up); canvas.addEventListener('pointerleave', leave);
  return {
    backend: `${gl2 ? 'WebGL2' : 'WebGL1'} · ${gl.getParameter(gl.RENDERER)}`,
    count, vertexBytes: count * 16,
    resize(w, h, scale) { width = w; height = h; dpr = scale; canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale); gl.viewport(0, 0, canvas.width, canvas.height); },
    active(next) {
      if (next === enabled) return;
      if (enabled === undefined && !next) reveal.jump(1);
      enabled = next;
      if (next) spring(reveal, 1);
      else { if (dragging !== null && canvas.hasPointerCapture(dragging)) canvas.releasePointerCapture(dragging); dragging = null; values.forEach(value => value.stop()); }
    },
    draw(_dt, time) {
      if (disposed || !program) return;
      const layout = orbLayout(width, height, overlay);
      gl.clearColor(0.024, 0.043, 0.071, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 4, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.uniform2f(uniforms.resolution, width, height); gl.uniform2f(uniforms.center, layout.x, layout.y);
      gl.uniform2f(uniforms.rotation, yaw.get(), pitch.get()); gl.uniform1f(uniforms.radius, layout.radius);
      gl.uniform1f(uniforms.time, time); gl.uniform1f(uniforms.press, press.get());
      gl.uniform1f(uniforms.reveal, reveal.get()); gl.uniform1f(uniforms.dpr, dpr);
      gl.drawArrays(gl.POINTS, 0, count);
    },
    dispose() {
      if (disposed) return; disposed = true;
      if (dragging !== null && canvas.hasPointerCapture(dragging)) canvas.releasePointerCapture(dragging);
      values.forEach(value => { value.stop(); value.destroy(); });
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up); canvas.removeEventListener('pointerleave', leave);
      releaseGL();
    },
  };
}
