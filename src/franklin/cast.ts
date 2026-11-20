// The Franklin film's cast: original toon people in the locked look (squircle heads, wide clavicles, sharp elbows,
// straight arms at rest, hands). Franklin is a historical figure drawn in the channel's own style, not a likeness.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
/** Benjamin Franklin, about 30: long brown hair thinning on top, round spectacles, a brown coat over a cream shirt */
export const FRANKLIN: CharacterSpec = {
  height: 1.74,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#7a4e2e", inner: "#f2ead8", bottom: "#4a3426", shoes: CLOTH.graphite, accent: "#d8b45a" }, hair: "sides", hairColor: "#7a5a40", glasses: "#3a2a20", face: F, seed: 601 },
};
/** the rival assemblyman: a powdered wig, a deep red coat with gold buttons, a tricorn on the way in */
export const RIVAL: CharacterSpec = {
  height: 1.82,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#7a2430", inner: "#f4ecdc", bottom: "#2a2430", shoes: CLOTH.graphite, accent: "#e0b84a" }, hair: "none", hat: "wig", hatColor: "#ecebe6", hatBand: "#26232b", face: { ...F, brow: 1.45 }, seed: 603 },
};
export const RIVAL_HAT: CharacterSpec = { ...RIVAL, look: { ...RIVAL.look, hat: "tricorn", hatColor: "#26232b", hatBand: "#d8b45a", hair: "sides", hairColor: "#ecebe6" } };
/** the messenger boy: a waistcoat and a flat cap */
export const MESSENGER: CharacterSpec = {
  height: 1.42,
  build: { ...styleOf("toon").adult },
  look: { skin: SKIN.medium, outfit: "vest", colors: { top: "#4a6a3a", inner: "#f0e6d0", bottom: "#5a4a3a", shoes: CLOTH.chestnut, accent: "#d8b45a" }, hair: "curly", hairColor: HAIR.espresso, hat: "flat", hatColor: "#6a5a48", face: F, seed: 605 },
};
/** 1969: the psychologist in a white lab coat, horn-rimmed glasses */
export const PSYCH: CharacterSpec = {
  height: 1.78,
  build: B,
  look: { skin: SKIN.tan, outfit: "jacket", colors: { top: "#f4f4f0", inner: "#3a5a8a", bottom: "#4a4a52", shoes: CLOTH.graphite, accent: "#c8c8d0" }, hair: "crop", hairColor: HAIR.black, glasses: "#2a2420", face: F, seed: 607 },
};
/** 1969: the student volunteer, a mustard turtleneck and a swoop */
export const STUDENT: CharacterSpec = {
  height: 1.7,
  build: B,
  look: { skin: SKIN.fair, outfit: "sweater", colors: { top: "#d6a137", inner: "#d6a137", bottom: "#4a5a7a", shoes: CLOTH.chestnut, accent: "#f4ead6" }, hair: "swoop", hairColor: HAIR.auburn, face: { ...F, lash: true }, seed: 609 },
};
/** today: you (the viewer stand-in) in a teal shirt */
export const YOU: CharacterSpec = {
  height: 1.76,
  build: B,
  look: { skin: SKIN.medium, outfit: "shirt", colors: { top: "#2e8a86", inner: "#2e8a86", bottom: "#2a2a3a", shoes: CLOTH.graphite, accent: "#ffffff" }, hair: "curly", hairColor: HAIR.black, face: F, seed: 611 },
};
/** today: the coworker who can't stand you: grey cardigan, a tight bun, glasses */
export const GRUMP: CharacterSpec = {
  height: 1.68,
  build: B,
  look: { skin: SKIN.light, outfit: "sweater", colors: { top: "#6a6a72", inner: "#efe6d2", bottom: "#3a3040", shoes: CLOTH.chestnut, accent: "#efe6d2" }, hair: "bun", hairColor: HAIR.espresso, glasses: "#5a2a3a", face: { ...F, lash: true, brow: 1.4 }, seed: 613 },
};
