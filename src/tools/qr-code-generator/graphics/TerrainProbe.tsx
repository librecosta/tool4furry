import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type CanvasProps } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Locale } from '../../../i18n/locale';
import { tr } from '../../general/ui';
import { createDefaultRecipe } from '../recipe/defaults';
import { buildTerrainData } from './terrain-math';
import notice from './graphics.NOTICE.txt?url&no-inline';

const recipe = createDefaultRecipe();
const camera: CanvasProps['camera'] = { position: [7, 7, 9], fov: 40, near: 0.1, far: 50 };
// The drawing buffer's old width must not set the grid's minimum width after resize.
const viewportSize = { height: 'clamp(200px, 45vw, 320px)', contain: 'inline-size' };
const webGl2: CanvasProps['gl'] = defaults => {
  if (!(defaults.canvas instanceof HTMLCanvasElement)) throw new Error('3D probe requires a canvas');
  const context = defaults.canvas.getContext('webgl2', {
    alpha: false, antialias: true, depth: true, powerPreference: 'low-power',
  });
  if (!context) throw new Error('WebGL2 context creation failed');
  try {
    // R3F owns renderers created by its factory and releases the context on unmount.
    return new WebGLRenderer({ ...defaults, canvas: defaults.canvas, context });
  } catch (error) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
};

function Terrain({ visible, onContextLost }: { visible: boolean; onContextLost: () => void }) {
  const { camera, gl, invalidate } = useThree();
  const geometry = useMemo(() => {
    const { positions, indices } = buildTerrainData(recipe.terrain.seed);
    const surface = new BufferGeometry();
    surface.setAttribute('position', new BufferAttribute(positions, 3));
    surface.setIndex(new BufferAttribute(indices, 1));
    surface.computeVertexNormals();
    return surface;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2.3;
    const requestFrame = () => invalidate();
    controls.addEventListener('change', requestFrame);
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      controls.removeEventListener('change', requestFrame);
      controls.dispose();
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
    };
  }, [camera, gl, invalidate, onContextLost]);
  useEffect(() => {
    if (visible) invalidate();
  }, [visible, invalidate]);
  return (
    <>
      <color attach="background" args={['#262b32']} />
      <hemisphereLight args={['#fff3dd', '#60566c', 2]} />
      <directionalLight position={[-3, 6, 4]} intensity={2.5} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#bb8e60" roughness={1} />
      </mesh>
    </>
  );
}

export default function TerrainProbe({ locale }: { locale: Locale }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [lost, setLost] = useState(false);
  const onContextLost = useCallback(() => setLost(true), []);
  useEffect(() => {
    const element = viewport.current;
    if (!element || lost) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [lost]);
  const unavailable = tr(locale,
    '3D 图形不可用。可以继续生成二维码。',
    '3D graphics are unavailable. You can still generate QR codes.');

  return (
    <section data-qr-terrain-probe data-recipe-version={recipe.version} data-terrain-seed={recipe.terrain.seed}
      aria-label={tr(locale, '地形验证', 'Terrain probe')}>
      {lost ? <p role="alert">{unavailable}</p> : (
        <div ref={viewport}>
          <Canvas aria-label={tr(locale, '拖动查看地形', 'Drag to inspect the terrain')}
            style={viewportSize} camera={camera} dpr={[1, 1.5]} gl={webGl2} frameloop={visible ? 'demand' : 'never'}
            fallback={<p role="alert">{unavailable}</p>}>
            <Terrain visible={visible} onContextLost={onContextLost} />
          </Canvas>
        </div>
      )}
      <a href={notice}>{tr(locale, '3D 依赖许可', '3D dependency licenses')}</a>
    </section>
  );
}
