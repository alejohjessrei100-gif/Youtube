// The Chess Crow short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const KID = styleOf("toon").kid;
const F = { blush: 0.3, brow: 1.25 };
/** Mr. Okafor, about 70: a mustard cardigan, round glasses, a grey mustache (no cap: it hid his face when he looked down) */
export const OKAFOR: CharacterSpec = {
  height: 1.74,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.deep, outfit: "sweater", colors: { top: "#c8922e", inner: "#efe6d2", bottom: "#4a4a58", shoes: CLOTH.chestnut, accent: "#6a4a2a" }, hair: "sides", hairColor: HAIR.silver, glasses: "#2a2420", mustache: "#d8d4cc", face: { ...F, lines: true }, seed: 211 },
};
/** the park groundskeeper: a green work shirt and cap */
export const STAFF: CharacterSpec = {
  height: 1.78,
  build: B,
  look: { skin: SKIN.light, outfit: "overalls", colors: { top: "#3e7a4a", inner: "#e8e0c8", bottom: "#3e7a4a", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.honey, hat: "cap", hatColor: "#2e5a36", face: F, seed: 223 },
};
export const KID1: CharacterSpec = {
  height: 1.2,
  build: KID,
  look: { skin: SKIN.medium, outfit: "shirt", colors: { top: "#2e7ad8", inner: "#2e7ad8", bottom: "#2a2a3a", shoes: "#e8e8e8", accent: "#ffffff" }, hair: "curly", hairColor: HAIR.black, face: F, seed: 227 },
};
export const KID2: CharacterSpec = {
  height: 1.14,
  build: KID,
  look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#e05a8a", inner: "#f4e04a", bottom: "#4a5a9a", shoes: "#f4e04a", accent: "#ffffff" }, hair: "bun", hairColor: HAIR.auburn, face: { ...F, lash: true, blush: 0.5 }, seed: 229 },
};
