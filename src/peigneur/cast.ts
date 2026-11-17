// The Lake Peigneur short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

export const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };

/** the fisherman: straw hat, khaki vest, a mustache */
export const FISHER: CharacterSpec = {
  height: 1.74,
  build: B,
  look: { skin: SKIN.tan, outfit: "vest", colors: { top: CLOTH.khaki, inner: "#e8e2cc", bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.espresso, hat: "sunhat", mustache: true, face: F, seed: 5 },
};
/** two drill-crew roughnecks: orange vests, yellow hard hats */
export const CREW1: CharacterSpec = {
  height: 1.8,
  build: B,
  look: { skin: SKIN.light, outfit: "vest", colors: { top: "#e8742a", inner: "#cfd4da", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.auburn, hat: "cap", hatColor: "#f0b820", face: F, seed: 13 },
};
export const CREW2: CharacterSpec = {
  height: 1.7,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.brown, outfit: "vest", colors: { top: "#e8742a", inner: "#cfd4da", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#f0b820", mustache: true, face: F, seed: 17 },
};
/** three salt miners: gray coveralls, orange hard hats */
export const MINER1: CharacterSpec = {
  height: 1.74,
  build: B,
  look: { skin: SKIN.fair, outfit: "overalls", colors: { top: "#5a6a7a", inner: "#cfc4a8", bottom: "#5a6a7a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "swoop", hairColor: HAIR.honey, hat: "cap", hatColor: "#f08a20", face: F, seed: 21 },
};
export const MINER2: CharacterSpec = {
  height: 1.66,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.medium, outfit: "overalls", colors: { top: "#5a6a7a", inner: "#b8c4d0", bottom: "#5a6a7a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "curly", hairColor: HAIR.black, hat: "cap", hatColor: "#f08a20", beard: true, face: F, seed: 25 },
};
export const MINER3: CharacterSpec = {
  height: 1.78,
  build: B,
  look: { skin: SKIN.deep, outfit: "overalls", colors: { top: "#5a6a7a", inner: CLOTH.cream, bottom: "#5a6a7a", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#f08a20", face: F, seed: 29 },
};
