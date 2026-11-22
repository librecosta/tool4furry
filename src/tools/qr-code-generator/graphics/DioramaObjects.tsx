import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Float32BufferAttribute, Matrix4, type InstancedMesh } from 'three';
import type { QrMatrixData } from '../matrix/qr-matrix';
import type { QrRecipeV1, TerrainId } from '../recipe/types';
import { buildDioramaQr, qrPlateEdge, qrPlateTop } from './diorama-qr';
import { buildDioramaTerrain, terrainPalettes } from './diorama-terrain';

export function DioramaWorld({ terrain }: { terrain: QrRecipeV1['terrain'] }) {
  const { id, seed, revision } = terrain;
  const geometry = useMemo(() => buildDioramaTerrain({ id, seed, revision }), [id, seed, revision]);
  const mesh = useRef<import('three').Mesh>(null);
  useLayoutEffect(() => { mesh.current?.geometry.computeVertexNormals(); }, [geometry]);
  return <mesh ref={mesh} name="closed terrain solid">
    <bufferGeometry key={id + ':' + seed}>
      <bufferAttribute attach="attributes-position" args={[geometry.positions, 3]} />
      <bufferAttribute attach="attributes-color" args={[geometry.colors, 3]} />
      <bufferAttribute attach="index" args={[geometry.indices, 1]} />
    </bufferGeometry>
    <meshStandardMaterial vertexColors roughness={0.91} />
  </mesh>;
}

function makeBrick() {
  const mesh = new BoxGeometry(1, 1, 1);
  const normals = mesh.getAttribute('normal');
  const colors = Array.from({ length: normals.count }, (_, i) => {
    if (normals.getY(i) > 0) return 1;
    return normals.getZ(i) ? 0.66 : 0.46;
  }).flatMap(value => [value, value, value]);
  mesh.setAttribute('color', new Float32BufferAttribute(colors, 3));
  mesh.clearGroups();
  return mesh;
}

export function DioramaQr({ matrix, terrain }: { matrix: QrMatrixData; terrain: TerrainId }) {
  const { ink, plate, base, rim } = terrainPalettes[terrain];
  const { bricks, step } = useMemo(() => buildDioramaQr(matrix), [matrix]);
  const brick = useMemo(makeBrick, []);
  const instances = useRef<InstancedMesh>(null);
  useEffect(() => () => brick.dispose(), [brick]);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (!mesh) return;
    const body = new Matrix4();
    const dark = new Color(ink);
    bricks.forEach(({ x, z, height, tint }, i) => {
      body.makeScale(step, height, step);
      body.setPosition(x, qrPlateTop + height / 2 - 0.001, z);
      mesh.setMatrixAt(i, body);
      mesh.setColorAt(i, dark.clone().multiplyScalar(tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bricks, ink, step]);
  return <>
    <mesh name="QR plinth" position={[0, -0.43, 0]}>
      <boxGeometry args={[qrPlateEdge + 0.33, 0.40, qrPlateEdge + 0.33]} />
      <meshStandardMaterial color={base} roughness={0.9} />
    </mesh>
    <mesh name="QR bevel course" position={[0, -0.19, 0]}>
      <boxGeometry args={[qrPlateEdge + 0.17, 0.09, qrPlateEdge + 0.17]} />
      <meshStandardMaterial color={rim} roughness={0.9} />
    </mesh>
    <mesh name="light modules and quiet zone" position={[0, qrPlateTop - 0.195, 0]}>
      <boxGeometry args={[qrPlateEdge, 0.39, qrPlateEdge]} />
      <meshBasicMaterial color={plate} />
    </mesh>
    <instancedMesh ref={instances} name="dark matrix relief" args={[undefined, undefined, bricks.length]} geometry={brick}>
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  </>;
}

// Analytic contact shading keeps the object grounded without a shadow map or texture asset.
export function ContactShadow() {
  return <mesh position={[0, -0.813, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[16, 16]} />
    <shaderMaterial transparent depthWrite={false}
      vertexShader="varying vec2 tex; void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
      fragmentShader="varying vec2 tex; void main(){vec2 p=(tex-.5)*vec2(2.,2.);float a=1.-smoothstep(.22,.89,length(p));gl_FragColor=vec4(.045,.035,.028,a*a*.30);}" />
  </mesh>;
}
