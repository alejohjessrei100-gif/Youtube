// The Vasa (1628), built procedurally in ship-local coordinates (bow +x, port -z, waterline y = 0):
// a lofted oak hull with tumblehome and a high carved stern, four decks with bulkheads, 2 x 2 x 12 gun ports with
// hinged red lids (gilded lion masks) and bronze guns that run out, three masts with tops, yards, four set sails
// (fore + main course and topsail, as on 10 August 1628), shrouds and stays, the gilded leaping-lion figurehead on
// the beakhead, stern lanterns, the Swedish ensign and long pennants. Everything sits in one Group that world.ts heels.
import * as THREE from "three";
import { Batch, V, lam, quad } from "./build";
import { ctex, planksHD, rng } from "./paint";
import { twoTone } from "./shade";
import { NOINK } from "./ink";
import { L0, L1, KEEL, sOf, deckY, topY, beam, prof, halfAt, PORT_LO, PORT_HI, portX, LION, MASTS, V3, clamp01 } from "./story";

// ---------------- painted textures ----------------
/** hull side, u = x / 3 m, v = (y + 5) / 20 m: tarred bottom, oak strakes + dark wales, a gold moulding, red upper works
 *  with gilded carving (scrolls, rosettes, little figures) */
const hullTex = () => ctex("vasaHull", 1024, 2048, (g, r) => {
  const Y = (y: number) => 2048 - ((y + 5) / 20) * 2048;   // world height -> canvas row
  const W = 1024;
  g.fillStyle = "#241a14"; g.fillRect(0, 0, W, 2048);
  // oak strakes 0 .. 5.5 m
  for (let y = -0.1; y < 5.5; y += 0.28) {
    const v = 0.88 + 0.2 * r();
    g.fillStyle = `rgb(${(112 * v) | 0},${(72 * v) | 0},${(42 * v) | 0})`; g.fillRect(0, Y(y + 0.28), W, Y(y) - Y(y + 0.28));
    g.fillStyle = "rgba(30,18,10,0.55)"; g.fillRect(0, Y(y + 0.28), W, 3);
    for (let x = r() * 300; x < W; x += 260 + r() * 300) { g.fillStyle = "rgba(30,18,10,0.5)"; g.fillRect(x, Y(y + 0.28), 3, Y(y) - Y(y + 0.28)); } // butts
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(40,24,12,0.25)"; g.fillRect(r() * W, Y(y + 0.28) + r() * 20, 80 + r() * 200, 2); } // grain
  }
  // tar below the waterline + a pale weed line
  g.fillStyle = "#2a201b"; g.fillRect(0, Y(0), W, 2048 - Y(0));
  g.fillStyle = "rgba(160,170,140,0.35)"; g.fillRect(0, Y(0.05), W, 8);
  // wales (thick dark strakes) round the gun decks
  for (const [y0, y1] of [[0.55, 0.85], [2.65, 2.95], [4.75, 5.05]]) { g.fillStyle = "#3a2516"; g.fillRect(0, Y(y1), W, Y(y0) - Y(y1)); g.fillStyle = "rgba(255,220,170,0.12)"; g.fillRect(0, Y(y1), W, 4); }
  // red upper works with gilded carving
  g.fillStyle = "#8f2a20"; g.fillRect(0, 0, W, Y(5.45));
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${60 + r() * 40},10,8,0.06)`; g.fillRect(r() * W, r() * Y(5.45), 6 + r() * 30, 2); }
  const gold = "#e2ae45", goldD = "#9a6a1e";
  const band = (y: number, h: number) => { g.fillStyle = goldD; g.fillRect(0, Y(y + h), W, Y(y) - Y(y + h)); g.fillStyle = gold; g.fillRect(0, Y(y + h) + 3, W, Y(y) - Y(y + h) - 8); };
  band(5.45, 0.22); band(7.5, 0.16); band(9.6, 0.16); band(11.8, 0.16);
  // carved figures between the bands: a scroll + a little warrior every 1.5 m (u: 1024 px = 3 m)
  for (const [y0, y1] of [[5.7, 7.45], [7.7, 9.55], [9.8, 11.75]]) {
    for (let x = 0; x < W; x += 512) {
      const cx = x + 256, cy = (Y(y0) + Y(y1)) / 2, hh = (Y(y0) - Y(y1)) * 0.42;
      g.fillStyle = goldD; g.strokeStyle = goldD; g.lineWidth = 16; g.lineCap = "round";
      g.beginPath(); g.ellipse(cx, cy - hh * 0.62, hh * 0.2, hh * 0.22, 0, 0, 7); g.fill();              // head
      g.beginPath(); g.moveTo(cx, cy - hh * 0.4); g.lineTo(cx, cy + hh * 0.35); g.stroke();             // body
      g.beginPath(); g.moveTo(cx, cy + hh * 0.3); g.lineTo(cx - hh * 0.25, cy + hh * 0.9); g.moveTo(cx, cy + hh * 0.3); g.lineTo(cx + hh * 0.25, cy + hh * 0.9); g.stroke();
      g.beginPath(); g.moveTo(cx - hh * 0.35, cy - hh * 0.1); g.lineTo(cx + hh * 0.35, cy - hh * 0.25); g.stroke(); // arms + spear
      g.lineWidth = 8; g.beginPath(); g.moveTo(cx + hh * 0.4, cy - hh * 0.9); g.lineTo(cx + hh * 0.3, cy + hh * 0.9); g.stroke();
      g.fillStyle = gold; g.strokeStyle = gold; g.lineWidth = 9;
      g.beginPath(); g.ellipse(cx - 3, cy - hh * 0.65, hh * 0.15, hh * 0.17, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(cx - 3, cy - hh * 0.42); g.lineTo(cx - 3, cy + hh * 0.3); g.stroke();
      // scroll between the figures
      const sx = x + (x ? 0 : 512) - 256 + 512, sy = cy;
      for (const s of [-1, 1]) {
        g.strokeStyle = goldD; g.lineWidth = 14; g.beginPath(); g.arc(sx + s * 70, sy, hh * 0.35, 0, Math.PI * 1.6 * s); g.stroke();
        g.strokeStyle = gold; g.lineWidth = 7; g.beginPath(); g.arc(sx + s * 70, sy - 3, hh * 0.35, 0, Math.PI * 1.6 * s); g.stroke();
      }
      g.fillStyle = gold; g.beginPath(); g.arc(sx, sy, hh * 0.18, 0, 7); g.fill();
    }
  }
});
/** transom: blue field, gilded frames, the royal arms held by two lions, rows of gallery windows, the Vasa sheaf */
const sternTex = () => ctex("vasaStern", 1024, 1536, (g, r) => {
  const W = 1024, H = 1536, gold = "#e2ae45", goldD = "#8a5c18";
  // v = (y - KEEL) / (13.8 - KEEL): canvas row for a height
  const Y = (y: number) => H - ((y - KEEL) / (13.8 - KEEL)) * H;
  g.fillStyle = "#241a14"; g.fillRect(0, 0, W, H);
  for (let y = Y(5.4); y < Y(-0.1); y += 26) { g.fillStyle = `rgb(${100 + r() * 20},${64 + r() * 10},${38 + r() * 8})`; g.fillRect(0, y, W, 24); }
  g.fillStyle = "#2a201b"; g.fillRect(0, Y(0), W, H - Y(0));
  g.fillStyle = "#2c3f7a"; g.fillRect(0, 0, W, Y(5.4));
  const frame = (x0: number, y0: number, x1: number, y1: number, w = 14) => { g.strokeStyle = goldD; g.lineWidth = w + 6; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.strokeStyle = gold; g.lineWidth = w; g.strokeRect(x0, y0, x1 - x0, y1 - y0); };
  // gallery windows (two rows)
  for (const [ya, yb] of [[Y(8.8), Y(7.7)], [Y(11.4), Y(10.4)]]) for (let i = 0; i < 5; i++) {
    const x0 = 110 + i * 170; g.fillStyle = "#1a1626"; g.fillRect(x0, ya, 110, yb - ya); frame(x0, ya, x0 + 110, yb, 10);
    g.strokeStyle = "rgba(226,174,69,0.7)"; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + 55, ya); g.lineTo(x0 + 55, yb); g.moveTo(x0, (ya + yb) / 2); g.lineTo(x0 + 110, (ya + yb) / 2); g.stroke();
  }
  // the arms: crowned shield with the sheaf, two rampant lions
  const cx = W / 2, cy = Y(6.6);
  g.fillStyle = goldD; g.beginPath(); g.moveTo(cx - 120, cy - 130); g.lineTo(cx + 120, cy - 130); g.lineTo(cx + 120, cy + 30); g.quadraticCurveTo(cx, cy + 170, cx - 120, cy + 30); g.closePath(); g.fill();
  g.fillStyle = "#3a62b8"; g.beginPath(); g.moveTo(cx - 100, cy - 112); g.lineTo(cx + 100, cy - 112); g.lineTo(cx + 100, cy + 24); g.quadraticCurveTo(cx, cy + 145, cx - 100, cy + 24); g.closePath(); g.fill();
  g.strokeStyle = gold; g.lineWidth = 12; g.lineCap = "round";                            // the sheaf (vase)
  for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx, cy + 70); g.quadraticCurveTo(cx + k * 10, cy, cx + k * 22, cy - 80); g.stroke(); }
  g.lineWidth = 16; g.beginPath(); g.moveTo(cx - 34, cy + 20); g.lineTo(cx + 34, cy + 20); g.stroke();
  g.fillStyle = gold; for (const dx of [-60, -30, 0, 30, 60]) { g.beginPath(); g.moveTo(cx + dx - 14, cy - 140); g.lineTo(cx + dx, cy - 190); g.lineTo(cx + dx + 14, cy - 140); g.fill(); } // crown
  g.fillRect(cx - 80, cy - 150, 160, 22);
  for (const s of [-1, 1]) {                                                               // lions
    const lx = cx + s * 230, ly = cy;
    g.fillStyle = goldD; g.beginPath(); g.ellipse(lx, ly + 20, 60, 110, s * 0.25, 0, 7); g.fill();
    g.fillStyle = gold; g.beginPath(); g.ellipse(lx - s * 4, ly + 14, 50, 100, s * 0.25, 0, 7); g.fill();
    g.fillStyle = goldD; g.beginPath(); g.arc(lx - s * 20, ly - 100, 58, 0, 7); g.fill();   // mane
    g.fillStyle = gold; g.beginPath(); g.arc(lx - s * 24, ly - 104, 40, 0, 7); g.fill();
    g.strokeStyle = goldD; g.lineWidth = 22; g.beginPath(); g.moveTo(lx - s * 30, ly - 40); g.lineTo(lx - s * 110, ly - 70); g.stroke(); // raised paws
    g.beginPath(); g.moveTo(lx, ly + 110); g.quadraticCurveTo(lx + s * 120, ly + 120, lx + s * 90, ly - 20); g.stroke(); // tail
  }
  frame(30, Y(13.4), W - 30, Y(5.5), 18);
  for (let x = 60; x < W - 40; x += 70) { g.fillStyle = gold; g.beginPath(); g.arc(x, Y(12.6), 14, 0, 7); g.fill(); } // rosettes
});
/** gun-port lid: red with a gilded lion mask (all six faces) */
const lidTex = () => ctex("vasaLid", 256, 256, (g) => {
  g.fillStyle = "#a8261c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#6e160f"; g.lineWidth = 10; g.strokeRect(10, 10, 236, 236);
  const gold = "#e2ae45", goldD = "#8a5c18";
  for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.fillStyle = k % 2 ? gold : goldD; g.beginPath(); g.ellipse(128 + 70 * Math.cos(a), 128 + 70 * Math.sin(a), 30, 20, a, 0, 7); g.fill(); }
  g.fillStyle = gold; g.beginPath(); g.arc(128, 128, 56, 0, 7); g.fill();
  g.fillStyle = "#3a1608"; g.beginPath(); g.arc(106, 118, 9, 0, 7); g.arc(150, 118, 9, 0, 7); g.fill();
  g.beginPath(); g.ellipse(128, 160, 22, 12, 0, 0, 7); g.fill();
  g.fillStyle = goldD; g.beginPath(); g.moveTo(118, 128); g.lineTo(138, 128); g.lineTo(128, 146); g.fill();
});
const sailTex = () => ctex("vasaSail", 512, 512, (g, r) => {
  g.fillStyle = "#efe2c4"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) { g.fillStyle = "rgba(150,120,80,0.35)"; g.fillRect(x, 0, 3, 512); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 4, 0, 3, 512); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(140,110,70,${0.04 + 0.05 * r()})`; g.fillRect(r() * 512, r() * 512, 20 + r() * 60, 2); }
  g.fillStyle = "rgba(120,90,60,0.5)"; g.fillRect(0, 0, 512, 10); g.fillRect(0, 502, 512, 10); // bolt ropes
});
const flagTex = () => ctex("swedishFlag", 512, 320, (g) => {
  g.clearRect(0, 0, 512, 320);
  g.fillStyle = "#1f5aa6"; g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0); g.lineTo(380, 160); g.lineTo(512, 320); g.lineTo(0, 320); g.closePath(); g.fill(); // swallow-tail
  g.fillStyle = "#f3c22c"; g.fillRect(0, 128, 450, 64); g.fillRect(150, 0, 64, 320);
});
const deckBulkTex = () => ctex("vasaBulk", 512, 256, (g, r) => {
  g.fillStyle = "#8f2a20"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(60,10,8,0.08)`; g.fillRect(r() * 512, r() * 256, 30, 2); }
  for (const x of [120, 360]) { g.fillStyle = "#3a2516"; g.fillRect(x - 40, 70, 80, 186); g.strokeStyle = "#e2ae45"; g.lineWidth = 8; g.strokeRect(x - 40, 70, 80, 186); g.fillStyle = "#e2ae45"; g.beginPath(); g.arc(x + 22, 170, 7, 0, 7); g.fill(); }
  g.fillStyle = "#e2ae45"; g.fillRect(0, 0, 512, 16);
});

// ---------------- geometry helpers ----------------
const grid = (nu: number, nv: number, at: (i: number, j: number) => [number, number, number], uvAt: (i: number, j: number, p: [number, number, number]) => [number, number]) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = at(i, j); pos.push(...p); uv.push(...uvAt(i, j, p)); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j, c = b + 1, d = a + 1;
    idx.push(a, b, c, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
};
/** a round spar / rope from a to b (radius r0 at a, r1 at b) */
const spar = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1 = r0, seg = 8) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, false);
  g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  g.applyQuaternion(q); g.translate(a.x, a.y, a.z);
  return g;
};
const sph = (c: V3, r: number, sx = 1, sy = 1, sz = 1, rz = 0, seg = 18) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.7 | 0)); g.scale(sx, sy, sz); g.rotateZ(rz); g.translate(...c); return g;
};
/** bow rake (stem leans forward with height) and stern rake (transom leans aft) */
const rakeX = (x: number, yn: number) => { const s = sOf(x); return x + 2.4 * yn ** 1.6 * clamp01((s - 0.86) / 0.14) - 1.4 * yn * clamp01(1 - s / 0.12); };

export type Sail = { geo: THREE.BufferGeometry; x: number; yTop: number; h: number; wTop: number; wBot: number; depth: number };
export type ShipParts = {
  group: THREE.Group; lids: THREE.InstancedMesh; guns: THREE.InstancedMesh; sails: Sail[];
  flags: { mesh: THREE.Mesh; len: number; hgt: number; nu: number }[]; ports: { d: number; side: number; k: number; x: number; y: number; z: number }[];
};

export const buildShip = (): ShipParts => {
  const group = new THREE.Group(), b = new Batch(), r = rng(28);
  const hullM = lam("vasaHull", () => ({ map: hullTex(), side: THREE.DoubleSide }));
  const sternM = lam("vasaStern", () => ({ map: sternTex(), side: THREE.DoubleSide }));
  const deckM = lam("vasaDeck", () => ({ map: (() => { const t = planksHD().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; })(), side: THREE.DoubleSide }));
  const bulkM = lam("vasaBulk", () => ({ map: deckBulkTex(), side: THREE.DoubleSide }));
  const woodM = lam("vasaSpar", () => ({ color: "#7a5236" }));
  const darkM = lam("vasaDark", () => ({ color: "#3a2516" }));
  const ropeM = lam("vasaRope", () => ({ color: "#3b2c22" }));
  const blackM = lam("vasaPortHole", () => ({ color: "#140c0a" }));
  const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#e0a63a", specular: "#fff0b8", shininess: 55 }), 0.25);
  const goldDark = twoTone(new THREE.MeshPhongMaterial({ color: "#b07a24", specular: "#ffe2a0", shininess: 40 }), 0.25);
  const bronze = twoTone(new THREE.MeshPhongMaterial({ color: "#9a6a34", specular: "#ffd9a0", shininess: 50 }), 0.25);
  const redM = lam("vasaRed", () => ({ color: "#8f2a20" }));

  // ---- hull: lofted grid, i along the length, j round the section (port top -> keel -> starboard top) ----
  const NS = 96, NV = 52;
  const hullAt = (i: number, j: number): [number, number, number] => {
    const s = i / NS, t = j / NV, side = t < 0.5 ? -1 : 1, yn = Math.abs(2 * t - 1);
    const x0 = L0 + (L1 - L0) * s, top = topY(s), y = KEEL + (top - KEEL) * yn;
    return [rakeX(x0, yn), y, side * beam(s) * prof(yn)];
  };
  b.add(grid(NS, NV, hullAt, (_i, _j, p) => [p[0] / 3, (p[1] + 5) / 20]), hullM);
  // transom: fan from the middle of the aft section
  { const pos: number[] = [], uv: number[] = [], ring: [number, number, number][] = [];
    for (let j = 0; j <= NV; j++) ring.push(hullAt(0, j));
    const c: [number, number, number] = [rakeX(L0, 0.55), KEEL + (topY(0) - KEEL) * 0.55, 0];
    const uvOf = (p: number[]) => [0.5 + p[2] / (2 * 5.2), (p[1] - KEEL) / (13.8 - KEEL)];
    for (let j = 0; j < NV; j++) for (const p of [c, ring[j + 1], ring[j]]) { pos.push(...p); uv.push(...uvOf(p)); }
    // close the top edge (port top -> starboard top) with a flat cap
    for (const p of [c, ring[0], ring[NV]]) { pos.push(...p); uv.push(...uvOf(p)); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    b.add(g, sternM); }
  // keel + stem post
  b.add(new THREE.BoxGeometry(L1 - L0, 0.5, 0.45).translate(0, KEEL - 0.2, 0), darkM);
  { const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const yn = k / 10; pts.push(V(rakeX(L1, yn) + 0.15, KEEL + (topY(1) - KEEL) * yn, 0)); }
    for (let k = 0; k < 10; k++) b.add(spar(pts[k], pts[k + 1], 0.32, 0.32, 6), darkM); }

  // ---- decks + bulkheads ----
  const deck = (sa: number, sb: number, y: number) => {
    const n = Math.max(4, Math.round((sb - sa) * 60));
    b.add(grid(n, 6, (i, j) => { const x = L0 + (L1 - L0) * (sa + ((sb - sa) * i) / n), w = Math.max(0.05, halfAt(x, y) - 0.06); return [x, y, -w + (2 * w * j) / 6]; }, (_i, _j, p) => [p[0] / 4, p[2] / 4]), deckM);
  };
  deck(0.005, 0.11, 10.8); deck(0.1, 0.3, 8.6); deck(0.29, 0.79, 5.6); deck(0.78, 0.985, 7.6);
  const bulk = (s: number, y0: number, y1: number, dir: number) => {
    const x = L0 + (L1 - L0) * s, w0 = halfAt(x, y0) - 0.03, w1 = halfAt(x, y1) - 0.03;
    const a = V(x, y0, -w0 * dir), bb = V(x, y0, w0 * dir), c = V(x, y1, w1 * dir), d = V(x, y1, -w1 * dir);
    b.add(quad(a, bb, c, d, w0 / 2.4, 1), bulkM);
    b.add(new THREE.BoxGeometry(0.3, 0.25, 2 * w1).translate(x + 0.05 * dir, y1 + 0.12, 0), gold);       // gilded rail
  };
  bulk(0.295, 5.6, 8.6, 1); bulk(0.105, 8.6, 10.8, 1); bulk(0.785, 5.6, 7.6, -1);
  // deck furniture: hatches, capstan, belfry, barrels, coiled ropes, a few deck guns on carriages
  const hatch = (x: number, z: number, y: number, w = 1.6, d = 1.4) => { b.add(new THREE.BoxGeometry(w, 0.3, d).translate(x, y + 0.15, z), darkM); b.add(new THREE.BoxGeometry(w - 0.2, 0.06, d - 0.2).translate(x, y + 0.31, z), woodM); };
  hatch(5.2, -1.4, 5.6, 1.6, 1.2); hatch(9, 0.5, 5.6, 1.2, 1.2);
  b.add(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 12).translate(-7.5, 6.15, 0), woodM);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; b.add(new THREE.BoxGeometry(2.4, 0.1, 0.1).rotateY(a).translate(-7.5, 6.55, 0), woodM); }
  for (const [x, z] of [[2.5, -3.6], [3.1, -3.2], [-3.8, -3.0], [7.5, -3.4]]) b.add(new THREE.CylinderGeometry(0.32, 0.36, 0.85, 12).translate(x, 6.03, z), lam("barrel", () => ({ color: "#8a5a34" })));
  for (const [x, z] of [[1.6, 3.6], [-3.8, -3.4], [6.2, 3.4]]) b.add(new THREE.TorusGeometry(0.34, 0.08, 6, 16).rotateX(Math.PI / 2).translate(x, 5.68, z), ropeM);
  for (const [x, side] of [[-5.5, 1], [-5.5, -1], [3.6, -1]]) {
    const z = side * (halfAt(x, 6.2) - 1.2);
    b.add(new THREE.BoxGeometry(1.1, 0.4, 0.9).translate(x, 5.8, z), lam("carriage", () => ({ color: "#7a4a2a" })));
    b.add(spar(V(x, 6.15, z - side * 0.4), V(x, 6.25, z + side * 1.25), 0.14, 0.11, 10), bronze);
    for (const dx of [-0.42, 0.42]) b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12).rotateZ(Math.PI / 2).translate(x + dx, 5.8, z - side * 0.2), darkM);
  }
  // top rail along the bulwark (gilded) + rail on the forecastle and poop
  for (const side of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 60; k++) { const s = 0.01 + 0.97 * (k / 60), x = L0 + (L1 - L0) * s, y = topY(s); pts.push(V(rakeX(x, 1), y + 0.05, side * (beam(s) * prof(1) - 0.05))); }
    for (let k = 0; k < 60; k++) b.add(spar(pts[k], pts[k + 1], 0.11, 0.11, 6), gold);
  }

  // ---- gun ports (recess + hinged lid instance + bronze gun instance) ----
  const ports: ShipParts["ports"] = [];
  for (const d of [0, 1]) for (const side of [-1, 1]) for (let k = 0; k < 12; k++) {
    const x = portX(d, k), y = d ? PORT_HI : PORT_LO, z = side * halfAt(x, y);
    ports.push({ d, side, k, x, y, z });
    b.add(new THREE.BoxGeometry(0.82, 0.78, 0.06).translate(x, y, z + side * 0.015), blackM);
  }
  const lidGeo = new THREE.BoxGeometry(0.92, 0.88, 0.1).translate(0, -0.44, 0);
  const lids = new THREE.InstancedMesh(lidGeo, lam("vasaLid", () => ({ map: lidTex() })), ports.length);
  const gunGeo = (() => {
    const parts = [new THREE.CylinderGeometry(0.13, 0.17, 2.6, 12).rotateX(Math.PI / 2).translate(0, 0, 1.3),
      new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12).rotateX(Math.PI / 2).translate(0, 0, 2.55), new THREE.CylinderGeometry(0.19, 0.19, 0.12, 12).rotateX(Math.PI / 2).translate(0, 0, 1.4)];
    const g = new THREE.BufferGeometry(), pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    for (const p of parts) { const q = p.toNonIndexed(); pos.push(...q.attributes.position.array); nrm.push(...q.attributes.normal.array); uv.push(...q.attributes.uv.array); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return g;
  })();
  const guns = new THREE.InstancedMesh(gunGeo, bronze, ports.length);
  for (const im of [lids, guns]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; group.add(im); }

  // ---- figurehead: the leaping gilded lion on the beakhead ----
  const [lx, ly, lz] = LION;
  b.add(new THREE.BoxGeometry(5.2, 0.5, 1.6).translate(24.6, 5.3, 0), darkM);                           // beak platform
  for (const s of [-1, 1]) b.add(spar(V(22.5, 8.4, s * 1.4), V(26.8, 5.6, s * 0.5), 0.12, 0.1, 6), gold); // head rails
  const lionParts: [THREE.BufferGeometry, THREE.Material][] = [];
  const L = (g: THREE.BufferGeometry, m: THREE.Material = gold) => lionParts.push([g, m]);
  L(sph([lx - 1.75, ly - 1.95, lz], 1, 1.65, 0.62, 0.62, 0.55));                                        // body, leaping up
  L(sph([lx - 0.75, ly - 1.05, lz], 0.78, 1.05, 1.05, 0.9));                                            // chest
  L(sph([lx, ly, lz], 0.6));                                                                            // head
  L(sph([lx + 0.46, ly - 0.08, lz], 0.27, 1.1, 0.8, 1.0));                                             // muzzle
  L(sph([lx + 0.36, ly - 0.42, lz], 0.24, 1.1, 0.5, 0.85));                                             // lower jaw (roaring)
  L(sph([lx + 0.5, ly - 0.25, lz], 0.18, 1.0, 0.6, 0.8), lam("lionMouth", () => ({ color: "#5a1410" }))); // open mouth
  L(sph([lx + 0.58, ly - 0.3, lz], 0.09, 1.2, 0.4, 1.3), lam("lionTongue", () => ({ color: "#c0392b" })));
  L(sph([lx + 0.7, ly - 0.03, lz], 0.08), lam("lionNose", () => ({ color: "#6a3a10" })));
  for (const s2 of [-1, 1]) for (const dy of [-0.13, -0.33]) L(new THREE.ConeGeometry(0.035, 0.12, 5).rotateZ(dy < -0.2 ? 0 : Math.PI).translate(lx + 0.6, ly + dy, lz + s2 * 0.1), lam("lionTooth", () => ({ color: "#f4ecd8" })));
  for (const s of [-1, 1]) {
    L(sph([lx + 0.47, ly + 0.2, lz + s * 0.24], 0.13, 0.7, 1.1, 1.0, 0, 12), lam("lionEyeW", () => ({ color: "#f6f0e2" })));
    L(sph([lx + 0.56, ly + 0.18, lz + s * 0.25], 0.065, 0.8, 1, 1, 0, 10), lam("lionEye", () => ({ color: "#1e1206" })));
    L(spar(V(lx + 0.22, ly + 0.36, lz + s * 0.1), V(lx + 0.45, ly + 0.31, lz + s * 0.36), 0.06, 0.04, 6), goldDark); // brow
    L(sph([lx - 0.12, ly + 0.58, lz + s * 0.36], 0.17, 1, 1.2, 0.6));                                     // ears
    // front legs reaching forward + paws with claws
    const sh2 = V(lx - 0.6, ly - 1.25, lz + s * 0.48), el = V(lx + 0.3, ly - 1.3, lz + s * 0.75), pw = V(lx + 0.95, ly - 1.15, lz + s * 0.8);
    L(spar(sh2, el, 0.3, 0.24, 10)); L(spar(el, pw, 0.24, 0.2, 10)); L(sph([pw.x + 0.08, pw.y, pw.z], 0.25, 1.2, 0.9, 1));
    for (const c of [-0.12, 0, 0.12]) L(new THREE.ConeGeometry(0.05, 0.22, 5).rotateZ(-Math.PI / 2).translate(pw.x + 0.38, pw.y - 0.06, pw.z + c), goldDark);
    // hind legs down along the beak
    const hp = V(lx - 2.9, ly - 2.4, lz + s * 0.4), kn = V(lx - 2.5, ly - 3.0, lz + s * 0.5), ft = V(lx - 3.2, ly - 3.25, lz + s * 0.45);
    L(spar(hp, kn, 0.36, 0.26, 10)); L(spar(kn, ft, 0.26, 0.2, 10)); L(sph([ft.x - 0.05, ft.y, ft.z], 0.24, 1.3, 0.7, 1));
  }
  // mane: three rings of round curls behind the face (rounded lumps read as carved curls, not spikes)
  for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 14 + ring * 3; k++) {
    const a = (k / (14 + ring * 3)) * Math.PI * 2 + ring * 0.25, rr = 0.66 + ring * 0.2;
    const c = V(lx - 0.18 - ring * 0.22, ly + 0.05 + rr * Math.sin(a) * 0.95, lz + rr * Math.cos(a));
    const o = V(-0.3, Math.sin(a), Math.cos(a)).normalize();
    const g = new THREE.SphereGeometry(0.2 + 0.03 * ring, 12, 8).scale(1, 1, 1.5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), o)); g.translate(c.x, c.y, c.z);
    L(g, ring % 2 ? goldDark : gold);
    const tip = c.clone().addScaledVector(o, 0.3);
    L(sph([tip.x, tip.y, tip.z], 0.1 + 0.02 * ring, 1, 1, 1, 0, 8), ring % 2 ? gold : goldDark);
  }
  // tail curling up behind
  { const c = new THREE.CatmullRomCurve3([V(lx - 3.2, ly - 2.0, 0), V(lx - 3.9, ly - 1.6, 0.2), V(lx - 4.0, ly - 0.7, 0.3), V(lx - 3.5, ly - 0.3, 0.2)]);
    L(new THREE.TubeGeometry(c, 24, 0.11, 8, false)); L(sph([lx - 3.4, ly - 0.25, 0.2], 0.24, 1, 1.3, 1)); }
  for (const [g, m] of lionParts) b.add(g, m);

  // ---- stern: gallery, lanterns, flagstaff ----
  { const xs = rakeX(L0, 0.75) - 0.6, y = 10.35;
    b.add(new THREE.BoxGeometry(1.2, 0.18, 9.2).translate(xs, y, 0), goldDark);
    for (let k = 0; k <= 16; k++) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6).translate(xs - 0.5, y + 0.5, -4.4 + k * 0.55), gold);
    b.add(new THREE.BoxGeometry(0.16, 0.12, 9.2).translate(xs - 0.5, y + 0.98, 0), gold);
    for (const z of [-2.2, 0, 2.2]) {
      const xl = rakeX(L0, 1) - 0.4, yb = 13.9;
      b.add(spar(V(xl + 0.6, yb - 0.6, z), V(xl, yb, z), 0.06, 0.06, 6), goldDark);
      b.add(new THREE.CylinderGeometry(0.42, 0.3, 0.9, 8).translate(xl, yb + 0.45, z), gold);
      b.add(new THREE.ConeGeometry(0.45, 0.6, 8).translate(xl, yb + 1.2, z), gold);
    }
    b.add(spar(V(rakeX(L0, 1) - 0.2, 13.5, 0), V(rakeX(L0, 1) - 0.9, 21.5, 0), 0.12, 0.08, 6), woodM); }

  // ---- masts, tops, yards, bowsprit ----
  const masts: { x: number; base: number; h1: number; h2: number; r: number }[] = [
    { x: MASTS.fore.x, base: 7.6, h1: MASTS.fore.h1, h2: MASTS.fore.h2, r: 0.5 },
    { x: MASTS.main.x, base: 5.6, h1: MASTS.main.h1, h2: MASTS.main.h2, r: 0.6 },
    { x: MASTS.mizzen.x, base: 8.6, h1: MASTS.mizzen.h1, h2: MASTS.mizzen.h2, r: 0.38 },
  ];
  for (const m of masts) {
    b.add(spar(V(m.x, m.base - 0.2, 0), V(m.x, m.h1 + 1.2, 0), m.r, m.r * 0.75, 14), woodM);
    b.add(new THREE.CylinderGeometry(m.r * 3.6, m.r * 3.2, 0.35, 16).translate(m.x, m.h1 - 0.4, 0), darkM); // the top
    b.add(new THREE.CylinderGeometry(m.r * 3.7, m.r * 3.7, 0.7, 16, 1, true).translate(m.x, m.h1 + 0.1, 0), redM);
    b.add(spar(V(m.x - m.r * 1.3, m.h1 - 1.5, 0), V(m.x - m.r * 1.3, m.h2, 0), m.r * 0.5, m.r * 0.3, 10), woodM); // topmast
    b.add(new THREE.BoxGeometry(m.r * 2.6, 0.35, m.r * 1.6).translate(m.x - m.r * 0.6, m.h1 + 1.1, 0), darkM);   // cap
    b.add(sph([m.x - m.r * 1.3, m.h2 + 0.3, 0], 0.3), gold);                                                     // truck
    b.add(new THREE.BoxGeometry(1.6, 0.22, 0.5).translate(m.x, m.base + 0.11, 0), darkM);                         // partners
  }
  const yards: [number, number, number][] = [[MASTS.fore.x, 21, 17], [MASTS.fore.x - 0.65, 34.5, 11], [MASTS.main.x, 25, 21], [MASTS.main.x - 0.8, 41.5, 13]];
  for (const [x, y, len] of yards) { b.add(spar(V(x + 0.6, y, -len / 2), V(x + 0.6, y, 0), 0.12, 0.3, 8), woodM); b.add(spar(V(x + 0.6, y, 0), V(x + 0.6, y, len / 2), 0.3, 0.12, 8), woodM); }
  b.add(spar(V(MASTS.mizzen.x - 6, 13, 0), V(MASTS.mizzen.x + 5, 27, 0), 0.14, 0.1, 8), woodM);                  // mizzen lateen yard
  const bsA = V(21.5, 8.6, 0), bsB = V(38, 15.5, 0);
  b.add(spar(bsA, bsB, 0.48, 0.24, 12), woodM);
  b.add(spar(V(33, 12.4, -5), V(33, 12.4, 5), 0.12, 0.12, 8), woodM);                                          // spritsail yard (furled)
  b.add(new THREE.CylinderGeometry(0.28, 0.28, 8.6, 10).rotateX(Math.PI / 2).translate(33, 12.1, 0), lam("furled", () => ({ color: "#d9c8a4" })));
  // ---- rigging ----
  const rope = (a: THREE.Vector3, c: THREE.Vector3, rr = 0.045) => b.add(spar(a, c, rr, rr, 5), ropeM);
  for (const m of masts) for (const side of [-1, 1]) {
    const chainY = Math.min(topY(sOf(m.x)) + 0.2, m.base + 1.6), cz = side * (halfAt(m.x, chainY) + 0.55);
    b.add(new THREE.BoxGeometry(5.2, 0.16, 0.7).translate(m.x - 0.6, chainY - 0.05, side * (halfAt(m.x, chainY) + 0.3)), darkM); // channel
    for (let k = 0; k < 5; k++) {
      const top = V(m.x + (k - 2) * 0.18, m.h1 - 1.0, side * m.r * 0.9), bot = V(m.x - 2.6 + k * 1.05, chainY, cz);
      rope(top, bot);
      b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10).rotateX(Math.PI / 2).translate(bot.x, bot.y + 0.35, bot.z), darkM); // deadeyes
    }
    for (let k = 0; k < 3; k++) rope(V(m.x - m.r * 1.3, m.h2 - 4, side * 0.15), V(m.x - 0.8 + k * 0.8, m.h1 - 0.3, side * m.r * 3.3), 0.035);
    rope(V(m.x - m.r * 1.3, m.h2 - 3, side * 0.2), V(m.x - 8, topY(sOf(m.x - 8)) + 0.1, side * (halfAt(m.x - 8, 7) + 0.4)), 0.04); // backstay
  }
  rope(V(MASTS.main.x + 0.4, MASTS.main.h1 - 0.5, 0), V(MASTS.fore.x - 0.4, 8.2, 0), 0.08);                 // main stay
  rope(V(MASTS.fore.x + 0.4, MASTS.fore.h1 - 0.5, 0), V(31, 13.7, 0), 0.08);                               // fore stay
  rope(V(MASTS.main.x - 0.8, MASTS.main.h2 - 2, 0), V(MASTS.fore.x - 0.6, MASTS.fore.h1 + 1, 0), 0.05);
  rope(V(MASTS.fore.x - 0.6, MASTS.fore.h2 - 2, 0), V(37, 15.3, 0), 0.05);
  rope(V(MASTS.mizzen.x + 0.3, MASTS.mizzen.h1 - 0.5, 0), V(MASTS.main.x - 0.6, 7.2, 0), 0.06);
  for (const [x, y, len] of yards) for (const side of [-1, 1]) rope(V(x + 0.6, y, side * len / 2 * 0.95), V(x - 7, topY(sOf(x - 7)) + 0.2, side * (halfAt(x - 7, 7) + 0.1)), 0.035); // braces
  b.build(group);

  // ---- sails (rebuilt per frame by poseSails) ----
  // emissive = light shining through the canvas (golden backlight makes the sails glow instead of going grey)
  const sailM = twoTone(new THREE.MeshLambertMaterial({ map: sailTex(), side: THREE.DoubleSide, emissive: new THREE.Color("#8a5a32"), emissiveIntensity: 0.55, emissiveMap: sailTex() }), 0.4);
  const sails: Sail[] = [];
  const mkSail = (x: number, yTop: number, h: number, wTop: number, wBot: number, depth: number) => {
    const geo = grid(14, 10, () => [0, 0, 0], (i, j) => [i / 14, 1 - j / 10]);
    const m = new THREE.Mesh(geo, sailM); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m);
    const s: Sail = { geo, x, yTop, h, wTop, wBot, depth }; sails.push(s); poseSail(s, 1);
  };
  mkSail(MASTS.fore.x + 0.85, 20.8, 9.2, 15.5, 17, 2.4);
  mkSail(MASTS.fore.x + 0.2, 34.3, 11.4, 9.8, 15, 2.0);
  mkSail(MASTS.main.x + 0.85, 24.8, 11.4, 19.5, 21, 2.9);
  mkSail(MASTS.main.x + 0.1, 41.3, 13.2, 11.6, 19, 2.4);

  // ---- flags: the ensign astern + long pennants at the mast heads ----
  const flags: ShipParts["flags"] = [];
  const ftex = flagTex();
  const mkFlag = (at: V3, len: number, hgt: number, nu: number) => {
    const geo = grid(nu, 1, () => [0, 0, 0], (i, j) => [i / nu, j]);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: ftex, side: THREE.DoubleSide, alphaTest: 0.5 }));
    twoTone(mesh.material as THREE.MeshLambertMaterial, 0.4);
    mesh.position.set(...at); mesh.castShadow = true; mesh.frustumCulled = false; group.add(mesh);
    flags.push({ mesh, len, hgt, nu });
  };
  mkFlag([rakeX(L0, 1) - 0.9, 21.3, 0], 6.5, 4.2, 16);
  for (const m of masts) mkFlag([m.x - m.r * 1.3, m.h2 + 0.6, 0], 9, 1.0, 20);
  void r; void NOINK;
  return { group, lids, guns, sails, flags, ports };
};

/** sail cloth: hangs from its yard (top edge straight), billows forward (+x) by `fill` (0 slack .. 1 full) */
export const poseSail = (s: Sail, fill: number, gust = 0) => {
  const p = s.geo.attributes.position as THREE.BufferAttribute;
  const nu = 14, nv = 10;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = j / nv, w = s.wTop + (s.wBot - s.wTop) * v;
    const belly = Math.sin(Math.PI * u) ** 0.7 * Math.sin(Math.PI * (0.08 + 0.84 * v));
    const d = s.depth * (0.25 + 0.75 * fill) * belly * (1 + 0.5 * gust) + 0.12 * gust * Math.sin(u * 9 + v * 5);
    p.setXYZ(i * (nv + 1) + j, s.x + d, s.yTop - s.h * v + 0.25 * d * v, (u - 0.5) * w);
  }
  p.needsUpdate = true; s.geo.computeVertexNormals();
};
/** a flag or pennant waving along -x (wind from astern pushes them forward... flags stream aft-to-fore: +x) */
export const poseFlags = (fl: ShipParts["flags"], t: number, gust = 0) => {
  for (const f of fl) {
    const p = f.mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= f.nu; i++) for (let j = 0; j <= 1; j++) {
      const u = i / f.nu, taper = f.hgt > 2 ? 1 : 1 - 0.85 * u;
      const y = -f.hgt * j * taper - (f.hgt > 2 ? 0 : 0) , wave = (0.18 + 0.25 * gust) * f.len * u * Math.sin(t * (5 + 3 * gust) - u * 6 + f.mesh.position.x);
      p.setXYZ(i * 2 + j, u * f.len * (1 - 0.05 * gust), y + 0.06 * f.len * u * Math.sin(t * 4 - u * 4) - u * f.len * 0.08, wave * 0.6);
    }
    p.needsUpdate = true; f.mesh.geometry.computeVertexNormals();
  }
};
/** lids + guns: open 0 (shut, gun in) .. 1 (lid up, gun run out) for every port */
export const posePorts = (sp: ShipParts, open: (d: number, side: number, k: number) => number) => {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1), p = V(0, 0, 0);
  sp.ports.forEach((pt, i) => {
    const o = clamp01(open(pt.d, pt.side, pt.k)), ov = o < 1 ? o + 0.12 * Math.sin(o * Math.PI) : 1; // a little overshoot
    e.set(-pt.side * 1.35 * ov, 0, 0); q.setFromEuler(e);
    sp.lids.setMatrixAt(i, m4.compose(p.set(pt.x, pt.y + 0.44, pt.z + pt.side * 0.06), q, one));
    const run = clamp01((o - 0.35) / 0.65), out = run < 1 ? run + 0.1 * Math.sin(run * Math.PI) : 1;
    e.set(0, pt.side > 0 ? 0 : Math.PI, 0); q.setFromEuler(e);
    sp.guns.setMatrixAt(i, m4.compose(p.set(pt.x, pt.y - 0.05, pt.z - pt.side * (2.5 - 1.15 * out)), q, one));
  });
  sp.lids.instanceMatrix.needsUpdate = true; sp.guns.instanceMatrix.needsUpdate = true;
};
