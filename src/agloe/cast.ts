// The Agloe short's cast: original toon people from the one family (no likenesses of the real mapmakers).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

export const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };

/** the mapmaker: waistcoat, sleeves, round glasses, a mustache */
export const MAKER: CharacterSpec = {
  height: 1.74,
  build: B,
  look: { skin: SKIN.light, outfit: "vest", colors: { top: "#5a3e7a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "swoop", hairColor: HAIR.espresso, glasses: "#3a2a22", mustache: true, face: F, seed: 4 },
};
/** his partner */
export const PARTNER: CharacterSpec = {
  height: 1.7,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.tan, outfit: "jacket", colors: { top: "#2e6a8a", inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.horn }, hair: "crop", hairColor: HAIR.honey, face: F, seed: 11 },
};
/** the man from the other map company */
export const REP: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.medium, outfit: "jacket", colors: { top: "#2b2d35", inner: "#f4f1e8", bottom: "#2b2d35", shoes: CLOTH.graphite, accent: "#9a2a2a" }, hair: "sides", hairColor: HAIR.silver, mustache: true, face: F, seed: 23 },
};
/** the man who built the store */
export const BUILDER: CharacterSpec = {
  height: 1.78,
  build: B,
  look: { skin: SKIN.brown, outfit: "overalls", colors: { top: CLOTH.denim, inner: CLOTH.brick, bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "flat", hatColor: "#6a5a48", face: F, seed: 31 },
};
