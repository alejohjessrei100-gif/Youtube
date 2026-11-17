// The gull short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Walt, the retired keeper: a navy fisherman's sweater, a red knit beanie, a white beard, round glasses */
export const WALT: CharacterSpec = {
  height: 1.64,
  build: { ...ELDER_BUILD, shoulders: 0.98 },
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: "#2a3a5a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "sides", hairColor: HAIR.snow, hat: "beanie", hatColor: "#9a2a2a", hatBand: "#e8e0d4", beard: true, glasses: "#5a4a3a", face: { ...F, lines: true }, seed: 61 },
};
/** two coast guard officers: navy jackets, caps */
export const OFF1: CharacterSpec = {
  height: 1.8,
  build: B,
  look: { skin: SKIN.medium, outfit: "jacket", colors: { top: "#1f3a6a", inner: "#f4f1e8", bottom: "#1f2a44", shoes: CLOTH.graphite, accent: "#e8b830" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1f3a6a", mustache: true, face: F, seed: 63 },
};
export const OFF2: CharacterSpec = {
  height: 1.7,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#1f3a6a", inner: "#f4f1e8", bottom: "#1f2a44", shoes: CLOTH.graphite, accent: "#e8b830" }, hair: "bob", hairColor: HAIR.auburn, hat: "cap", hatColor: "#1f3a6a", face: { ...F, lash: true }, seed: 67 },
};
