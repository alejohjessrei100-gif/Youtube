// "floodlit": a night final under stadium lights. A hard white key from high above, a cool blue night ambient, a warm
// rim from the far lights. "room": the quiet room with one spotlight for the last two shots.
import { MOODS, mk, sky } from "../inkbeat/core/moods";

MOODS.floodlit = mk({
  note: "night match under floodlights", hemi: ["#8fa6e0", "#20283a", 0.85], key: ["#f6f8ff", 5.0, [0.35, 0.85, 0.4]], rim: ["#ffe6b8", 2.6, [-0.6, 0.5, -0.7]],
  fill: ["#7f98ff", 0.5, [-0.7, 0.3, 0.5]], prac: ["#fff4d8", 4, "#ffffff"], fog: ["#1a2240", 0.0025],
  sky: sky("#070b1e", "#10183a", "#26305c", { clouds: 0.1, cloudColor: "#141c40", cloudLit: "#3a4a80", moonOn: 0 }),
  toon: { shadowTint: [0.84, 0.88, 1.18], hiTint: [1.04, 1.03, 1.0], rimColor: "#ffe8c0" },
  grade: { exposure: 0.92, contrast: 1.16, saturation: 1.12, shadowTint: "#1e2a6a", highlightTint: "#fff6e4", gain: "#f6f8ff" }, bloomTint: "#fff2d8", ink: "#0d0e1a",
  camFill: ["#e8eeff", 0.3], cast: { rim: ["#ffe8c0", 2.0], fill: ["#c8d4ff", 0.6] },
});
MOODS.room = mk({
  note: "dark room, one spotlight", hemi: ["#3a3550", "#120e16", 0.35], key: ["#ffe8bc", 6.0, [0.15, 1, 0.25]], rim: ["#8a90ff", 0.8, [-0.6, 0.4, -0.7]],
  fill: ["#5a5080", 0.2, [-0.7, 0.3, 0.5]], prac: ["#ffd890", 3, "#fff0c8"], fog: ["#0c0a12", 0.004],
  sky: sky("#06050a", "#0a0910", "#100e18"),
  toon: { shadowTint: [0.86, 0.8, 1.12], hiTint: [1.12, 1.04, 0.86], rimColor: "#b8bcff" },
  grade: { exposure: 0.95, contrast: 1.2, saturation: 1.1, shadowTint: "#20143a", highlightTint: "#ffe8b8", gain: "#fff6e6" }, bloomTint: "#ffd890", ink: "#0c0810",
  camFill: ["#ffe8cc", 0.15], cast: { rim: ["#ffd890", 1.6], fill: ["#a8a0ff", 0.3] },
});
