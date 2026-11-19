// The Maple Street test's cast: an original toon prowler (dark jacket, hood). No likeness of a real person.
import type { CharacterSpec } from "../inkbeat/char/Character3D";
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";

const B = { ...styleOf("toon").adult, shoulders: 1.1 };
export const PROWLER: CharacterSpec = {
  height: 1.75,
  build: B,
  look: { skin: SKIN.light, outfit: "jacket", colors: { top: "#2e3a52", inner: "#8a2e2e", bottom: "#23232c", shoes: CLOTH.graphite, accent: "#c8c8d0" }, hair: "crop", hairColor: HAIR.black, hat: "hood", hatColor: "#2e3a52", face: { blush: 0.25, brow: 1.3 }, seed: 401 },
};
