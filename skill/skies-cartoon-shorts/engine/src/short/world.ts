// The whole film as one three.js scene, eight sets far apart (story.ts ORG): the clockmaker's window at dusk, the night
// terrace of a mill town (the hero bedroom window with a real opening and a lit room behind it, gas lamps, the mills on
// the horizon), the worker's bedroom, the cotton mill's gate at dawn, a foggy London street by the docks, the
// knocker-upper's own room by day, the same kind of street in the 1970s, and a modern bedroom.
// update(id, f, camera) shows the shot's set and poses everything for frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri, Kit } from "./build";
import { ctex, cloudHD } from "./paint";
import { paintTex, stoneTex, labelTex, boardsTex, brickTex, cobbleTex, wallpaperTex, quiltTex, clockFaceTex, litWinTex, darkWinTex, clockSignTex, priceTagTex, millSignTex, lateSignTex, cheapSignTex, pubSignTex } from "./npaint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, Line3 } from "./cast";
import { skiesMark, SKIES_COUNT, skiesWarning } from "./skies";
import { FPS, SHOTS, ORG, INDOOR, SetName, camAt, V3, ShotDef, FZ, CZ, PH, WX, WY, WZ, WW, WH, SGZ, CLOCK, BY, BZ, BX0, BX1, WIN_B, GTZ, GW, tapAt, ramp, clamp01 } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);
/** shadow map size: 4096 on a GPU; the cloud renderer passes ?sm=2048 (software WebGL is CPU-bound) */
const SMAP = (() => { try { return Number(new URLSearchParams(location.search).get("sm") ?? 4096); } catch { return 4096; } })();

const M4 = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(...s));
const beamBetween = (a: THREE.Vector3, b: THREE.Vector3, th: number, round = false) => {
  const g = round ? new THREE.CylinderGeometry(th / 2, th / 2, a.distanceTo(b), 8) : new THREE.BoxGeometry(th, a.distanceTo(b), th);
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1));
  return g.applyMatrix4(m);
};
/** axis box from local corner a to b inside set origin O */
const BX = (O: V3, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) =>
  boxGeo(V(O[0] + Math.min(x0, x1), O[1] + Math.min(y0, y1), O[2] + Math.min(z0, z1)), V(O[0] + Math.max(x0, x1), O[1] + Math.max(y0, y1), O[2] + Math.max(z0, z1)), tile);
/** vertical picture quad facing +z (n = 1), -z (n = -1), +x (n = 2) or -x (n = -2) centred at local (x, y, z) */
const pic = (O: V3, x: number, y: number, z: number, w: number, h: number, n: 1 | -1 | 2 | -2, u1 = 1, v1 = 1) => {
  const [ox, oy, oz] = O, hw = w / 2, hh = h / 2;
  if (n === 1) return quad(V(ox + x - hw, oy + y - hh, oz + z), V(ox + x + hw, oy + y - hh, oz + z), V(ox + x + hw, oy + y + hh, oz + z), V(ox + x - hw, oy + y + hh, oz + z), u1, v1);
  if (n === -1) return quad(V(ox + x + hw, oy + y - hh, oz + z), V(ox + x - hw, oy + y - hh, oz + z), V(ox + x - hw, oy + y + hh, oz + z), V(ox + x + hw, oy + y + hh, oz + z), u1, v1);
  if (n === 2) return quad(V(ox + x, oy + y - hh, oz + z + hw), V(ox + x, oy + y - hh, oz + z - hw), V(ox + x, oy + y + hh, oz + z - hw), V(ox + x, oy + y + hh, oz + z + hw), u1, v1);
  return quad(V(ox + x, oy + y - hh, oz + z - hw), V(ox + x, oy + y - hh, oz + z + hw), V(ox + x, oy + y + hh, oz + z + hw), V(ox + x, oy + y + hh, oz + z - hw), u1, v1);
};
/** horizontal quad (floor / ground) from x0..x1, z0..z1 at height y, tiled every ft metres */
const flat = (O: V3, x0: number, z0: number, x1: number, z1: number, y: number, ft: number) =>
  quad(V(O[0] + x0, y, O[2] + z1), V(O[0] + x1, y, O[2] + z1), V(O[0] + x1, y, O[2] + z0), V(O[0] + x0, y, O[2] + z0), (x1 - x0) / ft, (z1 - z0) / ft);
const C = (c: string) => lam("c" + c, () => ({ color: c }));
const T = (key: string, map: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map, ...extra }));
/** unlit (always readable) material: signs, windows, glows */
const U = (map: THREE.Texture | null, k = 1, col?: string) => { const m = new THREE.MeshBasicMaterial({ map, color: col ? new THREE.Color(col).multiplyScalar(k) : new THREE.Color(k, k, k), toneMapped: true }); return m; };
/** an unlit picture added straight to a group, facing like pic() */
const sign = (G: THREE.Object3D, O: V3, x: number, y: number, z: number, w: number, h: number, n: 1 | -1 | 2 | -2, map: THREE.Texture, k = 1) => {
  const m = new THREE.Mesh(pic(O, x, y, z, w, h, n), U(map, k)); m.layers.set(NOINK); G.add(m); return m;
};
/** gable roof: ridge along x from x0 to x1, eaves at height y on z0 (front) and z1 (back), ridge h above */
const gable = (b: Batch, O: V3, x0: number, x1: number, z0: number, z1: number, y: number, h: number, mat: THREE.Material) => {
  const zm = (z0 + z1) / 2, o = 0.25;
  b.add(quad(V(O[0] + x0, y, O[2] + z0 + o), V(O[0] + x1, y, O[2] + z0 + o), V(O[0] + x1, y + h, O[2] + zm), V(O[0] + x0, y + h, O[2] + zm), (x1 - x0) / 3, 1), mat);
  b.add(quad(V(O[0] + x1, y, O[2] + z1 - o), V(O[0] + x0, y, O[2] + z1 - o), V(O[0] + x0, y + h, O[2] + zm), V(O[0] + x1, y + h, O[2] + zm), (x1 - x0) / 3, 1), mat);
  b.add(tri(V(O[0] + x0, y, O[2] + z1 - o), V(O[0] + x0, y, O[2] + z0 + o), V(O[0] + x0, y + h, O[2] + zm)), mat);
  b.add(tri(V(O[0] + x1, y, O[2] + z0 + o), V(O[0] + x1, y, O[2] + z1 - o), V(O[0] + x1, y + h, O[2] + zm)), mat);
};
const plant = (b: Batch, x: number, y: number, z: number, s = 1, pot = "#c8643a") => {
  b.add(new THREE.CylinderGeometry(0.22 * s, 0.17 * s, 0.4 * s, 12), C(pot), M4(x, y + 0.2 * s, z));
  for (const [dx, dy, r] of [[0, 0.75, 0.3], [0.18, 0.6, 0.22], [-0.18, 0.64, 0.22], [0, 1.0, 0.2]] as const) b.add(new THREE.IcosahedronGeometry(r * s, 1), C("#4f9a46"), M4(x + dx * s, y + dy * s, z));
};
const car70 = (b: Batch, x: number, z: number, col: string) => {
  const m = M4(x, 0, z);
  b.add(boxGeo(V(-2.0, 0.3, -0.85), V(2.0, 0.95, 0.85)), C(col), m);
  b.add(boxGeo(V(-1.05, 0.95, -0.78), V(0.95, 1.5, 0.78)), C(col), m);
  b.add(boxGeo(V(-0.98, 1.0, -0.8), V(0.88, 1.44, 0.8)), C("#2c3a52"), m);
  b.add(boxGeo(V(-2.04, 0.36, -0.88), V(2.04, 0.46, 0.88)), C("#d9dde3"), m); // chrome bumpers band
  for (const [wx, wz] of [[-1.3, -0.84], [1.3, -0.84], [-1.3, 0.84], [1.3, 0.84]] as const) {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 14); w.rotateX(Math.PI / 2);
    b.add(w, C("#1d1d22"), new THREE.Matrix4().multiplyMatrices(m, M4(wx, 0.33, wz)));
  }
  b.add(boxGeo(V(1.98, 0.55, -0.7), V(2.06, 0.75, -0.4)), C("#fff3c4"), m); b.add(boxGeo(V(1.98, 0.55, 0.4), V(2.06, 0.75, 0.7)), C("#fff3c4"), m);
};
/** a twin-bell alarm clock as a small group (body, face, bells, hammer, feet), facing +z, base at its origin */
const alarmClock = (col: string, face: THREE.Texture, s = 1) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.07 * s, 24).rotateX(Math.PI / 2), C(col)); body.position.y = 0.15 * s; g.add(body);
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.092 * s, 24), U(face, 1.05)); f.position.set(0, 0.15 * s, 0.0355 * s); f.layers.set(NOINK); g.add(f);
  for (const sx of [-1, 1]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), C("#e8c45a")); bell.position.set(sx * 0.075 * s, 0.255 * s, 0); bell.rotation.z = -sx * 0.5; g.add(bell);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.07 * s, 6), C("#3a3d46")); foot.position.set(sx * 0.06 * s, 0.05 * s, 0); foot.rotation.z = sx * 0.4; g.add(foot); }
  const ham = new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.09 * s, 6), C("#3a3d46")); ham.position.set(0, 0.29 * s, 0.01 * s); g.add(ham);
  return g;
};

type Mats = Record<string, THREE.Material>;
type Terr = { brick: string; mortar: string; storeys: 2 | 3; doors: string[]; trim: string; extras: "mills" | "docks" | "seventies"; seed: string };
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite; private moon: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>(); private shadowCache = new Map<number, { c: THREE.Vector3; r: number }>();
  private cloudMaps: Record<string, THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private sets = {} as Record<SetName, THREE.Group>;
  private panelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.15, 2.0) });
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  // animated parts
  private poles: THREE.Mesh[] = []; private poleKnobs: THREE.Mesh[] = [];
  private bedPole = new THREE.Group(); private gateL = new THREE.Group(); private gateR = new THREE.Group();
  private heroClock!: THREE.Group; private heroTag!: THREE.Object3D; private cheap: THREE.Group[] = []; private cheapSign!: THREE.Object3D; private modernClock!: THREE.Group;
  private switchWins: { m: THREE.Mesh; on: THREE.Material; off: THREE.Material; set: SetName; t: number; shots: number[] }[] = [];
  private heroRoomLamp: Record<string, THREE.Mesh> = {};
  private labels: Record<string, THREE.Sprite> = {};
  private smoke: THREE.Mesh[] = [];
  private skiesWarn = skiesWarning("ADD 2-3 skies MARKS TO THIS FILM");
  private skiesWarnMany = skiesWarning("USE ONLY 2-3 skies MARKS");

  constructor(_kit: Kit) {
    const R = this.root, M: Mats = {};
    void M;
    // ---- sky, sun, moon, clouds ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    const discT = ctex("sunDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const moonT = ctex("moonDisc", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 116, 128, 128, 128); gr.addColorStop(0, "rgba(255,250,232,1)"); gr.addColorStop(1, "rgba(255,250,232,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "rgba(214,206,186,0.7)"; for (const [x, y, r] of [[96, 100, 22], [160, 150, 16], [120, 170, 12], [170, 92, 10]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discT, color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: discT, color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonT, color: new THREE.Color(1.6, 1.55, 1.4), fog: false, depthWrite: false, transparent: true }));
    for (const m of [this.sunDisc, this.sunHalo, this.moon]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(SMAP, SMAP);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = Object.fromEntries((["day", "golden", "night", "indoor", "dim"] as const).map((l) => [l, [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[l].cloud))]));
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 900 + (i % 3) * 80;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 200 + (i % 4) * 45; m.userData.base = [Math.cos(a) * d, 110 + (i % 4) * 45, Math.sin(a) * d]; m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    for (const k of Object.keys(ORG) as SetName[]) { this.sets[k] = new THREE.Group(); R.add(this.sets[k]); }
    // the knocker-upper's pole(s): a cylinder + a wire knob at the tip, posed per frame from cast.ts lines
    for (let i = 0; i < 2; i++) {
      const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.024, 1, 10), C("#a87a46")); pm.visible = false; pm.castShadow = true; R.add(pm); this.poles.push(pm);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), C("#5a5f6e")); kn.visible = false; R.add(kn); this.poleKnobs.push(kn);
    }
    this.buildShop(); this.buildTerrace("street", { brick: "#c06a3c", mortar: "#e0c0a0", storeys: 2, doors: ["#1f6a4a", "#2457c5", "#7b2d2d", "#2a2a33", "#1f8a70"], trim: "#f2ead6", extras: "mills", seed: "mt" });
    this.buildTerrace("london", { brick: "#d4bc86", mortar: "#e6d6b0", storeys: 3, doors: ["#1f4e3d", "#2b2b33", "#7b2d2d", "#1d47b8"], trim: "#f6f2e6", extras: "docks", seed: "ld" });
    this.buildTerrace("seventies", { brick: "#c0563c", mortar: "#e2c0a8", storeys: 2, doors: ["#e07a1f", "#f2c12e", "#2a9d8f", "#c0392b", "#6a3d9a"], trim: "#ffffff", extras: "seventies", seed: "sv" });
    this.buildRoom("bed"); this.buildRoom("attic"); this.buildRoom("modern"); this.buildGate();
    R.add(this.skiesWarn); R.add(this.skiesWarnMany);
  }

  private label(G: THREE.Group, k: string, t: string, w = 0.9) {
    const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(k, t), depthTest: false })); s2.scale.set(w, w * 0.3125, 1); s2.renderOrder = 10; s2.layers.set(NOINK); s2.visible = false; G.add(s2); this.labels[k] = s2; return s2;
  }
  /** a window quad on a facade: lit (warm, curtains) or dark (blue glass); with a white frame and a stone sill */
  private window(b: Batch, G: THREE.Group, O: V3, x: number, y: number, z: number, w: number, h: number, n: 1 | -1, lit: boolean, trim: string, seed: string) {
    const m = new THREE.Mesh(pic(O, x, y, z + n * 0.01, w, h, n), lit ? U(litWinTex("lw" + seed, "#ffd27a", ["#c0392b", "#2457c5", "#1f8a70", "#7b2d8e"][seed.length % 4]), 1.15) : U(darkWinTex("dw" + seed), 1.0));
    m.layers.set(NOINK); G.add(m);
    const t = 0.07, d = 0.06 * n;
    b.add(BX(O, x - w / 2 - t, y - h / 2 - t, z, x - w / 2, y + h / 2 + t, z + d), C(trim)); b.add(BX(O, x + w / 2, y - h / 2 - t, z, x + w / 2 + t, y + h / 2 + t, z + d), C(trim));
    b.add(BX(O, x - w / 2 - t, y + h / 2, z, x + w / 2 + t, y + h / 2 + t, z + d), C(trim));
    b.add(BX(O, x - w / 2 - 0.12, y - h / 2 - 0.12, z, x + w / 2 + 0.12, y - h / 2, z + 0.16 * n), C("#e4dccb")); // sill
    b.add(BX(O, x - w / 2 - 0.1, y + h / 2 + t, z, x + w / 2 + 0.1, y + h / 2 + t + 0.14, z + 0.04 * n), C("#e4dccb")); // lintel
    return m;
  }
  /** a gas lamp: iron post, glowing lantern (bloom), warm pool of light on the ground */
  private gasLamp(b: Batch, G: THREE.Group, O: V3, x: number, y0: number, z: number, glow = true, k = 1) {
    b.add(new THREE.CylinderGeometry(0.06, 0.1, 3.1, 10), C("#2b2f3a"), M4(O[0] + x, y0 + 1.55, O[2] + z));
    b.add(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 10), C("#2b2f3a"), M4(O[0] + x, y0 + 0.15, O[2] + z));
    b.add(boxGeo(V(O[0] + x - 0.24, y0 + 3.1, O[2] + z - 0.24), V(O[0] + x + 0.24, y0 + 3.16, O[2] + z + 0.24)), C("#2b2f3a"));
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.46, 4, 1), new THREE.MeshBasicMaterial({ color: glow ? new THREE.Color(2.4 * k, 1.7 * k, 0.75 * k) : new THREE.Color(0.75, 0.8, 0.85) }));
    g.position.set(O[0] + x, y0 + 3.4, O[2] + z); g.rotation.y = Math.PI / 4; g.layers.set(NOINK); G.add(g);
    b.add(new THREE.ConeGeometry(0.3, 0.24, 4), C("#2b2f3a"), M4(O[0] + x, y0 + 3.75, O[2] + z, Math.PI / 4));
    if (glow) { const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ctex("lampPool", 128, 128, (g2) => { const gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,190,110,0.5)"); gr.addColorStop(1, "rgba(255,190,110,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.position.set(O[0] + x, y0 + 0.012, O[2] + z); pool.layers.set(NOINK); G.add(pool); }
  }

  // ======================================================================================================
  /** a terraced street: hero house at x -2.1..2.1 (door, ground window, two bedroom windows; the right one at (WX, WY) is
   *  a real opening with a lit room behind it), 14 more houses, pavement, cobbled road, the facing terrace behind the
   *  camera, and the horizon (mills / docks / the 70s) */
  private buildTerrace(set: SetName, s: Terr) {
    const O = ORG[set], G = this.sets[set], b = new Batch();
    const brick = T(s.seed + "Brick", brickTex(s.seed + "BrickT", s.brick, s.mortar, 0.5)), slate = T(s.seed + "Slate", stoneTex(s.seed + "SlateT", s.extras === "seventies" ? "#6a5a5a" : "#5a6070", 0.25));
    const flag = T(s.seed + "Flag", stoneTex(s.seed + "FlagT", s.extras === "seventies" ? "#b8b4ac" : "#a8a296", 0.3)), cob = T(s.seed + "Cob", cobbleTex(s.seed + "CobT", s.extras === "seventies" ? "#5a5a60" : "#7a7068"));
    const HT = s.storeys * 3.0, HW = 4.2, night = s.extras !== "seventies";
    // ground: road + pavements
    b.add(flat(O, -120, -300, 120, 300, -0.002, 3), cob);
    b.add(BX(O, -60, 0, FZ, 60, PH, CZ, 0), flag); b.add(BX(O, -60, 0, CZ - 0.12, 60, PH + 0.01, CZ, 0), C("#9a958c"));
    b.add(BX(O, -60, 0, 4.4, 60, PH, 6.0, 0), flag);
    if (s.extras === "seventies") { for (let x = -40; x <= 40; x += 6) b.add(BX(O, x - 1.4, 0.0, -0.06, x + 1.4, 0.006, 0.06), C("#f2efe6")); } // painted centre line
    // the terrace: front wall slabs per house (the hero house built round its window opening)
    for (let k = -7; k <= 7; k++) {
      const x0 = k * HW - HW / 2, x1 = x0 + HW, cx = k * HW, hero = k === 0;
      if (hero) {
        const wx0 = WX - WW / 2, wx1 = WX + WW / 2, wy0 = WY - WH / 2, wy1 = WY + WH / 2;
        b.add(BX(O, x0, 0, FZ - 0.3, x1, wy0, FZ, 1.2), brick); b.add(BX(O, x0, wy1, FZ - 0.3, x1, HT, FZ, 1.2), brick);
        b.add(BX(O, x0, wy0, FZ - 0.3, wx0, wy1, FZ, 1.2), brick); b.add(BX(O, wx1, wy0, FZ - 0.3, x1, wy1, FZ, 1.2), brick);
        // the bedroom behind the hero window (lit by a candle-lamp: warm wallpaper, a bedside lamp glow)
        const ry0 = 3.0, ry1 = 6.0, rz0 = FZ - 3.0, rz1 = FZ - 0.3, rx0 = WX - 1.6, rx1 = WX + 1.4;
        const wp = T(s.seed + "RoomWp", wallpaperTex(s.seed + "RoomWpT", s.extras === "seventies" ? "#e8b860" : "#e6cfa8", s.extras === "seventies" ? "#d9822b" : "#d8bc94", "#c0392b"));
        b.add(BX(O, rx0, ry0 - 0.1, rz0, rx1, ry0, rz1), C("#6a4a32"));
        b.add(quad(V(O[0] + rx0, ry0, O[2] + rz0), V(O[0] + rx1, ry0, O[2] + rz0), V(O[0] + rx1, ry1, O[2] + rz0), V(O[0] + rx0, ry1, O[2] + rz0), 3, 3), wp);
        b.add(quad(V(O[0] + rx0, ry0, O[2] + rz1), V(O[0] + rx0, ry0, O[2] + rz0), V(O[0] + rx0, ry1, O[2] + rz0), V(O[0] + rx0, ry1, O[2] + rz1), 3, 3), wp);
        b.add(quad(V(O[0] + rx1, ry0, O[2] + rz0), V(O[0] + rx1, ry0, O[2] + rz1), V(O[0] + rx1, ry1, O[2] + rz1), V(O[0] + rx1, ry1, O[2] + rz0), 3, 3), wp);
        b.add(BX(O, rx0, ry1, rz0, rx1, ry1 + 0.1, rz1), C("#e3d4b0"));
        // a picture and a wardrobe edge in the room so it reads as a bedroom through the glass
        b.add(BX(O, WX - 0.4, 4.6, rz0, WX + 0.2, 5.0, rz0 + 0.04), C("#8a5a34")); b.add(BX(O, WX - 0.34, 4.64, rz0 + 0.02, WX + 0.14, 4.96, rz0 + 0.05), C("#6a9fd0"));
        b.add(BX(O, rx1 - 0.6, ry0, rz0 + 0.1, rx1 - 0.02, 5.2, rz0 + 0.7), C("#7a4a2a"));
        const lamp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: ctex("roomGlow", 128, 128, (g2) => { const gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,200,120,0.55)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        lamp.position.set(O[0] + WX - 0.2, 4.0, O[2] + rz0 + 0.06); lamp.layers.set(NOINK); lamp.visible = false; G.add(lamp); this.heroRoomLamp[set] = lamp;
        // the glass (see-through) and the window frame: sash bars, reveal, sill
        const gl = new THREE.Mesh(pic(O, WX, WY, WZ, WW, WH, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.7, 1.0), transparent: true, opacity: 0.22, depthWrite: false }));
        gl.layers.set(NOINK); gl.renderOrder = 2; G.add(gl);
        const t2 = 0.06; b.add(BX(O, WX - t2 / 2, wy0, WZ - 0.03, WX + t2 / 2, wy1, WZ + 0.02), C(s.trim)); b.add(BX(O, wx0, WY - t2 / 2, WZ - 0.03, wx1, WY + t2 / 2, WZ + 0.02), C(s.trim));
        for (const [a0, a1, c0, c1] of [[wx0 - 0.07, wx0, wy0 - 0.07, wy1 + 0.07], [wx1, wx1 + 0.07, wy0 - 0.07, wy1 + 0.07], [wx0, wx1, wy1, wy1 + 0.07], [wx0, wx1, wy0 - 0.07, wy0]] as const)
          b.add(BX(O, a0, c0, FZ - 0.3, a1, c1, FZ + 0.06), C(s.trim));
        b.add(BX(O, wx0 - 0.12, wy0 - 0.19, FZ - 0.3, wx1 + 0.12, wy0 - 0.07, FZ + 0.16), C("#e4dccb"));
        b.add(BX(O, wx0 - 0.1, wy1 + 0.07, FZ - 0.02, wx1 + 0.1, wy1 + 0.21, FZ + 0.04), C("#e4dccb"));
        { const m = this.window(b, G, O, -1.0, WY, FZ, WW, WH, 1, false, s.trim, s.seed + "h1");
          if (s.extras === "docks") this.switchWins.push({ m, on: U(litWinTex("lwOnA", "#ffd27a", "#2457c5"), 1.15), off: m.material as THREE.Material, set, t: 31.8, shots: [23, 24] });
          if (s.storeys === 3) for (const [dx, tt] of [[-1.0, 32.15], [1.0, 32.45]] as const) { const m2 = this.window(b, G, O, dx, WY + 3, FZ, WW, WH, 1, false, s.trim, s.seed + "ht" + dx);
            if (s.extras === "docks") this.switchWins.push({ m: m2, on: U(litWinTex("lwOnT" + dx, "#ffd27a", "#7b2d8e"), 1.15), off: m2.material as THREE.Material, set, t: tt, shots: [23, 24] }); } }
      } else {
        b.add(BX(O, x0, 0, FZ - 0.3, x1, HT, FZ, 1.2), brick);
        for (let fl = 1; fl < s.storeys; fl++) for (const dx of [-1.0, 1.0]) {
          const lit = ((k * 7 + fl * 3 + (dx > 0 ? 1 : 0)) % 3) === 0, m = this.window(b, G, O, cx + dx, WY + (fl - 1) * 3.0, FZ, WW, WH, 1, lit, s.trim, s.seed + k + fl + dx);
        }
      }
      // ground floor: door with fanlight + step, the front window; downpipe; chimney stack with pots; gable roof
      const dcol = s.doors[(k + 70) % s.doors.length];
      b.add(BX(O, cx - 1.55, PH, FZ - 0.08, cx - 0.65, 2.4, FZ + 0.02), C(dcol));
      b.add(BX(O, cx - 1.45, 1.0, FZ + 0.02, cx - 0.75, 2.2, FZ + 0.04), C(dcol === "#2a2a33" ? "#3a3a44" : dcol));
      b.add(new THREE.SphereGeometry(0.04, 8, 6), C("#e8c45a"), M4(O[0] + cx - 0.82, 1.25, O[2] + FZ + 0.06));
      { const fm = new THREE.Mesh(pic(O, cx - 1.1, 2.62, FZ + 0.015, 0.9, 0.36, 1), night ? U(litWinTex("fan" + s.seed, "#f2c070", "#f2c070"), 0.9) : U(darkWinTex("fanD" + s.seed), 1)); fm.layers.set(NOINK); G.add(fm); }
      b.add(BX(O, cx - 1.6, 2.4, FZ, cx - 0.6, 2.44, FZ + 0.06), C(s.trim)); b.add(BX(O, cx - 1.6, 2.8, FZ, cx - 0.6, 2.86, FZ + 0.06), C(s.trim));
      b.add(BX(O, cx - 1.7, PH, FZ, cx - 0.5, PH + 0.16, FZ + 0.34), C("#d8d2c6")); // the scrubbed front step
      this.window(b, G, O, cx + 1.0, 1.55, FZ, 1.1, 1.3, 1, (k + 2) % 3 === 0, s.trim, s.seed + "g" + k);
      b.add(BX(O, x1 - 0.06, 0, FZ, x1 + 0.06, HT, FZ + 0.1), C("#2b2f3a"));
      b.add(BX(O, cx - 0.5, HT + 0.6, FZ - 2.6, cx + 0.5, HT + 2.0, FZ - 2.0), brick);
      for (const dx of [-0.25, 0.25]) b.add(new THREE.CylinderGeometry(0.09, 0.11, 0.38, 10), C("#c8643a"), M4(O[0] + cx + dx, HT + 2.19, O[2] + FZ - 2.3));
      if (s.extras === "seventies" && k % 2 === 0) { // TV aerials on the chimneys
        b.add(beamBetween(V(O[0] + cx, HT + 2.0, O[2] + FZ - 2.3), V(O[0] + cx, HT + 3.3, O[2] + FZ - 2.3), 0.04, true), C("#8a8f99"));
        b.add(beamBetween(V(O[0] + cx - 0.7, HT + 3.1, O[2] + FZ - 2.3), V(O[0] + cx + 0.7, HT + 3.1, O[2] + FZ - 2.3), 0.03, true), C("#8a8f99"));
        for (let q = -2; q <= 2; q++) b.add(beamBetween(V(O[0] + cx + q * 0.3, HT + 3.1, O[2] + FZ - 2.6), V(O[0] + cx + q * 0.3, HT + 3.1, O[2] + FZ - 2.0), 0.02, true), C("#8a8f99"));
      }
    }
    { const rx0 = WX - 1.6, rx1 = WX + 1.4; // the house bodies behind the fronts, hollow round the hero bedroom (x rx0..rx1, y 3..6, to FZ - 3)
      b.add(BX(O, -31.5, 0, FZ - 5.0, rx0, HT, FZ - 0.3), brick); b.add(BX(O, rx1, 0, FZ - 5.0, 31.5, HT, FZ - 0.3), brick);
      b.add(BX(O, rx0, 0, FZ - 5.0, rx1, 2.9, FZ - 0.3), brick); b.add(BX(O, rx0, 6.1, FZ - 5.0, rx1, HT, FZ - 0.3), brick); b.add(BX(O, rx0, 2.9, FZ - 5.0, rx1, 6.1, FZ - 3.05), brick); }
    gable(b, O, -31.5, 31.5, FZ, FZ - 5.0, HT, 2.4, slate);
    b.add(BX(O, -31.5, HT - 0.1, FZ - 0.04, 31.5, HT + 0.06, FZ + 0.25), C(s.trim)); // gutter board
    // the facing terrace (behind the camera in reverse angles), plain fronts with windows
    b.add(BX(O, -40, 0, 6.0, 40, HT, 9.0, 1.2), brick); gable(b, O, -40, 40, 9.0, 6.0, HT, 2.2, slate);
    for (let k = -8; k <= 8; k++) for (const [dx, y] of [[-1.0, 1.55], [1.0, 1.55], [-1.0, WY], [1.0, WY]] as const) this.window(b, G, O, k * HW + dx, y, 6.0, WW, WH, -1, ((k * 5 + (y > 3 ? 1 : 0)) % 4) === 0, s.trim, s.seed + "o" + k + dx + y);
    // street lamps between the houses at the curb
    for (const x of [-12.6, -6.3, 6.3, 12.6, 18.9]) {
      if (s.extras === "seventies") { // concrete post with a sodium head (off by day)
        b.add(new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8), C("#b8b4ac"), M4(O[0] + x, 2.7, O[2] + CZ - 0.1));
        b.add(beamBetween(V(O[0] + x, 5.4, O[2] + CZ - 0.1), V(O[0] + x, 5.6, O[2] + CZ + 0.9), 0.08), C("#b8b4ac"));
        b.add(boxGeo(V(O[0] + x - 0.14, 5.45, O[2] + CZ + 0.6), V(O[0] + x + 0.14, 5.6, O[2] + CZ + 1.15)), C("#e8e2d0"));
      } else this.gasLamp(b, G, O, x, PH, CZ - 0.1, true, s.extras === "docks" ? 1.0 : 1.1);
    }
    // ---- the horizon ----
    if (s.extras === "mills" || s.extras === "seventies") {
      // rows of terraces behind ours (seen from the aerial) with their chimney stacks and windows
      for (const [rz, rx] of [[-16, 0], [-27, 2.1], [-38, 0]] as const) {
        b.add(BX(O, -44 + rx, 0, rz - 6, 44 + rx, 6.0, rz, 1.2), brick); gable(b, O, -44 + rx, 44 + rx, rz, rz - 6, 6.0, 2.2, slate);
        for (let x = -42 + rx; x < 42 + rx; x += 4.2) { b.add(BX(O, x - 0.45, 6.6, rz - 3.3, x + 0.45, 7.8, rz - 2.7), brick);
          for (const [dx, y] of [[-1.0, 1.55], [1.0, 1.55], [-1.0, WY], [1.0, WY]] as const) { const lit = ((Math.round(x * 3) + y * 7 + rz) % 5) === 0;
            const m = new THREE.Mesh(pic(O, x + dx, y, rz + 0.01, WW, WH, 1), lit && night ? U(litWinTex("lw" + s.seed + "r", "#ffd27a", "#c0392b"), 1.1) : U(darkWinTex("dw" + s.seed + "r"), 0.95)); m.layers.set(NOINK); G.add(m); } }
      }
      // the cotton mills: big brick blocks with rows of lit windows and tall chimneys
      const millWin = ctex("millWin" + s.seed, 512, 512, (g) => { g.fillStyle = s.brick; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { g.fillStyle = night ? "#ffcf70" : "#5a6a80"; g.fillRect(14 + x * 84, 30 + y * 124, 56, 76); } });
      for (const [mx, mz, w, h] of [[-26, -56, 34, 16], [10, -62, 30, 14], [42, -54, 26, 13]] as const) {
        const face = new THREE.Mesh(pic(O, mx, h / 2, mz + 0.02, w, h, 1, w / 8, h / 6), U(millWin, night ? 1.05 : 0.9)); face.layers.set(NOINK); G.add(face);
        b.add(BX(O, mx - w / 2, 0, mz - 14, mx + w / 2, h, mz, 0), C(s.brick));
        gable(b, O, mx - w / 2, mx + w / 2, mz, mz - 14, h, 3, slate);
        b.add(new THREE.CylinderGeometry(1.1, 1.6, 34, 14), C(s.brick), M4(O[0] + mx + w / 2 - 3, 17, O[2] + mz - 7));
        b.add(new THREE.CylinderGeometry(1.25, 1.25, 1.2, 14), C("#3a2a24"), M4(O[0] + mx + w / 2 - 3, 34.4, O[2] + mz - 7));
        // smoke: soft puffs drifting up and away (animated in update)
        for (let q = 0; q < 5; q++) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ctex("smokePuff", 128, 128, (g2) => { const gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(200,205,220,0.85)"); gr.addColorStop(0.7, "rgba(170,178,200,0.5)"); gr.addColorStop(1, "rgba(170,178,200,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, color: new THREE.Color(night ? 0.55 : 0.95, night ? 0.6 : 0.95, night ? 0.72 : 0.98) }));
          sm.userData = { x: O[0] + mx + w / 2 - 3, y: 35, z: O[2] + mz - 7, q }; sm.layers.set(NOINK); G.add(sm); this.smoke.push(sm); }
      }
    }
    if (s.extras === "docks") {
      // the street ends at the quay: water, a moored sailing barge's masts and a crane; the corner pub
      b.add(BX(O, 30, -0.4, -60, 120, -0.38, 60), C("#1d3460"));
      { const wq = new THREE.Mesh(new THREE.PlaneGeometry(80, 120).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.32, 0.6) })); wq.position.set(O[0] + 72, -0.36, O[2]); wq.layers.set(NOINK); G.add(wq); }
      b.add(BX(O, 29.4, -0.4, -60, 30.2, 0.02, 60), C("#6a6460"));
      for (const [mx, mz, h] of [[36, -8, 18], [44, -3, 22], [52, -10, 16]] as const) {
        b.add(new THREE.CylinderGeometry(0.16, 0.24, h, 8), C("#5a3b2a"), M4(O[0] + mx, h / 2, O[2] + mz));
        for (const y of [h * 0.55, h * 0.8]) b.add(beamBetween(V(O[0] + mx - 3.2, y, O[2] + mz), V(O[0] + mx + 3.2, y, O[2] + mz), 0.12, true), C("#5a3b2a"));
        b.add(BX(O, mx - 6, -0.4, mz - 1.6, mx + 6, 1.0, mz + 1.6), C("#3a2a24"));
      }
      b.add(BX(O, 33, 0, 4, 34.2, 14, 5.2), C("#2b2f3a")); b.add(beamBetween(V(O[0] + 33.6, 14, O[2] + 4.6), V(O[0] + 42, 16, O[2] + 4.6), 0.5), C("#2b2f3a"));
      b.add(beamBetween(V(O[0] + 42, 16, O[2] + 4.6), V(O[0] + 42, 6, O[2] + 4.6), 0.04, true), C("#1d1f26"));
      // area railings in front of the London houses
      for (let x = -30; x <= 30; x += 0.25) if (Math.abs(x + 1.1) > 0.7 && Math.abs(((x + 30) % 4.2) - 3.1) > 0.55) b.add(BX(O, x - 0.012, PH, FZ + 0.48, x + 0.012, PH + 1.0, FZ + 0.5), C("#1d1f26"));
      b.add(BX(O, -30, PH + 0.95, FZ + 0.47, 30, PH + 1.0, FZ + 0.52), C("#1d1f26"));
      sign(G, O, -8.4, 3.4, FZ + 0.08, 2.6, 0.86, 1, pubSignTex(), 1.0);
      // the pole Mary didn't need: leaning on the wall by the hero door
      b.add(beamBetween(V(O[0] + 0.55, PH, O[2] + FZ + 0.62), V(O[0] + 0.75, 3.3, O[2] + FZ + 0.08), 0.06, true), C("#a87a46"));
      b.add(new THREE.SphereGeometry(0.05, 10, 8), C("#5a5f6e"), M4(O[0] + 0.75, 3.33, O[2] + FZ + 0.08));
    }
    if (s.extras === "seventies") {
      car70(b, O[0] - 5.2, O[2] - 3.4, "#e07a1f"); car70(b, O[0] + 9.6, O[2] - 3.4, "#2a9d8f"); car70(b, O[0] - 14, O[2] + 3.4, "#f2c12e");
      // a red phone box on the far pavement
      b.add(BX(O, -9.0, PH, 4.6, -8.1, 2.7, 5.5), C("#d7262e")); b.add(BX(O, -9.05, 2.7, 4.55, -8.05, 2.9, 5.55), C("#d7262e"));
      { const pw = new THREE.Mesh(pic(O, -8.55, 1.6, 4.59, 0.66, 1.6, -1), U(darkWinTex("phoneW", "#5a7aa0", "#d7262e"), 1.1)); pw.layers.set(NOINK); G.add(pw); }
      for (const [x, z] of [[-3.2, 4.9], [14, 4.9]] as const) plant(b, O[0] + x, PH, O[2] + z, 0.8, "#2a2a33");
    }
    // labels
    if (set === "street") { this.label(G, "ku", "KNOCKER-UPPER", 0.82).position.set(O[0] + 2.12, 2.05, O[2] - 4.3); this.label(G, "q", "?", 0.36).position.set(O[0] + 1.74, 1.86, O[2] - 4.35); }
    if (set === "london") { this.label(G, "mary", "MARY SMITH", 0.85).position.set(O[0] + 2.4, 2.12, O[2] - 2.6); this.label(G, "six", "SIXPENCE A WEEK", 0.6).position.set(O[0] + 2.4, 0.8, O[2] - 2.5); }
    if (set === "seventies") this.label(G, "70s", "1970s", 0.9).position.set(O[0] + WX, WY - 0.95, O[2] + WZ + 0.35);
    b.build(G);
  }

  // ======================================================================================================
  /** the clockmaker's bow window on a cobbled street (dusk / day): shelves of clocks, the hero alarm clock and its tag,
   *  a tray of cheap tin clocks (shot 30 only) */
  private buildShop() {
    const O = ORG.shop, G = this.sets.shop, b = new Batch();
    const brick = T("shBrick", brickTex("shBrickT", "#a8503a", "#d4b098", 0.5)), green = C("#1f4e3d"), gold = C("#d9a441");
    b.add(flat(O, -120, -300, 120, 300, -0.002, 3), T("shCob", cobbleTex("shCobT", "#7a7068")));
    b.add(BX(O, -40, 0, -3.6, 40, PH, -1.6, 0), T("shFlag", stoneTex("shFlagT", "#a8a296", 0.3))); b.add(BX(O, -40, 0, -1.72, 40, PH + 0.01, -1.6), C("#9a958c"));
    // three shopfronts: draper (left), CLOCKMAKER (centre), baker (right); upstairs brick with windows, roofs
    b.add(BX(O, -10, 0, -9, 10, 6.4, -4.6, 1.2), brick); b.add(BX(O, -10, 3.45, -4.6, 10, 6.4, -3.6, 1.2), brick);
    for (const x of [-6.3, -2.2, 2.2, 6.3]) b.add(BX(O, x - 0.12, 0, -4.6, x + 0.12, 3.45, -3.6), brick); // party walls between the shops
    b.add(BX(O, -10, 0, -4.6, -6.3, 3.45, -3.6, 1.2), brick); b.add(BX(O, 6.3, 0, -4.6, 10, 3.45, -3.6, 1.2), brick);
    gable(b, O, -10, 10, -3.6, -9, 6.4, 2.4, T("shSlate", stoneTex("shSlateT", "#5a6070", 0.25)));
    for (const x of [-4.2, 0, 4.2]) for (const dx of [-0.9, 0.9]) this.window(b, G, O, x + dx, 4.6, -3.6, 0.95, 1.2, 1, (Math.round(x + dx * 3) % 2) === 0, "#f2ead6", "sh" + x + dx);
    // clockmaker front: green painted pilasters, fascia with the gold sign, the bow window, the door
    b.add(BX(O, -2.1, PH, -3.6, -1.82, 3.4, -3.46), green); b.add(BX(O, 1.82, PH, -3.6, 2.1, 3.4, -3.46), green);
    b.add(BX(O, -2.2, 2.75, -3.62, 2.2, 3.45, -3.4), green); sign(G, O, 0, 3.1, -3.39, 3.6, 0.6, 1, clockSignTex(), 1.0);
    b.add(BX(O, -1.82, PH, -3.62, 1.5, 0.68, -3.42), green); // stall riser under the window
    b.add(BX(O, -1.82, 0.66, -3.66, 1.5, 0.72, -3.4), gold);
    { const gl = new THREE.Mesh(pic(O, -0.16, 1.68, SGZ, 3.3, 2.0, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.8, 1.0), transparent: true, opacity: 0.16, depthWrite: false })); gl.layers.set(NOINK); gl.renderOrder = 2; G.add(gl); }
    for (const x of [-1.0, 0.65]) b.add(BX(O, x - 0.03, 0.72, SGZ - 0.03, x + 0.03, 2.7, SGZ + 0.03), green);
    b.add(BX(O, -1.82, 2.66, SGZ - 0.04, 1.5, 2.75, SGZ + 0.05), green);
    b.add(BX(O, 1.5, PH, -3.66, 1.82, 2.75, -3.56), green); b.add(BX(O, 1.52, PH, -3.9, 1.8, 2.6, -3.84), C("#2a5a48")); // door (recessed)
    // the display inside: velvet floor, a back board, shelves of clocks, wall clocks, a warm lamp glow
    b.add(BX(O, -1.82, 0.68, -4.5, 1.5, 0.74, SGZ - 0.02), C("#7b2d3a"));
    b.add(BX(O, -1.82, 0.74, -4.55, 1.5, 2.66, -4.5), C("#3a2418"));
    for (const y of [1.62, 2.12]) b.add(BX(O, -1.8, y, -4.5, 1.48, y + 0.04, -4.18), C("#8a5a34"));
    const rims = ["#c9933f", "#8a5a34", "#2b2b33", "#d9a441", "#6a4a2a"];
    let q = 0;
    for (const y of [1.66, 2.16]) for (let x = -1.6; x <= 1.3; x += 0.42) { q++; const r = 0.1 + (q % 3) * 0.02, col = rims[q % rims.length];
      b.add(boxGeo(V(O[0] + x - r - 0.02, y, O[2] - 4.42), V(O[0] + x + r + 0.02, y + 2.2 * r + 0.06, O[2] - 4.26)), C(col));
      const fm = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 20), U(clockFaceTex("sh" + q, (q * 5) % 12, (q * 17) % 60, col), 1.0)); fm.position.set(O[0] + x, y + r + 0.05, O[2] - 4.255); fm.layers.set(NOINK); G.add(fm); }
    for (const x of [-1.3, 0.0, 1.1]) { b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 24).rotateX(Math.PI / 2), C("#6a4a2a"), M4(O[0] + x, 2.45, O[2] - 4.49));
      const fm = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), U(clockFaceTex("wc" + x, 10, 10 + Math.round(x * 10), "#6a4a2a"), 1.0)); fm.position.set(O[0] + x, 2.45, O[2] - 4.46); fm.layers.set(NOINK); G.add(fm); }
    { const glow = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshBasicMaterial({ map: ctex("roomGlow2", 128, 128, (g2) => { const gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,200,120,0.45)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.set(O[0] - 0.2, 1.7, O[2] - 4.47); glow.layers.set(NOINK); G.add(glow); }
    // the hero: a red twin-bell alarm clock on a little stand, the giant price tag on a string
    this.heroClock = alarmClock("#d7262e", clockFaceTex("hero", 7, 0, "#d7262e"), 1.25); this.heroClock.position.set(O[0] + CLOCK[0], 1.04, O[2] + CLOCK[2]); G.add(this.heroClock);
    { const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 16), C("#d9a441")); stand.position.set(0, -0.15, 0); stand.castShadow = true; this.heroClock.add(stand); }
    { const tg = new THREE.Group(); const tagM = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), U(priceTagTex("hero", "£££"), 1.05)); tagM.position.set(0.0, -0.13, 0); tagM.layers.set(NOINK); tg.add(tagM);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), C("#f4f1ea")); str.position.set(-0.1, 0.02, 0); str.rotation.z = 0.7; tg.add(str);
      tg.position.set(O[0] + CLOCK[0] + 0.26, 1.2, O[2] + CLOCK[2] + 0.16); tg.rotation.z = -0.12; G.add(tg); this.heroTag = tg; }
    // the cheap tin clocks (shot 30): a tray of identical little clocks, a CHEAP! card
    for (let i = 0; i < 12; i++) { const c = alarmClock(["#2457c5", "#1f8a70", "#e07a1f"][i % 3], clockFaceTex("cheap" + (i % 3), 6, 0, "#9aa3ad"), 0.8);
      const row = Math.floor(i / 4); c.position.set(O[0] - 0.48 + (i % 4) * 0.32 + (row % 2) * 0.12, 0.74 + row * 0.03, O[2] - 3.82 - row * 0.24); c.visible = false; G.add(c); this.cheap.push(c); }
    { const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), U(cheapSignTex(), 1.05)); cs.position.set(O[0] + 0.05, 1.42, O[2] - 4.3); cs.rotation.z = 0.06; cs.layers.set(NOINK); cs.visible = false; G.add(cs); this.cheapSign = cs; }
    // neighbours: the draper (bolts of cloth) and the baker (loaves) in their windows, both lit
    for (const [x0, col] of [[-6.3, "#3d6ab5"], [2.1, "#e9c46a"]] as const) {
      b.add(BX(O, x0, PH, -3.62, x0 + 4.2, 0.68, -3.44), C(col === "#3d6ab5" ? "#2a2a44" : "#6a3a24"));
      b.add(BX(O, x0, 2.75, -3.62, x0 + 4.2, 3.45, -3.42), C(col === "#3d6ab5" ? "#2a2a44" : "#6a3a24"));
      const wm = new THREE.Mesh(pic(O, x0 + 2.1, 1.7, -3.58, 3.6, 2.0, 1), U(litWinTex("nb" + x0, "#ffd88a", col), 1.0)); wm.layers.set(NOINK); G.add(wm);
      b.add(BX(O, x0 + 0.1, 0.68, -3.62, x0 + 0.3, 2.75, -3.42), C(col === "#3d6ab5" ? "#2a2a44" : "#6a3a24")); b.add(BX(O, x0 + 3.9, 0.68, -3.62, x0 + 4.1, 2.75, -3.42), C(col === "#3d6ab5" ? "#2a2a44" : "#6a3a24"));
      for (let k = 0; k < 4; k++) b.add(col === "#3d6ab5" ? new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12) : new THREE.SphereGeometry(0.16, 12, 8), C(col === "#3d6ab5" ? ["#c0392b", "#3d6ab5", "#e9c46a", "#1f8a70"][k] : "#c9853f"), M4(O[0] + x0 + 0.7 + k * 0.9, col === "#3d6ab5" ? 1.1 : 0.85, O[2] - 3.72, 0, 0, col === "#3d6ab5" ? Math.PI / 2 : 0, [1, col === "#3d6ab5" ? 1 : 0.6, 1]));
    }
    // © skies mark 1 of 3 in this film
    skiesMark(G, "plaque", [O[0] - 1.05, 0.4, O[2] - 3.405], 1, 0.8); // brass maker's plate on the stall riser (seen in shot 1)
    this.gasLamp(b, G, O, -3.6, PH, -1.8, true, 0.9); this.gasLamp(b, G, O, 6.4, PH, -1.8, true, 0.9);
    b.build(G);
    // the far side of the street (casts no shadow: the low dusk sun comes from behind it)
    const bf = new Batch();
    bf.add(BX(O, -40, 0, 5.5, 40, 6.4, 9, 1.2), brick); gable(bf, O, -40, 40, 9, 5.5, 6.4, 2.2, T("shSlate", stoneTex("shSlateT", "#5a6070", 0.25)));
    for (let x = -18; x <= 18; x += 2.1) for (const y of [1.6, 4.4]) this.window(bf, G, O, x, y, 5.5, 0.95, 1.2, -1, (Math.round(x * 2 + y) % 3) === 0, "#f2ead6", "sho" + x + y);
    bf.build(G, false);
  }

  // ======================================================================================================
  /** a small bedroom (bed / attic / modern): back wall with a real window, side walls, floor, ceiling; the bed along x */
  private buildRoom(set: "bed" | "attic" | "modern") {
    const O = ORG[set], G = this.sets[set], b = new Batch();
    const X0 = -2.6, X1 = 2.6, Z0 = -2.4, Z1 = 2.0, HT = 2.7;
    const st = set === "bed" ? { wp: ["#e8d2b0", "#dcc29c", "#c0392b"], floor: "#8a5a34", quilt: ["#c0392b", "#2457c5", "#e9c46a", "#1f8a70", "#f4f1ea"], frame: "#2b2b33" }
      : set === "attic" ? { wp: ["#cfe0c0", "#bcd2aa", "#e07a1f"], floor: "#9a6a44", quilt: ["#7b2d8e", "#e9c46a", "#f4f1ea", "#2a9d8f", "#d9822b"], frame: "#6a4a2a" }
        : { wp: ["#cfe2ee", "#cfe2ee", "#cfe2ee"], floor: "#c9a77a", quilt: ["#2457c5", "#2457c5", "#3d6ab5", "#2457c5", "#3d6ab5"], frame: "#e8e8ee" };
    const wall = set === "modern" ? T("mWall", paintTex("mWallT", "#d6e6f0")) : T(set + "Wp", wallpaperTex(set + "WpT", st.wp[0], st.wp[1], st.wp[2]));
    b.add(flat(O, X0, Z0, X1, Z1, 0, 1.2), T(set + "Floor", boardsTex(set + "FloorT", st.floor)));
    b.add(quad(V(O[0] + X0, HT, O[2] + Z0), V(O[0] + X1, HT, O[2] + Z0), V(O[0] + X1, HT, O[2] + Z1), V(O[0] + X0, HT, O[2] + Z1), 2, 2), C(set === "modern" ? "#f4f6fa" : "#e8dcc4"));
    // back wall round the window opening
    const [wx, wy] = [WIN_B[0], WIN_B[1]], ww = 1.0, wh = 1.2, wx0 = wx - ww / 2, wx1 = wx + ww / 2, wy0 = wy - wh / 2, wy1 = wy + wh / 2;
    const wq = (x0: number, y0: number, x1: number, y1: number) => b.add(quad(V(O[0] + x0, y0, O[2] + Z0), V(O[0] + x1, y0, O[2] + Z0), V(O[0] + x1, y1, O[2] + Z0), V(O[0] + x0, y1, O[2] + Z0), (x1 - x0) / 1.2, (y1 - y0) / 1.2), wall);
    wq(X0, 0, X1, wy0); wq(X0, wy1, X1, HT); wq(X0, wy0, wx0, wy1); wq(wx1, wy0, X1, wy1);
    b.add(quad(V(O[0] + X0, 0, O[2] + Z1), V(O[0] + X0, 0, O[2] + Z0), V(O[0] + X0, HT, O[2] + Z0), V(O[0] + X0, HT, O[2] + Z1), (Z1 - Z0) / 1.2, HT / 1.2), wall);
    b.add(quad(V(O[0] + X1, 0, O[2] + Z0), V(O[0] + X1, 0, O[2] + Z1), V(O[0] + X1, HT, O[2] + Z1), V(O[0] + X1, HT, O[2] + Z0), (Z1 - Z0) / 1.2, HT / 1.2), wall);
    for (const [a0, a1] of [[[X0, Z0 + 0.04], [X1, Z0 + 0.04]], [[X0 + 0.04, Z0], [X0 + 0.04, Z1]], [[X1 - 0.04, Z0], [X1 - 0.04, Z1]]] as const)
      b.add(beamBetween(V(O[0] + a0[0], 0.07, O[2] + a0[1]), V(O[0] + a1[0], 0.07, O[2] + a1[1]), 0.14), C(set === "modern" ? "#ffffff" : "#6a4a32"));
    // the window: reveal, frame, cross bars, sill, glass; outside: night street / sunny sky / morning
    const fr = set === "modern" ? "#ffffff" : "#f2ead6";
    b.add(BX(O, wx0 - 0.06, wy0 - 0.06, Z0 - 0.2, wx0, wy1 + 0.06, Z0 + 0.04), C(fr)); b.add(BX(O, wx1, wy0 - 0.06, Z0 - 0.2, wx1 + 0.06, wy1 + 0.06, Z0 + 0.04), C(fr));
    b.add(BX(O, wx0, wy1, Z0 - 0.2, wx1, wy1 + 0.06, Z0 + 0.04), C(fr)); b.add(BX(O, wx0 - 0.1, wy0 - 0.08, Z0 - 0.2, wx1 + 0.1, wy0, Z0 + 0.12), C(fr));
    if (set !== "modern") { b.add(BX(O, wx - 0.025, wy0, WIN_B[2] - 0.02, wx + 0.025, wy1, WIN_B[2] + 0.02), C(fr)); b.add(BX(O, wx0, wy - 0.025, WIN_B[2] - 0.02, wx1, wy + 0.025, WIN_B[2] + 0.02), C(fr)); }
    { const gl = new THREE.Mesh(pic(O, wx, wy, WIN_B[2], ww, wh, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.75, 1.0), transparent: true, opacity: 0.18, depthWrite: false })); gl.layers.set(NOINK); gl.renderOrder = 2; G.add(gl); }
    const out = ctex("outside" + set, 512, 512, (g) => {
      if (set === "bed") { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0f1d45"); gr.addColorStop(1, "#2a4a86"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
        g.fillStyle = "#1a2440"; g.beginPath(); g.moveTo(0, 330); for (let x = 0; x <= 512; x += 64) { g.lineTo(x, 330 - ((x / 64) % 2) * 30); g.lineTo(x + 64, 330 - ((x / 64) % 2) * 30); } g.lineTo(512, 512); g.lineTo(0, 512); g.fill();
        g.fillStyle = "#ffcf70"; for (const [x, y] of [[60, 380], [300, 400], [420, 370]]) g.fillRect(x, y, 30, 40);
        g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(380, 120, 34, 0, 7); g.fill(); }
      else { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, set === "attic" ? "#3373cc" : "#6a9fe0"); gr.addColorStop(1, set === "attic" ? "#b8d0ec" : "#e8f0fa"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
        g.fillStyle = set === "attic" ? "#b4533a" : "#8fa0b4"; g.beginPath(); g.moveTo(0, 360); g.lineTo(140, 330); g.lineTo(260, 345); g.lineTo(400, 320); g.lineTo(512, 340); g.lineTo(512, 512); g.lineTo(0, 512); g.fill();
        g.fillStyle = "rgba(255,255,255,0.9)"; for (const [x, y, r] of [[120, 120, 40], [170, 110, 50], [220, 125, 36], [380, 200, 30], [420, 190, 40]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } } });
    { const om = new THREE.Mesh(pic(O, wx, wy, Z0 - 1.2, 3.4, 3.0, 1), U(out, set === "bed" ? 1.0 : 1.25)); om.layers.set(NOINK); G.add(om); }
    if (set !== "modern") for (const s2 of [-1, 1]) b.add(BX(O, wx + s2 * (ww / 2 + 0.22) - 0.16, wy0 - 0.25, Z0 + 0.03, wx + s2 * (ww / 2 + 0.22) + 0.16, wy1 + 0.2, Z0 + 0.07), C(set === "bed" ? "#c0392b" : "#e07a1f")); // curtains
    else for (let k = 0; k < 9; k++) b.add(BX(O, wx0, wy1 - 0.08 - k * 0.12, Z0 + 0.03, wx1, wy1 - 0.05 - k * 0.12, Z0 + 0.06), C("#f4f6fa")); // blinds (half up)
    // the bed: frame, mattress, quilt (flat), pillow behind the sleeper card
    const fz0 = BZ - 0.5, fz1 = BZ + 0.5, bx0 = BX0, bx1 = BX1;
    b.add(BX(O, bx0, 0.22, fz0, bx1, BY - 0.1, fz1), C(set === "modern" ? "#e8e8ee" : "#efe6d2"));
    b.add(BX(O, bx0 - 0.02, BY - 0.1, fz0 - 0.02, bx1 + 0.04, BY + 0.03, fz1 + 0.03), T(set + "Quilt", quiltTex(set + "QuiltT", st.quilt)));
    b.add(BX(O, -1.95, BY, fz0 + 0.04, -0.95, BY + 0.24, BZ - 0.08), C("#f6f3ea")); // pillow (behind the sleeper's card)
    { // the quilt hump over the (hidden) body, up to the chin, with the turned-down sheet at the top
      const L = BX1 + 0.02 - -1.78, hump = new THREE.CylinderGeometry(0.44, 0.44, L, 24, 1, false, 0, Math.PI); hump.rotateZ(Math.PI / 2); hump.rotateX(Math.PI / 2); hump.scale(1, 0.6, 1);
      b.add(hump, T(set + "Quilt", quiltTex(set + "QuiltT", st.quilt)), M4(O[0] + (-1.78 + BX1 + 0.02) / 2, BY + 0.02, O[2] + BZ));
      const sheet = new THREE.CylinderGeometry(0.455, 0.455, 0.24, 24, 1, false, 0, Math.PI); sheet.rotateZ(Math.PI / 2); sheet.rotateX(Math.PI / 2); sheet.scale(1, 0.6, 1);
      b.add(sheet, C(set === "modern" ? "#e8eef6" : "#f6f3ea"), M4(O[0] - 1.66, BY + 0.02, O[2] + BZ)); }
    if (set === "modern") { b.add(BX(O, bx0 - 0.12, 0, fz0 - 0.04, bx0, 1.15, fz1 + 0.04), C("#4a5a72")); b.add(BX(O, bx0, 0, fz0, bx1 + 0.06, 0.24, fz1), C("#4a5a72")); }
    else {
      for (const x of [bx0 - 0.04, bx1 + 0.04]) for (const z of [fz0, fz1]) b.add(new THREE.CylinderGeometry(0.025, 0.025, x < 0 ? 1.15 : 0.85, 8), C(st.frame), M4(O[0] + x, x < 0 ? 0.575 : 0.425, O[2] + z));
      for (const x of [bx0 - 0.04, bx1 + 0.04]) { const h2 = x < 0 ? 1.1 : 0.8; for (const y of [h2, 0.36]) b.add(beamBetween(V(O[0] + x, y, O[2] + fz0), V(O[0] + x, y, O[2] + fz1), 0.03, true), C(st.frame));
        for (let k = 1; k < 6; k++) b.add(beamBetween(V(O[0] + x, 0.36, O[2] + fz0 + k / 6), V(O[0] + x, h2, O[2] + fz0 + k / 6), 0.014, true), C(st.frame)); }
      for (const z of [fz0, fz1]) for (const x of [bx0 - 0.04, bx1 + 0.04]) b.add(new THREE.SphereGeometry(0.045, 10, 8), C("#e8c45a"), M4(O[0] + x, x < 0 ? 1.16 : 0.86, O[2] + z));
    }
    // nightstand at the head end (candle / lamp / alarm clock), rug, chair or desk, decoration
    if (set === "modern") b.add(BX(O, X0 + 0.02, 0, BZ - 0.28, bx0 - 0.14, 0.62, BZ + 0.22), C("#ffffff"));
    else b.add(BX(O, bx0 - 0.02, 0, BZ - 1.05, bx0 + 0.5, 0.62, BZ - 0.56), C("#7a4a2a"));
    if (set === "bed") { b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 12), C("#e8c45a"), M4(O[0] + bx0 + 0.24, 0.635, O[2] + BZ - 0.8)); b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), C("#f4f1ea"), M4(O[0] + bx0 + 0.24, 0.72, O[2] + BZ - 0.8));
      b.add(BX(O, 1.8, 0, -1.6, 2.5, 0.78, -1.0), C("#7a4a2a")); b.add(new THREE.CylinderGeometry(0.2, 0.14, 0.12, 16, 1, true), C("#f4f1ea"), M4(O[0] + 2.15, 0.84, O[2] - 1.3));
      b.add(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 12), C("#f4f1ea"), M4(O[0] + 2.15, 0.95, O[2] - 1.3)); // washstand: bowl + jug
      b.add(BX(O, 1.2, 0, 0.3, 1.65, 0.48, 0.75), C("#8a5a34")); b.add(BX(O, 1.2, 0.48, 0.68, 1.65, 1.05, 0.75), C("#8a5a34")); b.add(BX(O, 1.22, 0.48, 0.32, 1.6, 0.56, 0.66), C("#5a6a8a")); // chair with clothes
      b.add(BX(O, -0.6, 0.002, -0.9, 0.9, 0.012, 0.3), C("#c0663a"));
      b.add(BX(O, 1.0, 1.5, Z0, 1.7, 2.0, Z0 + 0.04), C("#6a4a2a")); b.add(BX(O, 1.04, 1.54, Z0 + 0.02, 1.66, 1.96, Z0 + 0.05), C("#f2e8d0")); }
    if (set === "attic") { b.add(BX(O, -0.5, 0.002, -0.9, 1.1, 0.012, 0.4), C("#2a9d8f"));
      b.add(beamBetween(V(O[0] + 2.2, 0, O[2] - 2.2), V(O[0] + 2.45, 2.62, O[2] - 2.34), 0.045, true), C("#a87a46")); // his pole, leaning in the corner
      b.add(new THREE.SphereGeometry(0.04, 10, 8), C("#5a5f6e"), M4(O[0] + 2.45, 2.65, O[2] - 2.34));
      b.add(BX(O, 1.55, 1.7, Z0, 1.62, 1.78, Z0 + 0.12), C("#6a4a2a")); b.add(new THREE.CylinderGeometry(0.17, 0.2, 0.09, 14), C("#4a4038"), M4(O[0] + 1.58, 1.62, O[2] + Z0 + 0.16)); // his cap on a hook
      for (const x of [0.62, 0.86]) b.add(BX(O, x, 0, -1.0, x + 0.16, 0.18, -0.68), C("#2b2018")); // boots
      // a sunbeam through the window onto the floor
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.4), new THREE.MeshBasicMaterial({ map: ctex("beam", 64, 256, (g2) => { const gr = g2.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,240,190,0.5)"); gr.addColorStop(1, "rgba(255,240,190,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 64, 256); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      beam.position.set(O[0] + wx - 0.3, 1.2, O[2] - 1.6); beam.rotation.set(-0.9, 0, 0.2); beam.layers.set(NOINK); G.add(beam);
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.2, 0.95), transparent: true, opacity: 0.35, depthWrite: false })); patch.position.set(O[0] + wx - 0.5, 0.004, O[2] - 0.6); patch.layers.set(NOINK); G.add(patch);
      b.add(BX(O, 0.4, 1.5, Z0, 1.0, 2.0, Z0 + 0.04), C("#6a4a2a")); b.add(BX(O, 0.44, 1.54, Z0 + 0.02, 0.96, 1.96, Z0 + 0.05), C("#e9c46a")); }
    if (set === "modern") {
      b.add(BX(O, -0.6, 0.002, -0.9, 1.2, 0.012, 0.5), C("#f2c12e"));
      b.add(BX(O, 1.5, 0.72, -2.38, 2.55, 0.77, -1.75), C("#ffffff")); for (const x of [1.55, 2.5]) b.add(BX(O, x - 0.03, 0, -2.3, x + 0.03, 0.72, -1.8), C("#ffffff")); // desk
      b.add(BX(O, 1.75, 0.77, -2.2, 2.25, 0.79, -1.9), C("#3a3d46")); b.add(BX(O, 1.75, 0.79, -2.22, 2.25, 1.1, -2.19), C("#3a3d46")); // laptop
      { const sc = new THREE.Mesh(pic(O, 2.0, 0.945, -2.185, 0.44, 0.27, 1), U(darkWinTex("laptopScr", "#2457c5", "#3a3d46"), 1.2)); sc.layers.set(NOINK); G.add(sc); }
      for (const [x, c1, c2] of [[1.2, "#e05a3a", "#ffcb2b"], [2.1, "#2a9d8f", "#f4f1ea"]] as const) { b.add(BX(O, x - 0.3, 1.45, Z0, x + 0.3, 2.25, Z0 + 0.02), C(c1)); b.add(BX(O, x - 0.2, 1.6, Z0 + 0.01, x + 0.2, 2.1, Z0 + 0.03), C(c2)); } // posters
      plant(b, O[0] + 2.25, 0, O[2] + 0.4, 0.8, "#f4f1ea");
      b.add(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 12), C("#2b2b33"), M4(O[0] + X0 + 0.14, 0.77, O[2] + BZ - 0.16)); b.add(new THREE.ConeGeometry(0.13, 0.16, 16, 1, true), C("#f2c12e"), M4(O[0] + X0 + 0.14, 0.98, O[2] + BZ - 0.16));
      this.modernClock = alarmClock("#d7262e", clockFaceTex("modern", 7, 0, "#d7262e"), 0.9); this.modernClock.position.set(O[0] - 2.18, 1.155, O[2] + BZ + 0.15); G.add(this.modernClock);
    }
    // © skies mark 3 of 3 in this film: neon on the back wall above the sleeper's head, where the close-ups see it
    if (set === "modern") skiesMark(G, "neon", [O[0] - 1.6, 1.98, O[2] + Z0 + 0.02], 1, 0.62, "skies");
    // the pole tip outside the bedroom window (shot 15): a short stretch of pole from below-right outside up to the glass
    if (set === "bed") { const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 1, 10), C("#a87a46")); pm.name = "pole"; this.bedPole.add(pm);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), C("#5a5f6e")); kn.name = "knob"; this.bedPole.add(kn); this.bedPole.visible = false; G.add(this.bedPole); }
    { const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8).rotateX(Math.PI / 2), this.panelMat); lm.position.set(O[0], HT - 0.01, O[2] - 0.5); lm.layers.set(NOINK); lm.visible = set !== "bed"; G.add(lm); }
    b.build(G, false);
  }

  // ======================================================================================================
  /** the cotton mill's gate at dawn: a long brick facade with rows of lit windows, the stone gate arch with two iron gate
   *  leaves (they swing shut in shot 11), the clock tower (5:59), the mill's name, the LATE? NO PAY placard */
  private buildGate() {
    const O = ORG.gate, G = this.sets.gate, b = new Batch();
    const brick = T("gBrick", brickTex("gBrickT", "#b4533a", "#d9b8a0", 0.5)), stone = C("#e4dccb");
    b.add(flat(O, -200, -300, 200, 300, -0.002, 3), T("gCob", cobbleTex("gCobT", "#7a7068")));
    const HT = 13;
    b.add(BX(O, -24, 0, GTZ - 14, -GW, HT, GTZ, 1.2), brick); b.add(BX(O, GW, 0, GTZ - 14, 24, HT, GTZ, 1.2), brick);
    b.add(BX(O, -GW, 4.9, GTZ - 14, GW, HT, GTZ, 1.2), brick);
    gable(b, O, -24, 24, GTZ, GTZ - 14, HT, 3, T("gSlate", stoneTex("gSlateT", "#5a6070", 0.25)));
    // the gate arch: stone piers + arch, the dark yard beyond, a far lit wall
    for (const s2 of [-1, 1]) b.add(BX(O, s2 * GW - (s2 > 0 ? 0 : 0.35), 0, GTZ - 0.35, s2 * GW + (s2 > 0 ? 0.35 : 0), 4.9, GTZ + 0.12), stone);
    b.add(BX(O, -GW - 0.35, 4.4, GTZ - 0.35, GW + 0.35, 4.95, GTZ + 0.12), stone);
    b.add(flat(O, -GW, GTZ - 14, GW, GTZ, 0.001, 2), C("#5a4a44"));
    b.add(quad(V(O[0] - 8, 0, O[2] + GTZ - 12), V(O[0] + 8, 0, O[2] + GTZ - 12), V(O[0] + 8, 9, O[2] + GTZ - 12), V(O[0] - 8, 9, O[2] + GTZ - 12)), C("#a8503a"));
    { const yw = new THREE.Mesh(pic(O, 0, 2.2, GTZ - 11.9, 4.0, 1.6, 1), U(litWinTex("yardWin", "#ffd27a", "#ffd27a"), 1.2)); yw.layers.set(NOINK); G.add(yw); }
    b.add(BX(O, -GW, 4.4, GTZ - 14, -GW + 0.01, 4.4, GTZ), C("#2a201c"));
    // the two iron gate leaves (hinged at the piers): frame + bars, pivot groups animated
    for (const [grp, s2] of [[this.gateL, -1], [this.gateR, 1]] as const) {
      const gb = new Batch(), iron = C("#1d1f26");
      gb.add(boxGeo(V(0, 0.05, -0.04), V(GW, 0.15, 0.04)), iron); gb.add(boxGeo(V(0, 3.55, -0.04), V(GW, 3.65, 0.04)), iron); gb.add(boxGeo(V(0, 1.8, -0.03), V(GW, 1.88, 0.03)), iron);
      for (let k = 0; k <= 10; k++) gb.add(new THREE.CylinderGeometry(0.018, 0.018, 3.9, 6), iron, M4((k / 10) * GW, 1.95, 0));
      for (let k = 0; k <= 10; k++) gb.add(new THREE.ConeGeometry(0.045, 0.14, 6), C("#e8c45a"), M4((k / 10) * GW, 3.95, 0));
      gb.build(grp); grp.position.set(O[0] + s2 * GW, 0, O[2] + GTZ); grp.scale.x = -s2; G.add(grp);
    }
    // the clock tower over the gate: brick shaft, white clock face (5:59), pyramid roof, the mill's name board below it
    b.add(BX(O, -2.0, HT - 1, GTZ - 2.0, 2.0, HT + 6.5, GTZ + 0.2, 1.2), brick);
    b.add(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 32).rotateX(Math.PI / 2), stone, M4(O[0], HT + 3.4, O[2] + GTZ + 0.22));
    { const cf = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), U(clockFaceTex("mill", 5, 59, "#2b2b33"), 1.1)); cf.position.set(O[0], HT + 3.4, O[2] + GTZ + 0.3); cf.layers.set(NOINK); G.add(cf); }
    for (const [p, q, r] of [[[-2.3, GTZ + 0.5], [2.3, GTZ + 0.5], [0, GTZ - 0.9]], [[2.3, GTZ + 0.5], [2.3, GTZ - 2.3], [0, GTZ - 0.9]], [[2.3, GTZ - 2.3], [-2.3, GTZ - 2.3], [0, GTZ - 0.9]], [[-2.3, GTZ - 2.3], [-2.3, GTZ + 0.5], [0, GTZ - 0.9]]] as const)
      b.add(tri(V(O[0] + p[0], HT + 6.5, O[2] + p[1]), V(O[0] + q[0], HT + 6.5, O[2] + q[1]), V(O[0] + r[0], HT + 9.5, O[2] + r[1])), C("#4a5060"));
    sign(G, O, 0, 5.55, GTZ + 0.04, 7.2, 1.2, 1, millSignTex(), 1.0);
    sign(G, O, -3.4, 1.9, GTZ + 0.04, 1.3, 0.82, 1, lateSignTex(), 1.0);
    // windows: rows along the facade, lit warm (the looms are already running)
    for (let x = -22; x <= 22; x += 2.6) for (const y of [2.2, 5.6, 8.6, 11.4]) {
      if (Math.abs(x) < 3.2 && y < 6) continue; if (Math.abs(x) < 2.6 && y > 10) continue;
      const m = new THREE.Mesh(pic(O, x, y, GTZ + 0.01, 1.4, 1.9, 1), U(litWinTex("mw" + ((x + y) % 3), "#ffcf70", "#ffcf70"), 1.15)); m.layers.set(NOINK); G.add(m);
      b.add(BX(O, x - 0.8, y - 1.06, GTZ, x + 0.8, y - 0.95, GTZ + 0.14), stone); b.add(BX(O, x - 0.8, y + 0.95, GTZ, x + 0.8, y + 1.1, GTZ + 0.08), stone);
    }
    b.add(new THREE.CylinderGeometry(1.2, 1.7, 38, 14), C("#a8503a"), M4(O[0] + 14, 19, O[2] + GTZ - 18));
    b.add(new THREE.CylinderGeometry(1.35, 1.35, 1.2, 14), C("#3a2a24"), M4(O[0] + 14, 38.4, O[2] + GTZ - 18));
    for (let q = 0; q < 5; q++) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ctex("smokePuff", 128, 128, () => {}), transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.85, 0.85) }));
      sm.userData = { x: O[0] + 14, y: 39, z: O[2] + GTZ - 18, q }; sm.layers.set(NOINK); G.add(sm); this.smoke.push(sm); }
    skiesMark(G, "banner", [O[0] + 4.6, 3.6, O[2] + GTZ + 0.03], 1, 2.4, "SKIES MILL CO."); // © skies mark 2 of 3
    this.gasLamp(b, G, O, -GW - 1.4, 0, GTZ + 0.9, true, 0.8); this.gasLamp(b, G, O, GW + 1.4, 0, GTZ + 0.9, true, 0.8);
    // the street in front: a low wall and terraces across the road (behind the camera in reverse angles)
    b.add(BX(O, -40, 0, 12, 40, 6.2, 18, 1.2), T("gBrick2", brickTex("gBrick2T", "#9a4a34", "#cfae96", 0.5)));
    for (let x = -30; x <= 30; x += 2.1) for (const y of [1.6, 4.2]) { const m = new THREE.Mesh(pic(O, x, y, 11.99, 0.95, 1.2, -1), U(darkWinTex("gdw"), 0.95)); m.layers.set(NOINK); G.add(m); }
    b.build(G);
  }

  /** pose the gates, clocks, windows, smoke, the bedroom pole, labels for this frame */
  private animate(id: number, t: number) {
    // the mill gates: open (swung in) until 14.75, shut by 15.4
    const sh = id >= 11 ? ramp(t, 14.75, 15.4) : 0, ang = (1 - sh) * 1.45;
    this.gateL.rotation.y = -ang; this.gateR.rotation.y = ang;
    // the hero clock, the cheap clocks (ringing = shaking), the modern alarm clock
    const ring = (g: THREE.Group, on: boolean, ph = 0) => { g.rotation.z = on ? 0.06 * Math.sin(t * 2 * Math.PI * 11 + ph) : 0; g.position.y += 0; };
    this.heroClock.visible = id !== 30; (this.heroTag as THREE.Object3D).visible = id !== 30;
    this.heroTag.rotation.z = -0.12 + 0.05 * Math.sin(t * 2.1);
    this.cheap.forEach((c, i) => { c.visible = id === 30; ring(c, id === 30 && t > 40.3, i * 1.3); }); this.cheapSign.visible = id === 30;
    ring(this.modernClock, id === 34, 0);
    // switching windows
    for (const w of this.switchWins) w.m.material = w.shots.includes(id) && t >= w.t ? w.on : w.off;
    // the lamp in the hero bedroom comes on when the sleeper gets up (shot 17 / 33)
    for (const k of Object.keys(this.heroRoomLamp)) this.heroRoomLamp[k].visible = (id === 17 && t > 23.75) || (id === 33) || ((id === 23 && t > 31.45) || id === 24);
    // smoke: puffs rise, grow and fade on a 6 s cycle (looped, slow)
    for (const sm of this.smoke) { const u = (((t / 6) + sm.userData.q / 5) % 1), d = sm.userData;
      sm.position.set(d.x + 2.5 * u * 6, d.y + 10 * u, d.z); sm.scale.setScalar(3 + 9 * u); (sm.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - u) * Math.min(1, u * 6); }
    // the pole tip outside the bedroom window taps the glass (shot 15)
    this.bedPole.visible = id === 15;
    if (id === 15) { const O = ORG.bed, tip = V(O[0] + WIN_B[0] - 0.18, WIN_B[1] - 0.2, O[2] + WIN_B[2] - 0.03 - 0.07 * tapAt(t)), base = V(O[0] + WIN_B[0] + 0.5, -1.4, O[2] + WIN_B[2] - 1.8);
      const pm = this.bedPole.getObjectByName("pole")!, kn = this.bedPole.getObjectByName("knob")!;
      pm.position.copy(tip).add(base).multiplyScalar(0.5); pm.scale.set(1, tip.distanceTo(base), 1); pm.quaternion.setFromUnitVectors(V(0, 1, 0), tip.clone().sub(base).normalize()); kn.position.copy(tip); }
    const L = this.labels; for (const k of Object.keys(L)) L[k].visible = false;
    L.ku.visible = id === 8 && t > 10.36; L.q.visible = id === 26 && t > 35.7; L.mary.visible = id === 19 && t > 25.95; L.six.visible = id === 24 && t > 32.6; L["70s"].visible = id === 33 && t > 44.85;
    // label pop: scale overshoot as it appears
    const pop = (s2: THREE.Sprite, t0: number, w: number) => { const u = clamp01((t - t0) / 0.18), k = u < 1 ? 0.6 + 0.55 * Math.sin(u * Math.PI * 0.75) : 1; s2.scale.set(w * k, w * 0.3125 * k, 1); };
    pop(L.ku, 10.36, 0.82); pop(L.q, 35.7, 0.36); pop(L.mary, 25.95, 0.85); pop(L.six, 32.6, 0.6); pop(L["70s"], 44.85, 0.7);
  }

  // ======================================================================================================
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene, v = 0) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f, v);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.06; cam.far = 3200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look);
    cam.layers.enable(NOINK);
    for (const k of Object.keys(this.sets) as SetName[]) this.sets[k].visible = k === s.set;
    // © skies: the film carries 2-3 skies marks in total, in different sets; fewer or more renders a red warning
    const marks = [...new Set(SHOTS.map((q) => q.set))].reduce((n, k) => n + (SKIES_COUNT.get(this.sets[k]) ?? 0), 0);
    const bad = marks < 2 ? "few" : marks > 3 ? "many" : "";
    (window as unknown as Record<string, unknown>).__skiesMissing = bad ? bad + ":" + marks : "";
    this.skiesWarn.visible = bad === "few"; this.skiesWarnMany.visible = bad === "many";
    if (bad) { const fw = new THREE.Vector3(); cam.getWorldDirection(fw); for (const w of [this.skiesWarn, this.skiesWarnMany]) { w.position.copy(cam.position).addScaledVector(fw, 2); w.scale.set(1.2, 0.3, 1); } }
    const indoor = INDOOR[s.set];
    this.panelMat.color.setRGB(2.2, 2.15, 2.0);
    this.animate(id, t);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    // anti-flicker: the shadow camera is frozen per shot and snapped to its texel grid
    let sh = this.shadowCache.get(id);
    if (!sh) { const cm = camAt(id, Math.round((s.a + s.b) / 2)), fc = V(...cm.look), dd = V(...cm.pos).distanceTo(fc);
      let r0 = THREE.MathUtils.clamp(dd * 1.6 + 8, 12, 160); if (s.light === "golden") r0 = Math.max(r0, 30); sh = { c: fc, r: r0 }; this.shadowCache.set(id, sh); }
    const Rr = sh.r, texel = (2 * Rr) / SMAP, sc0 = sh.c.clone();
    { const zAx = sunDir.clone().normalize(), xAx = V(0, 1, 0).cross(zAx).normalize(), yAx = zAx.clone().cross(xAx);
      const px = Math.round(sc0.dot(xAx) / texel) * texel - sc0.dot(xAx), py = Math.round(sc0.dot(yAx) / texel) * texel - sc0.dot(yAx);
      sc0.addScaledVector(xAx, px).addScaledVector(yAx, py); }
    this.sun.position.copy(sc0).addScaledVector(sunDir, 300); this.sun.target.position.copy(sc0);
    const scm = this.sun.shadow.camera;
    scm.left = -Rr; scm.right = Rr; scm.top = Rr; scm.bottom = -Rr; scm.near = 20; scm.far = 700; scm.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, moon ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    this.sky.visible = !indoor;
    for (const cl of this.clouds) cl.visible = !indoor && s.light !== "night";
    untone(L.fog, this.fog.color);
    const farSet = !indoor;
    this.fog.near = s.fog?.[0] ?? (s.set === "london" ? 22 : farSet ? 90 : L.fogNear); this.fog.far = s.fog?.[1] ?? (s.set === "london" ? 140 : farSet ? 900 : L.fogFar);
    scene.fog = this.fog; scene.background = indoor ? new THREE.Color("#2a2a33") : null;
    const showSun = s.light === "golden" && !indoor;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 1500); this.sunDisc.scale.setScalar(2 * 1500 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 1500 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    this.moon.visible = s.light === "night" && !indoor;
    if (this.moon.visible) { const md = V(-0.32, 0.5, -1).normalize(); this.moon.position.copy(cam.position).addScaledVector(md, 1500); this.moon.scale.setScalar(2 * 1500 * Math.tan(THREE.MathUtils.degToRad(3.2))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const bp = m.userData.base as V3; m.position.set(bp[0] + cam.position.x, bp[1], bp[2] + cam.position.z);
      m.lookAt(cam.position.x, m.position.y, cam.position.z); mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- cast + effects + the poles ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.poles.forEach((pm, i) => { const ln: Line3 | undefined = st.lines[i]; pm.visible = !!ln; this.poleKnobs[i].visible = !!ln;
      if (!ln) return; const a = V(...ln.a), b2 = V(...ln.b);
      pm.position.copy(a).add(b2).multiplyScalar(0.5); pm.scale.set(1, a.distanceTo(b2), 1); pm.quaternion.setFromUnitVectors(V(0, 1, 0), b2.clone().sub(a).normalize()); this.poleKnobs[i].position.copy(b2); });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++), [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
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
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw); e2.use(!!p.soft);
      e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
void BY; void BX0; void BX1; void WZ; void CLOCK; void SGZ;
