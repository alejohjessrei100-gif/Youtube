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
const SKINS = [SKIN.light, SKIN.tan, SKIN.medium, SKIN.brown, SKIN.fair, SKIN.deep];
const HAIRS = [HAIR.espresso, HAIR.black, HAIR.auburn, HAIR.honey, HAIR.black, HAIR.espresso];
const CUTS = ["crop", "swoop", "sides", "curly", "crop", "swoop"] as const;
const TOPS = [CLOTH.mustard, CLOTH.sage, CLOTH.cream, CLOTH.teal, CLOTH.khaki, CLOTH.rose, CLOTH.cocoa, CLOTH.horn];
const PANTS = [CLOTH.denim, CLOTH.charcoal, CLOTH.khaki, CLOTH.cocoa];

/** one boy; team "R" / "B" puts a vest in that team's colour over his own shirt */
export const boy = (i: number, team?: "R" | "B", old = false): CharacterSpec => ({
  height: 1.36 + 0.035 * ((i * 5) % 5),
  build: { ...KID, shoulders: 1.0 },
  look: {
    skin: SKINS[(i * 5 + 1) % 6],
    outfit: team ? "vest" : i % 3 === 1 ? "sweater" : "shirt",
    colors: {
      top: team === "R" ? RED : team === "B" ? BLUE : old ? (i % 2 ? CLOTH.cream : CLOTH.khaki) : TOPS[(i * 3) % 8],
      inner: team ? CLOTH.cream : CLOTH.horn,
      bottom: PANTS[(i * 7) % 4],
      shoes: CLOTH.chestnut,
      accent: CLOTH.brass,
    },
    hair: CUTS[(i * 5) % 6],
    hairColor: HAIRS[(i * 3 + 2) % 6],
    face: { nose: "button", blush: 0.28, brow: 1.1 },
    seed: 40 + i * 3,
  },
});

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
