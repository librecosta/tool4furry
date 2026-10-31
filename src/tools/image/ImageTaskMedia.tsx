import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';
import { ImageThumbnail } from './ImageThumbnail';

/** URLs are owned by the task row; no preview generation or Blob allocation. */
export function ImageTaskMedia({ source, output, checking, labels }: {
  source?: string;
  output?: string;
  checking?: boolean;
  labels: { original: string; output: string };
}) {
  return (
    <span data-image-task-media {...stylex.props(s.pair)}>
      <span data-thumbnail-kind="source" {...stylex.props(s.item)}>
        <span {...stylex.props(s.frame)}><ImageThumbnail src={source} checking={checking} /></span>
        <span>{labels.original}</span>
      </span>
      {output && <span data-thumbnail-kind="output" {...stylex.props(s.item)}>
        <span {...stylex.props(s.frame)}><ImageThumbnail src={output} /></span>
        <span>{labels.output}</span>
      </span>}
    </span>
  );
}
const s = stylex.create({
  pair: { display: 'inline-flex', gap: t.space8, alignItems: 'start' },
  item: { display: 'grid', gap: 2, width: 44, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: t.textSecondary },
  frame: { display: 'block', width: 44, height: 44, overflow: 'hidden', borderRadius: t.radiusSm, backgroundColor: t.workspace },
});
