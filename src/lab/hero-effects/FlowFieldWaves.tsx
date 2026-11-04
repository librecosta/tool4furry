import { useRef } from 'react';
import { useScene, type SceneProps } from './useScene';
import { createWavesRenderer } from './waves-renderer';
import s from './styles.module.scss';

export default function FlowFieldWaves(props: SceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useScene(canvas, createWavesRenderer, props);
  return <canvas ref={canvas} aria-hidden="true" data-hero-canvas="waves" className={s.canvas} />;
}
