// The Maple Street film's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Walt, 80: a brown cardigan, round glasses, a white mustache, silver side hair */
export const WALT: CharacterSpec = {
  height: 1.7,
  build: { ...ELDER_BUILD },
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: "#8a5a3a", inner: "#efe6d2", bottom: "#4a4a58", shoes: CLOTH.chestnut, accent: "#d8c090" }, hair: "sides", hairColor: HAIR.snow, glasses: "#3a2a20", mustache: "#f2f0ea", face: { ...F, lines: true }, seed: 501 },
};
/** Walt at night: the same man in a dark hooded jacket (the glasses and the white mustache still show: a fair clue) */
export const WALT_HOOD: CharacterSpec = { ...WALT, look: { ...WALT.look, outfit: "jacket", colors: { top: "#2e3a52", inner: "#8a2e2e", bottom: "#23232c", shoes: CLOTH.graphite, accent: "#c8c8d0" }, hat: "hood", hatColor: "#2e3a52" } };
export const WALT_HOOD_DOWN: CharacterSpec = { ...WALT_HOOD, look: { ...WALT_HOOD.look, hat: "hoodDown" } };
export const OFFICER: CharacterSpec = {
  height: 1.82,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.brown, outfit: "shirt", colors: { top: "#2a3a5e", inner: "#2a3a5e", bottom: "#1e2430", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1e2a44", face: F, seed: 503 },
};
/** Mrs. Alvarez, about 70: a teal cardigan, a grey bob, glasses */
export const ALVAREZ: CharacterSpec = {
  height: 1.6,
  build: { ...B },
  look: { skin: SKIN.tan, outfit: "sweater", colors: { top: "#2e8a86", inner: "#f4ead6", bottom: "#5a3a5a", shoes: CLOTH.chestnut, accent: "#f4ead6" }, hair: "bob", hairColor: HAIR.silver, glasses: "#5a2a3a", face: { ...F, lash: true, blush: 0.45 }, seed: 507 },
};
export const NEIGH_A: CharacterSpec = {
  height: 1.78,
  build: B,
  look: { skin: SKIN.medium, outfit: "shirt", colors: { top: "#d8a03a", inner: "#d8a03a", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: "#ffffff" }, hair: "curly", hairColor: HAIR.black, face: F, seed: 509 },
};
export const NEIGH_B: CharacterSpec = {
  height: 1.66,
  build: B,
  look: { skin: SKIN.fair, outfit: "vest", colors: { top: "#7a3a5a", inner: "#efe6d2", bottom: "#2a2a3a", shoes: CLOTH.chestnut, accent: "#c8a040" }, hair: "bun", hairColor: HAIR.auburn, face: { ...F, lash: true }, seed: 511 },
};
