// Moods for the poison short: warm candlelit hall, golden Roman afternoon, cold moonlit throne room, and a torchlit
// dungeon. Strong key/rim contrast so faces read.
import { MOODS, mk, sky } from "../inkbeat/core/moods";
MOODS.candle = mk({
  note: "candlelit feast hall", hemi: ["#8a6ab0", "#2a1a24", 0.6], key: ["#ffb866", 4.6, [0.5, 0.7, 0.45]], rim: ["#8a9aff", 1.6, [-0.6, 0.4, -0.7]],
  fill: ["#6a70d0", 0.35, [-0.8, 0.3, 0.4]], prac: ["#ff9a40", 8, "#ffd890"], fog: ["#2a1a20", 0.01],
  sky: sky("#100c1a", "#1a1428", "#24182e"), toon: { shadowTint: [0.92, 0.78, 1.12], hiTint: [1.14, 1.0, 0.82], rimColor: "#b0b8ff" },
  grade: { exposure: 1.0, contrast: 1.2, saturation: 1.18, shadowTint: "#3a1a5a", highlightTint: "#ffd8a0", gain: "#fff4e4" }, bloomTint: "#ffb060", ink: "#160c10",
  camFill: ["#ffe0c0", 0.3], cast: { rim: ["#ffc070", 2.0], fill: ["#c0c8ff", 0.6] },
});
MOODS.roman = mk({
  note: "golden Roman afternoon", hemi: ["#ffe6c0", "#7a5a6a", 0.95], key: ["#ffd290", 5.0, [-0.6, 0.55, 0.5]], rim: ["#fff0c8", 2.2, [0.6, 0.4, -0.7]],
  fill: ["#b0a0e0", 0.45, [0.8, 0.3, 0.4]], prac: ["#ffd8a0", 3, "#fff0d0"], fog: ["#e8c8a0", 0.006],
  sky: sky("#7aa6e8", "#ffd8a0", "#fff0d0", { sunOn: 0.6 }), toon: { shadowTint: [0.95, 0.84, 1.08], hiTint: [1.1, 1.03, 0.88], rimColor: "#fff0c8" },
  grade: { exposure: 0.9, contrast: 1.14, saturation: 1.14, shadowTint: "#5a3a6a", highlightTint: "#fff0c8", gain: "#fff8ea" }, bloomTint: "#ffe0a0", ink: "#1e1008",
  camFill: ["#fff0d8", 0.25], cast: { rim: ["#ffe0a0", 2.0], fill: ["#e8dcff", 0.5] },
});
MOODS.moon = mk({
  note: "moonlit throne room", hemi: ["#4a5ac8", "#14102a", 0.7], key: ["#a8c0ff", 3.4, [-0.5, 0.6, 0.4]], rim: ["#d8e0ff", 2.6, [0.6, 0.45, -0.7]],
  fill: ["#ffb060", 0.6, [0.6, 0.2, 0.7]], prac: ["#ffb050", 7, "#ffd890"], fog: ["#1a2050", 0.01],
  sky: sky("#0a0e30", "#1a2460", "#3a4a90", { moonOn: 0.9 }), toon: { shadowTint: [0.82, 0.86, 1.2], hiTint: [1.0, 1.02, 1.1], rimColor: "#cdd6ff" },
  grade: { exposure: 0.85, contrast: 1.18, saturation: 1.12, shadowTint: "#2a3a9a", highlightTint: "#ffe0b0", gain: "#e8ecff" }, bloomTint: "#ffd8a0", ink: "#0c0c1e",
  camFill: ["#c8d0ff", 0.32], cast: { rim: ["#d8e0ff", 2.2], fill: ["#ffc890", 0.7] },
});
MOODS.torch = mk({
  note: "torchlit dungeon", hemi: ["#4a3a6a", "#120a10", 0.5], key: ["#ff9a50", 4.2, [0.6, 0.6, 0.3]], rim: ["#6a8aff", 1.8, [-0.6, 0.4, -0.7]],
  fill: ["#3a4aa0", 0.35, [-0.8, 0.3, 0.4]], prac: ["#ff8a30", 9, "#ffc070"], fog: ["#1a1018", 0.014],
  sky: sky("#08060c", "#0c0a12", "#120e18"), toon: { shadowTint: [0.86, 0.78, 1.16], hiTint: [1.14, 0.98, 0.8], rimColor: "#9ab0ff" },
  grade: { exposure: 1.0, contrast: 1.22, saturation: 1.15, shadowTint: "#2a1440", highlightTint: "#ffc890", gain: "#fff0e0" }, bloomTint: "#ff9a40", ink: "#100808",
  camFill: ["#ffd0a8", 0.28], cast: { rim: ["#ffa050", 2.2], fill: ["#a0b0ff", 0.5] },
});
