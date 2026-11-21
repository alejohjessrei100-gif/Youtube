// "Point at One Person" cast: original toon people in the locked look (squircle heads, wide clavicles, sharp elbows,
// straight arms at rest, hands).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, KID_BUILD, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** the man who collapses: grey suit, a tie, thinning hair */
export const VICTIM: CharacterSpec = {
  height: 1.78, build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#5a6070", inner: "#e8ecf0", bottom: "#4a4e5a", shoes: CLOTH.graphite, accent: "#a83030" }, hair: "sides", hairColor: HAIR.espresso, face: F, seed: 901 },
};
/** the girl, about ten: a yellow raincoat, a bob, a big voice */
export const GIRL: CharacterSpec = {
  height: 1.3, build: { ...KID_BUILD },
  look: { skin: SKIN.brown, outfit: "jacket", colors: { top: "#f2c230", inner: "#3a6aa8", bottom: "#3a4a7a", shoes: "#c83a3a", accent: "#f4f0e0" }, hair: "curly", hairColor: HAIR.black, face: { ...F, lash: true }, seed: 903 },
};
/** the man in the red jacket: headphones round his neck, a coffee */
export const RED: CharacterSpec = {
  height: 1.8, build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#c8302a", inner: "#2a2a30", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: "#f0f0f0" }, hair: "swoop", hairColor: HAIR.auburn, face: F, seed: 905 },
};
export const MEDIC_A: CharacterSpec = {
  height: 1.76, build: B,
  look: { skin: SKIN.tan, outfit: "shirt", colors: { top: "#2a6a4a", inner: "#2a6a4a", bottom: "#24302a", shoes: CLOTH.graphite, accent: "#e8e040" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#24302a", face: F, seed: 907 },
};
export const MEDIC_B: CharacterSpec = {
  height: 1.68, build: B,
  look: { skin: SKIN.fair, outfit: "shirt", colors: { top: "#2a6a4a", inner: "#2a6a4a", bottom: "#24302a", shoes: CLOTH.graphite, accent: "#e8e040" }, hair: "bun", hairColor: HAIR.honey, face: { ...F, lash: true }, seed: 909 },
};
/** the 1968 lab students (one alone, one "in a group") */
export const STUDENT_A: CharacterSpec = {
  height: 1.76, build: B,
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: CLOTH.mustard, inner: "#f0ead8", bottom: CLOTH.khaki, shoes: CLOTH.chestnut, accent: "#f0ead8" }, hair: "swoop", hairColor: HAIR.honey, glasses: "#2a2020", face: F, seed: 911 },
};
export const STUDENT_B: CharacterSpec = {
  height: 1.66, build: B,
  look: { skin: SKIN.medium, outfit: "sweater", colors: { top: CLOTH.teal, inner: "#f0ead8", bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: "#f0ead8" }, hair: "bob", hairColor: HAIR.espresso, face: { ...F, lash: true }, seed: 913 },
};
// commuters (reused far apart)
const C = (seed: number, h: number, skin: string, top: string, bottom: string, hair: CharacterSpec["look"]["hair"], hairColor: string, extra: Partial<CharacterSpec["look"]> = {}, build: Partial<typeof B> = B): CharacterSpec => ({
  height: h, build, look: { skin, outfit: "jacket", colors: { top, inner: "#ece6da", bottom, shoes: CLOTH.graphite, accent: "#d8d0c0" }, hair, hairColor, face: F, seed, ...extra },
});
export const COMMUTERS: CharacterSpec[] = [
  C(921, 1.74, SKIN.medium, CLOTH.cobalt, CLOTH.charcoal, "crop", HAIR.black),
  C(923, 1.66, SKIN.fair, CLOTH.sage, CLOTH.denim, "bun", HAIR.auburn, { face: { ...F, lash: true } }),
  C(925, 1.82, SKIN.deep, CLOTH.charcoal, CLOTH.charcoal, "none", HAIR.black, { hat: "beanie", hatColor: CLOTH.mustard }),
  C(927, 1.62, SKIN.light, CLOTH.rose, CLOTH.cocoa, "bob", HAIR.honey, { face: { ...F, lash: true } }),
  C(929, 1.7, SKIN.tan, CLOTH.khaki, CLOTH.denim, "curly", HAIR.espresso, { glasses: "#2a2020" }),
  C(931, 1.68, SKIN.fair, "#6a4a8a", CLOTH.charcoal, "sides", HAIR.silver, { face: { ...F, lines: true } }, { ...ELDER_BUILD }),
  C(933, 1.78, SKIN.brown, CLOTH.teal, CLOTH.khaki, "swoop", HAIR.black),
  C(935, 1.64, SKIN.medium, CLOTH.brick, CLOTH.denim, "bun", HAIR.black, { face: { ...F, lash: true } }),
];
