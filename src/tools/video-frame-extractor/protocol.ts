import type { FramePlan, ImageSettings, Size, videoErrors } from './core';

export type VideoInfo = Size & {
  origin: number;
  end: number;
  duration: number;
  fps: number;
  timeResolution: number;
  hdr: boolean;
};

export type Position = {
  requested: number;
  timestamp: number;
  step?: 'first' | 'previous' | 'next' | 'last';
};

export type Preview = { timestamp: number; image: Blob };
export type GalleryFrame = {
  id: number;
  timestamp: number;
  name: string;
  image: Blob;
  thumbnail?: Blob;
};

export type FrameEvent = Omit<GalleryFrame, 'name' | 'id'>;
export type VideoRequests = {
  inspect: { file: File };
  preview: { file: File; info: VideoInfo; position: Position };
  extract: {
    file: File; info: VideoInfo; plan: FramePlan; settings: ImageSettings;
    gallery?: { frames: number; bytes: number };
  };
};
export type VideoResults = {
  inspect: { info: VideoInfo; preview: Preview };
  preview: Preview;
  extract: { frames: number; sampled: number };
};
export type VideoRequest = {
  [K in keyof VideoRequests]: { type: K } & VideoRequests[K]
}[keyof VideoRequests];
export type VideoResponse =
  | { type: 'result'; value: VideoResults[keyof VideoResults] }
  | { type: 'frame'; frame: FrameEvent }
  | { type: 'progress'; sampled: number; frames: number; time: number }
  | { type: 'error'; code: keyof typeof videoErrors };
