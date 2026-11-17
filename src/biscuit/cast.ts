// The Biscuit short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const KID = styleOf("toon").kid;
const F = { blush: 0.3, brow: 1.25 };
/** Lily, 8: a red raincoat over a yellow shirt, pigtails (bun), rain boots */
export const LILY: CharacterSpec = {
  height: 1.22,
  build: KID,
  look: { skin: SKIN.medium, outfit: "jacket", colors: { top: "#d8382e", inner: "#f4c430", bottom: "#3a5a9a", shoes: "#f4c430", accent: "#ffffff" }, hair: "bun", hairColor: HAIR.espresso, face: { ...F, lash: true, blush: 0.55 }, seed: 113 },
};
/** the mail carrier: a grey-blue uniform, a cap, a satchel (drawn as a prop) */
export const CARRIER: CharacterSpec = {
  height: 1.76,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.tan, outfit: "shirt", colors: { top: "#6a86a8", inner: "#6a86a8", bottom: "#2a3a5a", shoes: CLOTH.graphite, accent: "#e8e0d0" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#2a3a5a", mustache: true, face: F, seed: 127 },
};
/** neighbors: a man in a bathrobe, a woman with a coffee mug, an old man with a newspaper */
export const ROBE: CharacterSpec = {
  height: 1.8,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: "#7a4a8a", inner: "#efe6d2", bottom: "#4a6a8a", shoes: "#8a6a4a", accent: "#efe6d2" }, hair: "swoop", hairColor: HAIR.honey, face: F, seed: 131 },
};
export const MUG: CharacterSpec = {
  height: 1.68,
  build: B,
  look: { skin: SKIN.brown, outfit: "sweater", colors: { top: CLOTH.teal, inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "curly", hairColor: HAIR.black, glasses: "#3a2a20", face: { ...F, lash: true }, seed: 137 },
};
export const PAPER: CharacterSpec = {
  height: 1.7,
  build: { ...ELDER_BUILD },
  look: { skin: SKIN.light, outfit: "vest", colors: { top: "#8a6a3a", inner: "#efe6d2", bottom: "#4a4a52", shoes: CLOTH.chestnut, accent: "#c8a040" }, hair: "sides", hairColor: HAIR.silver, hat: "flat", hatColor: "#5a5a4a", mustache: true, face: { ...F, lines: true }, seed: 139 },
};
