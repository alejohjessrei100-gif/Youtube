// Three Flashes cast: original toon people in the locked look (squircle heads, wide clavicles, sharp elbows, straight
// arms at rest, hands).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Tom, 76: a brown cardigan over blue pyjamas, a flat cap, glasses, pink fuzzy slippers */
export const TOM: CharacterSpec = {
  height: 1.72,
  build: { ...ELDER_BUILD },
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: "#7a5a3e", inner: "#a8c0e0", bottom: "#8ea8d4", shoes: "#e890b0", accent: "#d8c8a8" }, hair: "sides", hairColor: HAIR.snow, hat: "flat", hatColor: "#4a3e34", glasses: "#3a2a20", face: { ...F, lines: true }, seed: 801 },
};
/** the night guard: black security shirt with a gold badge, a cap, a short beard */
export const GUARD: CharacterSpec = {
  height: 1.84,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.deep, outfit: "shirt", colors: { top: "#2b2d35", inner: "#2b2d35", bottom: "#24262c", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1a1c22", beard: "#1e1a1a", face: { ...F, brow: 1.4 }, seed: 803 },
};
/** Ellen, about 75: a pale-blue hospital gown, a white bun, round glasses */
export const ELLEN: CharacterSpec = {
  height: 1.56,
  build: { ...ELDER_BUILD },
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: "#a8c8e0", inner: "#f4efe6", bottom: "#a8c8e0", shoes: "#f4efe6", accent: "#f4efe6" }, hair: "bun", hairColor: HAIR.snow, glasses: "#6a4a5a", face: { ...F, lash: true, lines: true }, seed: 805 },
};
/** Tom in 1974: a brown leather jacket, a mustard shirt, flared denim, a brown swoop */
export const YOUNG_TOM: CharacterSpec = {
  height: 1.8,
  build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#7a4a24", inner: "#e0b040", bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: "#e0b040" }, hair: "swoop", hairColor: HAIR.espresso, face: F, seed: 807 },
};
/** Ellen in 1974: a rose sweater, a honey bob */
export const YOUNG_ELLEN: CharacterSpec = {
  height: 1.64,
  build: B,
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: CLOTH.rose, inner: "#f4efe6", bottom: "#4a3a52", shoes: CLOTH.chestnut, accent: "#f4efe6" }, hair: "bob", hairColor: HAIR.honey, face: { ...F, lash: true }, seed: 809 },
};
export const NURSE_A: CharacterSpec = {
  height: 1.66,
  build: B,
  look: { skin: SKIN.brown, outfit: "shirt", colors: { top: "#3a9a94", inner: "#3a9a94", bottom: "#3a9a94", shoes: "#f0f0f0", accent: "#f0f0f0" }, hair: "bun", hairColor: HAIR.black, face: { ...F, lash: true }, seed: 811 },
};
export const NURSE_B: CharacterSpec = {
  height: 1.74,
  build: B,
  look: { skin: SKIN.fair, outfit: "shirt", colors: { top: "#6a7ac8", inner: "#6a7ac8", bottom: "#6a7ac8", shoes: "#f0f0f0", accent: "#f0f0f0" }, hair: "curly", hairColor: HAIR.auburn, face: F, seed: 813 },
};
