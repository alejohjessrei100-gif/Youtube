// The Midnight School cast: original toon people in the locked look (squircle heads, wide clavicles, sharp elbows,
// straight arms at rest, hands). Six distinct night-school students (used twice, far apart, so their geometry is shared).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Mrs. Bell, about 75: a plum cardigan, a white bun, round glasses, a pearl-white blouse */
export const MRS_BELL: CharacterSpec = {
  height: 1.58,
  build: { ...ELDER_BUILD },
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: "#7a3a6a", inner: "#f4efe6", bottom: "#4a3a52", shoes: CLOTH.chestnut, accent: "#f4efe6" }, hair: "bun", hairColor: HAIR.snow, glasses: "#5a3a4a", face: { ...F, lash: true, lines: true }, seed: 701 },
};
/** the sergeant: a big man, a navy uniform, a peaked cap, a thick moustache */
export const SERGEANT: CharacterSpec = {
  height: 1.86,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.medium, outfit: "shirt", colors: { top: "#243a60", inner: "#243a60", bottom: "#1c2230", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1c2a48", mustache: "#2a2420", face: { ...F, brow: 1.4 }, seed: 703 },
};
export const OFFICER_A: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.fair, outfit: "shirt", colors: { top: "#2a4068", inner: "#2a4068", bottom: "#1c2230", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "swoop", hairColor: HAIR.auburn, hat: "cap", hatColor: "#1c2a48", face: F, seed: 705 },
};
export const OFFICER_B: CharacterSpec = {
  height: 1.7,
  build: B,
  look: { skin: SKIN.brown, outfit: "shirt", colors: { top: "#2a4068", inner: "#2a4068", bottom: "#1c2230", shoes: CLOTH.graphite, accent: "#e8c040" }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#1c2a48", face: { ...F, lash: true }, seed: 707 },
};
/** the neighbour: a plaid robe over pyjamas, a knitted night cap */
export const NEIGHBOUR: CharacterSpec = {
  height: 1.72,
  build: B,
  look: { skin: SKIN.tan, outfit: "jacket", colors: { top: "#8a3a3a", inner: "#cfd8e8", bottom: "#4a5a7a", shoes: CLOTH.chestnut, accent: "#e8d8b0" }, hair: "none", hat: "beanie", hatColor: "#c8a040", mustache: "#d8d0c4", face: F, seed: 709 },
};
// the night-school students
export const TRUCKER: CharacterSpec = {
  height: 1.84, build: { ...B, torso: "barrel" },
  look: { skin: SKIN.medium, outfit: "shirt", colors: { top: "#b8402e", inner: "#e8e0d0", bottom: "#3a4a6a", shoes: CLOTH.graphite, accent: "#f4efe6" }, hair: "crop", hairColor: HAIR.espresso, hat: "cap", hatColor: "#2e6a3a", beard: "#3d2a22", face: F, seed: 721 },
};
export const BAKER: CharacterSpec = {
  height: 1.7, build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "apron", colors: { top: "#f4f4f0", inner: "#d8d0c0", bottom: "#4a4a58", shoes: CLOTH.chestnut, accent: "#c8c8d0" }, hair: "curly", hairColor: HAIR.black, hat: "flat", hatColor: "#f2f0ea", mustache: "#26232b", face: F, seed: 723 },
};
export const JANITOR: CharacterSpec = {
  height: 1.76, build: B,
  look: { skin: SKIN.brown, outfit: "overalls", colors: { top: "#3a5a8a", inner: "#b8c0cc", bottom: "#3a5a8a", shoes: CLOTH.graphite, accent: "#e0b840" }, hair: "none", hat: "beanie", hatColor: "#4a4a52", face: F, seed: 725 },
};
export const OLD_MAN: CharacterSpec = {
  height: 1.68, build: { ...ELDER_BUILD },
  look: { skin: SKIN.tan, outfit: "vest", colors: { top: "#6a5a3a", inner: "#efe6d2", bottom: "#4a4034", shoes: CLOTH.chestnut, accent: "#d8c090" }, hair: "sides", hairColor: HAIR.snow, glasses: "#3a2a20", mustache: "#f2f0ea", face: { ...F, lines: true }, seed: 727 },
};
export const YOUNG_GUY: CharacterSpec = {
  height: 1.8, build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#2e6a86", inner: "#f0f0f0", bottom: "#3a3a48", shoes: CLOTH.graphite, accent: "#c8c8d0" }, hair: "swoop", hairColor: "#c89a4a", face: F, seed: 729 },
};
export const BIG_BEARD: CharacterSpec = {
  height: 1.9, build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "vest", colors: { top: "#3a6a4a", inner: "#d8c8a0", bottom: "#4a4a3a", shoes: CLOTH.chestnut, accent: "#d8b45a" }, hair: "crop", hairColor: HAIR.auburn, beard: "#a04e2c", face: F, seed: 731 },
};
export const STUDENTS = [TRUCKER, BAKER, JANITOR, OLD_MAN, YOUNG_GUY, BIG_BEARD];
/** who sits where: 12 spots (4 columns x 3 rows, row 0 nearest the door); duplicates share geometry and sit far apart */
export const SEATING: CharacterSpec[] = [TRUCKER, BAKER, OLD_MAN, YOUNG_GUY, JANITOR, BIG_BEARD, TRUCKER, BAKER, OLD_MAN, YOUNG_GUY, JANITOR, BIG_BEARD];
