// Act moods for "Same island" (added to the starter's MOODS): a subantarctic palette. Higher contrast than the
// starter moods: a strong key and rim against a low ambient, so forms have a lit side, a shadow side and depth.
import { MOODS, mk, sky } from "../inkbeat/core/moods";

/** the night of the wreck: almost no ambient, a hard cold rim, heavy cloud; lightning does the rest */
MOODS.storm = mk({
  note: "storm night", hemi: ["#3a4e7a", "#0c0e1c", 0.5], key: ["#9fb4e8", 2.3, [-0.55, 0.5, 0.5]], rim: ["#cfe0ff", 3.4, [0.6, 0.4, -0.75]],
  fill: ["#3a5a8a", 0.3, [0.7, 0.2, 0.6]], prac: ["#ffb050", 6, "#ffd890"], fog: ["#141c34", 0.013],
  sky: sky("#070a1c", "#141c3a", "#2a3658", { clouds: 0.9, cloudColor: "#0e1430", cloudLit: "#46567e", moonOn: 0 }),
  toon: { shadowTint: [0.72, 0.8, 1.22], hiTint: [0.96, 1.02, 1.12], rimColor: "#cfe0ff" },
  grade: { exposure: 0.74, contrast: 1.26, saturation: 0.96, shadowTint: "#122a66", highlightTint: "#dfeaff", gain: "#e6eeff" }, bloomTint: "#cfe0ff", ink: "#05060f",
  camFill: ["#b8c8ee", 0.3], cast: { rim: ["#d8e6ff", 2.6], fill: ["#8fa6d8", 0.7] },
});
/** the usual weather: low grey cloud, mist on the slopes, soft cool light with a clear direction */
MOODS.overcast = mk({
  note: "overcast, mist", hemi: ["#c6d2dc", "#4a4e5e", 0.72], key: ["#f2f4f0", 3.9, [0.5, 0.62, 0.55]], rim: ["#dfeaf2", 2.0, [-0.6, 0.45, -0.7]],
  fill: ["#8fa2bc", 0.4, [-0.75, 0.3, 0.45]], prac: ["#ffb050", 6, "#ffd890"], fog: ["#b9c4cc", 0.011],
  sky: sky("#7d8c9c", "#aab6c0", "#d3dade", { clouds: 0.75, cloudColor: "#8a96a4", cloudLit: "#e8ecee" }),
  toon: { shadowTint: [0.8, 0.86, 1.14], hiTint: [1.03, 1.02, 0.97], rimColor: "#e6eef4" },
  grade: { exposure: 0.8, contrast: 1.2, saturation: 1.04, shadowTint: "#2c3e66", highlightTint: "#f4f2e8", gain: "#f8faff" }, bloomTint: "#eef2f4", ink: "#10131c",
  camFill: ["#eef2f6", 0.22], cast: { rim: ["#eef4fa", 1.9], fill: ["#d6dfee", 0.55] },
});
/** night by the fire: the world is dark blue, the fire is the key (a point light in the set), faces glow */
MOODS.fire = mk({
  note: "firelight at night", hemi: ["#33448c", "#120c1c", 0.42], key: ["#8fa2e6", 1.5, [-0.5, 0.6, -0.5]], rim: ["#aab8ff", 1.9, [0.6, 0.45, -0.7]],
  fill: ["#ff9a40", 0.25, [0.4, 0.2, 0.8]], prac: ["#ff9a30", 9, "#ffc878"], fog: ["#141a3c", 0.012],
  sky: sky("#070a22", "#111a44", "#24306a", { clouds: 0.55, cloudColor: "#0e1438", cloudLit: "#3a4a8a", moonOn: 0.5 }),
  toon: { shadowTint: [0.8, 0.78, 1.2], hiTint: [1.14, 1.0, 0.82], rimColor: "#ffc27a" },
  grade: { exposure: 0.9, contrast: 1.24, saturation: 1.16, shadowTint: "#1e2470", highlightTint: "#ffd29a", gain: "#fff2e0" }, bloomTint: "#ffb060", ink: "#07060f",
  camFill: ["#ffd2a8", 0.18], cast: { rim: ["#ffb463", 2.6], fill: ["#9fb0ff", 0.45] },
});
/** the sun breaks under the cloud: a low gold key against slate-blue shade */
MOODS.break = mk({
  note: "sun under the cloud", hemi: ["#d8d2c8", "#3e3c5c", 0.7], key: ["#ffc66a", 5.4, [-0.65, 0.32, 0.5]], rim: ["#ffe2a0", 2.9, [0.6, 0.35, -0.75]],
  fill: ["#8894d0", 0.45, [0.8, 0.3, 0.4]], prac: ["#ffb050", 6, "#ffe0a0"], fog: ["#c9b8a4", 0.008],
  sky: sky("#5d6c92", "#c9a98a", "#ffd9a0", { clouds: 0.6, cloudColor: "#6c7391", cloudLit: "#ffd9a8", sunOn: 0.8, rays: 0.3 }),
  toon: { shadowTint: [0.86, 0.82, 1.14], hiTint: [1.14, 1.03, 0.82], rimColor: "#ffdc98" },
  grade: { exposure: 0.84, contrast: 1.2, saturation: 1.12, shadowTint: "#3a3a7c", highlightTint: "#ffe2a8", gain: "#fff6e4" }, bloomTint: "#ffd080", ink: "#1a1010",
  camFill: ["#ffe8c8", 0.22], cast: { rim: ["#ffd070", 2.4], fill: ["#dcd6ff", 0.5] },
});
export const FILM_MOODS = ["storm", "overcast", "fire", "break"];
