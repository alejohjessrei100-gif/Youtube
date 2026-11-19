// Procedural canvas textures — gives surfaces the "real material" detail
// (wood grain, stone, dirt, fabric) that makes the reference frames look premium.
import * as THREE from "three";

let seed = 12345;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const reseed = (s: number) => {
  seed = s;
};

const cache = new Map<string, THREE.Texture>();

const make = (
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat: [number, number] = [1, 1],
  srgb = true
) => {
  const k = key + repeat.join("x");
  if (cache.has(k)) return cache.get(k)!;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  reseed(key.length * 977 + w);
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k, t);
  return t;
};

// value noise for organic variation
const noiseLayer = (g: CanvasRenderingContext2D, w: number, h: number, cell: number, alpha: number, light = "255,255,255", dark = "0,0,0") => {
  for (let y = 0; y < h; y += cell)
    for (let x = 0; x < w; x += cell) {
      const v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(${light},${(v - 0.5) * alpha})` : `rgba(${dark},${(0.5 - v) * alpha})`;
      g.fillRect(x, y, cell, cell);
    }
};
const blurPass = (g: CanvasRenderingContext2D, w: number, h: number, px: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g2 = c.getContext("2d")!;
  g2.filter = `blur(${px}px)`;
  g2.drawImage(g.canvas, 0, 0);
  g.clearRect(0, 0, w, h);
  g.drawImage(c, 0, 0);
};

export const dirtTex = (repeat: [number, number]) =>
  make("dirt", 512, 512, (g, w, h) => {
    g.fillStyle = "#7a5a3c";
    g.fillRect(0, 0, w, h);
    noiseLayer(g, w, h, 32, 0.35, "200,160,110", "40,25,15");
    blurPass(g, w, h, 14);
    noiseLayer(g, w, h, 8, 0.25, "210,170,120", "50,30,20");
    blurPass(g, w, h, 3);
    noiseLayer(g, w, h, 2, 0.22);
    // pebbles
    for (let i = 0; i < 220; i++) {
      const x = rnd() * w, y = rnd() * h, r = 1 + rnd() * 4;
      g.fillStyle = `rgba(${150 + rnd() * 60},${120 + rnd() * 50},${90 + rnd() * 40},0.8)`;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, 7);
      g.fill();
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath();
      g.ellipse(x + r * 0.3, y + r * 0.4, r, r * 0.6, 0, 0, 7);
      g.fill();
    }
  }, repeat);

export const grassTex = (repeat: [number, number]) =>
  make("grass", 512, 512, (g, w, h) => {
    g.fillStyle = "#4f6b2e";
    g.fillRect(0, 0, w, h);
    noiseLayer(g, w, h, 40, 0.4, "150,170,70", "20,35,10");
    blurPass(g, w, h, 16);
    for (let i = 0; i < 9000; i++) {
      const x = rnd() * w, y = rnd() * h, l = 3 + rnd() * 7;
      g.strokeStyle = `rgba(${70 + rnd() * 80},${100 + rnd() * 80},${30 + rnd() * 40},0.7)`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rnd() - 0.5) * 3, y - l);
      g.stroke();
    }
  }, repeat);

export const woodTex = (repeat: [number, number], base = "#8a5a34", planks = 6) =>
  make("wood" + base + planks, 512, 512, (g, w, h) => {
    const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const shade = 0.82 + rnd() * 0.3;
      g.fillStyle = base;
      g.fillRect(0, p * ph, w, ph);
      g.fillStyle = `rgba(${shade > 1 ? "255,230,200" : "30,15,5"},${Math.abs(shade - 1) * 0.9})`;
      g.fillRect(0, p * ph, w, ph);
      // grain
      for (let i = 0; i < 26; i++) {
        const y = p * ph + rnd() * ph;
        g.strokeStyle = `rgba(40,20,8,${0.1 + rnd() * 0.18})`;
        g.lineWidth = 1 + rnd() * 1.5;
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 2 + (rnd() - 0.5) * 2);
        g.stroke();
      }
      // knots
      if (rnd() > 0.5) {
        g.fillStyle = "rgba(50,25,10,0.45)";
        g.beginPath();
        g.ellipse(rnd() * w, p * ph + ph / 2, 7, 4, 0, 0, 7);
        g.fill();
      }
      // seam
      g.fillStyle = "rgba(20,10,4,0.75)";
      g.fillRect(0, p * ph, w, 3);
      g.fillStyle = "rgba(255,220,180,0.12)";
      g.fillRect(0, p * ph + 3, w, 2);
      // vertical butt joints
      const jx = rnd() * w;
      g.fillStyle = "rgba(20,10,4,0.6)";
      g.fillRect(jx, p * ph, 3, ph);
    }
  }, repeat);

export const stoneTex = (repeat: [number, number]) =>
  make("stone", 512, 512, (g, w, h) => {
    g.fillStyle = "#3a3632";
    g.fillRect(0, 0, w, h);
    const rows = 8;
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -40 : 0;
      while (x < w) {
        const bw = 60 + rnd() * 50;
        const v = 120 + rnd() * 50;
        g.fillStyle = `rgb(${v + 10},${v},${v - 12})`;
        g.beginPath();
        g.roundRect(x + 3, r * rh + 3, bw - 6, rh - 6, 6);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.12)";
        g.fillRect(x + 5, r * rh + 4, bw - 10, 4);
        x += bw;
      }
    }
    noiseLayer(g, w, h, 4, 0.18);
  }, repeat);

export const roofTex = (repeat: [number, number], base = "#7d3328") =>
  make("roof" + base, 512, 512, (g, w, h) => {
    g.fillStyle = "#2a1410";
    g.fillRect(0, 0, w, h);
    const rows = 10, cols = 8;
    for (let r = 0; r < rows; r++)
      for (let c = -1; c < cols; c++) {
        const x = c * (w / cols) + (r % 2 ? w / cols / 2 : 0), y = r * (h / rows);
        const s = 0.8 + rnd() * 0.35;
        g.fillStyle = base;
        g.globalAlpha = 1;
        g.beginPath();
        g.roundRect(x + 2, y, w / cols - 4, h / rows + 6, [0, 0, 14, 14]);
        g.fill();
        g.fillStyle = s > 1 ? `rgba(255,200,170,${(s - 1) * 0.8})` : `rgba(0,0,0,${(1 - s) * 0.8})`;
        g.fill();
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(x + 2, y + h / rows, w / cols - 4, 6);
      }
  }, repeat);

export const fabricTex = (base: string, stripe: string, accent: string) =>
  make("fab" + base + stripe + accent, 256, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // woven vertical stripes like the reference robes
    // fine weave: thin stripes + cross-hatch, low contrast like real cloth
    for (let x = 0; x < w; x += 10) {
      g.fillStyle = stripe;
      g.globalAlpha = 0.55;
      g.fillRect(x, 0, 3, h);
    }
    g.globalAlpha = 0.12;
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = "#000";
      g.fillRect(0, y, w, 1);
    }
    g.globalAlpha = 1;
    // accent bands + belt
    g.fillStyle = accent;
    g.fillRect(0, h * 0.86, w, 14);
    // V collar at the front (u = 0.25 is the front of a capsule)
    g.fillStyle = accent;
    g.beginPath();
    g.moveTo(w * 0.25 - 40, 0);
    g.lineTo(w * 0.25, h * 0.2);
    g.lineTo(w * 0.25 + 40, 0);
    g.lineTo(w * 0.25 + 26, 0);
    g.lineTo(w * 0.25, h * 0.15);
    g.lineTo(w * 0.25 - 26, 0);
    g.fill();
    g.fillStyle = "#2b1a12";
    g.fillRect(0, h * 0.52, w, 26);
    g.fillStyle = "#d8b25a";
    g.fillRect(w * 0.46, h * 0.52 + 4, 22, 18);
    noiseLayer(g, w, h, 2, 0.14);
  }, [1, 1]);

export const rugTex = () =>
  make("rug", 512, 512, (g, w, h) => {
    g.fillStyle = "#9b1e22";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e8c06a";
    g.lineWidth = 10;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.strokeStyle = "#1f2e6b";
    g.lineWidth = 16;
    g.strokeRect(50, 50, w - 100, h - 100);
    g.fillStyle = "#1f2e6b";
    g.beginPath();
    g.ellipse(w / 2, h / 2, 120, 120, 0, 0, 7);
    g.fill();
    g.fillStyle = "#e8c06a";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.ellipse(w / 2 + Math.cos(a) * 80, h / 2 + Math.sin(a) * 80, 18, 8, a, 0, 7);
      g.fill();
    }
    g.fillStyle = "#c8481e";
    g.beginPath();
    g.ellipse(w / 2, h / 2, 40, 40, 0, 0, 7);
    g.fill();
    noiseLayer(g, w, h, 2, 0.2);
  });

export const glowTex = () =>
  make("glow", 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

export const flameTex = () =>
  make("flame", 128, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * 0.72, 4, w / 2, h * 0.6, h * 0.55);
    gr.addColorStop(0, "rgba(255,255,220,1)");
    gr.addColorStop(0.25, "rgba(255,210,90,1)");
    gr.addColorStop(0.6, "rgba(255,110,20,0.85)");
    gr.addColorStop(1, "rgba(200,40,0,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(w / 2, 6);
    g.bezierCurveTo(w * 0.95, h * 0.45, w * 0.95, h * 0.9, w / 2, h - 4);
    g.bezierCurveTo(w * 0.05, h * 0.9, w * 0.05, h * 0.45, w / 2, 6);
    g.fill();
  });

export const leafTex = () =>
  make("leaf", 512, 512, (g, w, h) => {
    g.fillStyle = "#3d5a2a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 9;
      const l = 0.55 + rnd() * 0.8;
      g.fillStyle = `rgb(${Math.round(60 * l)},${Math.round(95 * l)},${Math.round(42 * l)})`;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.55, rnd() * 3, 0, 7);
      g.fill();
    }
  }, [2, 2]);
