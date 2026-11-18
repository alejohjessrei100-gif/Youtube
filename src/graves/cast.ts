// The Graves short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Sheriff Dale Ortiz: a khaki shirt, a wide-brim hat, a mustache */
export const SHERIFF: CharacterSpec = {
  height: 1.8,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.tan, outfit: "shirt", colors: { top: "#c8b078", inner: "#c8b078", bottom: "#4a4a3a", shoes: CLOTH.chestnut, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.black, hat: "sunhat", hatColor: "#6a4a2a", mustache: true, face: F, seed: 301 },
};
/** the stonemason, about 40: a canvas work jacket, a knit beanie, her hair in a bun */
export const MASON: CharacterSpec = {
  height: 1.7,
  build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#6a5a3a", inner: "#d8d0c0", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: "#c8b080" }, hair: "bun", hairColor: HAIR.auburn, hat: "beanie", hatColor: "#2e5a6a", face: { ...F, lash: true }, seed: 307 },
};
/** two townsfolk */
export const TOWN1: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.brown, outfit: "vest", colors: { top: "#4a6a8a", inner: "#efe6d2", bottom: CLOTH.charcoal, shoes: CLOTH.chestnut, accent: "#c8a040" }, hair: "curly", hairColor: HAIR.black, face: F, seed: 311 },
};
export const TOWN2: CharacterSpec = {
  height: 1.66,
  build: B,
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: "#a04a5a", inner: CLOTH.cream, bottom: "#3a3a4a", shoes: CLOTH.graphite, accent: CLOTH.cream }, hair: "bob", hairColor: HAIR.honey, glasses: "#3a2a20", face: { ...F, lash: true }, seed: 313 },
};
