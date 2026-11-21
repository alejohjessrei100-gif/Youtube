// Painted textures for "Blockbuster Laughed at Netflix" (same storybook rules as paint.ts: flat fills, soft jitter,
// dark-tint seams, no photo detail, NO readable words or logos anywhere): the Dallas skyline outside the boardroom,
// shelves of movie boxes, store walls, the generic blue-and-yellow ticket sign, glass towers, office pieces, TV screens.
import * as THREE from "three";
import { ctex, jit } from "./paint";

const line = (g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, c: string) => {
  g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
};
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

/** Dallas-ish skyline seen from a high floor: blue sky with clouds, towers in three depth layers with window grids */
export const skylineTex = (dusk = false) => ctex("skyline" + (dusk ? "D" : ""), 2048, 1024, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 1024);
  if (dusk) { sky.addColorStop(0, "#5b5e9a"); sky.addColorStop(0.6, "#e7a07e"); sky.addColorStop(1, "#ffd39a"); }
  else { sky.addColorStop(0, "#4f8cdb"); sky.addColorStop(0.65, "#9fc4ee"); sky.addColorStop(1, "#cfe2f5"); }
  g.fillStyle = sky; g.fillRect(0, 0, 2048, 1024);
  g.fillStyle = dusk ? "rgba(255,214,190,0.75)" : "rgba(255,255,255,0.85)";
  for (let i = 0; i < 7; i++) { const x = r() * 2048, y = 80 + r() * 260; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 46, y + (k % 2) * 10, 70, 30, 0, 0, 7); g.fill(); } }
  const layer = (n: number, y0: number, hmin: number, hmax: number, cols: string[], win: string, wmin: number, wmax: number) => {
    let x = -40;
    for (let i = 0; i < n && x < 2100; i++) {
      const w = wmin + r() * (wmax - wmin), h = hmin + r() * (hmax - hmin), c = jit(r, cols[i % cols.length], 0.06);
      g.fillStyle = c; g.fillRect(x, y0 - h, w, h + 400);
      if (r() < 0.35) { g.beginPath(); g.moveTo(x, y0 - h); g.lineTo(x + w / 2, y0 - h - w * 0.5); g.lineTo(x + w, y0 - h); g.fill(); }
      if (r() < 0.25) line(g, x + w / 2, y0 - h, x + w / 2, y0 - h - 70, 5, c);
      g.fillStyle = win;
      for (let yy = y0 - h + 16; yy < 1024; yy += 22) for (let xx = x + 8; xx < x + w - 10; xx += 16) if (r() < 0.8) g.fillRect(xx, yy, 9, 12);
      line(g, x, y0 - h, x, 1024, 3, "rgba(30,40,70,0.45)");
      x += w + r() * 14;
    }
  };
  layer(40, 760, 160, 420, dusk ? ["#8a7aa8", "#9a86ac", "#7a6e9c"] : ["#9fb3d6", "#a9bcdc", "#93a8cf"], dusk ? "rgba(255,220,160,0.5)" : "rgba(220,235,255,0.55)", 70, 150);
  layer(28, 860, 220, 560, dusk ? ["#5e5688", "#6c5f8e", "#53507e"] : ["#6f8fc0", "#7b97c4", "#5f7fb2"], dusk ? "rgba(255,206,140,0.75)" : "rgba(200,225,255,0.6)", 110, 210);
  layer(14, 1000, 300, 640, dusk ? ["#3e3a64", "#463e6a"] : ["#4d6c9e", "#56739f", "#3f5f92"], dusk ? "rgba(255,196,120,0.85)" : "rgba(185,215,250,0.7)", 170, 300);
  // one green-glass landmark with a ball on top (a nod to the real skyline, not a copy)
  const lx = 1260; g.fillStyle = dusk ? "#3f6a70" : "#4f9a8e"; g.fillRect(lx, 300, 120, 724); g.fillStyle = "#e9f1ee";
  g.beginPath(); g.arc(lx + 60, 270, 42, 0, 7); g.fill(); line(g, lx + 60, 228, lx + 60, 190, 4, "#e9f1ee");
});

/** a shelf section full of movie boxes facing out: 1 tile = 2 m wide x 2 m tall, 5 shelf rows, no words */
export const boxesTex = (seed: number) => ctex("movieBoxes" + seed, 1024, 1024, (g, r) => {
  g.fillStyle = "#1d3f8f"; g.fillRect(0, 0, 1024, 1024);
  const pal = ["#d64933", "#f2b134", "#2a9d8f", "#264653", "#e76f51", "#8e44ad", "#f4d35e", "#3a86ff", "#ff006e", "#43aa8b", "#f8961e", "#577590", "#c9184a", "#6a994e"];
  for (let row = 0; row < 5; row++) {
    const y0 = 24 + row * 200;
    g.fillStyle = "#e8ecf4"; g.fillRect(0, y0 + 166, 1024, 18); // shelf lip
    g.fillStyle = "#0f2560"; g.fillRect(0, y0 + 184, 1024, 16);
    let x = 10;
    while (x < 1000) {
      const w = 58 + Math.floor(r() * 10), h = 148 + Math.floor(r() * 10), c = pal[Math.floor(r() * pal.length)];
      g.fillStyle = c; rr(g, x, y0 + 166 - h, w, h, 4); g.fill();
      g.strokeStyle = "rgba(15,20,40,0.85)"; g.lineWidth = 3; g.stroke();
      // cover art: a big simple shape + a title bar (bars only, no letters)
      const k = Math.floor(r() * 4), cx = x + w / 2, cy = y0 + 166 - h * 0.55;
      g.fillStyle = jit(r, pal[(Math.floor(r() * pal.length) + 3) % pal.length], 0.1);
      if (k === 0) { g.beginPath(); g.arc(cx, cy, w * 0.32, 0, 7); g.fill(); }
      else if (k === 1) { g.beginPath(); g.moveTo(cx, cy - w * 0.4); g.lineTo(cx + w * 0.36, cy + w * 0.3); g.lineTo(cx - w * 0.36, cy + w * 0.3); g.fill(); }
      else if (k === 2) g.fillRect(x + 8, cy - 18, w - 16, 36);
      else { g.beginPath(); g.ellipse(cx, cy, w * 0.18, w * 0.38, 0.4, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(x + 8, y0 + 166 - h + 12, w - 16, 9);
      g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(x + 12, y0 + 150, w - 24, 6);
      x += w + 6;
    }
  }
});
/** empty shelves (the store after it closed): bare lips, a few left-behind boxes, dust */
export const emptyShelfTex = () => ctex("emptyShelves", 1024, 1024, (g, r) => {
  g.fillStyle = "#1a3577"; g.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 5; row++) {
    const y0 = 24 + row * 200;
    g.fillStyle = "#cfd4de"; g.fillRect(0, y0 + 166, 1024, 18); g.fillStyle = "#0e2050"; g.fillRect(0, y0 + 184, 1024, 16);
    if (r() < 0.6) { const x = r() * 900; g.fillStyle = "#7d6a8e"; g.save(); g.translate(x, y0 + 166); g.rotate(-0.25); g.fillRect(0, -150, 60, 150); g.restore(); }
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});
/** store wall: royal blue with a yellow stripe at 2.4 m and a white skirting (2 m per tile, 3.6 m tall) */
export const storeWallTex = () => ctex("storeWall", 512, 922, (g, r) => {
  g.fillStyle = "#2457c5"; g.fillRect(0, 0, 512, 922);
  for (let i = 0; i < 400; i++) { g.fillStyle = jit(r, "#2457c5", 0.05); g.fillRect(r() * 512, r() * 922, 4, 4); }
  g.fillStyle = "#ffc629"; g.fillRect(0, 922 - 2.4 * 256 - 40, 512, 40);
  g.fillStyle = "#f2f2f2"; g.fillRect(0, 922 - 36, 512, 36);
});
/** blue store carpet with a confetti fleck (2 m tile) */
export const storeCarpetTex = () => ctex("storeCarpet", 512, 512, (g, r) => {
  g.fillStyle = "#24418e"; g.fillRect(0, 0, 512, 512);
  const c = ["#ffc629", "#e74c3c", "#7fb3ff", "#ffffff"];
  for (let i = 0; i < 700; i++) { g.fillStyle = c[i % 4]; g.globalAlpha = 0.5; g.fillRect(r() * 512, r() * 512, 5, 3); }
  g.globalAlpha = 1;
});
/** the generic video-store sign: deep blue panel with a yellow torn ticket (no lettering) */
export const ticketSignTex = () => ctex("ticketSign", 1024, 320, (g) => {
  g.fillStyle = "#1d47b8"; g.fillRect(0, 0, 1024, 320);
  g.fillStyle = "#ffcb2b";
  g.beginPath(); g.moveTo(150, 60); g.lineTo(870, 60);
  for (let i = 0; i <= 10; i++) g.lineTo(870 + (i % 2 ? 26 : 0), 60 + i * 20);
  g.lineTo(150, 260); for (let i = 10; i >= 0; i--) g.lineTo(150 - (i % 2 ? 26 : 0), 60 + i * 20); g.fill();
  g.fillStyle = "#1d47b8";
  for (let i = 0; i < 5; i++) { rr(g, 230 + i * 120, 120, 80, 80, 14); g.fill(); }
  g.strokeStyle = "#0b2470"; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 306);
});
/** store front glass: bright interior seen through, shelves and posters as soft shapes */
export const storeGlassTex = () => ctex("storeGlass", 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#bcd6f2"); gr.addColorStop(1, "#7ea6da");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 6; i++) { g.fillStyle = jit(r, "#2457c5", 0.1); g.fillRect(40 + i * 170, 200, 120, 260); }
  const pal = ["#e76f51", "#f2b134", "#2a9d8f", "#ff006e", "#3a86ff"];
  for (let i = 0; i < 5; i++) { g.fillStyle = pal[i]; g.fillRect(70 + i * 190, 50, 90, 130); g.strokeStyle = "#fff"; g.lineWidth = 6; g.strokeRect(70 + i * 190, 50, 90, 130); }
  g.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 280, 0); g.lineTo(i * 280 + 90, 0); g.lineTo(i * 280 - 120, 512); g.lineTo(i * 280 - 210, 512); g.fill(); }
  line(g, 512, 0, 512, 512, 14, "#c9ccd2");
});
/** curtain-wall glass tower (4 m x 4 m per tile): blue glass panes with mullions and a sky reflection streak */
export const glassTex = (key: string, tint: string, mull: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = mull; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const c = jit(r, tint, 0.08); g.fillStyle = c; g.fillRect(i * 128 + 6, j * 128 + 6, 116, 116);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(i * 128 + 6, j * 128 + 122); g.lineTo(i * 128 + 60, j * 128 + 6); g.lineTo(i * 128 + 84, j * 128 + 6); g.lineTo(i * 128 + 30, j * 128 + 122); g.fill();
  }
});
/** office whiteboard: a hand-drawn chart whose line falls off a cliff (losing money), boxes and arrows, no words */
export const whiteboardTex = () => ctex("whiteboard", 1024, 640, (g) => {
  g.fillStyle = "#f7f7f2"; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "#9aa0aa"; g.lineWidth = 22; g.strokeRect(11, 11, 1002, 618);
  line(g, 120, 520, 600, 520, 6, "#2b2b33"); line(g, 120, 520, 120, 140, 6, "#2b2b33");
  g.strokeStyle = "#d7262e"; g.lineWidth = 10; g.beginPath(); g.moveTo(130, 200); g.lineTo(240, 230); g.lineTo(330, 300); g.lineTo(420, 380); g.lineTo(520, 490); g.stroke();
  g.beginPath(); g.moveTo(520, 490); g.lineTo(486, 470); g.moveTo(520, 490); g.lineTo(512, 452); g.stroke();
  g.strokeStyle = "#2457c5"; g.lineWidth = 7; g.strokeRect(680, 120, 120, 80); g.strokeRect(680, 300, 120, 80); g.strokeRect(840, 210, 120, 80);
  line(g, 800, 160, 840, 240, 5, "#2457c5"); line(g, 800, 340, 840, 270, 5, "#2457c5");
  g.fillStyle = "#d7262e"; for (let i = 0; i < 3; i++) g.fillRect(690 + i * 40, 470, 26, 18);
});
/** old CRT monitor screen: green-on-black rows of bars (a spreadsheet look, no characters) */
export const crtTex = () => ctex("crt", 256, 192, (g, r) => {
  g.fillStyle = "#0e2a1c"; g.fillRect(0, 0, 256, 192);
  g.fillStyle = "#57e389"; for (let y = 16; y < 180; y += 16) { let x = 12; while (x < 240) { const w = 8 + r() * 40; g.fillRect(x, y, w, 7); x += w + 10; } }
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, 256, 60);
});
/** TV screen, off (dark glass) or on (a warm movie frame: sunset hills and a little figure; no logo) */
export const tvTex = (on: boolean) => ctex(on ? "tvOn" : "tvOff", 512, 288, (g, r) => {
  if (!on) { g.fillStyle = "#3a4152"; g.fillRect(0, 0, 512, 288); g.fillStyle = "rgba(255,255,255,0.16)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(200, 0); g.lineTo(60, 288); g.lineTo(0, 288); g.fill(); return; }
  const gr = g.createLinearGradient(0, 0, 0, 288); gr.addColorStop(0, "#ff7b54"); gr.addColorStop(0.55, "#ffd36e"); gr.addColorStop(1, "#ffb24a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
  g.fillStyle = "#fff4cf"; g.beginPath(); g.arc(360, 150, 40, 0, 7); g.fill();
  g.fillStyle = "#7a3b6a"; g.beginPath(); g.moveTo(0, 200); g.quadraticCurveTo(160, 130, 300, 190); g.quadraticCurveTo(420, 230, 512, 180); g.lineTo(512, 288); g.lineTo(0, 288); g.fill();
  g.fillStyle = "#3d1f46"; g.fillRect(150, 160, 10, 30); g.beginPath(); g.arc(155, 152, 9, 0, 7); g.fill();
  void r;
});
/** office poster / home picture frames: simple abstract art, no words */
export const artTex = (seed: number) => ctex("art" + seed, 384, 512, (g, r) => {
  const bg = ["#f4e3c1", "#cfe8e0", "#f1d0d6", "#d9e4f5"][seed % 4];
  g.fillStyle = bg; g.fillRect(0, 0, 384, 512);
  const pal = ["#e76f51", "#2a9d8f", "#f4a261", "#264653", "#d7262e"];
  for (let i = 0; i < 4; i++) { g.fillStyle = pal[(seed + i) % 5]; const k = (seed + i) % 3; if (k === 0) { g.beginPath(); g.arc(80 + r() * 220, 100 + r() * 300, 50 + r() * 50, 0, 7); g.fill(); } else if (k === 1) g.fillRect(40 + r() * 200, 60 + r() * 300, 120, 80); else { g.beginPath(); g.moveTo(60 + r() * 200, 400); g.lineTo(190, 120 + r() * 80); g.lineTo(330, 420); g.fill(); } }
  g.strokeStyle = "#2b2b33"; g.lineWidth = 26; g.strokeRect(13, 13, 358, 486);
});
/** asphalt with white parking bays (10 m per tile) */
export const lotTex = () => ctex("parkingLot", 512, 512, (g, r) => {
  g.fillStyle = "#5e6068"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { g.fillStyle = jit(r, "#5e6068", 0.12); g.fillRect(r() * 512, r() * 512, 3, 3); }
  g.fillStyle = "#f0f0ea"; for (let i = 0; i < 4; i++) { g.fillRect(i * 128 + 2, 0, 8, 200); g.fillRect(i * 128 + 2, 312, 8, 200); }
});
/** road with a dashed yellow centre line (12 m across, 12 m per tile along) */
export const roadTex = () => ctex("road", 512, 512, (g, r) => {
  g.fillStyle = "#4e5058"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1200; i++) { g.fillStyle = jit(r, "#4e5058", 0.12); g.fillRect(r() * 512, r() * 512, 3, 3); }
  g.fillStyle = "#e9e3d2"; g.fillRect(0, 30, 512, 8); g.fillRect(0, 474, 512, 8);
  g.fillStyle = "#f2c14e"; for (let i = 0; i < 4; i++) g.fillRect(i * 128 + 20, 250, 80, 10);
});
/** concrete plaza slabs (4 m tile) */
export const plazaTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = jit(r, base, 0.05); g.fillRect(i * 128, j * 128, 128, 128); }
  g.strokeStyle = "rgba(60,60,70,0.45)"; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { line(g, i * 128, 0, i * 128, 512, 3, "rgba(60,60,70,0.45)"); line(g, 0, i * 128, 512, i * 128, 3, "rgba(60,60,70,0.45)"); }
});
/** short lawn grass (6 m tile) */
export const lawnTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) { g.fillStyle = jit(r, base, 0.14, 8); g.fillRect(r() * 512, r() * 512, 3, 6); }
});
/** a stack of red mailer envelopes seen from the side (top face / side bands) */
export const stackTex = () => ctex("envStack", 256, 256, (g, r) => {
  for (let y = 0; y < 256; y += 8) { g.fillStyle = jit(r, "#d7262e", 0.08); g.fillRect(0, y, 256, 7); g.fillStyle = "#8a1218"; g.fillRect(0, y + 7, 256, 1); }
});
/** night window (living room): deep blue night, a moon, far house lights */
export const nightWinTex = () => ctex("nightWin", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0f1d45"); gr.addColorStop(1, "#2a4a86");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#f2efd8"; g.beginPath(); g.arc(380, 120, 36, 0, 7); g.fill();
  g.fillStyle = "#1b2a52"; g.fillRect(0, 360, 512, 152);
  g.fillStyle = "#ffd58a"; for (let i = 0; i < 14; i++) g.fillRect(r() * 500, 380 + r() * 100, 8, 10);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(r() * 512, r() * 300, 2, 2); }
});
/** daylight office window */
export const dayWinTex = () => ctex("dayWin", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5e93d9"); gr.addColorStop(1, "#cfe2f5");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(160, 140, 90, 34, 0, 0, 7); g.fill();
  g.fillStyle = "#8fb06a"; g.beginPath(); g.ellipse(120, 470, 160, 90, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(420, 480, 140, 80, 0, 0, 7); g.fill();
  void r;
});
/** wood floor boards (home / office) 2 m tile */
export const boardsTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = jit(r, base, 0.07); g.fillRect(0, i * 64, 512, 62); g.fillStyle = "rgba(60,35,20,0.5)"; g.fillRect(0, i * 64 + 62, 512, 2); const x = r() * 512; g.fillRect(x, i * 64, 2, 62); }
});
/** plain painted wall with a soft roller texture */
export const paintTex = (key: string, base: string) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) { g.fillStyle = jit(r, base, 0.03); g.fillRect(r() * 256, r() * 256, 6, 6); }
});
export const flatTex = (t: THREE.Texture) => { t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------------- text signs (the environment carries the story's words, like the reference channel) ----------------
const FONT = (px: number, w = 900) => `${w} ${px}px "Arial Black", "Arial", "DejaVu Sans", sans-serif`;
type Line = { t: string; px: number; c: string; y: number; w?: number; font?: string };
/** a sign / screen / paper: background colour (or null = transparent), optional border, centred lines of text */
export const textTex = (key: string, w: number, h: number, bg: string | null, lines: Line[], border?: [string, number], deco?: (g: CanvasRenderingContext2D) => void) => ctex("txt_" + key, w, h, (g) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
  if (deco) deco(g);
  if (border) { g.strokeStyle = border[0]; g.lineWidth = border[1]; g.strokeRect(border[1] / 2, border[1] / 2, w - border[1], h - border[1]); }
  g.textAlign = "center"; g.textBaseline = "middle";
  for (const L of lines) {
    let px = L.px; g.font = L.font ?? FONT(px, L.w);
    while (g.measureText(L.t).width > w * 0.92 && px > 8) { px -= 4; g.font = L.font ?? FONT(px, L.w); }
    g.fillStyle = L.c; g.fillText(L.t, w / 2, L.y);
  }
});
/** the video store's sign: deep blue panel, the name in big yellow letters (plain type, not the real logo) */
export const storeNameTex = () => textTex("storeName", 1024, 320, "#1d47b8", [{ t: "BLOCKBUSTER", px: 150, c: "#ffcb2b", y: 140 }, { t: "VIDEO", px: 64, c: "#ffffff", y: 262 }], ["#0b2470", 14]);
/** a red mailer envelope seen from above: white "NETFLIX" print */
export const envTopTex = () => textTex("envTop", 512, 360, "#d7262e", [{ t: "NETFLIX", px: 110, c: "#ffffff", y: 170 }], ["#8a1218", 10], (g) => {
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 6; g.beginPath(); g.moveTo(10, 10); g.lineTo(256, 120); g.lineTo(502, 10); g.stroke();
});
/** the netflix.com of 1999 on Marc's laptop: red header, DVD rows */
export const siteTex = () => textTex("site", 512, 340, "#f4f1ea", [{ t: "NETFLIX.COM", px: 52, c: "#ffffff", y: 40 }, { t: "DVDs BY MAIL", px: 34, c: "#2b2b33", y: 300 }], undefined, (g) => {
  g.fillStyle = "#d7262e"; g.fillRect(0, 0, 512, 80);
  const pal = ["#2457c5", "#e76f51", "#2a9d8f", "#f2b134", "#7b5ac9", "#d65a8a"];
  for (let i = 0; i < 6; i++) { g.fillStyle = pal[i]; g.fillRect(24 + i * 80, 110, 64, 150); g.strokeStyle = "#2b2b33"; g.lineWidth = 3; g.strokeRect(24 + i * 80, 110, 64, 150); }
});
/** the pitch board on the easel */
export const pitchTex = () => textTex("pitch", 512, 400, "#ffffff", [{ t: "BUY NETFLIX", px: 64, c: "#d7262e", y: 90 }, { t: "$50,000,000", px: 78, c: "#2b2b33", y: 210 }, { t: "WE RUN YOUR WEBSITE", px: 34, c: "#2457c5", y: 320 }], ["#2b2b33", 12]);
/** desk calendar: a year in big type */
export const yearTex = (year: string) => textTex("year" + year, 256, 256, "#ffffff", [{ t: "JAN", px: 44, c: "#ffffff", y: 32 }, { t: year, px: 96, c: "#2b2b33", y: 150 }], ["#2b2b33", 8], (g) => { g.fillStyle = "#d7262e"; g.fillRect(0, 0, 256, 64); });
/** gold door / desk plate */
export const plateTex = (key: string, t: string) => textTex("plate" + key, 512, 128, "#2a2e38", [{ t, px: 64, c: "#e8c45a", y: 66 }], ["#e8c45a", 8]);
/** desk name card */
export const nameCardTex = (key: string, t: string) => textTex("card" + key, 512, 128, "#f6f3ea", [{ t, px: 60, c: "#2b2b33", y: 66 }], ["#2457c5", 8]);
/** register screen: the fine */
export const lateFeeTex = () => textTex("lateFee", 512, 352, "#0e2a1c", [{ t: "LATE FEE", px: 72, c: "#57e389", y: 100 }, { t: "$40.00", px: 132, c: "#ffef6e", y: 230 }], ["#3a3d46", 12]);
/** a big printed banner */
export const bannerTex = (key: string, t: string, sub: string | null, bg: string, fg: string) =>
  textTex("banner" + key, 1024, 256, bg, sub ? [{ t, px: 110, c: fg, y: 100 }, { t: sub, px: 50, c: fg, y: 205 }] : [{ t, px: 130, c: fg, y: 132 }], [fg, 10]);
/** letters on a building, transparent background */
export const lettersTex = (key: string, t: string, c: string) => textTex("letters" + key, 2048, 512, null, [{ t, px: 440, c, y: 262 }]);
/** a streaming menu on the TV: red title, rows of tiles, a big play button */
export const streamTex = () => textTex("stream", 512, 288, "#141414", [{ t: "NETFLIX", px: 40, c: "#e50914", y: 26 }, { t: "▶  PLAY", px: 40, c: "#ffffff", y: 150 }], undefined, (g) => {
  const pal = ["#e76f51", "#2a9d8f", "#f2b134", "#3a86ff", "#d65a8a", "#43aa8b", "#f8961e"];
  for (let r2 = 0; r2 < 2; r2++) for (let i = 0; i < 6; i++) { g.fillStyle = pal[(i + r2 * 3) % 7]; g.fillRect(14 + i * 84, 196 + r2 * 46 - (r2 ? 0 : 0), 74, 38); }
  g.fillStyle = "rgba(229,9,20,0.95)"; g.fillRect(150, 118, 212, 64);
});
/** stock ticker board */
export const tickerTex = () => textTex("ticker", 1024, 384, "#0b0d12", [{ t: "NFLX  ▲", px: 96, c: "#4cff7a", y: 96 }, { t: "$300,000,000,000", px: 104, c: "#ffffff", y: 250 }], ["#e50914", 14]);
/** town welcome sign */
export const welcomeTex = () => textTex("welcome", 1024, 384, "#2f6a4a", [{ t: "WELCOME TO", px: 70, c: "#f4f1e6", y: 90 }, { t: "BEND, OREGON", px: 128, c: "#ffffff", y: 230 }], ["#f4f1e6", 16]);
/** billboard */
export const billboardTex = () => textTex("bill2000", 1024, 448, "#ffcb2b", [{ t: "HELLO 2000!", px: 170, c: "#1d47b8", y: 190 }, { t: "THE NEW MILLENNIUM", px: 60, c: "#d7262e", y: 350 }], ["#1d47b8", 18], (g) => {
  const pal = ["#d7262e", "#1d47b8", "#2a9d8f", "#ffffff"]; for (let i = 0; i < 70; i++) { g.fillStyle = pal[i % 4]; g.fillRect((i * 97) % 1024, (i * 53) % 448, 14, 8); }
});
/** a city monument sign */
export const cityTex = () => textTex("dallas", 1024, 256, "#cfc6b6", [{ t: "DALLAS, TEXAS", px: 120, c: "#3a3d46", y: 132 }], ["#8a8073", 12]);
/** the VHS label */
export const vhsLabelTex = () => textTex("vhsLabel", 512, 192, "#f2efe6", [{ t: "APOLLO 13", px: 96, c: "#1d1f26", y: 100 }], undefined, (g) => { g.fillStyle = "#e05a3a"; g.fillRect(0, 160, 512, 32); });
/** painted "photographs" in frames (no real people): skyline, a family on a beach, a store opening, a dog, a mountain */
export const photoTex = (seed: number) => ctex("photo" + seed, 384, 288, (g, r) => {
  const k = seed % 5;
  const sky = g.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, ["#7fb3ef", "#9fd0ff", "#f2c08a", "#a8d0f0", "#c8d8f0"][k]); sky.addColorStop(1, ["#d6e6f7", "#ffe8b8", "#ffd9a8", "#e8f2fa", "#f0f4fa"][k]);
  g.fillStyle = sky; g.fillRect(0, 0, 384, 288);
  if (k === 0) { for (let i = 0; i < 9; i++) { g.fillStyle = ["#4d6c9e", "#5f7fb2", "#3f5f92"][i % 3]; const w = 30 + r() * 20, h = 80 + r() * 140; g.fillRect(10 + i * 42, 288 - h, w, h); } }
  else if (k === 1) { g.fillStyle = "#3a86ff"; g.fillRect(0, 170, 384, 50); g.fillStyle = "#f4d9a0"; g.fillRect(0, 220, 384, 68);
    for (let i = 0; i < 4; i++) { const x = 90 + i * 60, hh2 = i > 1 ? 50 : 80; g.fillStyle = ["#d7262e", "#2457c5", "#f2b134", "#2a9d8f"][i]; g.fillRect(x - 14, 236 - hh2, 28, hh2); g.fillStyle = "#f2cda8"; g.beginPath(); g.arc(x, 226 - hh2, 14, 0, 7); g.fill(); } }
  else if (k === 2) { g.fillStyle = "#e9dfcc"; g.fillRect(40, 110, 304, 150); g.fillStyle = "#1d47b8"; g.fillRect(40, 90, 304, 34); g.fillStyle = "#ffcb2b"; g.fillRect(150, 96, 84, 22); g.fillStyle = "#d7262e"; g.fillRect(150, 240, 84, 6);
    for (let i = 0; i < 7; i++) { g.fillStyle = ["#e76f51", "#2a9d8f", "#7b5ac9"][i % 3]; g.fillRect(50 + i * 44, 220, 18, 40); } }
  else if (k === 3) { g.fillStyle = "#6aa64e"; g.fillRect(0, 200, 384, 88); g.fillStyle = "#c48a4a"; g.beginPath(); g.ellipse(190, 200, 70, 40, 0, 0, 7); g.fill(); g.beginPath(); g.arc(258, 168, 30, 0, 7); g.fill(); g.fillStyle = "#2b2b33"; g.beginPath(); g.arc(268, 162, 5, 0, 7); g.fill(); }
  else { g.fillStyle = "#7f7aa0"; g.beginPath(); g.moveTo(0, 260); g.lineTo(140, 80); g.lineTo(260, 230); g.lineTo(320, 140); g.lineTo(384, 220); g.lineTo(384, 288); g.lineTo(0, 288); g.fill(); g.fillStyle = "#f4f1f6"; g.beginPath(); g.moveTo(140, 80); g.lineTo(115, 112); g.lineTo(165, 112); g.fill(); g.fillStyle = "#2f6a4a"; g.fillRect(0, 262, 384, 26); }
  g.strokeStyle = "#ffffff"; g.lineWidth = 18; g.strokeRect(9, 9, 366, 270);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 6; g.strokeRect(3, 3, 378, 282);
});

// ======================= "The Guy Who Paid 10,000 Bitcoin for Two Pizzas" =======================
const BTC = "#f7931a";
/** a 2010 computer screen: title bar, then lines of text (forum posts, wallets, price) */
export const screenTex = (key: string, title: string, lines: Line[], bg = "#f4f4ef", bar = "#3b5998") => textTex("scr" + key, 640, 400, bg, lines, ["#1d1f26", 10], (g) => {
  g.fillStyle = bar; g.fillRect(0, 0, 640, 64);
  g.fillStyle = "#ffffff"; g.font = FONT(30, 800); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(title, 24, 34);
  g.fillStyle = "#d7262e"; g.beginPath(); g.arc(606, 32, 10, 0, 7); g.fill();
});
export const SCREENS = {
  btcNew: () => screenTex("btcNew", "Bitcoin v0.3", [{ t: "₿ BITCOIN", px: 84, c: BTC, y: 170 }, { t: "brand new digital money", px: 34, c: "#2b2b33", y: 270 }, { t: "users online: 12", px: 28, c: "#6a6f7a", y: 330 }]),
  wallet: () => screenTex("wallet", "My Wallet", [{ t: "BALANCE", px: 40, c: "#6a6f7a", y: 140 }, { t: "THOUSANDS ₿", px: 70, c: BTC, y: 220 }, { t: "mined at home", px: 30, c: "#2b2b33", y: 320 }]),
  mining: () => screenTex("mining", "Mining...", [{ t: "+50 ₿", px: 110, c: "#1f9d55", y: 180 }, { t: "block found!", px: 40, c: "#2b2b33", y: 300 }], "#0f1a12", "#1f9d55"),
  post: () => screenTex("post", "Pizza for bitcoins?", [{ t: "I'll pay", px: 40, c: "#2b2b33", y: 120 }, { t: "10,000 BITCOINS", px: 70, c: BTC, y: 200 }, { t: "for 2 large pizzas!", px: 46, c: "#2b2b33", y: 290 }]),
  noReply: () => screenTex("noReply", "Pizza for bitcoins?", [{ t: "REPLIES:", px: 52, c: "#6a6f7a", y: 160 }, { t: "0", px: 150, c: "#d7262e", y: 280 }]),
  deal: () => screenTex("deal", "Reply from jercos", [{ t: "DEAL!", px: 150, c: "#1f9d55", y: 200 }, { t: "I'll order them for you", px: 34, c: "#2b2b33", y: 320 }]),
  got: () => screenTex("got", "My Wallet", [{ t: "RECEIVED", px: 40, c: "#6a6f7a", y: 140 }, { t: "+10,000 ₿", px: 96, c: "#1f9d55", y: 230 }], "#f4f4ef", "#1f9d55"),
  price2010: () => screenTex("price2010", "Bitcoin price, May 2010", [{ t: "10,000 ₿ =", px: 52, c: "#2b2b33", y: 150 }, { t: "$41", px: 150, c: "#1f9d55", y: 270 }]),
  report: () => screenTex("report", "Re: Pizza for bitcoins?", [{ t: "I just want to report that I", px: 30, c: "#2b2b33", y: 110 }, { t: "successfully traded", px: 44, c: "#2b2b33", y: 170 }, { t: "10,000 bitcoins", px: 64, c: BTC, y: 245 }, { t: "for pizza.", px: 50, c: "#2b2b33", y: 320 }]),
  billions: () => screenTex("billions", "Bitcoin price today", [{ t: "ALL THAT PIZZA =", px: 40, c: "#6a6f7a", y: 140 }, { t: "$7.7 BILLION", px: 84, c: "#1f9d55", y: 240 }], "#0b0d12", "#1f9d55"),
  order: () => screenTex("order", "Pizza order #2", [{ t: "MORE PIZZA", px: 70, c: "#d7262e", y: 170 }, { t: "pay with ₿", px: 46, c: BTC, y: 280 }]),
  off: () => ctex("scrOff", 640, 400, (g) => { g.fillStyle = "#1b1e26"; g.fillRect(0, 0, 640, 400); g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(40, 30, 220, 120); }),
  game: () => ctex("scrGame", 640, 400, (g, r) => {
    const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, "#3a6fd8"); gr.addColorStop(1, "#9ad0ff"); g.fillStyle = gr; g.fillRect(0, 0, 640, 400);
    g.fillStyle = "#4caf50"; g.fillRect(0, 300, 640, 100); for (let i = 0; i < 6; i++) { g.fillStyle = "#8d6e63"; g.fillRect(60 + i * 100, 250 - r() * 60, 50, 50); }
    g.fillStyle = "#ffeb3b"; g.beginPath(); g.arc(520, 80, 34, 0, 7); g.fill();
  }),
} as const;
export type ScreenKey = keyof typeof SCREENS;
/** a pizza box lid seen from above: red/white with a big slice drawing and the word PIZZA (generic, not a real brand) */
export const pizzaLidTex = () => textTex("pizzaLid", 512, 512, "#f4efe4", [{ t: "PIZZA", px: 120, c: "#d7262e", y: 400 }], ["#c9b89a", 14], (g) => {
  g.fillStyle = "#d7262e"; g.beginPath(); g.moveTo(256, 60); g.lineTo(150, 300); g.lineTo(362, 300); g.closePath(); g.fill();
  g.fillStyle = "#ffcb2b"; g.beginPath(); g.moveTo(256, 92); g.lineTo(174, 278); g.lineTo(338, 278); g.closePath(); g.fill();
  g.fillStyle = "#d7262e"; for (const [x, y] of [[240, 170], [280, 220], [220, 250], [270, 140]]) { g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); }
});
/** the gold coin face: ₿ on orange */
export const coinTex = () => textTex("btcCoin", 256, 256, BTC, [{ t: "₿", px: 170, c: "#ffffff", y: 138 }], undefined, (g) => {
  g.fillStyle = "#e07d0e"; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill(); g.fillStyle = BTC; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill();
});
/** price boards in the city */
export const priceTex = (key: string, top: string, big: string, col = "#1f9d55") => textTex("price" + key, 768, 683, "#0b0d12", [{ t: top, px: 80, c: "#ffffff", y: 190 }, { t: big, px: 190, c: col, y: 420 }], [BTC, 16]);
export const tagTex = (key: string, t: string) => textTex("tag" + key, 512, 256, "#ffcb2b", [{ t, px: 110, c: "#1d1f26", y: 134 }], ["#1d1f26", 12]);
export const calTex = (key: string, mon: string, yr: string) => textTex("cal" + key, 256, 320, "#ffffff", [{ t: mon, px: 56, c: "#ffffff", y: 42 }, { t: yr, px: 96, c: "#2b2b33", y: 190 }], ["#2b2b33", 8], (g) => { g.fillStyle = "#d7262e"; g.fillRect(0, 0, 256, 84); });
export const shopSignTex = () => textTex("shopSign", 1024, 320, "#d7262e", [{ t: "PIZZA", px: 200, c: "#ffffff", y: 150 }, { t: "HOT • FRESH • FAST", px: 52, c: "#ffcb2b", y: 270 }], ["#8a1218", 14]);
export const menuTex = () => textTex("menu", 768, 512, "#1d1f26", [{ t: "MENU", px: 80, c: "#ffcb2b", y: 70 }, { t: "LARGE PIZZA  $12", px: 52, c: "#ffffff", y: 190 }, { t: "2 LARGE  $25", px: 52, c: "#ffffff", y: 280 }, { t: "SODA  $1", px: 52, c: "#ffffff", y: 370 }], ["#ffcb2b", 10]);
export const cashOnlyTex = () => textTex("cashOnly", 512, 256, "#ffffff", [{ t: "CASH ONLY", px: 100, c: "#d7262e", y: 100 }, { t: "no internet money", px: 36, c: "#2b2b33", y: 200 }], ["#d7262e", 12]);
export const btcHereTex = () => textTex("btcHere", 512, 256, BTC, [{ t: "₿ BITCOIN", px: 92, c: "#ffffff", y: 96 }, { t: "ACCEPTED HERE", px: 56, c: "#1d1f26", y: 196 }], ["#1d1f26", 12]);
export const partyBannerTex = () => textTex("partyBan", 1536, 384, "#ffcb2b", [{ t: "HAPPY BITCOIN PIZZA DAY!", px: 120, c: "#d7262e", y: 150 }, { t: "MAY 22", px: 100, c: "#1d1f26", y: 290 }], [BTC, 18]);
export const plateFLTex = () => textTex("plateFL", 512, 256, "#ffffff", [{ t: "FLORIDA", px: 70, c: "#2a7a3a", y: 60 }, { t: "B1T 2010", px: 110, c: "#1d1f26", y: 170 }], ["#2a7a3a", 10]);
export const doorSignTex = () => textTex("doorSign", 512, 256, "#2b2b33", [{ t: "JEREMY'S ROOM", px: 64, c: "#ffffff", y: 90 }, { t: "KEEP OUT!", px: 80, c: "#ff5252", y: 190 }], ["#ffcb2b", 10]);
export const deliveryTex = () => textTex("delivery", 512, 192, "#d7262e", [{ t: "PIZZA DELIVERY", px: 64, c: "#ffffff", y: 100 }], ["#ffffff", 8]);
export const nameMugTex = () => textTex("nameMug", 512, 128, "#f6f3ea", [{ t: "LASZLO", px: 80, c: "#2b2b33", y: 66 }], [BTC, 8]);
export const posterTex = (key: string, t: string, sub: string, bg: string, fg: string) => textTex("poster" + key, 384, 512, bg, [{ t, px: 70, c: fg, y: 200 }, { t: sub, px: 34, c: fg, y: 330 }], ["#1d1f26", 8]);
export const palmWinTex = () => ctex("palmWin", 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3f86e0"); gr.addColorStop(1, "#bfe3ff"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.ellipse(150, 120, 80, 28, 0, 0, 7); g.fill();
  g.fillStyle = "#7ec850"; g.fillRect(0, 430, 512, 82);
  for (const x of [110, 380]) { g.strokeStyle = "#8a5a34"; g.lineWidth = 18; g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x + 20, 320, x - 10, 220); g.stroke();
    g.fillStyle = "#2f8f46"; for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; g.beginPath(); g.ellipse(x - 10 + Math.cos(a) * 46, 220 + Math.sin(a) * 18, 60, 14, a, 0, 7); g.fill(); } }
});
export const playMoneyTex = (k: number) => textTex("play" + k, 256, 128, ["#f7a8c8", "#a8e0f7", "#f7e08a", "#b8f2a0"][k % 4], [{ t: ["$500", "$100", "$50", "$20"][k % 4], px: 64, c: "#1d1f26", y: 66 }], ["#1d1f26", 6]);
export const welcomeFLTex = () => textTex("welcomeFL", 1024, 384, "#2a7a3a", [{ t: "WELCOME TO", px: 70, c: "#f4f1e6", y: 90 }, { t: "FLORIDA", px: 150, c: "#ffffff", y: 220 }, { t: "THE SUNSHINE STATE", px: 46, c: "#ffcb2b", y: 330 }], ["#f4f1e6", 16]);

// ======================= "The 2,000-Year-Old Vending Machine" =======================
/** sandstone blocks: soft warm tones, darker mortar, chips */
export const stoneTex = (key: string, base: string, joint = 0.45) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const rows = 6, bh = 512 / rows;
  for (let y = 0; y < rows; y++) for (let x = -1; x < 4; x++) {
    const ox = (y % 2) * 64 + x * 128, k = 0.9 + r() * 0.16;
    const c = parseInt(base.slice(1), 16), ch = (s: number) => Math.min(255, Math.round(((c >> s) & 255) * k));
    g.fillStyle = `rgb(${ch(16)},${ch(8)},${ch(0)})`; g.fillRect(ox + 3, y * bh + 3, 122, bh - 6);
    for (let n = 0; n < 5; n++) { g.fillStyle = "rgba(120,80,40,0.12)"; g.beginPath(); g.arc(ox + r() * 120, y * bh + r() * bh, 1 + r() * 3, 0, 7); g.fill(); }
  }
  g.strokeStyle = `rgba(110,72,40,${joint})`; g.lineWidth = 3;
  for (let y = 0; y <= rows; y++) { g.beginPath(); g.moveTo(0, y * bh); g.lineTo(512, y * bh); g.stroke(); }
});
/** the painted temple frieze: lotus flowers and zigzag water bands in blue, red and gold (no writing) */
export const friezeTex = () => ctex("frieze", 1024, 256, (g) => {
  g.fillStyle = "#f2e2bc"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#2457c5"; g.fillRect(0, 0, 1024, 34); g.fillRect(0, 222, 1024, 34);
  g.fillStyle = "#e8c45a"; g.fillRect(0, 34, 1024, 10); g.fillRect(0, 212, 1024, 10);
  for (let i = 0; i < 16; i++) {
    const x = 32 + i * 64;
    // a lotus: stem, two outer petals curling out, a tall middle petal
    g.fillStyle = "#1f8a70"; g.fillRect(x - 3, 150, 6, 56);
    g.fillStyle = i % 2 ? "#c0392b" : "#2457c5";
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(x, 160); g.quadraticCurveTo(x + sd * 30, 150, x + sd * 26, 96); g.quadraticCurveTo(x + sd * 12, 130, x, 160); g.fill(); }
    g.fillStyle = i % 2 ? "#e05a3a" : "#3a86ff"; g.beginPath(); g.moveTo(x, 162); g.quadraticCurveTo(x - 13, 120, x, 74); g.quadraticCurveTo(x + 13, 120, x, 162); g.fill();
  }
  g.strokeStyle = "#f2e2bc"; g.lineWidth = 6; g.beginPath();
  for (let x = 0; x <= 1024; x += 32) g.lineTo(x, x % 64 ? 8 : 26); g.stroke();
});
/** a painted wall panel: a procession of stylised people in profile and a sun disc (decoration only) */
export const muralTex = () => ctex("mural", 1024, 512, (g) => {
  g.fillStyle = "#ead7ad"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(512, 110, 62, 0, 7); g.fill();
  g.strokeStyle = "#e8c45a"; g.lineWidth = 10; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(512 + s * 70, 110); g.lineTo(512 + s * 210, 90); g.lineTo(512 + s * 260, 120); g.stroke(); }
  for (let i = 0; i < 7; i++) {
    const x = 90 + i * 140 + (i > 3 ? 20 : 0), c = ["#2457c5", "#c0392b", "#1f8a70", "#d9822b"][i % 4];
    g.fillStyle = "#b8743c"; g.beginPath(); g.arc(x, 250, 22, 0, 7); g.fill();
    g.fillStyle = "#1d1f26"; g.fillRect(x - 24, 228, 30, 16);
    g.fillStyle = "#f6f2e6"; g.fillRect(x - 22, 276, 44, 110);
    g.fillStyle = c; g.fillRect(x - 22, 276, 44, 20);
    g.fillStyle = "#b8743c"; g.fillRect(x - 14, 386, 10, 70); g.fillRect(x + 4, 386, 10, 70);
    g.fillRect(x + 20, 300, 40, 10);
  }
  g.fillStyle = "#2457c5"; g.fillRect(0, 470, 1024, 42); g.fillStyle = "#c0392b"; g.fillRect(0, 0, 1024, 18);
});
/** Hero's drawing: the box cut open, lever, tray, plug, water and arrows, sepia on parchment */
export const blueprintTex = () => ctex("blueprint", 1024, 768, (g, r) => {
  g.fillStyle = "#f1e3c0"; g.fillRect(0, 0, 1024, 768);
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(150,110,60,0.06)"; g.beginPath(); g.arc(r() * 1024, r() * 768, 20 + r() * 60, 0, 7); g.fill(); }
  g.strokeStyle = "#5a3b22"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round";
  g.strokeRect(300, 140, 420, 480);                                  // the box
  g.beginPath(); g.moveTo(400, 140); g.lineTo(400, 120); g.lineTo(440, 120); g.lineTo(440, 140); g.stroke(); // the slot
  g.strokeRect(520, 200, 170, 160);                                  // the water tank
  g.fillStyle = "rgba(60,140,210,0.35)"; g.fillRect(524, 250, 162, 106);
  g.beginPath(); g.moveTo(330, 420); g.lineTo(650, 380); g.stroke();  // lever
  g.beginPath(); g.arc(490, 400, 12, 0, 7); g.stroke();             // pivot
  g.beginPath(); g.moveTo(312, 420); g.lineTo(372, 420); g.stroke(); // tray
  g.beginPath(); g.moveTo(610, 385); g.lineTo(610, 360); g.stroke(); // rod to the plug
  g.beginPath(); g.moveTo(690, 330); g.lineTo(780, 330); g.lineTo(780, 360); g.stroke(); // spout
  g.lineWidth = 4; g.setLineDash([14, 12]);
  g.beginPath(); g.moveTo(420, 150); g.lineTo(345, 405); g.stroke(); // the coin's path
  g.setLineDash([]);
  g.beginPath(); g.arc(342, 408, 14, 0, 7); g.stroke();
  for (const [x, y, a] of [[380, 470, 1], [640, 330, -1]] as const) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 40 * a); g.moveTo(x - 12, y + 26 * a); g.lineTo(x, y + 40 * a); g.lineTo(x + 12, y + 26 * a); g.stroke(); }
  g.beginPath(); g.moveTo(780, 370); g.quadraticCurveTo(790, 430, 780, 480); g.stroke();
  g.strokeRect(310, 520, 160, 90);                                   // coin box
  g.font = "italic 34px Georgia, serif"; g.fillStyle = "#5a3b22";
  for (const [t, x, y] of [["ὕδωρ", 560, 230], ["νόμισμα", 120, 400], ["μοχλός", 470, 470]] as const) g.fillText(t, x, y);
});
/** the workshop window: blue sea, the Pharos lighthouse of Alexandria, a sail */
export const pharosWinTex = () => ctex("pharosWin", 512, 640, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, "#3f86e0"); gr.addColorStop(0.62, "#bfe3ff"); gr.addColorStop(0.62, "#2f8fc8"); gr.addColorStop(1, "#1f6aa0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.ellipse(140, 110, 90, 28, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(380, 170, 70, 20, 0, 0, 7); g.fill();
  g.fillStyle = "#e9d8b0"; g.fillRect(250, 250, 90, 150); g.fillRect(262, 170, 66, 84); g.fillRect(274, 118, 42, 56);
  g.strokeStyle = "#b89a6a"; g.lineWidth = 3; for (const y of [250, 170, 118]) { g.beginPath(); g.moveTo(240, y); g.lineTo(350, y); g.stroke(); }
  g.fillStyle = "#ffcf5e"; g.beginPath(); g.arc(295, 108, 16, 0, 7); g.fill();
  g.fillStyle = "#d8c49a"; g.fillRect(200, 392, 190, 18);
  g.fillStyle = "#f4f1e6"; g.beginPath(); g.moveTo(90, 470); g.lineTo(130, 380); g.lineTo(140, 470); g.fill(); g.fillStyle = "#8a5a34"; g.fillRect(70, 470, 90, 12);
});
/** small label pill for the cutaway (Knackery-style annotations) */
export const labelTex = (key: string, t: string) => textTex("lbl" + key, 512, 160, "#ffffff", [{ t, px: 92, c: "#1d1f26", y: 84 }], ["#1d1f26", 14]);
/** the modern snack machine's glass front: rows of colourful snacks */
export const snackFrontTex = () => ctex("snackFront", 512, 768, (g, r) => {
  g.fillStyle = "#1d2a38"; g.fillRect(0, 0, 512, 768);
  for (let row = 0; row < 5; row++) {
    const y = 40 + row * 140;
    g.fillStyle = "#c9ccd2"; g.fillRect(16, y + 110, 480, 8);
    for (let k = 0; k < 5; k++) {
      const x = 26 + k * 96, c = ["#d7262e", "#ffcb2b", "#2457c5", "#2a9d8f", "#f77f00", "#7b5ac9"][(row * 2 + k) % 6];
      g.fillStyle = c; g.fillRect(x, y + 12 + r() * 6, 76, 96);
      g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(x + 38, y + 56, 24, 16, 0, 0, 7); g.fill();
      g.fillStyle = "#f4f1ea"; g.fillRect(x + 22, y + 118, 32, 12);
    }
  }
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(160, 0); g.lineTo(60, 768); g.lineTo(0, 768); g.fill();
});
export const snackSignTex = () => textTex("snackSign", 512, 128, "#d7262e", [{ t: "SNACKS", px: 90, c: "#ffffff", y: 68 }], ["#8a1218", 8]);
export const hallPosterTex = (key: string, t: string, sub: string, bg: string, fg: string) => textTex("hp" + key, 384, 512, bg, [{ t, px: 72, c: fg, y: 200 }, { t: sub, px: 34, c: fg, y: 320 }], ["#1d1f26", 8]);
/** the "no electricity" / "no buttons" circle-slash badges */
export const noTex = (key: string, icon: "bolt" | "button") => ctex("no" + key, 512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.fill();
  g.fillStyle = "#1d1f26";
  if (icon === "bolt") { g.fillStyle = "#ffcb2b"; g.beginPath(); g.moveTo(290, 70); g.lineTo(160, 280); g.lineTo(250, 280); g.lineTo(210, 450); g.lineTo(360, 220); g.lineTo(265, 220); g.closePath(); g.fill(); g.strokeStyle = "#1d1f26"; g.lineWidth = 12; g.stroke(); }
  else { g.fillStyle = "#c9ccd2"; g.beginPath(); g.roundRect(120, 160, 272, 192, 40); g.fill(); g.fillStyle = "#d7262e"; g.beginPath(); g.arc(256, 256, 62, 0, 7); g.fill(); g.strokeStyle = "#1d1f26"; g.lineWidth = 12; g.stroke(); }
  g.strokeStyle = "#d7262e"; g.lineWidth = 46; g.beginPath(); g.arc(256, 256, 210, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(108, 108); g.lineTo(404, 404); g.stroke();
});

// ================= "What Romans Used Instead of Toilet Paper" =================
/** black-and-white Roman floor mosaic: small tesserae, a wave border and a central rosette per tile */
export const mosaicTex = () => ctex("mosaic2", 1024, 1024, (g, r) => {
  // anti-shimmer: no 1-px grout grid, no black-and-white ladders (they crawled at grazing angles); a soft cream field with
  // big low-contrast tesserae, a muted terracotta wave band and a warm rosette
  g.fillStyle = "#efe4cf"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 32) for (let x = 0; x < 1024; x += 32) { g.fillStyle = jit(r, "#eee2cb", 0.018); g.fillRect(x, y, 32, 32); }
  const t = (x: number, y: number, c: string) => { g.fillStyle = jit(r, c, 0.03); g.fillRect(x, y, 32, 32); };
  for (let x = 0; x < 1024; x += 32) { const h = Math.round(1.5 + 1.2 * Math.sin((x / 1024) * Math.PI * 8)); for (let j = 0; j < h; j++) { t(x, 32 + j * 32, "#c99a7a"); t(x, 960 - j * 32, "#c99a7a"); } }
  for (let a = 0; a < 360; a += 8) for (let rad = 48; rad < 240; rad += 32) {
    const x = 512 + Math.cos((a * Math.PI) / 180) * rad, y = 512 + Math.sin((a * Math.PI) / 180) * rad;
    if (Math.cos(((a * 8) * Math.PI) / 180) * 100 + 140 > rad) t(Math.round(x / 32) * 32, Math.round(y / 32) * 32, rad < 90 ? "#d98a6a" : "#e0b483");
  }
});
/** Roman wall fresco: deep red panels framed in black and ochre, a garland and a little bird (Pompeii style) */
export const frescoTex = (key: string, seed = 0) => ctex("fresco" + key, 1024, 512, (g, r) => {
  g.fillStyle = "#b8322a"; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#e8c45a"; g.fillRect(0, 0, 1024, 30); g.fillStyle = "#1d1f26"; g.fillRect(0, 420, 1024, 92);
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 330; g.fillStyle = "#1d1f26"; g.fillRect(x, 60, 280, 330); g.fillStyle = i === 1 ? "#e8c45a" : "#c94a34"; g.fillRect(x + 14, 74, 252, 302);
    g.strokeStyle = "#f4f1ea"; g.lineWidth = 4; g.strokeRect(x + 30, 90, 220, 270);
    if (i === 1) { // a little bird on a branch
      g.strokeStyle = "#3a5a2a"; g.lineWidth = 8; g.beginPath(); g.moveTo(x + 50, 300); g.quadraticCurveTo(x + 140, 250, x + 230, 290); g.stroke();
      g.fillStyle = "#2457c5"; g.beginPath(); g.ellipse(x + 140 + seed * 10, 230, 34, 22, -0.3, 0, 7); g.fill(); g.beginPath(); g.arc(x + 172 + seed * 10, 212, 14, 0, 7); g.fill();
      g.fillStyle = "#f2b134"; g.beginPath(); g.moveTo(x + 184 + seed * 10, 210); g.lineTo(x + 200 + seed * 10, 214); g.lineTo(x + 184 + seed * 10, 218); g.fill();
    } else { // a garland swag
      g.strokeStyle = "#3f8a3e"; g.lineWidth = 14; g.beginPath(); g.moveTo(x + 40, 130); g.quadraticCurveTo(x + 140, 230, x + 240, 130); g.stroke();
      for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? "#f2b134" : "#f4f1ea"; g.beginPath(); g.arc(x + 60 + k * 32, 150 + Math.sin((k / 5) * Math.PI) * 50, 8, 0, 7); g.fill(); }
    }
  }
  for (let n = 0; n < 220; n++) { g.fillStyle = "rgba(255,240,220,0.05)"; g.fillRect(r() * 1024, r() * 512, 10, 10); }
});
/** veined white marble */
export const marbleTex = (key: string, base = "#f2efe8", vein = "#c9c3ba") => ctex("marble" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let n = 0; n < 9; n++) { g.strokeStyle = vein; g.globalAlpha = 0.35 + r() * 0.3; g.lineWidth = 1 + r() * 2.5; g.beginPath(); let x = r() * 512, y = 0; g.moveTo(x, y);
    while (y < 512) { x += (r() - 0.5) * 60; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
  g.globalAlpha = 1;
});
/** running water seen from above: bright stripes that world.ts scrolls along the channel */
export const flowTex = () => { const t = ctex("flow", 256, 256, (g, r) => {
  g.fillStyle = "#4fb2e8"; g.fillRect(0, 0, 256, 256);
  for (let n = 0; n < 28; n++) { const y = r() * 256, x = r() * 256, w = 30 + r() * 70; g.fillStyle = n % 3 ? "rgba(200,240,255,0.55)" : "rgba(255,255,255,0.8)"; g.fillRect(x, y, w, 3 + r() * 3); g.fillRect(x - 256, y, w, 4); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
/** the latrine's painted sign over the street door */
export const foricaTex = () => textTex("forica", 1024, 256, "#b8322a", [{ t: "FORICA", px: 150, c: "#f4e6c4", y: 132, font: `700 150px "Times New Roman", "DejaVu Serif", serif` }], ["#e8c45a", 16]);
/** a painted shop board (no readable words): an amphora, bread loaves or a fish on a coloured field */
export const shopTex = (key: string, kind: "wine" | "bread" | "fish", bg: string) => ctex("shop" + key, 512, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#1d1f26"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 244);
  g.fillStyle = "#f4e6c4";
  if (kind === "wine") { g.beginPath(); g.ellipse(256, 140, 50, 70, 0, 0, 7); g.fill(); g.fillRect(240, 50, 32, 40); g.fillStyle = bg; g.fillRect(250, 56, 12, 20); }
  else if (kind === "bread") for (const x of [150, 256, 362]) { g.beginPath(); g.arc(x, 132, 46, 0, 7); g.fill(); g.strokeStyle = bg; g.lineWidth = 6; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, 132); g.lineTo(x + Math.cos(k * 1.57) * 46, 132 + Math.sin(k * 1.57) * 46); g.stroke(); } }
  else { g.beginPath(); g.ellipse(240, 128, 110, 44, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(340, 128); g.lineTo(410, 80); g.lineTo(410, 176); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(170, 118, 9, 0, 7); g.fill(); }
});
/** the historians' board: a sponge + arrow + a person, versus a sponge + arrow + a toilet seat (pictures only) */
export const debateTex = () => ctex("debate", 1024, 640, (g) => {
  g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, 1024, 640); g.strokeStyle = "#2b2b33"; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 626);
  g.strokeStyle = "#c9c3ba"; g.lineWidth = 6; g.beginPath(); g.moveTo(512, 40); g.lineTo(512, 600); g.stroke();
  const sponge = (x: number, y: number) => { g.strokeStyle = "#8a5a34"; g.lineWidth = 12; g.beginPath(); g.moveTo(x, y + 150); g.lineTo(x + 10, y); g.stroke();
    g.fillStyle = "#e8c870"; g.beginPath(); g.ellipse(x + 12, y - 20, 46, 36, 0, 0, 7); g.fill(); g.strokeStyle = "#2b2b33"; g.lineWidth = 6; g.stroke();
    g.fillStyle = "#b8923e"; for (const [dx, dy] of [[-16, -8], [10, 4], [20, -24], [-4, -36]]) { g.beginPath(); g.arc(x + 12 + dx, y - 20 + dy, 6, 0, 7); g.fill(); } };
  const arrow = (x: number, y: number) => { g.strokeStyle = "#d7262e"; g.lineWidth = 16; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 90, y); g.stroke(); g.fillStyle = "#d7262e"; g.beginPath(); g.moveTo(x + 120, y); g.lineTo(x + 84, y - 28); g.lineTo(x + 84, y + 28); g.fill(); };
  sponge(110, 230); arrow(190, 300);
  // a person (simple figure, from behind) : head + tunic
  g.fillStyle = "#e9c39f"; g.strokeStyle = "#2b2b33"; g.lineWidth = 6; g.beginPath(); g.arc(410, 200, 44, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#2457c5"; g.beginPath(); g.moveTo(350, 250); g.lineTo(470, 250); g.lineTo(490, 450); g.lineTo(330, 450); g.closePath(); g.fill(); g.stroke();
  sponge(610, 230); arrow(690, 300);
  // a stone seat with a keyhole
  g.fillStyle = "#e8e2d6"; g.beginPath(); g.rect(830, 300, 160, 150); g.fill(); g.stroke();
  g.fillStyle = "#2b2b33"; g.beginPath(); g.arc(910, 352, 30, 0, 7); g.fill(); g.fillRect(898, 352, 24, 98);
  g.fillStyle = "#1d1f26"; g.font = `900 120px "Arial Black", "DejaVu Sans", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("?", 256, 560); g.fillText("?", 768, 560);
});
/** glossy modern bathroom wall tile */
export const tileTex = (key: string, base: string) => ctex("tile" + key, 512, 512, (g, r) => {
  g.fillStyle = "#e9eef4"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = jit(r, base, 0.03); g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x * 128 + 10, y * 128 + 10, 50, 8); }
});
/** excavation soil: brown with pebbles */
export const soilTex = (key: string, base: string) => ctex("soil" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let n = 0; n < 900; n++) { g.fillStyle = jit(r, base, 0.12); g.beginPath(); g.arc(r() * 512, r() * 512, 1 + r() * 5, 0, 7); g.fill(); }
  for (let n = 0; n < 60; n++) { g.fillStyle = "rgba(240,230,210,0.5)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 6, 2 + r() * 4, r() * 3, 0, 7); g.fill(); }
});

// ================= "Before Alarm Clocks" (knocker-upper short) =================
const hexK = (base: string, k: number) => { const c = parseInt(base.slice(1), 16), ch = (s: number) => Math.min(255, Math.round(((c >> s) & 255) * k)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
/** big storybook bricks, low-contrast mortar (anti-shimmer: 4 courses per tile, soft joints, gentle per-brick variation) */
export const brickTex = (key: string, base: string, mortar: string, joint = 0.55) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = mortar; g.fillRect(0, 0, 512, 512);
  const rows = 4, bh = 512 / rows, bw = 256;
  for (let y = 0; y < rows; y++) for (let x = -1; x < 3; x++) {
    const ox = (y % 2) * (bw / 2) + x * bw, k = 0.93 + r() * 0.12;
    g.fillStyle = hexK(base, k); g.globalAlpha = 1; g.fillRect(ox + 6, y * bh + 6, bw - 12, bh - 12);
    g.fillStyle = hexK(base, 1.08); g.globalAlpha = 0.35; g.fillRect(ox + 10, y * bh + 10, bw - 20, 10);
    g.globalAlpha = 1;
  }
  g.globalAlpha = 1 - joint; g.fillStyle = base; // pull the mortar toward the brick colour (softer lines)
  for (let y = 0; y <= rows; y++) g.fillRect(0, y * bh - 6, 512, 12);
  for (let y = 0; y < rows; y++) for (let x = -1; x < 3; x++) g.fillRect((y % 2) * (bw / 2) + x * bw - 6, y * bh, 12, bh);
  g.globalAlpha = 1;
});
/** rounded cobbles, soft and low contrast */
export const cobbleTex = (key: string, base: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = hexK(base, 0.86); g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
    const cx = x * 102.4 + 51 + (y % 2) * 51, cy = y * 102.4 + 51, k = 0.94 + r() * 0.1;
    for (const dx of [-512, 0, 512]) { g.fillStyle = hexK(base, k); g.beginPath(); g.ellipse(cx + dx, cy, 44, 40, r() * 0.4, 0, 7); g.fill();
      g.fillStyle = hexK(base, k * 1.06); g.beginPath(); g.ellipse(cx + dx - 8, cy - 10, 26, 16, 0, 0, 7); g.fill(); }
  }
});
/** Victorian wallpaper: soft stripes with small flower sprigs */
export const wallpaperTex = (key: string, base: string, stripe: string, flower: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  g.fillStyle = stripe; for (let x = 0; x < 512; x += 128) g.fillRect(x + 48, 0, 32, 512);
  for (let y = 0; y < 512; y += 128) for (let x = 0; x < 512; x += 128) {
    const cx = x + 16 + ((y / 128) % 2) * 0, cy = y + 64; g.fillStyle = flower;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 7, 0, 7); g.fill(); }
    g.fillStyle = "#f2e2a0"; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill(); void r;
  }
});
/** patchwork quilt */
export const quiltTex = (key: string, cols: string[]) => ctex(key, 512, 512, (g, r) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x * 128, y * 128, 128, 128);
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.setLineDash([10, 8]); g.lineWidth = 4; g.strokeRect(x * 128 + 10, y * 128 + 10, 108, 108); g.setLineDash([]); }
});
/** a clock face (hours h, minutes m): cream dial, numerals as ticks, black hands */
export const clockFaceTex = (key: string, h: number, m: number, rim = "#c9933f") => ctex("clock" + key, 256, 256, (g) => {
  g.fillStyle = rim; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = "#fbf6e8"; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill();
  g.strokeStyle = "#2b2b33"; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.lineWidth = k % 3 ? 5 : 10; g.beginPath(); g.moveTo(128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); g.lineTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.stroke(); }
  const ha = ((h % 12) + m / 60) / 12 * Math.PI * 2, ma = (m / 60) * Math.PI * 2;
  g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ha) * 52, 128 - Math.cos(ha) * 52); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ma) * 80, 128 - Math.cos(ma) * 80); g.stroke();
  g.fillStyle = "#2b2b33"; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill();
});
/** a lit window at night: warm glow with a cross mullion and curtains */
export const litWinTex = (key: string, warm = "#ffd27a", curtain = "#c0392b") => ctex(key, 256, 320, (g) => {
  const gr = g.createRadialGradient(128, 170, 20, 128, 170, 200); gr.addColorStop(0, "#fff1c8"); gr.addColorStop(1, warm); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = curtain; g.fillRect(0, 0, 46, 320); g.fillRect(210, 0, 46, 320);
  g.fillStyle = "#3a2a24"; g.fillRect(122, 0, 12, 320); g.fillRect(0, 150, 256, 12);
});
/** a dark window at night: deep blue glass with a faint reflection and the cross mullion */
export const darkWinTex = (key: string, glass = "#20345e", frame = "#f2ead6") => ctex(key, 256, 320, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, "#36518a"); gr.addColorStop(1, glass); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "rgba(200,220,255,0.18)"; g.beginPath(); g.moveTo(30, 0); g.lineTo(90, 0); g.lineTo(20, 140); g.lineTo(0, 140); g.closePath(); g.fill();
  g.fillStyle = frame; g.fillRect(122, 0, 12, 320); g.fillRect(0, 150, 256, 12);
});
export const clockSignTex = () => textTex("clockSign", 1024, 256, "#1f4e3d", [{ t: "CLOCKMAKER", px: 140, c: "#f2d27a", y: 132 }], ["#f2d27a", 12]);
export const priceTagTex = (key: string, t: string, bg = "#ffffff", fg = "#c0392b") => textTex("tag" + key, 384, 192, bg, [{ t, px: 110, c: fg, y: 100 }], [fg, 10]);
export const millSignTex = () => textTex("millSign", 1536, 256, "#2a2a33", [{ t: "VICTORIA COTTON MILL", px: 120, c: "#f4f1e6", y: 132 }], ["#e8c45a", 12]);
export const lateSignTex = () => textTex("lateSign", 512, 320, "#f4f1e6", [{ t: "LATE?", px: 100, c: "#c0392b", y: 100 }, { t: "NO PAY", px: 110, c: "#1d1f26", y: 230 }], ["#1d1f26", 14]);
export const cheapSignTex = () => textTex("cheapSign", 512, 256, "#ffcb2b", [{ t: "CHEAP!", px: 150, c: "#c0392b", y: 132 }], ["#c0392b", 14]);
export const pubSignTex = () => textTex("pubSign", 768, 256, "#7b2d2d", [{ t: "THE ANCHOR", px: 110, c: "#f2d27a", y: 132 }], ["#f2d27a", 12]);
