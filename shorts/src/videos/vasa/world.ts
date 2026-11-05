// The Vasa short's world: Stockholm harbour on a summer afternoon, 1628. Sky dome + sun disc and halo + painted
// clouds, a harbour sea (depression-angle gradient + drifting marks), the stone quay with bollards and crates on the
// crowd side, the far shore with gabled houses, church spires and the castle tower, and the ship (ship.ts) heeled /
// moved per frame from story.ts. Cards and effects come from cast.ts stage().
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, house } from "./build";
import { ctex, rep, stoneHD, cobbleHD, roofHD, waterNear, waterFar, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, LFB } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { halfAt } from "./story";
import { buildShip, poseSail, poseFlags, posePorts, setClip, ShipParts } from "./ship";
import { FPS, SHOTS, camAt, ShotDef, clamp01, smooth, shipPose, shipToWorld, whereAt, lidOpenAt, BREEZE_HIT, GUSTS, BALLAST, QUAY_Z, QUAY_Y, SHORE_Z, PIER_X, PIER_Y, BOAT, CUT_X, DIAG_X, UNDER_X, SEABED, MUSEUM_X, RAISE_X, V3 } from "./story";

const halfW = (x: number) => halfAt(x, 0.5);
export const loadKit = () => Promise.resolve({} as Kit);

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade, wSunDir;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.12 * wTime, 0.25 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 7.0), texture2D(wFarTex, wp / 36.0 + 0.37), smoothstep(20.0, 80.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  // sun glitter: marks facing the sun path light up (golden backlight)
  vec3 rv = reflect(normalize(wV), vec3(0.0, 1.0, 0.0));
  float sunPath = pow(max(dot(rv, normalize(wSunDir)), 0.0), 40.0);
  wc = mix(wc, wGlint, clamp(mk.b * (0.3 + 0.5 * wf) + (mk.r + mk.b) * sunPath * 2.5, 0.0, 1.0));
  wc += wGlint * sunPath * 0.25;
  diffuseColor.rgb = wc;`;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#efb489", 50, 380);
  private sunCache = new Map<number, THREE.Vector3>();
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private clouds: THREE.Mesh[] = []; private cloudMaps: Record<string, THREE.Texture[]>;
  private WU: Record<string, { value: unknown }>;
  private ship: ShipParts;
  private harbourG = new THREE.Group(); private diagramG = new THREE.Group(); private underG = new THREE.Group(); private museumG = new THREE.Group(); private raiseG = new THREE.Group();
  private cables: THREE.Mesh[] = []; private ballastBase: THREE.Matrix4[] = []; private clipPlane = new THREE.Plane();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    // ---- sky + sun + clouds ----
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
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 560 + (i % 3) * 70;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.golden[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 35;
      m.position.set(Math.cos(a) * d, 70 + (i % 4) * 45, Math.sin(a) * d); m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }
    // ---- the sea ----
    const wN = waterNear(), wF = waterFar();
    for (const t of [wN, wF]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wN }, wFarTex: { value: wF }, wTime: { value: 0 },
      wSunDir: { value: new THREE.Vector3(0, 0.2, 1) },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "harbour1";
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), waterM);
    sea.receiveShadow = true; this.harbourG.add(sea);
    // ---- quay (crowd side) ----
    const b = new Batch();
    const quayStone = lam("quayStone", () => ({ map: rep(stoneHD("quayHD", ["#a99a86", "#9d8f7b", "#b3a590", "#94877a"], "#6e6356"), 0.5, 0.5) }));
    const cob = lam("quayCob", () => ({ map: rep(cobbleHD(), 150, 30) }));
    b.add(boxGeo(V(-300, -4, -160), V(140, QUAY_Y - 0.02, QUAY_Z), 3), quayStone);
    const top = new THREE.PlaneGeometry(440, 117).rotateX(-Math.PI / 2).translate(-80, QUAY_Y, (QUAY_Z - 160) / 2);
    b.add(top, cob);
    b.add(boxGeo(V(-300, QUAY_Y, QUAY_Z - 0.6), V(140, QUAY_Y + 0.3, QUAY_Z), 2), quayStone);    // kerb
    const wood = lam("crate", () => ({ color: "#8a5a34" })), iron = lam("bollard", () => ({ color: "#3a3640" }));
    for (let x = -200; x <= 136; x += 9) if (Math.abs(x - PIER_X) > 3) b.add(new THREE.CylinderGeometry(0.22, 0.28, 0.75, 10).translate(x, QUAY_Y + 0.37, QUAY_Z - 1.2), iron);
    for (const [x, z, s] of [[62, -58, 1], [63.2, -58.4, 0.8], [30, -60, 1], [74, -55, 0.9], [20, -52, 1]] as [number, number, number][]) b.add(boxGeo(V(x - 0.5 * s, QUAY_Y, z - 0.5 * s), V(x + 0.5 * s, QUAY_Y + s, z + 0.5 * s)), wood);
    for (const [x, z] of [[58, -57], [36, -57]]) b.add(new THREE.CylinderGeometry(0.4, 0.45, 1.0, 12).translate(x, QUAY_Y + 0.5, z), wood);
    // quayside houses behind the crowd (seen only when the lens turns round)
    for (let k = 0; k < 30; k++) house(b, -200 + k * 11, -96, 0, 10, 8, 8 + (k % 3) * 1.4, k, QUAY_Y);
    // the pier the ship lies alongside (planked deck on posts, from the quay out to her port side)
    const plank = lam("pierPlank", () => ({ map: rep(cobbleHD(), 1, 1) }));
    void plank;
    const pierWood = lam("pierWood", () => ({ color: "#8a6440" })), pierDark = lam("pierPost", () => ({ color: "#4a3424" }));
    b.add(boxGeo(V(PIER_X - 1.7, PIER_Y - 0.3, QUAY_Z - 0.5), V(PIER_X + 1.7, PIER_Y, -6.5)), pierWood);
    for (let z = QUAY_Z + 1; z <= -6.6; z += 3.2) for (const dx of [-1.6, 1.6]) b.add(new THREE.CylinderGeometry(0.18, 0.2, 6, 8).translate(PIER_X + dx, PIER_Y - 3.1, z), pierDark);
    for (let z = QUAY_Z + 0.5; z < -6.6; z += 0.55) b.add(boxGeo(V(PIER_X - 1.72, PIER_Y - 0.02, z), V(PIER_X + 1.72, PIER_Y + 0.02, z + 0.08)), pierDark);
    b.add(new THREE.CylinderGeometry(0.25, 0.3, 0.7, 10).translate(PIER_X + 1.3, PIER_Y + 0.35, -7.3), iron);
    // the observers' rowboat
    { const hullB = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(2.6, 0.7, 1.05).translate(BOAT[0], 0.35, BOAT[2]);
      b.add(hullB, lam("boatHull", () => ({ color: "#6e4a2e", side: THREE.DoubleSide })));
      b.add(boxGeo(V(BOAT[0] - 0.3, 0.2, BOAT[2] - 0.95), V(BOAT[0] + 0.3, 0.3, BOAT[2] + 0.95)), pierWood);
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 6).rotateX(1.2).translate(BOAT[0] - 0.4, 0.4, BOAT[2] - 1.4), pierWood); }
    // ---- far shore: Stockholm across the water ----
    const shoreM = lam("shore", () => ({ color: "#8f8a6a" }));
    b.add(boxGeo(V(-700, -2, SHORE_Z - 6), V(700, 2.2, SHORE_Z + 400), 0), shoreM);
    b.add(boxGeo(V(-700, -2, SHORE_Z - 8), V(700, 2.0, SHORE_Z - 5.5), 3), quayStone);
    for (let k = 0; k < 40; k++) {
      const x = -260 + k * 13 + ((k * 7) % 5), h = 9 + ((k * 5) % 4) * 2.2;
      house(b, x, SHORE_Z + 8 + (k % 2) * 3, Math.PI, 11, 9, h, k + 3, 2.2);
      if (k % 3 === 0) house(b, x + 5, SHORE_Z + 26, Math.PI, 12, 10, h + 4, k + 5, 2.2);
    }
    const spireM = lam("spire", () => ({ map: roofHD("#5d7f7a", true) })), towerM = lam("tower", () => ({ map: rep(stoneHD("towerHD", ["#d9c9ae", "#cfbfa4", "#e2d3ba", "#c7b79c"], "#9c8d76"), 0.3, 0.3) }));
    const tower = (x: number, z: number, w: number, h: number, sp: number) => {
      b.add(boxGeo(V(x - w / 2, 2, z - w / 2), V(x + w / 2, 2 + h, z + w / 2), 4), towerM);
      b.add(new THREE.ConeGeometry(w * 0.72, sp, 4).rotateY(Math.PI / 4).translate(x, 2 + h + sp / 2, z), spireM);
    };
    tower(-40, SHORE_Z + 40, 9, 34, 26);     // church
    tower(95, SHORE_Z + 46, 7, 26, 20);
    tower(170, SHORE_Z + 36, 8, 30, 22);
    // the castle (Tre Kronor): a long block with a tall central tower crowned in gold
    b.add(boxGeo(V(-150, 2, SHORE_Z + 18), V(-80, 24, SHORE_Z + 60), 4), towerM);
    b.add(new THREE.ConeGeometry(36, 12, 4).rotateY(Math.PI / 4).scale(1.4, 1, 0.8).translate(-115, 30, SHORE_Z + 39), spireM);
    tower(-115, SHORE_Z + 30, 12, 46, 30);
    b.build(this.harbourG);
    const crownM = new THREE.MeshPhongMaterial({ color: "#e0a63a", specular: "#fff0b8", shininess: 60 });
    for (const dz of [-3, 0, 3]) { const c = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 6, 12).rotateX(Math.PI / 2), crownM); c.position.set(-115, 2 + 46 + 30 + 1.5 + (dz + 3) * 1.4, SHORE_Z + 30); this.harbourG.add(c); }
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material === shoreM)) m.castShadow = false; });
    // ---- the ship ----
    this.ship = buildShip();
    R.add(this.ship.group);
    for (let i = 0; i < 420; i++) { const m = new THREE.Matrix4(); this.ship.ballast.getMatrixAt(i, m); this.ballastBase.push(m); }
    for (const c of this.clouds) this.harbourG.add(c);
    R.add(this.harbourG, this.diagramG, this.underG, this.museumG, this.raiseG);
    this.buildDiagram(); this.buildUnder(); this.buildMuseum(); this.buildRaise();
  }

  // ---- the cutaway: a blueprint backdrop (sky / sea with a water line), a see-through sea slab in front of the cut ----
  private buildDiagram() {
    const G = this.diagramG;
    const bp = ctex("blueprint", 1024, 1024, (g) => {
      const wl = Math.round((1 - 50 / 120) * 1024);
      g.fillStyle = "#3b7bc4"; g.fillRect(0, 0, 1024, wl); g.fillStyle = "#123f7e"; g.fillRect(0, wl, 1024, 1024 - wl);
      g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 2;
      for (let k = 0; k <= 1024; k += 34) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 1024); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(1024, k); g.stroke(); }
      g.strokeStyle = "#e9f6ff"; g.lineWidth = 7; g.beginPath();
      for (let x = 0; x <= 1024; x += 8) { const y = wl + 5 * Math.sin(x / 22); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(140, 120).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ map: bp, fog: false }));
    back.position.set(DIAG_X - 60, 10, 0); back.layers.set(NOINK); G.add(back);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(80, 40).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color("#2a78d0"), transparent: true, opacity: 0.38, depthWrite: false, fog: false }));
    slab.position.set(DIAG_X + CUT_X + 0.6, -20, 0); slab.layers.set(NOINK); slab.renderOrder = 3; G.add(slab);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.6), fog: false }));
    line.position.set(DIAG_X + CUT_X + 0.65, 0, 0); line.layers.set(NOINK); G.add(line);
    G.visible = false;
  }
  // ---- the sea bed: silt, rocks, weed, a bright rippled surface overhead ----
  private buildUnder() {
    const G = this.underG, b = new Batch();
    const mud = lam("seabed", () => ({ map: rep(ctex("mud", 512, 512, (g, r) => {
      g.fillStyle = "#5b6a58"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) { const v = 0.8 + 0.4 * r(); g.fillStyle = `rgba(${(70 * v) | 0},${(84 * v) | 0},${(66 * v) | 0},0.5)`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + 14 * r(), 2 + 6 * r(), r() * 3, 0, 7); g.fill(); }
    }), 30, 30) }));
    b.add(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2).translate(UNDER_X, SEABED, 0), mud);
    const rock = lam("rock", () => ({ color: "#6e7468" })), weed = lam("weed", () => ({ color: "#4f7f3a" }));
    const r = (k: number) => { const v = Math.sin(k * 91.7) * 43758.5; return v - Math.floor(v); };
    for (let k = 0; k < 60; k++) {
      const x = UNDER_X - 70 + 140 * r(k), z = -60 + 120 * r(k + 0.5); if (Math.abs(z) < 9 && Math.abs(x - UNDER_X) < 32) continue;
      b.add(new THREE.DodecahedronGeometry(0.6 + 2 * r(k + 0.2), 0).scale(1, 0.6, 1).translate(x, SEABED + 0.2, z), rock);
      if (k % 2) for (let j = 0; j < 4; j++) b.add(new THREE.ConeGeometry(0.15, 1.4 + 1.6 * r(k + j), 5).translate(x + 1.2 * (r(k + j * 3) - 0.5) * 3, SEABED + 0.9, z + 1.6 + j * 0.3), weed);
    }
    // a mud mound along the keel line
    b.add(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(30, 2.2, 6.5).translate(UNDER_X, SEABED - 0.3, 0), mud);
    b.build(G);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: rep(ctex("surfRipple", 512, 512, (g, rr) => {
      g.fillStyle = "#6cc6d0"; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(230,255,255,${0.2 + 0.4 * rr()})`; g.lineWidth = 3 + 4 * rr(); g.beginPath(); const x = rr() * 512, y = rr() * 512; g.arc(x, y, 12 + 30 * rr(), 0, 3); g.stroke(); }
    }), 40, 40), color: new THREE.Color(1.3, 1.4, 1.4), fog: false }));
    surf.position.set(UNDER_X, 0, 0); surf.layers.set(NOINK); G.add(surf);
    G.visible = false;
  }
  // ---- 1961: two salvage pontoons (posed with the hull) and lifting cables ----
  private buildRaise() {
    const pm = lam("pontoon", () => ({ color: "#6f7a6a" })), dm = lam("pontoonDeck", () => ({ color: "#4a524a" }));
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(36, 2.4, 4.2), pm); p.position.set(RAISE_X, 0.4, side * 9.6); p.castShadow = true; p.receiveShadow = true; this.raiseG.add(p);
      const h = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 2.4), dm); h.position.set(RAISE_X - 8 + (side > 0 ? 4 : 0), 2.8, side * 9.6); h.castShadow = true; this.raiseG.add(h);
    }
    const cm = lam("cable", () => ({ color: "#2a2826" }));
    for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), cm); c.frustumCulled = false; this.cables.push(c); this.root.add(c); }
    this.raiseG.visible = false;
  }
  // ---- the museum: a tall dark hall, galleries with rails, the ship on a steel cradle ----
  private buildMuseum() {
    const G = this.museumG, b = new Batch(), X = MUSEUM_X, FL = -6;
    const wall = lam("musWall", () => ({ map: rep(ctex("musPanel", 512, 512, (g) => {
      g.fillStyle = "#2b2a33"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#24232b"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 6, 512);
    }), 1, 1), side: THREE.DoubleSide }));
    const floor = lam("musFloor", () => ({ color: "#3a2f2a" })), steel = lam("musSteel", () => ({ color: "#45464e" })), rail = lam("musRail", () => ({ color: "#1e1e24" }));
    const x0 = X - 45, x1 = X + 50, z0 = -48, z1 = 26, h = 34;
    b.add(boxGeo(V(x0, FL - 1, z0), V(x1, FL, z1)), floor);
    const q = (a: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, e: THREE.Vector3) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([a, c, d, a, d, e].flatMap((v) => [v.x, v.y, v.z]), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, (c.distanceTo(a)) / 6, 0, (c.distanceTo(a)) / 6, h / 6, 0, 0, (c.distanceTo(a)) / 6, h / 6, 0, h / 6], 2)); g.computeVertexNormals(); return g; };
    b.add(q(V(x0, FL, z1), V(x1, FL, z1), V(x1, FL + h, z1), V(x0, FL + h, z1)), wall);
    b.add(q(V(x1, FL, z0), V(x0, FL, z0), V(x0, FL + h, z0), V(x1, FL + h, z0)), wall);
    b.add(q(V(x0, FL, z0), V(x0, FL, z1), V(x0, FL + h, z1), V(x0, FL + h, z0)), wall);
    b.add(q(V(x1, FL, z1), V(x1, FL, z0), V(x1, FL + h, z0), V(x1, FL + h, z1)), wall);
    b.add(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(Math.PI / 2).translate((x0 + x1) / 2, FL + h, (z0 + z1) / 2), lam("musCeil", () => ({ color: "#1a1920" })));
    for (const cx of [-14, -2, 10, 20]) b.add(boxGeo(V(X + cx - 0.6, FL, -1.6), V(X + cx + 0.6, -4.9, 1.6)), steel);     // cradle under the keel
    // galleries: a long one on the near side (z -17 .. -21) and a bow platform beside the lion
    const gal = (xa: number, xb: number, za: number, zb: number, y: number) => {
      b.add(boxGeo(V(xa, y - 0.4, za), V(xb, y, zb)), floor);
      b.add(boxGeo(V(xa, y + 1.0, zb - 0.08), V(xb, y + 1.08, zb)), rail);
      for (let x = xa; x <= xb; x += 1.6) b.add(boxGeo(V(x, y, zb - 0.06), V(x + 0.05, y + 1.0, zb)), rail);
      for (let x = xa + 2; x < xb; x += 9) b.add(boxGeo(V(x - 0.25, FL, za + 0.5), V(x + 0.25, y - 0.4, za + 1)), steel);
    };
    gal(X - 30, X + 44, -21, -16.6, 2.0);
    gal(X + 29.5, X + 40, -8.4, -3.2, 5.0);
    b.build(G);
    G.visible = false;
  }
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < Math.min(s.b, s.a + 60); f += 3) {
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
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(...(c.up ?? [0, 1, 0])); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.place === "harbour") Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value as THREE.Color));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    (su.e.value as THREE.Vector4).set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    void (0 as unknown as V3);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light === "golden" ? "golden" : "day"][i % 4];
    }
    // ---- water ----
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value as THREE.Color); untone(wc.mid, W.wMidC.value as THREE.Color); untone(wc.far, W.wFarC.value as THREE.Color);
    untone(wc.crest, W.wCrest.value as THREE.Color); untone(wc.trough, W.wTrough.value as THREE.Color); untone(wc.glint, W.wGlint.value as THREE.Color);
    (W.wShade.value as THREE.Vector3).set(...wc.shade); W.wTime.value = t; (W.wSunDir.value as THREE.Vector3).copy(sunDir);
    // ---- the ship ----
    const P = shipPose(f), g = this.ship.group, where = whereAt(f), pl = s.place;
    g.position.set(P.x, P.y, 0); g.rotation.set(0, 0, 0); g.rotateZ(P.pitch); g.rotateX(-P.heel);
    g.updateMatrixWorld(true);
    const sailing = where === "hook" || where === "leave" || where === "sink";
    const gust = smooth((f - (BREEZE_HIT - 6)) / 8) * (1 - smooth((f - BREEZE_HIT - 20) / 14))
      + GUSTS.reduce((acc, g0, k) => acc + (0.8 + 0.6 * k) * smooth((f - g0 + 4) / 8) * (1 - smooth((f - g0 - 22 - 30 * k) / 14)), 0);
    for (const m of this.ship.sailMeshes) m.visible = sailing;
    for (const fl of this.ship.flags) fl.mesh.visible = where !== "under" && where !== "surface" && where !== "museum";
    if (sailing) for (const sl of this.ship.sails) poseSail(sl, 0.75 + 0.1 * Math.sin(t * 1.7 + sl.x), gust);
    poseFlags(this.ship.flags, t, gust);
    // gun ports: shut before shot 3, a ripple of opening down the port side (the side we see) during it, open after
    posePorts(this.ship, (d, side, k) => f < 46 ? 0 : side < 0 ? clamp01((f - lidOpenAt(d, k)) / 7) : clamp01((f - 60 - k * 2) / 7));
    // mud on the hull after 333 years
    const muddy = where === "under" || where === "surface";
    this.ship.hullMat.color.setRGB(muddy ? 0.55 : 1, muddy ? 0.52 : 1, muddy ? 0.45 : 1);
    // ---- places: which sets show, sky / fog / light overrides ----
    this.harbourG.visible = pl === "ship" || pl === "harbour";
    this.diagramG.visible = pl === "diagram"; this.underG.visible = pl === "under"; this.museumG.visible = pl === "museum";
    this.raiseG.visible = where === "surface";
    this.sky.visible = this.harbourG.visible;
    if (pl === "diagram") {
      this.sunDisc.visible = this.sunHalo.visible = false; scene.fog = null; scene.background = untone("#163e7a");
      TONE.uShadeCol.value.set(0.42, 0.44, 0.62); TONE.uShadeLift.value.set(0.05, 0.06, 0.1);
      // cutaway: clip the bow half away at a plane that heels with the hull
      this.clipPlane.set(V(-1, 0, 0), CUT_X).applyMatrix4(g.matrixWorld);
      setClip(this.ship, this.clipPlane);
      // ballast: stones pour in (each drops from above the hold in 6 frames)
      const n = Math.round(120 + 300 * clamp01((f - BALLAST[0]) / (BALLAST[1] - BALLAST[0])));
      const bm = this.ship.ballast, tmpM = new THREE.Matrix4(), drop = new THREE.Matrix4();
      for (let i = 120; i < n; i++) {
        const born = BALLAST[0] + ((i - 120) / 300) * (BALLAST[1] - BALLAST[0]), u = clamp01((f - born) / 6);
        drop.makeTranslation(0, 6 * (1 - u) ** 2, 0); bm.setMatrixAt(i, tmpM.multiplyMatrices(drop, this.ballastBase[i]));
      }
      bm.count = n; bm.instanceMatrix.needsUpdate = true;
    } else {
      setClip(this.ship, null);
      this.ship.ballast.count = 120;
    }
    if (pl === "under") {
      this.sunDisc.visible = this.sunHalo.visible = false;
      const fc = new THREE.Color("#0e4d5c"); untone(fc, this.fog.color); this.fog.near = 3; this.fog.far = 62; scene.fog = this.fog; scene.background = this.fog.color.clone();
      TONE.uLitCol.value.set(0.55, 1.0, 1.05); TONE.uShadeCol.value.set(0.07, 0.17, 0.22); TONE.uShadeLift.value.set(0.02, 0.05, 0.07);
    }
    if (pl === "museum") {
      this.sunDisc.visible = this.sunHalo.visible = false;
      untone("#2a2230", this.fog.color); this.fog.near = 45; this.fog.far = 190; scene.fog = this.fog; scene.background = this.fog.color.clone();
      TONE.uLitCol.value.set(1.75, 1.38, 1.0); TONE.uShadeCol.value.set(0.34, 0.29, 0.4); TONE.uShadeLift.value.set(0.06, 0.05, 0.08);
    }
    // lifting cables: from the hull's sides up to the surface (under) or to the pontoons (surface)
    for (let i = 0; i < this.cables.length; i++) {
      const c = this.cables[i], on = where === "under" && f >= 970 || where === "surface";
      c.visible = on && pl !== "diagram";
      if (!c.visible) continue;
      const side = i % 2 ? 1 : -1, x = -12 + (Math.floor(i / 2) * 6), lo = V(...shipToWorld([x, 0.5, side * (halfW(x) - 0.2)], f));
      const hi = where === "surface" ? V(RAISE_X + x, 1.6, side * 8.2) : V(lo.x + side * 0.0, -0.5, side * 10);
      const mid = lo.clone().add(hi).multiplyScalar(0.5), d = hi.clone().sub(lo);
      c.position.copy(mid); c.scale.set(1, d.length(), 1); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h2, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h2, k, p.draw);
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
