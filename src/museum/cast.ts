// The museum short's cast: original toon people from the one family (no likenesses of real people).
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, ELDER_BUILD, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const F = { blush: 0.3, brow: 1.25 };
const GUARD = { top: "#262c3a", inner: "#dfe6ee", bottom: "#1c2230", shoes: CLOTH.graphite, accent: "#d8b040" };
const HENRY_LOOK = { skin: SKIN.light, outfit: "sweater" as const, colors: { top: "#4a4e5a", inner: "#3a3e48", bottom: "#2e3a52", shoes: CLOTH.chestnut, accent: "#6a6e7a" }, hair: "sides" as const, hairColor: HAIR.snow, hatColor: "#4a4e5a", glasses: "#3a2e26", face: { ...F, lines: true }, seed: 83 };
/** Henry at 81: a grey hoodie (hood up, or pushed back), white hair, round glasses */
export const HENRY: CharacterSpec = { height: 1.66, build: { ...ELDER_BUILD, shoulders: 0.98 }, look: { ...HENRY_LOOK, hat: "hood" } };
export const HENRY_BARE: CharacterSpec = { ...HENRY, look: { ...HENRY_LOOK, hat: "hoodDown" } };
/** Henry at 20: paint-flecked overalls, a mop of dark curls */
export const YOUNG: CharacterSpec = {
  height: 1.8,
  build: { ...B, shoulders: 1.0, torsoWidth: 0.92 },
  look: { skin: SKIN.light, outfit: "overalls", colors: { top: "#e8e0d0", inner: "#e8e0d0", bottom: "#4a6a9a", shoes: CLOTH.chestnut, accent: "#f4c430" }, hair: "curly", hairColor: HAIR.espresso, face: F, seed: 83 },
};
/** June at 20: the yellow dress, auburn hair up */
export const JUNE: CharacterSpec = {
  height: 1.66,
  build: { ...B, shoulders: 0.95, torsoWidth: 0.9 },
  look: { skin: SKIN.fair, outfit: "shirt", colors: { top: "#f4c430", inner: "#f4c430", bottom: "#e8b898", shoes: "#c83a3a", accent: "#ffffff" }, skirt: "#f4c430", hair: "bun", hairColor: "#6a3a20", face: { ...F, lash: true, blush: 0.5 }, seed: 91 },
};
/** the night guards: Dolores (short, stout, no-nonsense) and Marcus (tall, jumpy) */
export const DOLORES: CharacterSpec = {
  height: 1.58,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.medium, outfit: "jacket", colors: GUARD, hair: "bob", hairColor: HAIR.black, hat: "cap", hatColor: "#262c3a", face: { ...F, lash: true }, seed: 97 },
};
export const MARCUS: CharacterSpec = {
  height: 1.92,
  build: { ...B, torsoWidth: 0.9, shoulders: 1.05 },
  look: { skin: SKIN.deep, outfit: "jacket", colors: GUARD, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#262c3a", mustache: true, face: F, seed: 101 },
};
/** the art dealer, 1964: a vest, a flat cap */
export const DEALER: CharacterSpec = {
  height: 1.74,
  build: { ...B, torso: "barrel" },
  look: { skin: SKIN.tan, outfit: "vest", colors: { top: "#4a2a2a", inner: "#efe6d2", bottom: "#3a3030", shoes: CLOTH.graphite, accent: "#c8a040" }, hair: "crop", hairColor: HAIR.black, hat: "flat", hatColor: "#5a4a3a", mustache: true, face: F, seed: 107 },
};
