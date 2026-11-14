// "archive": the 1954 Oklahoma flashback. A warm, almost colourless look: low saturation, a brown shadow tint, a cream
// highlight and a heavier vignette. No grain and no flicker, so nothing crawls. (Beirut itself uses the shipped "day".)
import { MOODS, mk, sky } from "../inkbeat/core/moods";

const a = mk({
  note: "archive photograph", hemi: ["#d8cdb4", "#6a5a4a", 0.95], key: ["#ffe6b8", 4.4, [0.55, 0.65, 0.45]], rim: ["#fff0d0", 1.5, [-0.6, 0.45, -0.7]],
  fill: ["#c0b498", 0.3, [-0.7, 0.3, 0.5]], prac: ["#ffd8a0", 3, "#fff0d0"], fog: ["#d6c9ae", 0.006],
  sky: sky("#c4b896", "#dccfb0", "#efe3c8", { clouds: 0.25, cloudColor: "#d0c4a8", cloudLit: "#fff4dc", sunOn: 0.4 }),
  toon: { shadowTint: [0.92, 0.86, 0.8], hiTint: [1.06, 1.02, 0.9], rimColor: "#fff0d8" },
  grade: { exposure: 0.9, contrast: 1.12, saturation: 0.16, shadowTint: "#5a4630", highlightTint: "#f6e6c0", gain: "#f8efd8" }, bloomTint: "#fff0d8", ink: "#2a2218",
  camFill: ["#f4ead4", 0.25], cast: { rim: ["#fff0d0", 1.5], fill: ["#e8dcc0", 0.55] },
});
a.post.vignette.amount = 0.4;
MOODS.archive = a;
