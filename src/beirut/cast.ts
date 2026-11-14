// The people of the Beirut camp film: eighteen boys (the same eighteen in every Beirut shot, so the viewer can follow
// them), twenty-two for the Oklahoma flashback, the researcher, and three camp staff. Invented people, not likenesses.
// Boys use the "feature" kid build of the shipped family. Teams are shown by a vest (red or blue) over the same
// shirt, so a boy's face, hair and skin never change when he joins a team.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

export const RED = "#d6402f";
export const BLUE = "#2a62d4";
const KID = styleOf("feature").kid;

const TOP6 = [CLOTH.mustard, CLOTH.sage, CLOTH.cream, CLOTH.teal, CLOTH.khaki, CLOTH.rose];
const PANTS6 = [CLOTH.denim, CLOTH.charcoal, CLOTH.khaki, CLOTH.cocoa, CLOTH.denim, CLOTH.charcoal];
const HAIR_OF = [HAIR.espresso, HAIR.black, HAIR.auburn, HAIR.honey, HAIR.espresso, HAIR.black, HAIR.auburn, HAIR.honey, HAIR.black];
const SKIN_OF = [SKIN.light, SKIN.tan, SKIN.medium, SKIN.brown, SKIN.fair, SKIN.deep, SKIN.medium, SKIN.light, SKIN.tan, SKIN.brown, SKIN.fair];
const CUT_OF = ["crop", "swoop", "sides", "curly", "crop", "sides", "curly", "swoop"] as const;
/** one boy; team "R" / "B" puts a vest in that team's colour over his own shirt. The shirt, trousers and body shape
 *  repeat every six boys (the character texture cache holds 64, and every distinct look is a 1024 px texture), while
 *  skin, hair and haircut vary independently so no two neighbours look alike. */
export const boy = (i: number, team?: "R" | "B", old = false): CharacterSpec => {
  const j = i % 6;
  return {
    height: 1.36 + 0.035 * ((i * 5) % 5),
    build: { ...KID, shoulders: 1.0 },
    look: {
      skin: SKIN_OF[(i * 7 + (i >> 2)) % SKIN_OF.length],
      outfit: team ? "vest" : j % 3 === 1 ? "sweater" : "shirt",
      colors: {
        top: team === "R" ? RED : team === "B" ? BLUE : old ? (j % 2 ? CLOTH.cream : CLOTH.khaki) : TOP6[j],
        inner: team ? CLOTH.cream : CLOTH.horn,
        bottom: PANTS6[j],
        shoes: CLOTH.chestnut,
        accent: CLOTH.brass,
      },
      hair: CUT_OF[(i * 3 + (i >> 1)) % CUT_OF.length],
      hairColor: HAIR_OF[(i * 5 + (i >> 1)) % HAIR_OF.length],
      face: { nose: "button", blush: 0.28, brow: 1.1 },
      seed: 40 + j * 3,
    },
  };
};

const ADULT = styleOf("feature").adult;
/** the researcher: one unnamed man with glasses and a clipboard */
export const RESEARCHER: CharacterSpec = {
  height: 1.78,
  build: { ...ADULT, shoulders: 1.15 },
  look: {
    skin: SKIN.medium,
    outfit: "shirt",
    colors: { top: "#4f86a6", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn },
    hair: "swoop",
    hairColor: HAIR.espresso,
    glasses: true,
    face: { nose: "hook", blush: 0.12, brow: 1.1 },
    seed: 3,
  },
};
/** three camp staff in matching polo shirts */
export const STAFF: CharacterSpec[] = [0, 1, 2].map((i) => ({
  height: 1.72 + 0.04 * i,
  build: { ...ADULT, shoulders: 1.12 },
  look: {
    skin: [SKIN.light, SKIN.tan, SKIN.fair][i],
    outfit: "shirt",
    colors: { top: CLOTH.sage, inner: CLOTH.cream, bottom: CLOTH.khaki, shoes: CLOTH.chestnut, accent: CLOTH.horn },
    hair: (["crop", "sides", "swoop"] as const)[i],
    hairColor: [HAIR.honey, HAIR.black, HAIR.espresso][i],
    hat: i === 1 ? "cap" : "none",
    hatColor: CLOTH.sage,
    face: { nose: "hook", blush: 0.1, brow: 1.15 },
    seed: 70 + i * 5,
  },
}));

/** who holds which badge: five crosses and four crescents on each team (10 and 8 in all) */
const PATTERN = ["c", "m", "c", "c", "m", "c", "m", "c", "m"] as const;
export const RELIGION = (i: number): "c" | "m" => PATTERN[i % 9];
export const TEAM = (i: number): "R" | "B" => (i < 9 ? "R" : "B");
