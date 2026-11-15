// Background people per set, so rooms feel lived in: servants in the hall, a Roman attendant, guards in the throne
// room. Kept at the back (z > 2.3) and out of the main action.
import { CLOTH, HAIR, SKIN } from "../inkbeat/char/family";
import { styleOf } from "../styles/styles";
import type { Actor } from "./shots";
import { GUARD } from "./cast";

const B = { ...styleOf("toon").adult, shoulders: 1.05 };
const servant = (seed: number, skin: string, top: string, hair: "crop" | "bob" | "sides" | "curly") => ({
  height: 1.62, build: B, look: { skin, outfit: "apron" as const, colors: { top, inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream }, hair, hairColor: HAIR.espresso, face: { blush: 0.3, brow: 1.2 }, seed },
});
const PI = Math.PI;
export const EXTRAS: Record<string, Actor[]> = {
  hall: [
    { spec: servant(51, SKIN.medium, CLOTH.sage, "bob"), p: [-2.0, 0, 2.5], yaw: PI + 0.4, face: { eyes: "open", mouth: "smile" }, hold: "goblet", pose: { armR: [40, 90], armRFwd: 70 } },
    { spec: servant(53, SKIN.light, CLOTH.mustard, "curly"), p: [2.1, 0, 2.6], yaw: PI - 0.5, face: { eyes: "half", mouth: "flat" }, pose: { armL: [30, 100], armLFwd: 80, armR: [30, 100], armRFwd: 80 } },
  ],
  roman: [{ spec: servant(57, SKIN.tan, "#e9e1cc", "crop"), p: [-2.2, 0, 2.6], yaw: PI + 0.3, face: { eyes: "open", mouth: "smile" }, hold: "goblet", pose: { armR: [50, 80], armRFwd: 60 } }],
  throne: [
    { spec: GUARD, p: [-2.0, 0, 2.0], yaw: PI, face: { eyes: "squint", mouth: "flat", brows: "angry" } },
    { spec: { ...GUARD, look: { ...GUARD.look, skin: SKIN.fair, seed: 61 } }, p: [2.0, 0, 2.0], yaw: PI, face: { eyes: "squint", mouth: "flat", brows: "angry" } },
  ],
};
