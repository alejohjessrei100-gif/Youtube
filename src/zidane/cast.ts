// The people of the Zidane short. Invented figures, not likenesses: no faces of real players, generic kits with no
// badges or numbers. France wore white and Italy blue in the 2006 final (Reuters/Dawn), so the kits keep those colours.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const ADULT = { ...styleOf("feature").adult, shoulders: 1.15 };
export const WHITE = "#f1f1ec";
export const AZZURRO = "#2f62b8";
const FACE = { nose: "hook" as const, blush: 0.1, brow: 1.15 };
/** the French captain: bald, white kit */
export const TEN: CharacterSpec = {
  height: 1.85,
  build: ADULT,
  look: { skin: SKIN.light, outfit: "shirt", colors: { top: WHITE, inner: WHITE, bottom: WHITE, shoes: CLOTH.graphite, accent: "#3a5fbf" }, hair: "none", hairColor: HAIR.espresso, face: FACE, seed: 11 },
};
/** the Italian defender: tall, dark crop, blue shirt, white shorts */
export const BIG: CharacterSpec = {
  height: 1.93,
  build: { ...ADULT, torsoWidth: 1.08 },
  look: { skin: SKIN.light, outfit: "shirt", colors: { top: AZZURRO, inner: AZZURRO, bottom: WHITE, shoes: CLOTH.graphite, accent: WHITE }, hair: "crop", hairColor: HAIR.black, face: FACE, seed: 23 },
};
const SK = [SKIN.light, SKIN.tan, SKIN.medium, SKIN.brown, SKIN.fair, SKIN.deep];
const HC = [HAIR.espresso, HAIR.black, HAIR.honey, HAIR.auburn, HAIR.black, HAIR.espresso];
const CUT = ["crop", "sides", "swoop", "curly", "crop", "sides"] as const;
/** a squad player; six looks per side so the texture cache stays small */
export const player = (side: "FR" | "IT", i: number): CharacterSpec => ({
  height: 1.76 + 0.03 * (i % 4),
  build: ADULT,
  look: {
    skin: SK[(i * 5 + (side === "IT" ? 2 : 0)) % 6],
    outfit: "shirt",
    colors: side === "FR" ? { top: WHITE, inner: WHITE, bottom: WHITE, shoes: CLOTH.graphite, accent: "#3a5fbf" } : { top: AZZURRO, inner: AZZURRO, bottom: WHITE, shoes: CLOTH.graphite, accent: WHITE },
    hair: CUT[i % 6],
    hairColor: HC[(i * 3 + 1) % 6],
    face: FACE,
    seed: (side === "FR" ? 100 : 140) + (i % 6) * 3,
  },
});
const OFFICIAL = (seed: number, hair: "crop" | "none" | "sides"): CharacterSpec => ({
  height: 1.8,
  build: ADULT,
  look: { skin: SKIN.tan, outfit: "shirt", colors: { top: "#e6cf3e", inner: "#e6cf3e", bottom: "#1d1f26", shoes: CLOTH.graphite, accent: "#1d1f26" }, hair, hairColor: HAIR.black, face: FACE, seed },
});
export const REF = OFFICIAL(61, "crop");
export const ASSIST = OFFICIAL(64, "sides");
export const FOURTH = OFFICIAL(67, "none");
