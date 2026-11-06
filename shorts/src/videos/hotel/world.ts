// The hotel short's world: a hotel room at night, lit by two bedside lamps (warm key) with the city glowing through the
// window (cool). Patterned wallpaper, carpet, a padded headboard, a king bed with a plump duvet and pillows (the hotel
// mint on one), nightstands with shaded lamps and an analogue clock (3:07), a desk + TV, a suitcase, curtains, a framed
// picture, the door. Cards and effects come from cast.ts stage().
import * as THREE from "three";
import { Batch, boxGeo, V, lam, Kit, quad } from "./build";
import { ctex, rep, rng } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, ShotDef, RX0, RX1, RZ0, RZ1, RH, BED, DUVET, PILLOWS, STANDS, MINT, WINDOW } from "./story";

export const loadKit = () => Promise.resolve({} as Kit);

// ---------------- painted textures ----------------
const wallTex = () => ctex("hotelWall", 512, 512, (g, r) => {
  g.fillStyle = "#3d5a6e"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < 512; x += 64) {          // damask diamonds
    g.fillStyle = "rgba(220,200,150,0.16)"; g.beginPath(); g.moveTo(x + 32, y + 6); g.lineTo(x + 52, y + 32); g.lineTo(x + 32, y + 58); g.lineTo(x + 12, y + 32); g.closePath(); g.fill();
    g.fillStyle = "rgba(220,200,150,0.22)"; g.beginPath(); g.arc(x + 32, y + 32, 5, 0, 7); g.fill();
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.03 * r()})`; g.fillRect(r() * 512, r() * 512, 20, 2); }
});
const carpetTex = () => ctex("hotelCarpet", 512, 512, (g, r) => {
  g.fillStyle = "#6a2a34"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { const v = 0.8 + 0.4 * r(); g.fillStyle = `rgba(${(120 * v) | 0},${(44 * v) | 0},${(58 * v) | 0},0.5)`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.strokeStyle = "rgba(230,190,110,0.35)"; g.lineWidth = 6;
  for (let k = 0; k < 512; k += 128) { g.beginPath(); g.arc(k + 64, k + 64, 40, 0, 7); g.stroke(); g.beginPath(); g.arc(k + 64, 448 - k, 26, 0, 7); g.stroke(); }
});
const duvetTex = () => ctex("duvet", 512, 512, (g, r) => {
  g.fillStyle = "#f3efe6"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { g.fillStyle = "rgba(170,160,150,0.35)"; g.fillRect(0, y, 512, 3); }  // quilting
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(180,170,160,${0.05 * r()})`; g.fillRect(r() * 512, r() * 512, 30, 2); }
  g.fillStyle = "#c9a24a"; g.fillRect(0, 470, 512, 14);                                                     // gold runner stripe
});
const headTex = () => ctex("headboard", 512, 256, (g) => {
  g.fillStyle = "#7a5a46"; g.fillRect(0, 0, 512, 256);
  for (let y = 32; y < 256; y += 64) for (let x = 32; x < 512; x += 64) { g.fillStyle = "rgba(40,20,10,0.5)"; g.beginPath(); g.arc(x + ((y / 64) % 2 ? 32 : 0), y, 6, 0, 7); g.fill(); } // tufted
});
const cityTex = () => ctex("cityNight", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#0b1230"); gr.addColorStop(0.6, "#2a2a5a"); gr.addColorStop(1, "#5a3a5a");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * r()})`; g.fillRect(r() * 1024, r() * 380, 2, 2); }      // stars
  g.fillStyle = "#f4ecd0"; g.beginPath(); g.arc(780, 190, 52, 0, 7); g.fill();                                                     // moon
  let x = 0;
  while (x < 1024) {                                                                                                               // skyline
    const w = 60 + r() * 110, h = 260 + r() * 420, y = 1024 - h;
    g.fillStyle = r() < 0.5 ? "#141634" : "#1b1d40"; g.fillRect(x, y, w, h);
    for (let wy = y + 16; wy < 1010; wy += 26) for (let wx = x + 10; wx < x + w - 12; wx += 20) if (r() < 0.36) { g.fillStyle = r() < 0.75 ? "#ffd27a" : "#9fd8ff"; g.fillRect(wx, wy, 9, 13); }
    x += w + 4;
  }
  g.fillStyle = "#ff4fa0"; g.fillRect(140, 640, 120, 18); g.fillStyle = "#4fe0ff"; g.fillRect(600, 560, 18, 140);                 // neon strips
});
const clockTex = () => ctex("clockFace", 256, 256, (g) => {
  g.fillStyle = "#fff7e0"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.strokeStyle = "#2a2230"; g.lineWidth = 10; g.stroke();
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.lineWidth = k % 3 ? 4 : 9; g.beginPath(); g.moveTo(128 + 86 * Math.sin(a), 128 - 86 * Math.cos(a)); g.lineTo(128 + 104 * Math.sin(a), 128 - 104 * Math.cos(a)); g.stroke(); }
  const hand = (a: number, len: number, w: number) => { g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + len * Math.sin(a), 128 - len * Math.cos(a)); g.stroke(); };
  hand(((3 + 7 / 60) / 12) * Math.PI * 2, 56, 12); hand((7 / 60) * Math.PI * 2, 88, 7);                                        // 3:07
  g.fillStyle = "#c0353a"; g.beginPath(); g.arc(128, 128, 9, 0, 7); g.fill();
});
const pictureTex = () => ctex("hotelPicture", 512, 384, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#f2b27a"); gr.addColorStop(1, "#7aa6c8"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#3f6a4a"; g.beginPath(); g.moveTo(0, 300); g.quadraticCurveTo(160, 200, 300, 290); g.quadraticCurveTo(420, 240, 512, 280); g.lineTo(512, 384); g.lineTo(0, 384); g.fill();
  g.fillStyle = "#fff0c0"; g.beginPath(); g.arc(380, 120, 40, 0, 7); g.fill();
});
const mintTex = () => ctex("mint", 256, 128, (g) => {
  g.fillStyle = "#2e8a5a"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#e2b24a"; g.fillRect(0, 50, 256, 28);
  g.fillStyle = "#f6f2e6"; g.beginPath(); g.arc(128, 64, 20, 0, 7); g.fill();
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private fog = new THREE.Fog("#24131c", 4, 26);
  private sunCache = new Map<number, THREE.Vector3>();
  private shades: THREE.MeshBasicMaterial[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, b = new Batch(), r = rng(9);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.3);
    this.sun = new THREE.DirectionalLight("#ffb36b", 2.4);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // ---- room shell (walls / floor / ceiling never cast shadows) ----
    const wall = lam("hotelWall", () => ({ map: rep(wallTex(), 1, 1) })), carpet = lam("hotelCarpet", () => ({ map: rep(carpetTex(), 1, 1) })), ceil = lam("hotelCeil", () => ({ color: "#e8e0d4" }));
    const W = (a: THREE.Vector3, c: THREE.Vector3) => b.add(quad(a, c, V(c.x, RH, c.z), V(a.x, RH, a.z), a.distanceTo(c) / 1.6, RH / 1.6), wall);
    W(V(RX0, 0, RZ0), V(RX1, 0, RZ0)); W(V(RX1, 0, RZ1), V(RX0, 0, RZ1)); W(V(RX0, 0, RZ1), V(RX0, 0, RZ0)); W(V(RX1, 0, RZ0), V(RX1, 0, RZ1));
    const fl = new THREE.PlaneGeometry(RX1 - RX0, RZ1 - RZ0).rotateX(-Math.PI / 2); fl.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= 3; }); b.add(fl, carpet);
    b.add(new THREE.PlaneGeometry(RX1 - RX0, RZ1 - RZ0).rotateX(Math.PI / 2).translate(0, RH, 0), ceil);
    const wood = lam("hotelWood", () => ({ color: "#5a3a26" })), trim = lam("hotelTrim", () => ({ color: "#efe6d4" }));
    for (const [a, c] of [[V(RX0, 0, RZ0 + 0.02), V(RX1, 0.12, RZ0 + 0.04)], [V(RX0, 0, RZ1 - 0.04), V(RX1, 0.12, RZ1 - 0.02)]] as [THREE.Vector3, THREE.Vector3][]) b.add(boxGeo(a, c), trim); // skirting
    // ---- the bed ----
    const sheet = lam("sheet", () => ({ color: "#f6f3ec" })), duvet = lam("duvet", () => ({ map: duvetTex() })), head = lam("headboard", () => ({ map: headTex() }));
    b.add(boxGeo(V(BED.x0 - 0.05, 0, BED.z0), V(BED.x1 + 0.05, 0.36, BED.z1)), wood);                                        // base
    b.add(boxGeo(V(BED.x0, 0.36, BED.z0 + 0.05), V(BED.x1, BED.top, BED.z1)), sheet);                                        // mattress
    b.add(boxGeo(V(BED.x0 - 0.25, 0, RZ0), V(BED.x1 + 0.25, 1.45, RZ0 + 0.12)), head);                                        // headboard
    // the duvet: a soft slab with rounded edges that drapes over the sides
    const dv = new THREE.BoxGeometry(BED.x1 - BED.x0 + 0.16, DUVET.top - BED.top + 0.1, DUVET.z1 - DUVET.z0, 24, 4, 24);
    { const p = dv.attributes.position, hx = (BED.x1 - BED.x0 + 0.16) / 2, hy = (DUVET.top - BED.top + 0.1) / 2;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ex = Math.abs(x) / hx;
        const puff = 0.04 * Math.sin(z * 9) * Math.sin(x * 7) + 0.05 * (1 - ex * ex);
        p.setY(i, y + (y > 0 ? puff : -0.12 * ex ** 6)); p.setX(i, x * (y < 0 ? 1.03 : 1)); } dv.computeVertexNormals(); }
    b.add(dv.translate(0, BED.top + hy0(), (DUVET.z0 + DUVET.z1) / 2), duvet);
    function hy0() { return (DUVET.top - BED.top + 0.1) / 2 - 0.08; }
    b.add(boxGeo(V(BED.x0 - 0.06, 0.4, DUVET.z0 + 0.6), V(BED.x1 + 0.06, BED.top + 0.03, DUVET.z0 + 1.05)), lam("runner", () => ({ color: "#b8913e" }))); // bed runner
    for (const p of PILLOWS) b.add(new THREE.SphereGeometry(0.42, 24, 14).scale(1, 0.32, 0.55).translate(p[0], p[1], p[2]), sheet);
    // ---- nightstands, lamps, clock ----
    for (const [sx, sy, sz] of STANDS) {
      b.add(boxGeo(V(sx - 0.28, 0, sz - 0.24), V(sx + 0.28, sy, sz + 0.24)), wood);
      b.add(boxGeo(V(sx - 0.24, sy * 0.45, sz + 0.24), V(sx + 0.24, sy * 0.5, sz + 0.25)), lam("knob", () => ({ color: "#c9a24a" })));
      const lx = sx + (sx > 0 ? 0.08 : -0.08), lz = sz - 0.05;
      b.add(new THREE.CylinderGeometry(0.05, 0.09, 0.32, 14).translate(lx, sy + 0.16, lz), lam("lampBase", () => ({ color: "#c9a24a" })));
      const sm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 1.1), side: THREE.DoubleSide });
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.24, 20, 1, true).translate(lx, sy + 0.42, lz), sm); shade.layers.set(NOINK); R.add(shade); this.shades.push(sm);
    }
    const [cx, cy, cz] = STANDS[0];
    b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24).rotateX(Math.PI / 2).translate(cx - 0.12, cy + 0.12, cz + 0.12), lam("clockCase", () => ({ color: "#3a3440" })));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.095, 32), new THREE.MeshBasicMaterial({ map: clockTex(), color: new THREE.Color(1.35, 1.3, 1.15) }));
    face.position.set(cx - 0.12, cy + 0.12, cz + 0.155); R.add(face);
    // the mint on the pillow
    b.add(new THREE.BoxGeometry(0.11, 0.025, 0.07).rotateY(0.3).translate(...MINT), lam("mint", () => ({ map: mintTex() })));
    // ---- window with the city, curtains ----
    const city = new THREE.Mesh(new THREE.PlaneGeometry(WINDOW.w, WINDOW.h).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: cityTex(), color: new THREE.Color(1.15, 1.15, 1.3) }));
    city.position.set(WINDOW.x - 0.005, WINDOW.y, WINDOW.z); city.layers.set(NOINK); R.add(city);
    const frame = lam("winFrame", () => ({ color: "#efe6d4" }));
    for (const [y0, y1, z0, z1] of [[WINDOW.y - WINDOW.h / 2 - 0.06, WINDOW.y - WINDOW.h / 2, -WINDOW.w / 2 - 0.06, WINDOW.w / 2 + 0.06], [WINDOW.y + WINDOW.h / 2, WINDOW.y + WINDOW.h / 2 + 0.06, -WINDOW.w / 2 - 0.06, WINDOW.w / 2 + 0.06],
      [WINDOW.y - WINDOW.h / 2, WINDOW.y + WINDOW.h / 2, -WINDOW.w / 2 - 0.06, -WINDOW.w / 2], [WINDOW.y - WINDOW.h / 2, WINDOW.y + WINDOW.h / 2, WINDOW.w / 2, WINDOW.w / 2 + 0.06], [WINDOW.y - WINDOW.h / 2, WINDOW.y + WINDOW.h / 2, -0.03, 0.03]])
      b.add(boxGeo(V(WINDOW.x - 0.08, y0, WINDOW.z + z0), V(WINDOW.x, y1, WINDOW.z + z1)), frame);
    const curtain = lam("curtain", () => ({ color: "#8a6a3a", side: THREE.DoubleSide }));
    for (const s of [-1, 1]) {
      const cg = new THREE.PlaneGeometry(0.55, 2.5, 12, 1).rotateY(-Math.PI / 2);
      const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, 0.06 * Math.sin(p.getZ(i) * 30));
      cg.computeVertexNormals(); b.add(cg.translate(WINDOW.x - 0.16, 1.4, WINDOW.z + s * (WINDOW.w / 2 + 0.3)), curtain);
    }
    // ---- desk + TV, suitcase, picture, door ----
    b.add(boxGeo(V(RX1 - 0.6, 0.72, 1.0), V(RX1 - 0.05, 0.77, 2.4)), wood);
    for (const z of [1.05, 2.35]) b.add(boxGeo(V(RX1 - 0.58, 0, z - 0.04), V(RX1 - 0.52, 0.72, z + 0.04)), wood);
    b.add(boxGeo(V(RX1 - 0.12, 1.15, 1.25), V(RX1 - 0.06, 1.75, 2.2)), lam("tv", () => ({ color: "#18181e" })));
    b.add(boxGeo(V(RX0 + 0.6, 0, 0.3), V(RX0 + 1.3, 0.65, 0.55)), lam("suitcase", () => ({ color: "#c0533a" })));
    b.add(boxGeo(V(RX0 + 0.85, 0.65, 0.4), V(RX0 + 1.05, 0.72, 0.45)), lam("handle", () => ({ color: "#2a2230" })));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.66), lam("picture", () => ({ map: pictureTex() }))); pic.position.set(-0.05, 1.95, RZ0 + 0.02); R.add(pic);
    b.add(boxGeo(V(-0.55, 1.58, RZ0 + 0.005), V(0.45, 2.32, RZ0 + 0.015)), lam("picFrame", () => ({ color: "#c9a24a" })));
    b.add(boxGeo(V(-0.5, 0, RZ1 - 0.03), V(0.45, 2.1, RZ1 - 0.01)), lam("door", () => ({ color: "#6a4630" })));
    void r;
    b.build(R);
    R.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material === wall || m.material === ceil || m.material === carpet)) m.castShadow = false; });
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
    cam.fov = c.fov; cam.near = 0.02; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- lamp light (warm key from the shot's lamp direction), a soft lift so the room stays readable ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.3 + 1.5, 3, 9);
    this.sun.position.copy(focus).addScaledVector(sunDir, 30); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 5; sc.far = 60; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 4);
    TONE.uLitCol.value.set(1.7, 1.12, 0.66); TONE.uShadeCol.value.set(0.24, 0.22, 0.42); TONE.uShadeLift.value.set(0.05, 0.05, 0.12);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(1.0, 0.86, 0.72); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    untone("#1c1424", this.fog.color); this.fog.near = 6; this.fog.far = 40;
    scene.fog = this.fog; scene.background = untone("#140b12");
    const fl = 0.97 + 0.03 * Math.sin(t * 3.1);
    for (const m of this.shades) m.color.setRGB(2.6 * fl, 1.9 * fl, 1.1 * fl);
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
      a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = true;
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
    void twoTone; void RZ1;
    return focus;
  }
}
