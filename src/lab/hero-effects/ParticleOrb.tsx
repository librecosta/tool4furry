import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useScene, type SceneProps } from './useScene';
import { createOrbRenderer } from './orb-renderer';
import { heroLabStyles as s } from './styles';

export default function ParticleOrb(props: SceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useScene(canvas, createOrbRenderer, props);
  return <>
    <canvas ref={canvas} aria-hidden="true" data-hero-canvas="orb" {...stylex.props(s.canvas)} />
    <span aria-hidden="true" {...stylex.props(s.symbol, props.overlay && s.symbolOverlay)} />
  </>;
}
