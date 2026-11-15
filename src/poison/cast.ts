// The poison short's cast: our own simple toon people (big heads, readable faces), not likenesses of anyone and not
// copies of any channel's characters. Costumes come from the kit's outfits plus head props drawn in the set (crown,
// laurel, chef hat).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
export const KING: CharacterSpec = { height: 1.72, build: { ...B, torso: "barrel" }, look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#8e1f2e", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "swoop", hairColor: HAIR.auburn, beard: true, face: F, seed: 5 } };
export const TASTER: CharacterSpec = { height: 1.64, build: B, look: { skin: SKIN.tan, outfit: "vest", colors: { top: CLOTH.khaki, inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, face: F, seed: 9 } };
export const ROMAN_TASTER: CharacterSpec = { height: 1.64, build: B, look: { skin: SKIN.tan, outfit: "shirt", colors: { top: "#e9e1cc", inner: "#e9e1cc", bottom: "#e9e1cc", shoes: CLOTH.chestnut, accent: CLOTH.khaki }, hair: "crop", hairColor: HAIR.black, face: F, seed: 9 } };
export const CLAUDIUS: CharacterSpec = { height: 1.7, build: { ...B, torso: "barrel" }, look: { skin: SKIN.fair, outfit: "shirt", colors: { top: "#6a2a8a", inner: "#efe6d2", bottom: "#efe6d2", shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "sides", hairColor: HAIR.silver, face: F, seed: 13 } };
export const MITHRIDATES: CharacterSpec = { height: 1.78, build: B, look: { skin: SKIN.medium, outfit: "jacket", colors: { top: "#1f4a7a", inner: CLOTH.mustard, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "curly", hairColor: HAIR.espresso, beard: true, face: F, seed: 21 } };
export const KINGS3: CharacterSpec[] = [
  { ...KING },
  { height: 1.66, build: B, look: { skin: SKIN.brown, outfit: "jacket", colors: { top: "#1f6a4a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, mustache: true, face: F, seed: 27 } },
  { height: 1.7, build: B, look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#2a3a8a", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.brass }, hair: "sides", hairColor: HAIR.honey, face: F, seed: 31 } },
];
export const SURGEON: CharacterSpec = { height: 1.74, build: B, look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#1d1f26", inner: "#f4f1e8", bottom: "#1d1f26", shoes: CLOTH.graphite, accent: CLOTH.horn }, hair: "sides", hairColor: HAIR.espresso, beard: true, glasses: false, face: F, seed: 37 } };
export const COOK: CharacterSpec = { height: 1.68, build: { ...B, torso: "barrel" }, look: { skin: SKIN.medium, outfit: "apron", colors: { top: "#f4f1e8", inner: CLOTH.sage, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair: "crop", hairColor: HAIR.espresso, mustache: true, face: F, seed: 41 } };
export const GUARD: CharacterSpec = { height: 1.82, build: B, look: { skin: SKIN.tan, outfit: "vest", colors: { top: "#4a4e5a", inner: CLOTH.oxblood, bottom: CLOTH.charcoal, shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "beanie", hatColor: "#2a2c34", face: F, seed: 45 } };
