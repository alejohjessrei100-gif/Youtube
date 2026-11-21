// Acting for "Before Alarm Clocks" (knocker-upper short): a pose library (hand targets solved by IK in toon.ts) and per-shot, per-character
// timelines keyed to the narration's word onsets, so every phrase gets its own action (review: "every phrase has animation").
// Keys blend with a short ease-out-back (a little overshoot, then settle) and land 2 frames before the word, like the reference.
import type { Pose, Prop, Expr } from "./toon";

export type HandK = { h: [number, number]; pt?: boolean; open?: boolean; front?: boolean };
export type Body = { l: HandK; r: HandK; tilt?: number; head?: number; look?: number };
const A = (x: number, y: number, o: Partial<HandK> = {}): HandK => ({ h: [x, y], ...o });

/** x from the midline (+ = that arm's own side), y from the chin (+ down): face -.5, crown -1, chest .3, belly .65, hip .9 */
const REST = A(0.62, 1.0);
export const PO: Record<string, Body> = {
  rest: { l: REST, r: REST },
  hips: { l: A(0.46, 0.86), r: A(0.46, 0.86) },
  crossed: { l: A(-0.2, 0.44, { front: true }), r: A(-0.16, 0.38, { front: true }) },
  hold: { l: REST, r: A(0.18, 0.5) },                                  // prop at the chest (right hand)
  holdBoth: { l: A(0.02, 0.52, { front: true }), r: A(0.16, 0.5) },
  holdUp: { l: A(0.5, 0.95), r: A(0.72, -0.9) },                       // prop raised high
  holdOut: { l: A(0.75, 0.4, { open: true }), r: A(0.72, 0.15) },       // prop out to the side, other palm presenting
  hug: { l: A(-0.05, 0.42, { front: true, open: true }), r: A(0.05, 0.46) }, // prop hugged to the chest
  present: { l: REST, r: A(0.95, 0.45, { open: true }) },               // "here it is" palm out
  presentL: { l: A(0.95, 0.45, { open: true }), r: REST },
  wide: { l: A(1.05, 0.25, { open: true }), r: A(1.05, 0.25, { open: true }) }, // arms spread: "everywhere / the whole planet"
  shrug: { l: A(0.78, 0.12, { open: true }), r: A(0.78, 0.12, { open: true }), head: 7 },
  cheer: { l: A(0.98, -1.0, { open: true }), r: A(0.98, -1.0, { open: true }) },
  fist: { l: REST, r: A(0.78, -0.72) },                                 // fist pump up
  fistShake: { l: A(0.5, 0.85), r: A(0.62, -0.35) },                    // angry fist at chin height
  facepalm: { l: REST, r: A(0.06, -0.48, { open: true, front: true }), head: -6 },
  bothFace: { l: A(0.12, -0.45, { open: true, front: true }), r: A(0.12, -0.45, { open: true, front: true }), head: -4 },
  chin: { l: A(-0.15, 0.5, { front: true }), r: A(0.06, -0.08, { front: true }), head: 5 },   // thinking: hand on chin, arm across
  temple: { l: REST, r: A(0.38, -0.62, { pt: true }), head: 5 },        // "idea": finger to the temple
  scratch: { l: REST, r: A(0.5, -0.88) },                               // nervous scratch on the side of the head
  neck: { l: REST, r: A(0.44, -0.12, { front: false }) },                 // rub the back of the neck
  mouth: { l: A(-0.05, 0.62, { front: true }), r: A(0.05, -0.28, { open: true, front: true }) }, // stifling a laugh
  belly: { l: A(0.12, 0.66, { open: true, front: true }), r: A(0.14, 0.62, { open: true, front: true }), head: 9 }, // clutch belly laughing
  tear: { l: A(0.12, 0.66, { open: true, front: true }), r: A(0.18, -0.52, { front: true }), head: 8 }, // wipe a tear
  clasp: { l: A(0.04, 0.55, { front: true }), r: A(0.04, 0.53, { front: true }) },           // hopeful / nervous hands together
  point: { l: REST, r: A(1.28, 0.05, { pt: true }) },                   // point off to the side
  pointL: { l: A(1.28, 0.05, { pt: true }), r: REST },
  pointYou: { l: REST, r: A(0.5, 0.12, { pt: true, front: true }) },   // point at the lens (foreshortened)
  pointUp: { l: REST, r: A(0.72, -1.15, { pt: true }) },
  pointSelf: { l: REST, r: A(-0.06, 0.34, { pt: true, front: true }) }, // "me"
  stop: { l: REST, r: A(0.58, -0.25, { open: true }) },                 // palm up: "no thanks"
  slamUp: { l: A(0.5, 0.9), r: A(0.75, -0.62) },
  slam: { l: A(0.5, 0.9), r: A(0.36, 0.98) },
  wave: { l: REST, r: A(0.95, -0.72, { open: true }) },
  thumbs: { l: REST, r: A(0.38, 0.28) },
  type: { l: A(0.22, 0.82, { front: true }), r: A(0.22, 0.82, { front: true }) },          // hands forward on a keyboard
  tiny: { l: REST, r: A(0.26, -0.2, { front: true }) },                // pinch "tiny" next to the face
  slump: { l: A(0.5, 1.06), r: A(0.5, 1.06), head: -9 },
  rub: { l: A(0.0, 0.5, { front: true }), r: A(0.02, 0.48, { front: true }) },              // greedy hand rub
  reach: { l: A(0.92, -0.95, { open: true }), r: A(1.0, -0.4, { open: true }) },            // grabbing at flying bills
  knee: { l: A(0.12, 0.66, { open: true, front: true }), r: A(0.55, 1.2, { open: true }), head: 10 }, // slap the knee laughing
  type1: { l: A(0.25, 0.8, { front: true }), r: A(0.2, 0.86, { front: true }) },
  glasses: { l: REST, r: A(0.14, -0.55, { front: true }) },             // push the glasses up
  calm: { l: A(0.5, 0.88), r: A(0.55, 0.25, { open: true }) },          // explaining, one palm up
  give: { l: A(0.6, 0.98), r: A(0.42, 0.55) },                          // put something down / hand it over
  tie: { l: A(0.5, 0.88), r: A(0.05, 0.14, { front: true }) },          // straighten the tie
  tap: { l: A(0.55, 0.95), r: A(0.4, 0.78, { pt: true, front: true }) }, // tap the thing on the counter
  wagL: { l: A(0.72, -0.55, { pt: true }), r: A(0.18, 0.5) },          // "no" finger wag (left), prop stays in the right hand
  pointYouL: { l: A(0.5, 0.12, { pt: true, front: true }), r: A(0.18, 0.5) },
  templeL: { l: A(0.38, -0.62, { pt: true }), r: A(0.18, 0.5) },        // "your idea": finger to the temple, prop in the right
};

// ---------------- timelines ----------------
export type Osc = { l?: [number, number]; r?: [number, number]; tilt?: number; head?: number; hz: number };
export type Key = {
  t: number; p: string; e?: Expr; dur?: number; mir?: boolean; osc?: Osc;
  tilt?: number; head?: number; look?: number; jump?: number; drop?: number;
};
export type Track = Key[];

const FPS = 30, LEAD = 2 / FPS;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** ease-out-back: fast start, ~8 % overshoot, settle */
const back = (x: number) => { const c = 1.5, y = clamp01(x) - 1; return 1 + (c + 1) * y * y * y + c * y * y; };
const mirB = (b: Body): Body => ({ ...b, l: b.r, r: b.l, tilt: -(b.tilt ?? 0), head: -(b.head ?? 0) });
const bodyOf = (k: Key) => { const b = PO[k.p] ?? PO.rest; return k.mir ? mirB(b) : b; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpH = (a: HandK, b: HandK, k: number): HandK => ({
  h: [lerp(a.h[0], b.h[0], k), lerp(a.h[1], b.h[1], k)],
  pt: k < 0.5 ? a.pt : b.pt, open: k < 0.5 ? a.open : b.open, front: k < 0.5 ? a.front : b.front,
});

export type ActOut = { pose: Pose; expr?: Expr; tilt: number; headTilt: number; hop: number; look?: number; swaps: number[] };
/** evaluate a timeline at narration time t. fade = 0..1 envelope for idle life (0 at the loop seam) */
export const evalTrack = (tr: Track, t: number, seed: number, fade = 1, lprop: Prop = null): ActOut => {
  let i = 0;
  while (i + 1 < tr.length && t >= tr[i + 1].t - LEAD) i++;
  const k = tr[i], prev = tr[Math.max(0, i - 1)];
  const u = i === 0 ? 1 : (t - (k.t - LEAD)) / (k.dur ?? 0.24);
  const w = u >= 1 ? 1 : back(u), B0 = bodyOf(prev), B1 = bodyOf(k);
  let l = lerpH(B0.l, B1.l, w), r = lerpH(B0.r, B1.r, w);
  let tilt = lerp(prev.tilt ?? B0.tilt ?? 0, k.tilt ?? B1.tilt ?? 0, w);
  let head = lerp(prev.head ?? B0.head ?? 0, k.head ?? B1.head ?? 0, w);
  const look = k.look !== undefined || prev.look !== undefined ? lerp(prev.look ?? 0, k.look ?? 0, w) : undefined;
  // repeated motion (laugh shake, waving, typing): ramps in with the key
  const o = k.osc;
  if (o) {
    const ph = Math.sin(2 * Math.PI * o.hz * (t - k.t)), m = clamp01(u * 1.5) * fade;
    if (o.l) l = { ...l, h: [l.h[0] + o.l[0] * ph * m, l.h[1] + o.l[1] * ph * m] };
    if (o.r) r = { ...r, h: [r.h[0] + o.r[0] * ph * m, r.h[1] + o.r[1] * ph * m] };
    if (o.tilt) tilt += o.tilt * ph * m;
    if (o.head) head += o.head * Math.sin(2 * Math.PI * o.hz * (t - k.t) + 1.1) * m;
  }
  // idle life: breathing hands and a slow weight shift, never perfectly still (zero at the loop seam)
  const br = Math.sin(2 * Math.PI * 0.42 * t + seed * 1.7) * fade, sw = Math.sin(2 * Math.PI * 0.23 * t + seed * 2.3) * fade;
  l = { ...l, h: [l.h[0], l.h[1] + 0.012 * br] }; r = { ...r, h: [r.h[0], r.h[1] + 0.012 * br] };
  tilt += 0.8 * sw; head += 0.9 * Math.sin(2 * Math.PI * 0.31 * t + seed) * fade;
  // hops: a jump arc (metres) on keys that ask for one, a small dip for "drop"
  let hop = 0;
  for (const kk of tr) {
    if (kk.jump) { const x = (t - (kk.t - LEAD)) / 0.34; if (x > 0 && x < 1) hop += kk.jump * Math.sin(Math.PI * x); }
    if (kk.drop) { const x = (t - (kk.t - LEAD)) / 0.3; if (x > 0) hop -= kk.drop * Math.min(1, x); }
  }
  // expression: the latest key that sets one
  let expr: Expr | undefined;
  for (let j = i; j >= 0; j--) if (tr[j].e) { expr = tr[j].e; break; }
  const swaps: number[] = [];
  for (let j = 1; j < tr.length; j++) if (tr[j].e && tr[j].e !== tr[j - 1].e) swaps.push(tr[j].t);
  const q = (v: number) => Math.round(v * 400) / 400;
  const H = (x: HandK) => ({ h: [q(x.h[0]), q(x.h[1])] as [number, number], pt: x.pt, open: x.open, front: x.front });
  return { pose: { l: H(l), r: H(r), lprop }, expr, tilt: Math.round(tilt * 8) / 8, headTilt: Math.round(head * 8) / 8, hop, look, swaps };
};

// ---------------- the acting, shot by shot (times = narration word onsets, words.json on clean.wav) ----------------
const K = (t: number, p: string, o: Partial<Key> = {}): Key => ({ t, p, ...o });
const WAVE: Osc = { r: [0.13, 0], hz: 3 };
/** props that differ from the staging defaults: [shot][role] */
export const PROPS: Record<number, Record<string, Prop>> = {
  10: { foreman: "ledger" }, 11: { foreman: "ledger" }, 12: { foreman: "ledger" }, 24: { mary: "sixpence" },
};
// the knocker-upper's pole is held in the canvas-left hand (world.ts / cast.ts attach the 3D pole to that hand)
PO.poleUp = { l: A(0.55, -0.5), r: A(-0.08, 0.28, { front: true }) };
PO.poleTip = { l: A(0.55, -0.5), r: A(0.42, -0.95) };                          // touches the peak of his cap
PO.poleScratch = { l: A(0.55, -0.5), r: A(0.5, -0.88) };
PO.poleShrug = { l: A(0.55, -0.5), r: A(0.78, 0.12, { open: true }), head: 6 };
PO.carry = { l: A(0.62, 0.36), r: REST };
PO.blow = { l: A(0.1, 0.45, { front: true }), r: A(0.3, -0.5, { front: true }) };   // pea shooter at the lips
PO.showSix = { l: A(0.5, 0.9), r: A(0.55, -0.12) };
export const TRACKS: Record<number, Record<string, Track>> = {
  // "Two hundred years ago, most workers"
  1: { worker: [K(0, "rest", { e: "nervous", look: -0.6 }), K(1.22, "chin", { e: "nervous", look: -0.6 })] },
  // "couldn't afford an alarm clock."
  2: { worker: [K(2.08, "chin", { e: "nervous", look: -0.5 }), K(2.39, "bothFace", { e: "shock" }), K(3.29, "slump", { e: "sad", look: -0.4 })] },
  // "They paid a stranger" (walks in)
  4: { ku: [K(5.62, "carry", { e: "neutral" })] },
  // "to hit their window"
  5: { ku: [K(6.75, "poleUp", { e: "neutral", look: -0.5 })] },
  // "With a stick."
  6: { ku: [K(7.86, "poleUp", { e: "neutral" }), K(8.06, "poleUp", { e: "smug", look: 0.3 })] },
  // "This was a real job:"
  7: { ku: [K(8.74, "poleUp", { e: "smile" }), K(9.39, "poleTip", { e: "grin" })] },
  // "the knocker-upper."
  8: { ku: [K(10.31, "poleTip", { e: "grin" }), K(10.95, "poleUp", { e: "smug" })] },
  // "shifts started before sunrise,"
  10: { foreman: [K(12.69, "hold", { e: "stern" }), K(13.93, "hold", { e: "stern", look: 0.5 })] },
  // "and if you were late,"
  11: { foreman: [K(14.68, "hold", { e: "smug" })] },
  // "you lost pay."
  12: { foreman: [K(15.62, "hold", { e: "stern" }), K(15.82, "wagL", { e: "stern" })], late: [K(15.62, "shrug", { e: "sad" }), K(16.17, "slump", { e: "sad" })] },
  // "So every morning, the knocker-upper walked the dark streets"
  13: { ku: [K(16.62, "carry", { e: "neutral" }), K(18.49, "carry", { e: "whistle" })] },
  // "with a long pole,"
  14: { ku: [K(19.72, "poleUp", { e: "neutral", look: -0.6 })] },
  // "And they didn't leave"
  16: { ku: [K(22.49, "crossed", { e: "stern", look: -0.6, osc: { tilt: 2.5, hz: 2.2 } })] },
  // "until you showed up at the glass."
  17: { ku: [K(23.38, "poleUp", { e: "neutral" }), K(24.25, "poleTip", { e: "grin" })], sleeper: [K(23.6, "rest", { e: "pained" }), K(24.3, "wave", { e: "stern", osc: WAVE })] },
  // "Mary Smith"
  19: { mary: [K(25.89, "rest", { e: "smile" })] },
  // "skipped the pole."
  20: { mary: [K(26.6, "rest", { e: "smug" }), K(26.99, "stop", { e: "smug", look: -0.8 })] },
  // "She used a pea shooter."
  21: { mary: [K(27.5, "rest", { e: "smile" }), K(28.05, "blow", { e: "smug", mir: true })] },
  // "Every morning, she fired dried peas"
  22: { mary: [K(28.9, "blow", { e: "smug", mir: true }), K(29.83, "blow", { e: "whistle", mir: true, osc: { head: 3, hz: 2.8 } })] },
  23: { mary: [K(31.17, "blow", { e: "whistle", mir: true, osc: { head: 3, hz: 2.8 } })] },
  // "Sixpence a week."
  24: { mary: [K(32.48, "showSix", { e: "grin" })] },
  // "But here's the question everyone asks:"
  25: { ku: [K(33.53, "poleUp", { e: "neutral" }), K(33.98, "poleUp", { e: "nervous", look: 0.6 })], nA: [K(33.53, "crossed", { e: "stern" }), K(34.46, "point", { e: "stern" })],
    nB: [K(33.53, "hips", { e: "stern" }), K(34.46, "pointL", { e: "stern" })] },
  // "who woke up the knocker-upper?"
  26: { ku: [K(35.5, "poleScratch", { e: "nervous", look: -0.5 }), K(36.21, "poleScratch", { e: "dazed", look: 0.3 })] },
  // "Nobody."
  27: { ku: [K(37.05, "poleShrug", { e: "neutral" })] },
  // "They worked all night"
  28: { ku: [K(37.61, "poleUp", { e: "whistle", look: -0.5 })] },
  // "finally put them out of work."
  31: { ku: [K(41.5, "carry", { e: "sad" })] },
  // "But in some towns, they were still knocking"
  32: { ku70: [K(42.52, "poleUp", { e: "smile" })], disco: [K(43.9, "rest", { e: "pained" })] },
  // "in the 1970s."
  33: { ku70: [K(44.69, "poleTip", { e: "grin" })], disco: [K(44.69, "wave", { e: "grin", osc: WAVE })] },
  // "just remember:"
  35: { guy: [K(48.2, "chin", { e: "neutral", look: -0.3 }), K(48.43, "pointUp", { e: "smile", look: 0 })] },
};
