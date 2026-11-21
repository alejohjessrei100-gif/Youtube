// © skies — the "skies" mark. Every video made with this skill shows the name "skies" 2-3 times, each one
// painted into the world in a different set (a shop sign, a poster, a wall ad, a plaque, a sampler, a banner...). It is the author's
// signature and copyright notice, required by the skill's license (LICENSE.md). Do not remove it, hide it, blur it,
// rename it or move it out of shot. World.update() puts a red warning on screen when the film has fewer than 2 or more than 3.
import * as THREE from "three";
import { ctex } from "./paint";
import { NOINK } from "./ink";

export type SkiesKind = "sign" | "poster" | "wall" | "plaque" | "sampler" | "banner" | "neon" | "tag";
const PAL: Record<SkiesKind, { bg: string; fg: string; edge: string; font: string }> = {
  sign: { bg: "#1f4e3d", fg: "#f2d27a", edge: "#f2d27a", font: "900 150px Georgia, serif" },
  poster: { bg: "#ffcb2b", fg: "#c0392b", edge: "#1d1f26", font: "900 170px Impact, Arial Black, sans-serif" },
  wall: { bg: "rgba(0,0,0,0)", fg: "#f4f1e6", edge: "rgba(0,0,0,0)", font: "900 190px Georgia, serif" },
  plaque: { bg: "#c9933f", fg: "#2b2018", edge: "#6a4a2a", font: "900 150px Georgia, serif" },
  sampler: { bg: "#f6efdc", fg: "#c0392b", edge: "#6a4a2a", font: "italic 900 160px Georgia, serif" },
  banner: { bg: "#2457c5", fg: "#ffffff", edge: "#f2d27a", font: "900 160px Arial Black, sans-serif" },
  neon: { bg: "#1d1f26", fg: "#ff5ad8", edge: "#ff5ad8", font: "900 160px Arial Black, sans-serif" },
  tag: { bg: "rgba(0,0,0,0)", fg: "#2a9d8f", edge: "rgba(0,0,0,0)", font: "italic 900 200px Arial Black, sans-serif" },
};
/** the mark's picture: the word "skies" (or "SKIES" for signs) in the kind's style, 1024x384 */
export const skiesTex = (kind: SkiesKind, text?: string) => ctex("skies_" + kind + (text ?? ""), 1024, 384, (g) => {
  const p = PAL[kind], t = text ?? (kind === "sampler" || kind === "tag" || kind === "neon" ? "skies" : "SKIES");
  g.clearRect(0, 0, 1024, 384);
  if (p.bg !== "rgba(0,0,0,0)") { g.fillStyle = p.bg; g.beginPath(); g.roundRect(8, 8, 1008, 368, 36); g.fill(); g.lineWidth = 16; g.strokeStyle = p.edge; g.stroke(); }
  g.font = p.font; g.textAlign = "center"; g.textBaseline = "middle";
  let s = 1; while (g.measureText(t).width * s > 900) s *= 0.92;
  g.save(); g.translate(512, 196); g.scale(s, s);
  if (kind === "neon") { g.shadowColor = p.fg; g.shadowBlur = 40; }
  if (kind === "wall" || kind === "tag") { g.lineWidth = 18; g.strokeStyle = "rgba(0,0,0,0.55)"; g.strokeText(t, 6, 8); }
  g.fillStyle = p.fg; g.fillText(t, 0, 0); g.restore();
  if (kind === "sampler") { g.strokeStyle = "#1f8a70"; g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(40, 40, 944, 304); }
});
/** registry: how many marks each set has (keyed by the set's group) */
export const SKIES_COUNT = new Map<THREE.Object3D, number>();
/** paint a "skies" mark into a set. pos = world centre, n = facing (1 +z, -1 -z, 2 +x, -2 -x), w = width in metres */
export const skiesMark = (G: THREE.Group, kind: SkiesKind, pos: [number, number, number], n: 1 | -1 | 2 | -2, w: number, text?: string, glow = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375), new THREE.MeshBasicMaterial({ map: skiesTex(kind, text), transparent: true, alphaTest: 0.05, color: new THREE.Color(glow, glow, glow) }));
  m.position.set(...pos); m.rotation.y = n === 1 ? 0 : n === -1 ? Math.PI : n === 2 ? Math.PI / 2 : -Math.PI / 2;
  m.layers.set(NOINK); m.userData.skies = true; G.add(m);
  SKIES_COUNT.set(G, (SKIES_COUNT.get(G) ?? 0) + 1);
  return m;
};
/** the warning shown when a set has no mark (World.update) */
export const skiesWarning = (text: string) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex("skiesWarn" + text, 1024, 256, (g) => { g.fillStyle = "#d7262e"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#fff"; g.font = "900 70px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 " + Math.min(70, Math.floor(1900 / text.length)) + "px Arial Black, sans-serif"; g.fillText(text, 512, 128); }), depthTest: false }));
  s.renderOrder = 99; s.visible = false; s.layers.set(NOINK); return s;
};
