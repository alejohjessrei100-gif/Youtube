// Character style directions, from very cartoony to semi-realistic. Each one is only a set of overrides on the
// shipped family (char/family.ts): proportions (Build) and face style. Pick one, then tune its numbers.
//
// "Heads tall" = body height / head height. The shipped family is ~3.3 heads tall; a real adult is ~7.5.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import type { Build, FaceStyle } from "../inkbeat/char/family";

export type StyleId = "chibi" | "toon" | "feature" | "heroic" | "semireal";

export type CharStyle = {
  id: StyleId;
  name: string;
  /** one line on what it is good for */
  note: string;
  /** approximate heads tall for an adult */
  heads: string;
  adult: Partial<Build>;
  kid: Partial<Build>;
  face: Partial<FaceStyle>;
};

export const STYLES: CharStyle[] = [
  {
    id: "chibi",
    name: "Chibi",
    heads: "~2 heads",
    note: "Huge head, tiny body. Cutest and most readable on a phone; acting is mostly the face.",
    adult: { headScale: 1.6, torso: "barrel", torsoWidth: 0.95, torsoHeight: 0.72, limb: 0.95, armLength: 0.72, hand: 1.0, neck: 0.4 },
    kid: { headScale: 1.85, torso: "barrel", torsoWidth: 0.9, torsoHeight: 0.66, limb: 0.9, armLength: 0.62, hand: 0.95, neck: 0.3 },
    face: { blush: 0.5, brow: 1.1, nose: "button" },
  },
  {
    id: "toon",
    name: "Classic toon",
    heads: "~3.3 heads",
    note: "The shipped family: big egg head, chunky body, thick ink. Friendly kids' cartoon look.",
    adult: { torso: "block", torsoWidth: 1.02 },
    kid: { headScale: 1.32, torso: "barrel", torsoWidth: 0.96, torsoHeight: 0.9, limb: 0.9, armLength: 0.8, hand: 0.92, neck: 0.6 },
    face: { blush: 0.3, brow: 1.1 },
  },
  {
    id: "feature",
    name: "Animated feature",
    heads: "~4.5 heads",
    note: "Big expressive head on a believable body. The look of most 3D animated films; a good all-rounder.",
    adult: { headScale: 0.74, torso: "block", torsoWidth: 0.98, torsoHeight: 1.08, limb: 0.86, armLength: 1.22, hand: 0.9, neck: 1.3 },
    kid: { headScale: 1.0, torso: "barrel", torsoWidth: 0.92, torsoHeight: 0.98, limb: 0.82, armLength: 1.0, hand: 0.85, neck: 0.9 },
    face: { blush: 0.22, brow: 1.0 },
  },
  {
    id: "heroic",
    name: "Stylized heroic",
    heads: "~6 heads",
    note: "Small head, broad shoulders, long limbs. Action, adventure and history stories.",
    adult: { headScale: 0.56, torso: "block", torsoWidth: 1.04, torsoDepth: 1.0, torsoHeight: 1.22, limb: 0.95, armLength: 1.42, hand: 0.9, neck: 1.7 },
    kid: { headScale: 0.82, torso: "barrel", torsoWidth: 0.86, torsoHeight: 1.05, limb: 0.82, armLength: 1.15, hand: 0.82, neck: 1.1 },
    face: { blush: 0.12, brow: 1.2, nose: "hook" },
  },
  {
    id: "semireal",
    name: "Semi-realistic",
    heads: "~7 heads",
    note: "Close to real proportions, slim limbs, little blush. Documentary and true-story Shorts.",
    adult: { headScale: 0.47, torso: "block", torsoWidth: 0.8, torsoDepth: 0.9, torsoHeight: 1.3, limb: 0.74, armLength: 1.55, hand: 0.72, neck: 2.0 },
    kid: { headScale: 0.68, torso: "barrel", torsoWidth: 0.78, torsoHeight: 1.12, limb: 0.7, armLength: 1.25, hand: 0.7, neck: 1.3 },
    face: { blush: 0.06, brow: 0.85, nose: "hook" },
  },
];

export const styleOf = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[1];

/** the same three people drawn in a style: a man, a woman and a kid (so styles compare like for like) */
export const trioOf = (s: CharStyle): { key: string; spec: CharacterSpec }[] => [
  {
    key: "man",
    spec: {
      height: 1.78,
      build: { ...s.adult, shoulders: 1.15 }, // wide clavicles
      look: {
        skin: SKIN.medium,
        outfit: "jacket",
        colors: { top: CLOTH.teal, inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn },
        hair: "swoop",
        hairColor: HAIR.espresso,
        face: { ...s.face },
        seed: 3,
      },
    },
  },
  {
    key: "woman",
    spec: {
      height: 1.66,
      build: { ...s.adult, torso: "block", torsoWidth: (s.adult.torsoWidth ?? 1) * 0.84, shoulders: 0.92 }, // slimmer, narrower clavicles than the men
      look: {
        skin: SKIN.brown,
        outfit: "sweater",
        colors: { top: CLOTH.mustard, inner: CLOTH.cream, bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: CLOTH.brass },
        hair: "bob",
        hairColor: HAIR.black,
        face: { ...s.face, lash: true, eyeColor: "#2a1d1a" },
        seed: 7,
      },
    },
  },
  {
    key: "kid",
    spec: {
      height: 1.2,
      build: s.kid,
      look: {
        skin: SKIN.light,
        outfit: "overalls",
        colors: { top: CLOTH.cobalt, inner: CLOTH.brick, bottom: CLOTH.cobalt, shoes: CLOTH.brick, accent: CLOTH.brass },
        hair: "curly",
        hairColor: HAIR.auburn,
        face: { ...s.face, nose: "button", blush: Math.max(0.2, (s.face.blush ?? 0.3) + 0.15) },
        seed: 6,
      },
    },
  },
];
