import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useScene, type SceneProps } from './useScene';
import { createWavesRenderer } from './waves-renderer';
import { heroLabStyles as s } from './styles';

export default function FlowFieldWaves(props: SceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useScene(canvas, createWavesRenderer, props);
  return <canvas ref={canvas} aria-hidden="true" data-hero-canvas="waves" {...stylex.props(s.canvas)} />;
}
