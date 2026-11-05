// The whole ear short as one three.js scene: sky, sea, three ships for the 1739 battle and the 1731 boarding, a night
// quay, a London street, the Commons chamber, a Victorian study and a museum hall, all far apart. update(id, f)
// poses the camera, light rig, flags, the page being written and the cast for shot `id` (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, Ray, house, quad, setSight } from "./build";
import { beam, rep, ctex, planksHD, beamHD, stoneHD, cobbleHD, waterNear, waterFar, cloudHD, rng } from "./paint";
import { Pen } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, camAt, V3, ShotDef, BRIT, SPAN, WAR_DECK, JAR1, REB, REB_DECK, GC, DOCK, QUAY_Y, STACK, LX, PX, TABLE, TABLE_TOP,
  SX, DESK_TOP, BOOK, MX, CASE, PED, PED_TOP, clamp01,
} from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures (flat colour, dark seams, ink-ish lines) ----------------
const hullTex = (key: string, base: string, stripe: string, ports: boolean, H: number) => ctex("hull" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const ph = 512 / (H / 0.32); // planks every 32 cm
  for (let y = 0; y < 512; y += ph) {
    g.fillStyle = `rgba(0,0,0,${0.05 + 0.06 * r()})`; g.fillRect(0, y, 512, ph * 0.5);
    g.fillStyle = "rgba(30,15,10,0.55)"; g.fillRect(0, y, 512, 2);
    for (let x = r() * 200; x < 512; x += 160 + r() * 120) g.fillRect(x, y, 2, ph);
  }
  // canvas y = 0 is the TOP of the hull side (uv v = 1 at the deck)
  g.fillStyle = stripe; g.fillRect(0, 512 * 0.06, 512, 512 * 0.1); g.fillRect(0, 512 * 0.36, 512, 512 * 0.06);
  g.fillStyle = "rgba(20,12,10,0.8)"; g.fillRect(0, 512 * 0.06, 512, 3); g.fillRect(0, 512 * 0.16 - 3, 512, 3);
  g.fillStyle = "#4a3a34"; g.fillRect(0, 512 * 0.86, 512, 512 * 0.14); // below the waterline
  if (ports) for (let x = 40; x < 512; x += 128) {
    g.fillStyle = "#c23a32"; g.fillRect(x - 6, 512 * 0.19 - 6, 72, 64);
    g.fillStyle = "#16121a"; g.fillRect(x, 512 * 0.19, 60, 52);
  }
});
const sailTex = () => ctex("sail", 256, 256, (g, r) => {
  g.fillStyle = "#f3ead6"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "rgba(120,100,70,0.35)"; g.fillRect(x, 0, 2, 256); }
  g.fillStyle = "rgba(120,100,70,0.12)"; for (let i = 0; i < 8; i++) g.fillRect(r() * 256, 0, 10, 256);
  g.strokeStyle = "rgba(60,40,30,0.8)"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250);
});
const redEnsign = () => ctex("redEnsign", 300, 180, (g) => {
  g.fillStyle = "#c8262f"; g.fillRect(0, 0, 300, 180);
  const W = 150, H = 90;
  g.fillStyle = "#24387a"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#ffffff"; g.lineWidth = 16; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  g.fillStyle = "#ffffff"; g.fillRect(W / 2 - 15, 0, 30, H); g.fillRect(0, H / 2 - 15, W, 30);
  g.fillStyle = "#c8262f"; g.fillRect(W / 2 - 9, 0, 18, H); g.fillRect(0, H / 2 - 9, W, 18);
});
const burgundy = () => ctex("burgundy", 300, 180, (g) => {
  g.fillStyle = "#f5f1e6"; g.fillRect(0, 0, 300, 180);
  g.strokeStyle = "#b8202a"; g.lineCap = "round";
  for (const [x0, y0, x1, y1] of [[20, 14, 280, 166], [280, 14, 20, 166]]) {
    g.lineWidth = 26; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    for (let k = 1; k < 6; k++) { const x = x0 + ((x1 - x0) * k) / 6, y = y0 + ((y1 - y0) * k) / 6; g.lineWidth = 12; g.beginPath(); g.moveTo(x - 12, y - 10); g.lineTo(x + 12, y + 10); g.stroke(); }
  }
});
const crateTex = () => ctex("crate", 256, 256, (g, r) => {
  g.fillStyle = "#b98450"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.08 * r()})`; g.fillRect(0, y, 256, 64); g.fillStyle = "rgba(60,35,20,0.7)"; g.fillRect(0, y, 256, 3); }
  g.strokeStyle = "#7a5232"; g.lineWidth = 22; g.strokeRect(11, 11, 234, 234);
  g.beginPath(); g.moveTo(20, 20); g.lineTo(236, 236); g.stroke();
});
const panelTex = () => ctex("oakPanel", 512, 512, (g) => {
  g.fillStyle = "#6e4630"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) for (let y = 0; y < 512; y += 256) {
    g.fillStyle = "#7d5238"; g.fillRect(x + 16, y + 16, 96, 224);
    g.strokeStyle = "rgba(30,15,10,0.75)"; g.lineWidth = 4; g.strokeRect(x + 16, y + 16, 96, 224);
    g.fillStyle = "rgba(255,230,190,0.12)"; g.fillRect(x + 20, y + 20, 6, 216);
  }
});
const plasterTex = (key: string, col: string, stripe?: string) => ctex("plaster" + key, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  if (stripe) for (let x = 0; x < 512; x += 64) { g.fillStyle = stripe; g.fillRect(x, 0, 26, 512); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,60,40,${0.03 + 0.03 * r()})`; g.beginPath(); g.arc(r() * 512, r() * 512, 20 + r() * 50, 0, 7); g.fill(); }
});
const carpetTex = () => ctex("carpet", 512, 512, (g) => {
  g.fillStyle = "#2f6a44"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#e2c35a"; g.lineWidth = 8; g.strokeRect(20, 20, 472, 472);
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 512; i += 32) g.fillRect(i, 0, 2, 512);
});
const marbleTex = () => ctex("marbleChk", 512, 512, (g) => {
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { g.fillStyle = (i + k) % 2 ? "#e9e3d6" : "#b9ad9a"; g.fillRect(i * 128, k * 128, 128, 128); }
  g.fillStyle = "rgba(40,30,30,0.6)"; for (let i = 0; i <= 512; i += 128) { g.fillRect(i - 1, 0, 2, 512); g.fillRect(0, i - 1, 512, 2); }
});
const booksTex = () => ctex("books", 1024, 512, (g, r) => {
  g.fillStyle = "#4a2e22"; g.fillRect(0, 0, 1024, 512);
  const cols = ["#8c2f2f", "#2f5a8c", "#3d6b3a", "#8a6a2a", "#5a3b6e", "#a84a2a", "#2a4a4a"];
  for (let sh = 0; sh < 4; sh++) {
    const y0 = sh * 128 + 10;
    for (let x = 6; x < 1018;) {
      const w = 14 + r() * 22, h = 84 + r() * 30;
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y0 + 112 - h, w, h);
      g.fillStyle = "rgba(240,210,120,0.75)"; g.fillRect(x + 3, y0 + 112 - h + 12, w - 6, 4);
      g.fillStyle = "rgba(20,10,10,0.6)"; g.fillRect(x + w - 2, y0 + 112 - h, 2, h);
      x += w + 1;
    }
    g.fillStyle = "#2e1c14"; g.fillRect(0, y0 + 112, 1024, 10);
  }
});
const paintingTex = (k: number) => ctex("painting" + k, 384, 288, (g, r) => {
  const sky = ["#9cc3e6", "#f2c38a", "#a9b8d6"][k % 3];
  g.fillStyle = sky; g.fillRect(0, 0, 384, 288);
  g.fillStyle = "#3f6f9a"; g.fillRect(0, 180, 384, 108);
  g.fillStyle = "#5a3a2a"; g.beginPath(); g.moveTo(110, 200); g.lineTo(270, 200); g.lineTo(250, 228); g.lineTo(130, 228); g.fill();
  g.fillStyle = "#f3ead6"; for (const x of [150, 200, 240]) { g.beginPath(); g.moveTo(x, 80); g.quadraticCurveTo(x + 34, 135, x, 190); g.lineTo(x, 80); g.fill(); }
  g.strokeStyle = "#3a2a20"; g.lineWidth = 3; for (const x of [150, 200, 240]) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 200); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${0.1 * r()})`; g.fillRect(r() * 384, 180 + r() * 100, 30, 3); }
});
const plaqueTex = (key: string, lines: string[]) => ctex("plaque" + key, 512, 192, (g) => {
  g.fillStyle = "#2b2420"; g.fillRect(0, 0, 512, 192);
  g.strokeStyle = "#c9a24a"; g.lineWidth = 8; g.strokeRect(10, 10, 492, 172);
  g.fillStyle = "#f1e6c8"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "bold 50px Georgia, serif"; g.fillText(lines[0], 256, lines.length > 1 ? 74 : 96);
  if (lines[1]) { g.font = "34px Georgia, serif"; g.fillText(lines[1], 256, 132); }
});

/** the open book's two pages; the title is written stroke by stroke (chars shown), redrawn only when n changes */
const TITLE = ["The War", "of Jenkins'", "Ear"];
class PageTex {
  cv = document.createElement("canvas"); tex: THREE.CanvasTexture; n = -1;
  constructor() { this.cv.width = 1024; this.cv.height = 720; this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8; this.draw(0); }
  draw(n: number) {
    if (n === this.n) return;
    this.n = n;
    const g = this.cv.getContext("2d")!, r = rng(7);
    g.fillStyle = "#f4ead2"; g.fillRect(0, 0, 1024, 720);
    g.fillStyle = "rgba(120,90,50,0.25)"; g.fillRect(500, 0, 24, 720); // gutter
    g.fillStyle = "#3a2c26"; g.font = "italic 64px Georgia, serif"; g.textAlign = "center"; g.fillText("1858", 256, 120);
    g.fillStyle = "rgba(60,45,35,0.55)";
    for (let i = 0; i < 11; i++) g.fillRect(70, 190 + i * 44, 260 + r() * 110, 6);
    g.fillStyle = "#1e2a4a"; g.font = "italic bold 88px Georgia, serif";
    let left = n;
    TITLE.forEach((line, i) => { if (left <= 0) return; g.fillText(line.slice(0, left), 768, 210 + i * 130); left -= line.length; });
    if (n >= TITLE.join("").length) { g.strokeStyle = "#1e2a4a"; g.lineWidth = 6; g.beginPath(); g.moveTo(620, 560); g.quadraticCurveTo(768, 600, 916, 552); g.stroke(); }
    this.tex.needsUpdate = true;
  }
}

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

/** every lens position of the film looking at its subject (houses in the way are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

/** horizontal quad facing up at height y */
function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
const between = (a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 6) => {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};
/** room: floor, four inward walls, ceiling. walls: [lower texture, upper texture, split height] */
const room = (b: Batch, x0: number, x1: number, z0: number, z1: number, h: number, floor: THREE.Material, lower: THREE.Material, upper: THREE.Material, split: number) => {
  b.add(quadUp(x0, x1, z0, z1, (x1 - x0) / 3, (z1 - z0) / 3, 0.002), floor);
  const wall = (c: THREE.Vector3, a: THREE.Vector3) => { // walked so the normal points into the room
    const len = a.distanceTo(c);
    b.add(quad(V(a.x, 0, a.z), V(c.x, 0, c.z), V(c.x, split, c.z), V(a.x, split, a.z), len / 4, 1), lower);
    b.add(quad(V(a.x, split, a.z), V(c.x, split, c.z), V(c.x, h, c.z), V(a.x, h, a.z), len / 4, (h - split) / 4), upper);
  };
  wall(V(x0, 0, z1), V(x1, 0, z1)); wall(V(x1, 0, z0), V(x0, 0, z0)); wall(V(x0, 0, z0), V(x0, 0, z1)); wall(V(x1, 0, z1), V(x1, 0, z0));
  const c = quadUp(x0, x1, z0, z1, 1, 1, h); c.scale(1, 1, 1); const pos = c.attributes.position.array as Float32Array;
  for (let i = 0; i < pos.length; i += 9) { const t = [pos[i + 3], pos[i + 4], pos[i + 5]]; pos.set([pos[i + 6], pos[i + 7], pos[i + 8]], i + 3); pos.set(t, i + 6); }
  c.computeVertexNormals();
  b.add(c, lam("ceiling", () => ({ color: "#d9cbb0" })));
};

type Flag = { m: THREE.Mesh; w: number; h: number; ph: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private flags: Flag[] = [];
  private sails: { g: THREE.BufferGeometry; base: Float32Array; ph: number }[] = [];
  private page = new PageTex();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky + light (as the bridge short) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(1.6, 1.6, 1.8), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = {
      day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
      night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)),
    };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 90 + (i % 4) * 34, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    setSight(sightLines());

    // ---- sea ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "sea1";
    const wm = new THREE.Mesh(quadUp(-450, 450, -560, 760, 1, 1, 0), waterM);
    wm.receiveShadow = true;
    R.add(wm);

    // ---- ships ----
    const b = new Batch();
    this.ship(b, BRIT, Math.PI / 2, { L: 34, B: 8.6, deck: WAR_DECK, masts: 3, hull: "#2b2a30", stripe: "#e0b13c", ports: true, flag: redEnsign(), mastH: 24 });
    this.ship(b, SPAN, -Math.PI / 2, { L: 32, B: 8.2, deck: WAR_DECK, masts: 3, hull: "#7a3328", stripe: "#e7c24a", ports: true, flag: burgundy(), mastH: 23 });
    this.ship(b, REB, 0, { L: 22, B: 6.4, deck: REB_DECK, masts: 2, hull: "#8a5a36", stripe: "#2f4f8a", ports: false, flag: redEnsign(), mastH: 17 });
    this.ship(b, GC, 0, { L: 18, B: 5.6, deck: 2.6, masts: 2, hull: "#c9a03a", stripe: "#8c2f2f", ports: true, flag: burgundy(), mastH: 15 });
    this.ship(b, DOCK, 0, { L: 24, B: 6.6, deck: REB_DECK, masts: 2, hull: "#6e4a30", stripe: "#8c2f2f", ports: false, flag: redEnsign(), mastH: 18, furled: true });
    // a barrel with the jar on the British deck (hook) + a few deck props
    const barrelM = lam("barrel", () => ({ map: rep(beam(), 2, 1) }));
    const barrel = (x: number, y: number, z: number, s = 1) => b.add(new THREE.CylinderGeometry(0.4 * s, 0.4 * s, 0.9 * s, 16).translate(0, 0.45 * s, 0), barrelM, new THREE.Matrix4().makeTranslation(x, y, z));
    barrel(JAR1[0], WAR_DECK, JAR1[2]);
    barrel(JAR1[0] - 1.3, WAR_DECK, JAR1[2] + 0.4); barrel(JAR1[0] + 1.6, WAR_DECK, JAR1[2] - 0.6);
    const ironM = twoTone(new THREE.MeshPhongMaterial({ color: "#3a3d46", specular: "#8a8a8a", shininess: 50 }), 0.15);
    for (const x of [-9, -5, -1, 3, 7]) {
      b.add(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 10).rotateX(Math.PI / 2).translate(BRIT[0] + x, WAR_DECK + 0.55, BRIT[2] + 3.6), ironM);
      b.add(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 10).rotateX(Math.PI / 2).translate(SPAN[0] + x, WAR_DECK + 0.55, SPAN[2] - 3.4), ironM);
    }
    for (const [x, z] of [[1.8, -4], [-1.7, 6.5]]) barrel(REB[0] + x, REB_DECK, REB[2] + z, 0.9);
    // ---- night quay ----
    const quayM = lam("quayHD", () => ({ map: rep(stoneHD("quayHD", ["#a9a093", "#9d9486", "#b2a99b", "#958c7f"], "#6f675d"), 0.5, 0.5) }));
    b.add(boxGeo(V(DOCK[0] + 4.0, -2.5, DOCK[2] - 70), V(DOCK[0] + 60, QUAY_Y, DOCK[2] + 70), 4, false), quayM);
    const crateM = lam("crate", () => ({ map: crateTex() }));
    const crate = (x: number, y: number, z: number, s = 0.8, yaw = 0) =>
      b.add(boxGeo(V(-s / 2, 0, -s / 2), V(s / 2, s, s / 2)), crateM, new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z));
    for (let k = 0; k < 3; k++) crate(STACK[0], QUAY_Y + k * 0.8, STACK[2], 0.8, k * 0.12);
    const rr = rng(5);
    for (let i = 0; i < 46; i++) {
      const x = STACK[0] - 3 + rr() * 8, z = STACK[2] - 4 + rr() * 9;
      if (Math.abs(x - STACK[0]) < 0.9 && Math.abs(z - STACK[2]) < 0.9) continue;
      if (z < STACK[2] - 1.5 && x > STACK[0] - 1 && x < STACK[0] + 2) continue; // keep the lens corridor clear
      const lv = Math.floor(rr() * 3);
      for (let k = 0; k <= lv; k++) crate(x, QUAY_Y + k * 0.8, z, 0.8, rr());
    }
    for (let i = 0; i < 14; i++) barrel(STACK[0] + 4 + rr() * 4, QUAY_Y, STACK[2] - 2 + rr() * 8, 0.95);
    const postM = lam("lampPost", () => ({ color: "#2e2a30" }));
    for (const [x, , z] of [[5.2, 0, -207], [5.2, 0, -193], [15, 0, -186], [21, 0, -205]]) {
      b.add(boxGeo(V(x - 0.07, QUAY_Y, z - 0.07), V(x + 0.07, QUAY_Y + 2.7, z + 0.07)), postM);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.1) }));
      lamp.position.set(x, QUAY_Y + 2.9, z); R.add(lamp);
    }
    b.add(boxGeo(V(DOCK[0] + 3.0, QUAY_Y - 0.1, DOCK[2] - 4.5), V(DOCK[0] + 4.2, QUAY_Y + 0.02, DOCK[2] - 2.0)), lam("plank", () => ({ map: beam() })));
    // warehouses behind the quay (fronts facing the water)
    for (let i = 0; i < 6; i++) house(b, DOCK[0] + 34, DOCK[2] - 45 + i * 15, -Math.PI / 2, 14, 10, 8.4 + (i % 2) * 1.4, i + 2, QUAY_Y);

    // ---- London street (along z at x = LX) ----
    b.add(quadUp(LX - 4, LX + 4, -40, 90, 2, 32, 0.01), lam("cobbleHD", () => ({ map: cobbleHD() })));
    b.add(quadUp(LX - 60, LX + 60, -60, 120, 30, 45, 0.0), lam("dirt", () => ({ color: "#9a8a72" })));
    const pave = lam("pave", () => ({ map: rep(stoneHD("pave", ["#cfc6b4", "#c4bba8", "#d8cfbe", "#bdb39f"], "#9a907f"), 0.5, 0.5) }));
    for (const s of [-1, 1]) b.add(boxGeo(V(s < 0 ? LX - 6.2 : LX + 4, 0, -40), V(s < 0 ? LX - 4 : LX + 6.2, 0.14, 90), 2), pave);
    {
      const r = rng(9);
      for (const s of [-1, 1]) {
        let z = -30;
        while (z < 80) {
          const w = [7, 8, 9][Math.floor(r() * 3)], h = [7, 8.4, 9.8][Math.floor(r() * 3)];
          house(b, LX + s * (6.2 + 5), z + w / 2, s < 0 ? Math.PI / 2 : -Math.PI / 2, w, 10, h, Math.floor(r() * 8), 0);
          z += w + 0.2;
        }
      }
      house(b, LX, 92, Math.PI, 14, 10, 11.2, 5, 0); // closes the street
    }

    // ---- the Commons chamber ----
    {
      const x0 = PX - 10, x1 = PX + 10, z0 = -15, z1 = 15;
      room(b, x0, x1, z0, z1, 11, lam("chamberFloor", () => ({ map: rep(planksHD(), 0.4, 0.4) })), lam("oakPanel", () => ({ map: panelTex() })),
        lam("chamberUpper", () => ({ map: plasterTex("ch", "#e8dcc0") })), 3.2);
      b.add(quadUp(PX - 2.3, PX + 2.3, -14, 14, 1, 4, 0.006), lam("carpet", () => ({ map: carpetTex() })));
      const wood = lam("benchWood", () => ({ color: "#5e3a26" })), leather = lam("leather", () => ({ color: "#3f7d4c" }));
      for (const s of [-1, 1]) for (let r = 0; r < 3; r++) {
        const xa = PX + s * (2.4 + 1.1 * r), xb = PX + s * (3.5 + 1.1 * r), y = 0.45 * (r + 1);
        b.add(boxGeo(V(Math.min(xa, xb), 0, -9), V(Math.max(xa, xb), y - 0.1, 9.5)), wood);
        b.add(boxGeo(V(Math.min(xa, xb), y - 0.1, -9), V(Math.max(xa, xb), y, 9.5)), leather);
        // back rest of this row = riser of the next
        b.add(boxGeo(V(Math.min(xb, xb + s * 0.12), y, -9), V(Math.max(xb, xb + s * 0.12), y + 0.55, 9.5)), leather);
      }
      b.add(boxGeo(V(PX - 6.6, 0, -9), V(PX - 5.7, 1.9, 9.5)), wood);
      b.add(boxGeo(V(PX + 5.7, 0, -9), V(PX + 6.6, 1.9, 9.5)), wood);
      // the table with the green cloth, a gold mace, the Speaker's chair
      b.add(boxGeo(V(TABLE[0] - 0.7, 0, TABLE[2] - 1.5), V(TABLE[0] + 0.7, TABLE_TOP - 0.06, TABLE[2] + 1.5)), wood);
      b.add(boxGeo(V(TABLE[0] - 0.78, TABLE_TOP - 0.06, TABLE[2] - 1.58), V(TABLE[0] + 0.78, TABLE_TOP, TABLE[2] + 1.58)), lam("baize", () => ({ color: "#2f6a44" })));
      const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#d9a63a", specular: "#fff0b0", shininess: 60 }), 0.2);
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10).rotateX(Math.PI / 2).translate(TABLE[0] + 0.35, TABLE_TOP + 0.06, TABLE[2] + 0.6), gold);
      b.add(new THREE.SphereGeometry(0.13, 14, 10).translate(TABLE[0] + 0.35, TABLE_TOP + 0.1, TABLE[2] + 1.35), gold);
      b.add(boxGeo(V(PX - 1.2, 0, 11.6), V(PX + 1.2, 1.2, 13.4)), wood);
      b.add(boxGeo(V(PX - 0.9, 1.2, 13.0), V(PX + 0.9, 4.6, 13.4)), wood);
      b.add(boxGeo(V(PX - 1.4, 4.6, 11.4), V(PX + 1.4, 5.0, 13.6)), wood);
      // tall windows (emissive panes, bloom) high on the side walls
      const pane = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.32, 1.18) });
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
        const z = -10 + k * 5, x = s < 0 ? x0 + 0.02 : x1 - 0.02;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4.2), pane);
        m.position.set(x, 6.8, z); m.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(m);
      }
    }

    // ---- Victorian study ----
    {
      room(b, SX - 4, SX + 4, -4, 4, 3.6, lam("studyFloor", () => ({ map: rep(planksHD(), 0.6, 0.6) })), lam("oakPanel", () => ({ map: panelTex() })),
        lam("wallpaper", () => ({ map: plasterTex("wp", "#4f6e52", "#5b7c5e") })), 1.0);
      const shelf = lam("books", () => ({ map: booksTex() }));
      b.add(quad(V(SX + 3.4, 0, 3.95), V(SX - 3.4, 0, 3.95), V(SX - 3.4, 3.0, 3.95), V(SX + 3.4, 3.0, 3.95)), shelf);
      const wood = lam("deskWood", () => ({ color: "#6a4028" }));
      b.add(boxGeo(V(BOOK[0] - 0.7, DESK_TOP - 0.06, BOOK[2] - 0.45), V(BOOK[0] + 0.95, DESK_TOP, BOOK[2] + 0.42)), wood);
      for (const [dx, dz] of [[-0.62, -0.38], [0.88, -0.38], [-0.62, 0.36], [0.88, 0.36]]) b.add(boxGeo(V(BOOK[0] + dx - 0.04, 0, BOOK[2] + dz - 0.04), V(BOOK[0] + dx + 0.04, DESK_TOP - 0.06, BOOK[2] + dz + 0.04)), wood);
      b.add(boxGeo(V(BOOK[0] - 0.7, 0.28, BOOK[2] - 0.45), V(BOOK[0] + 0.95, 0.36, BOOK[2] + 0.42)), wood);
      // the open book: cover + pages (page canvas drawn per frame, readable from the lens at -z)
      b.add(boxGeo(V(BOOK[0] - 0.33, DESK_TOP, BOOK[2] - 0.22), V(BOOK[0] + 0.33, DESK_TOP + 0.01, BOOK[2] + 0.22)), lam("cover", () => ({ color: "#6e2a2a" })));
      const pg = new THREE.PlaneGeometry(0.62, 0.42).rotateX(-Math.PI / 2).rotateY(Math.PI);
      const pm = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: this.page.tex, color: new THREE.Color(0.92, 0.88, 0.8) }));
      pm.position.set(BOOK[0], BOOK[1], BOOK[2]); pm.layers.set(NOINK); R.add(pm);
      b.add(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 10).translate(SX + 0.75, DESK_TOP + 0.11, 1.25), lam("wax", () => ({ color: "#f3ecd8" })));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.8, 1.2) }));
      flame.position.set(SX + 0.75, DESK_TOP + 0.26, 1.25); R.add(flame);
      b.add(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 12).translate(SX - 0.5, DESK_TOP + 0.035, 0.85), lam("inkpot", () => ({ color: "#1c2236" })));
      for (let k = 0; k < 4; k++) b.add(boxGeo(V(SX + 0.4, DESK_TOP + k * 0.06, 0.62), V(SX + 0.72, DESK_TOP + k * 0.06 + 0.055, 0.86)), lam("bk" + k, () => ({ color: ["#8c2f2f", "#2f5a8c", "#3d6b3a", "#8a6a2a"][k] })));
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.7) }));
      win.position.set(SX + 3.98, 1.9, -0.5); win.rotation.y = -Math.PI / 2; R.add(win);
    }

    // ---- museum hall ----
    {
      room(b, MX - 10, MX + 10, -15, 15, 7, lam("marble", () => ({ map: marbleTex() })), lam("museumLow", () => ({ map: plasterTex("ml", "#8c3b3f") })),
        lam("museumUp", () => ({ map: plasterTex("mu", "#efe4cc") })), 1.2);
      const wood = lam("caseWood", () => ({ color: "#5a3a26" })), marble = lam("pedestal", () => ({ map: stoneHD("pedHD", ["#efe9dd", "#e6dfd1", "#f4efe5", "#ddd5c6"], "#bdb2a0") }));
      b.add(boxGeo(V(CASE[0] - 1.0, 0, CASE[2] - 0.6), V(CASE[0] + 1.0, 0.9, CASE[2] + 0.6)), wood);
      b.add(boxGeo(V(PED[0] - 0.32, 0, PED[2] - 0.32), V(PED[0] + 0.32, PED_TOP, PED[2] + 0.32)), marble);
      b.add(boxGeo(V(PED[0] - 0.4, PED_TOP - 0.06, PED[2] - 0.4), V(PED[0] + 0.4, PED_TOP, PED[2] + 0.4)), marble);
      b.add(boxGeo(V(PED[0] - 0.42, 0, PED[2] - 0.42), V(PED[0] + 0.42, 0.12, PED[2] + 0.42)), marble);
      const brass = twoTone(new THREE.MeshPhongMaterial({ color: "#c99a3a", specular: "#fff0b0", shininess: 50 }), 0.2);
      const rope = lam("rope", () => ({ color: "#a8242f" }));
      const posts: V3[] = [[PED[0] - 1.0, 0, PED[2] + 0.2], [PED[0] - 1.0, 0, PED[2] + 1.2], [PED[0] + 1.0, 0, PED[2] + 1.2], [PED[0] + 1.0, 0, PED[2] + 0.2]];
      for (const p of posts) b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.95, 10).translate(p[0], 0.475, p[2]), brass);
      for (let i = 0; i < 3; i++) b.add(between(V(posts[i][0], 0.85, posts[i][2]), V(posts[i + 1][0], 0.85, posts[i + 1][2]), 0.025), rope);
      // plaques (unlit faces, readable from the lenses at -z)
      const plaque = (key: string, lines: string[], x: number, y: number, z: number, w: number) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375).rotateY(Math.PI), new THREE.MeshBasicMaterial({ map: plaqueTex(key, lines), color: 0xdddddd }));
        m.position.set(x, y, z); m.layers.set(NOINK); R.add(m);
      };
      plaque("trade", ["TRADE TREATIES", "1739"], CASE[0], 0.62, CASE[2] - 0.62, 0.8);
      plaque("ear", ["JENKINS' EAR", "1731"], PED[0], 0.78, PED[2] - 0.33, 0.5);
      for (let k = 0; k < 6; k++) {
        const z = -11 + k * 4.4, s = k % 2 ? -1 : 1, x = s < 0 ? MX - 9.97 : MX + 9.97;
        if (Math.abs(z - PED[2]) < 1.2 && s > 0) continue;
        const pm2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), lam("painting" + k, () => ({ map: paintingTex(k) })));
        pm2.position.set(x, 2.9, z); pm2.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(pm2);
        b.add(boxGeo(V(x - (s < 0 ? 0 : 0.06), 2.1, z - 1.12), V(x + (s < 0 ? 0.06 : 0), 3.7, z + 1.12)), lam("frame", () => ({ color: "#b8883a" })));
      }
    }
    b.build(R);
    // interiors: walls/ceilings never block the sun (the rooms would be in their own shadow)
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = m.material as THREE.Material; if (["oakPanel", "chamberUpper", "wallpaper", "museumLow", "museumUp", "ceiling"].some((k) => mat === lam(k, () => ({})))) m.castShadow = false; } });
    for (const f of this.flags) R.add(f.m);
  }

  /** a ship along local +z (bow), centred at p, turned by yaw; deck at `deck` above the sea */
  private ship(b: Batch, p: V3, yaw: number, o: { L: number; B: number; deck: number; masts: number; hull: string; stripe: string; ports: boolean; flag: THREE.Texture; mastH: number; furled?: boolean }) {
    const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(p[0], p[1], p[2]);
    const at = (x: number, y: number, z: number) => V(x, y, z).applyMatrix4(M);
    const { L, B, deck } = o, hb = B / 2, sz = -L / 2, bz = L / 2, bot = -1.6, H = deck - bot;
    // deck outline (x, z): flat stern, curved sides, pointed bow
    const outline: [number, number][] = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10, z = sz + u * (L * 0.72); outline.push([hb * (0.86 + 0.14 * Math.sin(u * Math.PI * 0.9)), z]); }
    for (let i = 1; i <= 8; i++) { const u = i / 8, z = sz + L * 0.72 + u * (L * 0.28); outline.push([hb * Math.cos(u * Math.PI / 2) ** 0.8, z]); }
    const shape = new THREE.Shape();
    const ring = [...outline, ...outline.slice(0, -1).reverse().map(([x, z]) => [-x, z] as [number, number])];
    ring.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
    const ex = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, curveSegments: 1 });
    ex.rotateX(-Math.PI / 2); ex.translate(0, bot, 0);
    const hullM = lam("hull" + o.hull, () => ({ map: (() => { const t = hullTex(o.hull, o.hull, o.stripe, o.ports, H); const c = t.clone(); c.repeat.set(0.25, 1 / H); c.offset.set(0, -bot / H); c.needsUpdate = true; return c; })() }));
    const deckM = lam("deckPlanks", () => ({ map: rep(planksHD(), 0.22, 0.22) }));
    // ExtrudeGeometry groups: 0 = caps (deck + keel), 1 = sides
    const caps = ex.clone(); caps.clearGroups(); const sides = ex.clone(); sides.clearGroups();
    const gi = ex.groups;
    const sub = (g: THREE.BufferGeometry, grp: { start: number; count: number }[]) => {
      const idx = g.index ? (g.index.array as ArrayLike<number>) : null, pos = g.attributes.position, uv = g.attributes.uv, nn = g.attributes.normal;
      const P: number[] = [], U: number[] = [], N: number[] = [];
      for (const gr of grp) for (let k = gr.start; k < gr.start + gr.count; k++) {
        const i = idx ? idx[k] : k;
        P.push(pos.getX(i), pos.getY(i), pos.getZ(i)); U.push(uv.getX(i), uv.getY(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i));
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      return out;
    };
    b.add(sub(caps, gi.filter((g) => g.materialIndex === 0)), deckM, M);
    const sideG = sub(sides, gi.filter((g) => g.materialIndex === 1));
    // side uvs: u along the hull (metres), v = height above the keel (metres)
    { const pos = sideG.attributes.position, uv = sideG.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) + pos.getX(i) * 0.3, pos.getY(i)); }
    b.add(sideG, hullM, M);
    // bulwark posts + rail along the outline (both sides), a raised quarterdeck at the stern
    const railM = lam("rail" + o.stripe, () => ({ color: o.stripe })), woodM = lam("shipWood", () => ({ map: beamHD() }));
    for (const s of [-1, 1]) for (let i = 0; i < outline.length - 1; i++) {
      const [xa, za] = outline[i], [xb, zb] = outline[i + 1];
      b.add(between(V(s * xa * 0.98, deck + 1.0, za), V(s * xb * 0.98, deck + 1.0, zb), 0.09, 5), railM, M);
      b.add(between(V(s * xa * 0.98, deck, za), V(s * xa * 0.98, deck + 1.0, za), 0.06, 4), woodM, M);
    }
    const qd = L * 0.22;
    b.add(boxGeo(V(-hb * 0.84, deck, sz), V(hb * 0.84, deck + 1.3, sz + qd), 1), woodM, M);
    b.add(boxGeo(V(-hb * 0.86, deck + 1.3, sz), V(hb * 0.86, deck + 1.36, sz + qd)), deckM, M);
    // bowsprit
    b.add(between(V(0, deck + 0.6, bz - 1), V(0, deck + 3.2, bz + L * 0.22), 0.16), woodM, M);
    // masts, yards, sails
    const mastM = lam("mast", () => ({ color: "#7a5236" })), sailM = lam("sailM", () => ({ map: sailTex(), side: THREE.DoubleSide }));
    const mz = o.masts === 3 ? [-L * 0.22, L * 0.06, L * 0.3] : [-L * 0.12, L * 0.22];
    mz.forEach((z, k) => {
      const h = o.mastH * (k === mz.length - 1 && o.masts === 3 ? 0.85 : k === 0 && o.masts === 3 ? 0.8 : 1);
      b.add(new THREE.CylinderGeometry(0.16, 0.26, h, 10).translate(0, deck + h / 2, z), mastM, M);
      for (const [yy, w] of [[0.38, 0.62], [0.66, 0.48], [0.88, 0.34]] as const) {
        const y = deck + h * yy, ww = B * w * 1.25;
        b.add(new THREE.CylinderGeometry(0.09, 0.09, ww, 8).rotateZ(Math.PI / 2).translate(0, y, z + 0.25), mastM, M);
        if (o.furled) { b.add(new THREE.CylinderGeometry(0.2, 0.2, ww * 0.92, 8).rotateZ(Math.PI / 2).translate(0, y - 0.15, z + 0.25), sailM, M); continue; }
        const sh = h * 0.24, sg = new THREE.PlaneGeometry(ww * 0.94, sh, 8, 6);
        const pa = sg.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) { const u = pa.getX(i) / (ww * 0.47), v = pa.getY(i) / (sh / 2); pa.setZ(i, 0.9 * (1 - u * u) * (1 - 0.35 * v * v)); }
        sg.computeVertexNormals();
        sg.translate(0, y - sh / 2 - 0.1, z + 0.35);
        b.add(sg, sailM, M);
      }
      // shrouds
      for (const s of [-1, 1]) for (const dz of [-0.6, 0.6]) b.add(between(V(s * hb * 0.95, deck + 1.0, z + dz), V(s * 0.2, deck + h * 0.62, z), 0.025, 4), lam("ropeDark", () => ({ color: "#3a2c24" })), M);
    });
    // stays: bow to foremast top, mast to mast
    b.add(between(V(0, deck + 3.2, bz + L * 0.22), V(0, deck + o.mastH * 0.86, mz[mz.length - 1]), 0.025, 4), lam("ropeDark", () => ({ color: "#3a2c24" })), M);
    // stern ensign on a staff (waves)
    const staff = at(0, deck + 1.36, sz + 0.2), top = at(0, deck + 5.4, sz - 0.6);
    b.add(between(staff, top, 0.05), mastM);
    const fw = B * 0.36, fh = fw * 0.6;
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh, 12, 1), lam("flag" + o.flag.uuid, () => ({ map: o.flag, side: THREE.DoubleSide })));
    fm.position.copy(top).add(V(0, -fh / 2, 0)); fm.rotation.y = yaw + Math.PI / 2; fm.castShadow = true; fm.frustumCulled = false;
    this.flags.push({ m: fm, w: fw, h: fh, ph: p[2] * 0.1 + yaw });
    // a pennant on the main mast top
    const top2 = at(0, deck + o.mastH, mz[Math.min(1, mz.length - 1)]);
    const pn = new THREE.Mesh(new THREE.PlaneGeometry(fw * 0.9, fh * 0.35, 12, 1), lam("flag" + o.flag.uuid, () => ({ map: o.flag, side: THREE.DoubleSide })));
    pn.position.copy(top2); pn.rotation.y = yaw + Math.PI / 2; pn.frustumCulled = false;
    this.flags.push({ m: pn, w: fw * 0.9, h: fh * 0.35, ph: p[0] + 1 });
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, moon, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "night";
    if (this.sunDisc.visible) {
      this.sunDisc.position.copy(cam.position).addScaledVector(V(sunDir.x, Math.max(0.3, sunDir.y), sunDir.z).normalize(), 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.2)));
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;
    // ---- flags ----
    for (const fl of this.flags) {
      const p = fl.m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 13) / 12, y = i < 13 ? fl.h / 2 : -fl.h / 2;
        p.setXYZ(i, -u * fl.w, y + 0.05 * fl.h * u * Math.sin(t * 4 - u * 3), 0.16 * fl.w * u * Math.sin(t * 5.5 - u * 5 + fl.ph));
      }
      p.needsUpdate = true;
    }
    // ---- the page being written (shot 8) ----
    if (id === 8) this.page.draw(Math.floor(clamp01((f - 823) / 52) * TITLE.join("").length));
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.12 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;
export { Pen };
