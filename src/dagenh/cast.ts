// The Dagen H short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };

/** a driver in a 1960s jacket, the hero of the street scenes */
export const DRIVER: CharacterSpec = {
  height: 1.74,
  build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#3a5a8a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn }, hair: "swoop", hairColor: HAIR.honey, face: F, seed: 7 },
};
/** a second driver: sweater, glasses */
export const DRIVER2: CharacterSpec = {
  height: 1.66,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: "#b8433a", inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "bob", hairColor: HAIR.auburn, glasses: true, face: { ...F, lash: true }, seed: 15 },
};
/** a traffic policeman */
export const POLICE: CharacterSpec = {
  height: 1.8,
  build: B,
  look: { skin: SKIN.medium, outfit: "jacket", colors: { top: "#1f2a4a", inner: "#e8e8ee", bottom: "#1f2a4a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1f2a4a", mustache: true, face: F, seed: 19 },
};
/** a voter in 1955 */
export const VOTER: CharacterSpec = {
  height: 1.62,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "apron", colors: { top: CLOTH.sage, inner: CLOTH.rose, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "bun", hairColor: HAIR.silver, glasses: true, face: { ...F, lines: true }, seed: 27 },
};
/** a government official */
export const OFFICIAL: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.tan, outfit: "jacket", colors: { top: "#2b2d35", inner: "#f4f1e8", bottom: "#2b2d35", shoes: CLOTH.graphite, accent: "#2a5a9a" }, hair: "sides", hairColor: HAIR.silver, glasses: "#2a2a2a", face: F, seed: 33 },
};
/** a statistics clerk */
export const CLERK: CharacterSpec = {
  height: 1.7,
  build: B,
  look: { skin: SKIN.brown, outfit: "vest", colors: { top: "#7a5a3a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "curly", hairColor: HAIR.black, face: F, seed: 41 },
};
