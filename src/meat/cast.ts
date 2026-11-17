// The Kentucky meat shower cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

export const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };

/** the woman making soap: a print dress under an apron, a bun, a sun bonnet */
export const WOMAN: CharacterSpec = {
  height: 1.66,
  build: { ...B, torso: "barrel", shoulders: 0.98 },
  look: { skin: SKIN.light, outfit: "apron", colors: { top: "#f2ead8", inner: "#4a6a9a", bottom: "#4a6a9a", shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "bun", hairColor: HAIR.auburn, hat: "sunhat", hatColor: "#e8dcb8", face: { ...F, lash: true }, seed: 12 },
};
/** two neighbors: overalls with a flat cap and a beard; a vest with a mustache */
export const MAN1: CharacterSpec = {
  height: 1.8,
  build: B,
  look: { skin: SKIN.tan, outfit: "overalls", colors: { top: "#4a5a7a", inner: "#c8b890", bottom: "#4a5a7a", shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.espresso, hat: "flat", hatColor: "#6a5a48", beard: true, face: F, seed: 34 },
};
export const MAN2: CharacterSpec = {
  height: 1.7,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "vest", colors: { top: "#7a3a2a", inner: "#efe6d2", bottom: CLOTH.khaki, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "sides", hairColor: HAIR.honey, mustache: true, face: F, seed: 38 },
};
/** two scientists */
export const SCI1: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#2b2d35", inner: "#f4f1e8", bottom: "#3b3d46", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "swoop", hairColor: HAIR.silver, glasses: "#c8a040", beard: true, face: F, seed: 44 },
};
export const SCI2: CharacterSpec = {
  height: 1.68,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.medium, outfit: "vest", colors: { top: "#5a4a3a", inner: "#f4f1e8", bottom: "#3b3d46", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "sides", hairColor: HAIR.black, mustache: true, face: F, seed: 48 },
};
