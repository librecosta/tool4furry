import s from './ImageTaskMedia.module.scss';
import { ImageThumbnail } from './ImageThumbnail';

/** URLs are owned by the task row; no preview generation or Blob allocation. */
export function ImageTaskMedia({ source, output, checking, labels }: {
  source?: string;
  output?: string;
  checking?: boolean;
  labels: { original: string; output: string };
}) {
  return (
    <span data-image-task-media className={s.pair}>
      <span data-thumbnail-kind="source" className={s.item}>
        <span className={s.frame}><ImageThumbnail src={source} checking={checking} /></span>
        <span>{labels.original}</span>
      </span>
      {output && <span data-thumbnail-kind="output" className={s.item}>
        <span className={s.frame}><ImageThumbnail src={output} /></span>
        <span>{labels.output}</span>
      </span>}
    </span>
  );
}
