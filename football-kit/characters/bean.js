// Procedural 3D "bean" football characters (three.js), built to the locked CHARACTER STYLE in SKILL.md:
// oversized sphere head with a face painted on it, bean torso in a numbered shirt, rounded shorts,
// stick arms/legs, round black shoe blobs, soft matte plastic shading, no outlines.
//
//   const p = makeBean({ shirt: '#d81f26', number: 7, skin: SKINS.beige, hair: 'cap', face: 'smug' });
//   scene.add(p.root);   p.setFace('shocked');   p.pose({ armL: -2.6, armR: 2.6 });   // arms up
//   makeCrowd({ rows: 8, perRow: 40, colors: ['#d81f26', '#ffffff'] })  -> InstancedMesh peg crowd
//
// Units: the character is ~3.0 tall, soles at y = 0. Proportions head 1 : torso 0.9 : legs 1.1.
import * as THREE from 'three';

export const SKINS = { beige: '#e8c39b', tan: '#c99a6b', brown: '#8a5a3c', dark: '#5e3b26' };
export const FACES = ['neutral', 'happy', 'smug', 'angry', 'shocked', 'sad', 'crying', 'determined'];

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: 0, ...extra });

// ---- face texture: equirect canvas wrapped on the head sphere (front of sphere = u 0.25)
function drawFace(c, skin, face, hair) {
  const W = c.canvas.width, H = c.canvas.height, cx = W * .25, cy = H * .5;
  c.fillStyle = skin; c.fillRect(0, 0, W, H);
  if (hair === 'old') { // white side tufts
    c.fillStyle = '#f2f2f2';
    for (const dx of [-1, 1]) { c.beginPath(); c.ellipse(cx + dx * 150, cy - 30, 26, 38, 0, 0, 7); c.fill(); }
  }
  const eyeY = cy - 22, ex = 58, ink = '#151515';
  const eye = (x, lid = 0, pup = [0, 0], r = [36, 44]) => {
    c.fillStyle = '#fff'; c.strokeStyle = ink; c.lineWidth = 7;
    c.beginPath(); c.ellipse(x, eyeY, r[0], r[1], 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = ink; c.beginPath(); c.ellipse(x + pup[0], eyeY + 6 + pup[1], 10, 12, 0, 0, 7); c.fill();
    if (lid > 0) { // upper lid drawn as skin over the top of the eye
      c.save(); c.beginPath(); c.ellipse(x, eyeY, r[0], r[1], 0, 0, 7); c.clip();
      c.fillStyle = skin; c.fillRect(x - 60, eyeY - 60, 120, 60 + (lid - .5) * 2 * r[1]); c.restore();
      c.strokeStyle = ink; c.lineWidth = 7; c.beginPath(); c.moveTo(x - r[0], eyeY + (lid - .5) * 2 * r[1] * .55); c.lineTo(x + r[0], eyeY + (lid - .5) * 2 * r[1] * .55); c.stroke();
      c.beginPath(); c.ellipse(x, eyeY, r[0], r[1], 0, 0, 7); c.stroke();
    }
  };
  const brow = (x, side, tilt, lift = 0) => { // tilt > 0 = angry (inner end down)
    c.strokeStyle = ink; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 34 * side, eyeY - 62 - lift + tilt * 10); c.lineTo(x + 30 * side, eyeY - 62 - lift - tilt * 12); c.stroke();
  };
  const mouthLine = (w, curve, y = cy + 70) => { c.strokeStyle = ink; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - w, y); c.quadraticCurveTo(cx, y + curve, cx + w, y); c.stroke(); };
  const mouthOpen = (w, h, y = cy + 70, teeth = true) => {
    c.fillStyle = '#6b1a1f'; c.strokeStyle = ink; c.lineWidth = 6;
    c.beginPath(); c.moveTo(cx - w, y); c.quadraticCurveTo(cx, y + h * 2, cx + w, y); c.closePath(); c.fill(); c.stroke();
    if (teeth) { c.save(); c.clip(); c.fillStyle = '#fff'; c.fillRect(cx - w, y - 4, w * 2, h * .45); c.restore(); }
  };
  const L = cx - ex, R = cx + ex;
  switch (face) {
    case 'happy': eye(L); eye(R); brow(L, -1, -.4, 6); brow(R, 1, -.4, 6); mouthOpen(46, 28); break;
    case 'smug': eye(L, .55, [6, 4]); eye(R, .55, [6, 4]); brow(L, -1, -.2); brow(R, 1, .3, 8); mouthLine(40, 18); c.beginPath(); c.moveTo(cx + 40, cy + 70); c.lineTo(cx + 52, cy + 60); c.stroke(); break;
    case 'angry': eye(L, .35, [0, 2]); eye(R, .35, [0, 2]); brow(L, -1, 1.6); brow(R, 1, 1.6); mouthOpen(36, 10, cy + 74); break;
    case 'shocked': eye(L, 0, [0, 0], [40, 50]); eye(R, 0, [0, 0], [40, 50]); brow(L, -1, -.6, 18); brow(R, 1, -.6, 18); c.fillStyle = '#6b1a1f'; c.beginPath(); c.ellipse(cx, cy + 82, 16, 20, 0, 0, 7); c.fill(); c.stroke(); break;
    case 'sad': eye(L, .3, [0, 8]); eye(R, .3, [0, 8]); brow(L, -1, -1.2, 4); brow(R, 1, -1.2, 4); mouthLine(30, -14, cy + 82); break;
    case 'crying': eye(L, .2, [0, 8]); eye(R, .2, [0, 8]); brow(L, -1, -1.4, 4); brow(R, 1, -1.4, 4); mouthOpen(40, -16, cy + 92, false);
      c.fillStyle = '#7cc7ff'; for (const x of [L, R]) { c.beginPath(); c.ellipse(x, eyeY + 70, 9, 34, 0, 0, 7); c.fill(); } break;
    case 'determined': eye(L, .4); eye(R, .4); brow(L, -1, .9); brow(R, 1, .9); mouthLine(34, -2); break;
    default: eye(L); eye(R); brow(L, -1, 0); brow(R, 1, 0); mouthLine(30, 10);
  }
}

function shirtTexture(shirt, number, numberColor) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = shirt; x.fillRect(0, 0, 512, 256);
  if (number != null) {
    x.fillStyle = numberColor; x.textAlign = 'center'; x.textBaseline = 'middle';
    // capsule u = 0 is the chest (it wraps at the canvas edges), u = 0.5 is the back
    x.font = `900 60px Inter, "DejaVu Sans", sans-serif`; x.fillText(String(number), 0, 112); x.fillText(String(number), 512, 112); // chest (small)
    x.font = `900 120px Inter, "DejaVu Sans", sans-serif`; x.fillText(String(number), 256, 120);                                     // back (big)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.offset.x = 0; return t;
}

export function makeBean({
  shirt = '#d81f26', shorts = '#f4f4f4', number = 7, numberColor = '#ffffff', skin = SKINS.beige,
  hair = 'cap', hairColor = '#3a2416', face = 'neutral', socks = null, shoes = '#121212', outfit = 'kit',
} = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skinMat = mat(skin);
  // legs (pivot at hip)
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group(); hip.position.set(s * .17, 1.12, 0); body.add(hip);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.08, 10), skinMat); leg.position.y = -.54; hip.add(leg);
    if (socks) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .32, 10), mat(socks)); sk.position.y = -.9; hip.add(sk); }
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), mat(shoes, { roughness: .4 })); shoe.scale.set(1, .7, 1.45); shoe.position.set(0, -1.08, .05); hip.add(shoe);
    return hip;
  });
  // shorts + torso
  const shortsM = new THREE.Mesh(new THREE.CylinderGeometry(.4, .36, .3, 24), mat(outfit === 'suit' ? '#1b1b1f' : shorts));
  shortsM.position.y = 1.24; body.add(shortsM);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .42, 8, 24),
    outfit === 'suit' ? mat('#1b1b1f') : new THREE.MeshStandardMaterial({ map: shirtTexture(shirt, number, numberColor), roughness: .6 }));
  torso.position.y = 1.72; torso.scale.set(1, 1, .9); body.add(torso);
  if (outfit === 'suit') { const tie = new THREE.Mesh(new THREE.BoxGeometry(.08, .4, .02), mat('#c3121b')); tie.position.set(0, 1.85, .4); body.add(tie);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(.2, .45, .02), mat('#ffffff')); sh.position.set(0, 1.86, .395); body.add(sh); }
  // arms (pivot at shoulder; rotation.z swings sideways, rotation.x forward/back)
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * .4, 2.0, 0); body.add(sh);
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), outfit === 'suit' ? mat('#1b1b1f') : mat(shirt)); sh.add(sleeve);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .78, 8), outfit === 'suit' ? mat('#1b1b1f') : skinMat); arm.position.y = -.39; sh.add(arm);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), skinMat); tip.position.y = -.78; sh.add(tip);
    sh.rotation.z = s * .18; return sh;
  });
  // head
  const headG = new THREE.Group(); headG.position.y = 2.55; body.add(headG);
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = 1024; faceCanvas.height = 512;
  const fctx = faceCanvas.getContext('2d'), faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.52, 48, 32), new THREE.MeshStandardMaterial({ map: faceTex, roughness: .5 }));
  headG.add(head);
  if (hair === 'cap' || hair === 'bun') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.535, 48, 24, 0, Math.PI * 2, 0, Math.PI * .42), mat(hairColor, { roughness: .45 }));
    cap.rotation.x = -.38; headG.add(cap);
    if (hair === 'bun') { const bun = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), mat(hairColor)); bun.position.set(0, .5, -.25); headG.add(bun); }
  }
  const setFace = (f) => { drawFace(fctx, skin, f, hair); faceTex.needsUpdate = true; };
  setFace(face);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });

  // pose: all angles in radians, applied absolutely each call
  const pose = ({ armL = .18, armR = -.18, armLf = 0, armRf = 0, legL = 0, legR = 0, lean = 0, headTilt = 0, headTurn = 0, squash = 1, bounce = 0 } = {}) => {
    arms[0].rotation.set(armLf, 0, -armL); arms[1].rotation.set(armRf, 0, -armR);
    legs[0].rotation.x = legL; legs[1].rotation.x = legR;
    body.rotation.x = lean; body.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash)); body.position.y = bounce;
    headG.rotation.set(0, headTurn, headTilt);
  };
  pose();
  return { root, body, head: headG, arms, legs, setFace, pose };
}

// Peg-people crowd: capsule body + sphere head, InstancedMesh pairs. Returns a Group.
export function makeCrowd({ rows = 8, perRow = 40, spacing = .55, rise = .5, depth = .7, colors = ['#d81f26', '#ffffff'], skins = Object.values(SKINS), seed = 3 } = {}) {
  let s = seed; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const n = rows * perRow, g = new THREE.Group();
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.16, .3, 4, 10), mat('#ffffff'), n);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.15, 12, 10), mat('#ffffff'), n);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const x = (col - perRow / 2) * spacing + (r() - .5) * .12, y = row * rise, z = -row * depth;
    m.makeTranslation(x, y + .3, z); bodies.setMatrixAt(i, m); bodies.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]));
    m.makeTranslation(x, y + .68, z); heads.setMatrixAt(i, m); heads.setColorAt(i, c.set(skins[Math.floor(r() * skins.length)]));
  }
  g.add(bodies, heads); g.userData = { bodies, heads, n, perRow };
  return g;
}
