import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { drawComposition, loadWatermarkFonts } from './render';
import type { View } from './session';
import { s } from './styles';
export function WatermarkPreview({view, label, failure}: {view: View; label: string; failure: string}) {
  const canvas = useRef<HTMLCanvasElement>(null), [failed, setFailed] = useState(false);
  const source = view.tasks.find(task => task.id === view.selected)?.source;
  useEffect(() => {
    let active = true; const target = canvas.current;
    setFailed(false);
    if (!target || !source || !view.preview) return;
    target.width = view.preview.width; target.height = view.preview.height;
    const draw = () => {
      if (!active) return;
      try {
        const ctx = target.getContext('2d'); if (!ctx) throw new Error('draw');
        if (view.settings.kind === 'image' && !view.watermark) { ctx.clearRect(0, 0, target.width, target.height); ctx.drawImage(view.preview!, 0, 0); return; }
        drawComposition(ctx, target.width, target.height, source.width, source.height, view.preview!, view.settings,
          view.watermark ? {image: view.watermark.preview, width: view.watermark.source.width, height: view.watermark.source.height} : undefined);
      } catch { setFailed(true); }
    };
    if (view.settings.kind === 'text') void loadWatermarkFonts(view.settings.text).then(draw, () => { if (active) setFailed(true); }); else draw();
    return () => { active = false; target.width = 0; target.height = 0; };
  }, [source, view.preview, view.settings, view.watermark]);
  return <div {...stylex.props(s.preview)}>{failed ? <p role="alert" {...stylex.props(s.error)}>{failure}</p> : <canvas data-watermark-preview ref={canvas} role="img" aria-label={label} {...stylex.props(s.canvas)}/>}</div>;
}
