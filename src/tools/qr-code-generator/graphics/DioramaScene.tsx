import { Canvas, useFrame, useThree, type CanvasProps } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Spherical, Vector3, WebGLRenderer, type Group, type OrthographicCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { QrMatrixData } from '../matrix/qr-matrix';
import type { QrRecipeV1 } from '../recipe/types';
import { ContactShadow, DioramaQr, DioramaWorld } from './DioramaObjects';
import { captureDiorama, scanDiorama, type DioramaCapture } from './scene-capture';
import { advanceDiorama, type DioramaCommand, type DioramaPose, type DioramaStatus } from './scene-transition';

export type SceneScan = { matrix: QrMatrixData; state: 'pending' | 'verified' | 'unreadable' };
export type DioramaZoom = (direction: 'in' | 'out') => void;
export type DioramaSceneProps = {
  active: boolean;
  zoomRef: RefObject<DioramaZoom | null>;
  recipe: QrRecipeV1;
  matrix: QrMatrixData | null;
  command: DioramaCommand;
  label: string;
  onStatus: (status: DioramaStatus) => void;
  onScan: (result: SceneScan | null) => void;
  onCapture: (capture: DioramaCapture | null) => void;
};

const worldPosition: [number, number, number] = [10, 11, 12];
const cameraConfig: CanvasProps['camera'] = { position: worldPosition, near: 0.1, far: 95 };
const webGl2: CanvasProps['gl'] = defaults => {
  if (!(defaults.canvas instanceof HTMLCanvasElement)) throw new Error('Diorama requires a canvas');
  const context = defaults.canvas.getContext('webgl2', {
    alpha: false, antialias: true, depth: true, powerPreference: 'low-power', preserveDrawingBuffer: false,
  });
  if (!context) throw new Error('WebGL2 context creation failed');
  try {
    return new WebGLRenderer({ ...defaults, canvas: defaults.canvas, context });
  } catch (error) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
};

type Pose = { position: Vector3; target: Vector3; zoom: number; reveal: number };
type Motion = { from: Pose; to: Pose; elapsed: number; final: DioramaPose };

function place(pose: DioramaPose): Pose {
  if (pose === 'front') return { position: new Vector3(0, 13, 0.001), target: new Vector3(0, 0.22, 0), zoom: 1 / 9.45, reveal: 1 };
  if (pose === 'tilted') return { position: new Vector3(7.5, 10, 9.2), target: new Vector3(0, 0.0, 0), zoom: 1 / 11.9, reveal: 1 };
  return { position: new Vector3(...worldPosition), target: new Vector3(0, 0.45, 0), zoom: 1 / 12.9, reveal: 0 };
}

function Room({ active, zoomRef, recipe, matrix, command, label, onStatus, onScan, onCapture, onLost, dark }: DioramaSceneProps & {
  onLost: () => void;
  dark: boolean;
}) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const ortho = camera as OrthographicCamera;
  const terrain = useRef<Group>(null);
  const symbol = useRef<Group>(null);
  const controls = useRef<OrbitControls>(null);
  const programmatic = useRef(false);
  const motion = useRef<Motion>(null);
  const world = useRef(place('world'));
  const position = useRef(place('world'));
  const current = useRef<DioramaStatus>('moving');
  const [status, setStatus] = useState<DioramaStatus>('moving');
  const short = Math.max(1, Math.min(size.width * 0.9, size.height));
  const screenSize = useRef(short);

  const report = useCallback((next: DioramaStatus) => {
    current.current = next;
    setStatus(next);
    onStatus(next);
  }, [onStatus]);

  const applyPose = useCallback((pose: Pose) => {
    position.current = pose;
    ortho.position.copy(pose.position);
    ortho.lookAt(pose.target);
    ortho.zoom = pose.zoom * screenSize.current;
    ortho.updateProjectionMatrix();
    const reveal = pose.reveal;
    if (terrain.current) {
      const amount = Math.min(1, reveal / 0.57);
      terrain.current.visible = amount < 1;
      terrain.current.position.y = -2.9 * amount;
      terrain.current.scale.setScalar(1 - 0.37 * amount);
    }
    if (symbol.current) {
      const amount = Math.max(0, (reveal - 0.44) / 0.56);
      symbol.current.visible = amount > 0;
      symbol.current.position.y = 1.15 * (1 - amount);
      symbol.current.scale.setScalar(0.64 + 0.36 * amount);
    }
  }, [ortho]);

  const settle = useCallback((pose: Pose, final: DioramaPose) => {
    applyPose(pose);
    if (final === 'world') world.current = pose;
    const orbit = controls.current;
    if (orbit) {
      programmatic.current = true;
      orbit.target.copy(pose.target);
      const defaultZoom = screenSize.current * place(final === 'world' ? 'world' : 'front').zoom;
      orbit.minZoom = 0.63 * defaultZoom;
      orbit.maxZoom = 1.72 * defaultZoom;
      orbit.update();
      orbit.enabled = true;
      programmatic.current = false;
    }
    report(final);
  }, [applyPose, ortho, report]);

  useLayoutEffect(() => {
    screenSize.current = short;
    ortho.zoom = short * position.current.zoom;
    ortho.updateProjectionMatrix();
    if (controls.current && !motion.current) {
      const defaultZoom = short * place(position.current.reveal ? 'front' : 'world').zoom;
      controls.current.minZoom = defaultZoom * 0.63;
      controls.current.maxZoom = defaultZoom * 1.72;
    }
    invalidate();
  }, [short, ortho, invalidate]);

  useEffect(() => {
    const orbit = new OrbitControls(ortho, gl.domElement);
    controls.current = orbit;
    orbit.enablePan = false;
    orbit.enableDamping = false;
    orbit.maxPolarAngle = Math.PI / 2.42;
    orbit.rotateSpeed = 0.72;
    orbit.zoomSpeed = 0.68;
    orbit.enabled = false;
    gl.domElement.tabIndex = 0;
    gl.domElement.setAttribute('aria-label', label);
    const changed = () => {
      if (programmatic.current || motion.current) return;
      position.current = {
        ...position.current, position: ortho.position.clone(), target: orbit.target.clone(),
        zoom: ortho.zoom / screenSize.current,
      };
      if (current.current === 'world') world.current = position.current;
      if (current.current === 'front') report('tilted');
      invalidate();
    };
    const zoom: DioramaZoom = (direction) => {
      if (!orbit.enabled) return;
      if (direction === 'in') orbit.dollyIn(0.87);
      else orbit.dollyOut(0.87);
    };
    zoomRef.current = zoom;
    const key = (event: KeyboardEvent) => {
      if (!orbit.enabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
      event.preventDefault();
      if (!event.key.startsWith('Arrow')) {
        zoom(event.key === '-' ? 'out' : 'in');
        return;
      }
      const offset = new Spherical().setFromVector3(ortho.position.clone().sub(orbit.target));
      if (event.key === 'ArrowLeft') offset.theta -= 0.13;
      if (event.key === 'ArrowRight') offset.theta += 0.13;
      if (event.key === 'ArrowUp') offset.phi = Math.max(0.001, offset.phi - 0.13);
      if (event.key === 'ArrowDown') offset.phi = Math.min(orbit.maxPolarAngle, offset.phi + 0.13);
      ortho.position.setFromSpherical(offset).add(orbit.target);
      orbit.update();
      changed();
    };
    orbit.addEventListener('change', changed);
    gl.domElement.addEventListener('keydown', key);
    gl.domElement.addEventListener('webglcontextlost', onLost);
    return () => {
      orbit.removeEventListener('change', changed);
      orbit.dispose();
      zoomRef.current = null;
      controls.current = null;
      gl.domElement.removeEventListener('keydown', key);
      gl.domElement.removeEventListener('webglcontextlost', onLost);
    };
  }, [ortho, gl, invalidate, label, onLost, report, zoomRef]);

  useEffect(() => {
    const destination = command.pose === 'world' && !command.reset ? world.current : place(command.pose);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (command.sequence === 0 || reduced) {
      motion.current = null;
      settle(destination, command.pose);
    } else {
      if (controls.current) controls.current.enabled = false;
      motion.current = { from: position.current, to: destination, elapsed: 0, final: command.pose };
      report('moving');
    }
    invalidate();
  }, [command, settle, report, invalidate]);

  useFrame((_, delta) => {
    const active = motion.current;
    if (!active) return;
    const { done, elapsed, progress } = advanceDiorama(active.elapsed, delta, false);
    active.elapsed = elapsed;
    if (done) {
      motion.current = null;
      settle(active.to, active.final);
      return;
    }
    const { from, to } = active;
    applyPose({
      position: from.position.clone().lerp(to.position, progress),
      target: from.target.clone().lerp(to.target, progress),
      zoom: from.zoom + (to.zoom - from.zoom) * progress,
      reveal: from.reveal + (to.reveal - from.reveal) * progress,
    });
    invalidate();
  });

  useEffect(() => {
    const ready = status === 'world' || ((status === 'front' || status === 'tilted') && matrix);
    onCapture(active && ready ? () => captureDiorama(gl, scene, ortho) : null);
    return () => onCapture(null);
  }, [active, status, matrix, gl, scene, ortho, onCapture]);

  useEffect(() => {
    if (!active || status !== 'front' || !matrix) {
      onScan(null);
      return;
    }
    const controller = new AbortController();
    onScan({ matrix, state: 'pending' });
    const publish = (verified: boolean) => {
      if (!controller.signal.aborted) onScan({ matrix, state: verified ? 'verified' : 'unreadable' });
    };
    const timer = window.setTimeout(() => {
      void scanDiorama(gl, scene, ortho, recipe.content, controller.signal).then(publish, () => publish(false));
    }, 125);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, status, matrix, recipe.content, recipe.terrain.id, size.width, size.height, gl, scene, ortho, onScan]);

  return <>
    <color attach="background" args={[dark ? '#252933' : '#e8e4da']} />
    <hemisphereLight args={['#fff5df', '#8b8798', 2.15]} />
    <directionalLight position={[-5, 9, 6]} intensity={2.2} color="#fff0d4" />
    <directionalLight position={[2, 5, -6]} intensity={0.48} color="#ecf0ff" />
    <ContactShadow />
    <group ref={terrain}><DioramaWorld terrain={recipe.terrain} /></group>
    <group ref={symbol} visible={false}>{matrix && <DioramaQr matrix={matrix} terrain={recipe.terrain.id} />}</group>
  </>;
}

export default function DioramaScene(props: DioramaSceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [lost, setLost] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.appearance === 'dark');
  const { onStatus } = props;
  const onLost = useCallback(() => { setLost(true); onStatus('unavailable'); }, [onStatus]);

  useEffect(() => {
    if (!root.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const theme = document.documentElement;
    const observer = new MutationObserver(() => setDark(theme.dataset.appearance === 'dark'));
    observer.observe(theme, { attributeFilter: ['data-appearance'] });
    return () => observer.disconnect();
  }, []);

  return <div ref={root} data-qr-diorama-scene style={{ height: '100%', contain: 'inline-size' }}>
    {!lost && <Canvas aria-label={props.label} flat orthographic camera={cameraConfig} gl={webGl2}
      dpr={[1, 1.5]} frameloop={props.active && visible ? 'demand' : 'never'}>
      <Room {...props} onLost={onLost} dark={dark} />
    </Canvas>}
  </div>;
}
