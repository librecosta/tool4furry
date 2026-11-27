declare module 'imagetracerjs' {
  interface Color { r: number; g: number; b: number; a: number }
  interface Segment { type: 'L' | 'Q'; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number }
  interface Outline { isholepath: boolean; holechildren: number[]; segments: Segment[] }
  interface Options {
    pal: Color[];
    colorquantcycles: number;
    mincolorratio: number;
    pathomit: number;
    ltres: number;
    qtres: number;
    rightangleenhance: boolean;
    layering: number;
  }
  const imageTracer: {
    imagedataToTracedata(
      image: { data: Uint8ClampedArray; width: number; height: number },
      options: Options,
    ): { layers: Outline[][]; palette: Color[] };
  };
  export default imageTracer;
}
