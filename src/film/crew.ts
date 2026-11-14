// The sailors of "Same island", in the Animated feature style (styles/styles.ts) with wide clavicles.
// Invented people, not likenesses of the real crews. Grafton men wear warmer, brighter wool; the Invercauld men wear
// cold, faded colors so the two camps read apart at a glance.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const BUILD = { ...styleOf("feature").adult, shoulders: 1.15 };
const FACE = { blush: 0.18, brow: 1.1 };

export const GRAFTON_CREW: CharacterSpec[] = [
  {
    height: 1.8,
    build: BUILD,
    look: { skin: SKIN.light, outfit: "jacket", colors: { top: CLOTH.cobalt, inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "swoop", hairColor: HAIR.auburn, beard: true, hat: "flat", face: FACE, seed: 3 },
  },
  {
    height: 1.74,
    build: { ...BUILD, torso: "barrel" },
    look: { skin: SKIN.medium, outfit: "sweater", colors: { top: CLOTH.brick, inner: CLOTH.cream, bottom: CLOTH.denim, shoes: CLOTH.oxblood, accent: CLOTH.horn }, hair: "crop", hairColor: HAIR.black, mustache: true, hat: "beanie", hatColor: CLOTH.mustard, face: FACE, seed: 5 },
  },
  {
    height: 1.77,
    build: BUILD,
    look: { skin: SKIN.tan, outfit: "vest", colors: { top: CLOTH.mustard, inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.brass }, hair: "curly", hairColor: HAIR.espresso, beard: true, face: FACE, seed: 8 },
  },
  {
    height: 1.7,
    build: BUILD,
    look: { skin: SKIN.fair, outfit: "sweater", colors: { top: CLOTH.teal, inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn }, hair: "sides", hairColor: HAIR.honey, hat: "beanie", hatColor: CLOTH.brick, face: FACE, seed: 11 },
  },
  {
    height: 1.82,
    build: BUILD,
    look: { skin: SKIN.brown, outfit: "shirt", colors: { top: CLOTH.sage, inner: CLOTH.cream, bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: CLOTH.horn }, hair: "crop", hairColor: HAIR.black, beard: true, face: FACE, seed: 13 },
  },
];

// the Invercauld's people: nineteen reached the ledge. Cold, faded, soaked colors; varied builds, hair and skin.
const COLD_TOPS = [CLOTH.graphite, CLOTH.denim, CLOTH.khaki, CLOTH.charcoal, CLOTH.cocoa];
const SKINS = [SKIN.light, SKIN.medium, SKIN.fair, SKIN.tan, SKIN.brown];
const HAIRS = [HAIR.espresso, HAIR.black, HAIR.honey, HAIR.auburn, HAIR.silver];
const OUTFITS = ["jacket", "sweater", "shirt", "vest"] as const;
const CUTS = ["crop", "swoop", "sides", "curly"] as const;
export const INVER_CREW: CharacterSpec[] = Array.from({ length: 19 }, (_, i) => ({
  height: 1.68 + 0.04 * ((i * 7) % 5),
  build: { ...BUILD, torso: i % 4 === 1 ? ("barrel" as const) : ("block" as const) },
  look: {
    skin: SKINS[i % 5],
    outfit: OUTFITS[i % 4],
    colors: { top: COLD_TOPS[(i * 3) % 5], inner: CLOTH.khaki, bottom: i % 2 ? CLOTH.charcoal : CLOTH.graphite, shoes: CLOTH.chestnut, accent: CLOTH.horn },
    hair: CUTS[(i * 3) % 4],
    hairColor: HAIRS[(i * 2) % 5],
    beard: i % 3 === 0,
    mustache: i % 5 === 2,
    face: { blush: 0.04, brow: 1.2 },
    seed: 21 + i * 3,
  },
}));
