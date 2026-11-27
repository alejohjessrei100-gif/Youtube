export type Expr = {
  t: number;
  eyes: string; // E1..E7
  mouth: string; // M0..M11
  gaze?: [number, number]; // -1..1
  mouthScale?: number;
};

export type FaceGeo = {
  eyeL: [number, number];
  eyeR: [number, number];
  eyeW: number;
  mouth: [number, number];
  mouthW: number;
  faceW: number;
  faceH: number;
  center: [number, number];
  roll: number;
  yaw: number;
  browY: number;
  moustache: boolean;
  skin: string;
};

export type AssetFaces = {w: number; h: number; faces: FaceGeo[]};

export type Anim = {
  type: 'slide_in' | 'drop' | 'pop' | 'rise' | 'fade' | 'shake' | 'walk' | 'none';
  t: number;
  dur?: number;
  dir?: 'left' | 'right';
  dist?: number; // fraction of frame width for walk
};

export type Layer = {
  asset: string;
  kind: 'bg' | 'full' | 'insert' | 'char' | 'prop' | 'route';
  character?: string;
  x?: number; // centre x, fraction of frame width
  y?: number; // bottom y (feet / base), fraction of frame height
  h?: number; // height, fraction of frame height
  flip?: boolean;
  depth?: number; // 0 = far (bg) .. 1 = subject .. 1.3 = foreground
  opacity?: number;
  shadow?: boolean;
  idle?: boolean;
  anim?: Anim;
  swaps: {t: number; asset: string; blur?: boolean; pop?: number; keepBg?: boolean; matchFace?: boolean; matchBody?: boolean; zoom?: number}[];
  repeat?: {n: number; dx?: number; dy?: number; every?: number; scaleJitter?: number};
  faces: {face: number; hidden: boolean; exprs: Expr[]}[];
  pivot?: [number, number]; // rotation / scale origin inside the layer box (0..1); default bottom-centre for cut-outs
  keys?: Key[];
  loops?: Loop[];
  flipbook?: {assets: string[]; every: number; t0: number; t1: number};
  base?: [number, number]; // split subject's base (bottom-centre of its mask): pivot so it stays grounded
  sway?: number; // 0..2 continuous sway/breathing of a split subject (default 1, scaled by shot energy)
  route?: {points: [number, number][]; t0: number; t1: number; pins?: {at: [number, number]; t: number; r?: number; color?: string; dot?: string}[]; icon?: string; color?: string; width?: number};
  split?: boolean; // plate has <asset>__fg (subject) and <asset>__bg (cleaned background) - moved independently
};

// Keyframe: offsets from the base placement. x/y = fraction of frame, s = scale multiplier, r = degrees, o = opacity.
export type Key = {t: number; x?: number; y?: number; s?: number; r?: number; o?: number; ease?: Ease};
export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'hold';

// Periodic motion (the reference's mechanical 3-frame wiggles). period in frames.
export type Loop = {
  type: 'shake' | 'bob' | 'rock' | 'pulse' | 'jitter';
  amp: number; // shake/bob: fraction of frame width; rock: degrees; pulse: scale fraction; jitter: fraction
  period?: number;
  t0: number;
  t1: number;
  decay?: boolean;
};

export type Camera = {
  move?: 'static' | 'creep' | 'push' | 'punch' | 'pull' | 'pan_l' | 'pan_r';
  amount?: number;
  focus?: [number, number];
  keys?: Key[]; // explicit camera keyframes (s, r, x, y) - overrides move
  handheld?: number; // 0..1 slow drift + sway (default 0.35)
  parallax?: {fgPan?: number; fgZoom?: number; fgRot?: number; bgPan?: number; bgZoom?: number;
    settle?: number; settleX?: number; pulse?: number; pulseX?: number}; // split plates
  pulses?: {t: number}[]; // eased push pulses on key words (split plates); default one mid-shot pulse if > 1.3 s
  drift?: number; // constant slow pan, fraction of frame width per second (default 0.015, seeded direction); 0 = off
  tilt?: number; // degrees of slow roll across the shot
};

export type Shot = {
  id: string;
  start: number;
  end: number;
  text: string;
  template: string;
  grade: string;
  gradeFlip: {t: number; to: string} | null;
  camera: Camera;
  transition: 'cut' | 'whip' | 'zoomblur';
  exit?: 'zoomblur' | null;
  energy?: number; // 0..1: 1 single focused character, ~0.25 crowds, ~0.2 wides / inserts
  dof: number;
  vignette: number;
  layers: Layer[];
};

export type Timeline = {
  slug: string;
  fps: number;
  width: number;
  height: number;
  duration: number;
  audio: string;
  sfx?: {src: string; t: number; dur: number; vol: number}[]; // diegetic SFX one-shots (start s, max length s, linear gain)
  shots: Shot[];
  captions: {text: string; start: number; end: number}[];
  faces: Record<string, AssetFaces>;
  boxes?: Record<string, [number, number, number, number]>; // split subject bbox (fractions) per asset
};
