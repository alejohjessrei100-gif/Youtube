// Cast line-up + overlay sample. Renders WebGL, then composites pixel-font overlays on a 2D canvas.
import * as THREE from 'three';
import { makeBean, makeCrowd, SKINS } from '../characters/bean.js';
import { drawPixelText, measurePixelText } from '../font/pixelfont.js';

const W = 1080, H = 1920;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H, false);
r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#3f8be0');
const cam = new THREE.PerspectiveCamera(38, W / H, .1, 200); cam.position.set(0, 4.2, 19); cam.lookAt(0, 1.6, 0);
scene.add(new THREE.HemisphereLight('#cfe3ff', '#3c6b2c', 1.1));
const sun = new THREE.DirectionalLight('#fff3e0', 2.2); sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); scene.add(sun);
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshStandardMaterial({ color: '#3fa34d', roughness: .9 }));
pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; scene.add(pitch);
const crowd = makeCrowd({ rows: 10, perRow: 60, colors: ['#d81f26', '#d81f26', '#ffffff', '#1f4fd8'] }); crowd.position.set(0, 0, -14); scene.add(crowd);

const cast = [
  { o: { number: 7, face: 'smug' }, p: {} },
  { o: { number: 5, face: 'happy', skin: SKINS.brown, hairColor: '#111' }, p: { armL: 2.6, armR: -2.6 } },
  { o: { number: 9, face: 'determined', shirt: '#6cabdd', hair: 'ponytail', hairColor: '#e2c46e' }, p: { tail: 1.1, tailSwing: 1.2 }, turn: -2.2 },
  { o: { number: 1, face: 'angry', shirt: '#2fb34a', hairColor: '#111', skin: SKINS.dark }, p: { armL: .5, armR: -1.2 } },
  { o: { number: null, face: 'sad', outfit: 'suit', hair: 'old' }, p: {} },
  { o: { number: 8, face: 'crying', skin: SKINS.beige, hair: 'bun', hairColor: '#7a4b2a' }, p: { headTilt: .15 } },
];
const pos = [[-2.2, 0, 1.6], [0, 0, 2.2], [2.2, 0, 1.6], [-2.6, 0, -1.6], [0, 0, -1.2], [2.6, 0, -1.6]];
cast.forEach((c, i) => { const b = makeBean(c.o); b.pose(c.p); b.root.position.set(...pos[i]); b.root.rotation.y = c.turn ?? -pos[i][0] * .1; scene.add(b.root); });

const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
const x = out.getContext('2d');
function panel(px, py, w, h, border = '#f2c230') { x.fillStyle = 'rgba(10,16,40,.92)'; x.fillRect(px, py, w, h); x.strokeStyle = border; x.lineWidth = 6; x.strokeRect(px + 3, py + 3, w - 6, h - 6); }
function frame() {
  r.render(scene, cam); x.drawImage(r.domElement, 0, 0);
  // score bug
  panel(36, 60, 470, 70, '#d9dde8'); x.fillStyle = '#d81f26'; x.fillRect(54, 76, 38, 38); drawPixelText(x, 'M', 73, 81, { px: 4, align: 'center' });
  drawPixelText(x, "MUN 0-0 ANT 40'", 110, 81, { px: 4, color: '#e9ecf5' });
  // stat card
  panel(250, 1300, 580, 300); drawPixelText(x, 'THE ANT', 540, 1335, { px: 6, color: '#f2c230', align: 'center' });
  [['PACE', 2], ['PASSING', 99], ['PHYSICAL', 1], ['LEGS', 6]].forEach(([k, v], i) => { drawPixelText(x, k, 290, 1410 + i * 44, { px: 4 }); drawPixelText(x, String(v), 790, 1410 + i * 44, { px: 4, align: 'right' }); });
  // name tag + pill
  const tag = 'THE CAPTAIN', tw = measurePixelText(tag, 4) + 30; x.fillStyle = '#f2c230'; x.fillRect(540 - tw / 2, 520, tw, 46); drawPixelText(x, tag, 540, 530, { px: 4, color: '#111', align: 'center' });
  x.beginPath(); x.moveTo(528, 566); x.lineTo(552, 566); x.lineTo(540, 580); x.fill();
  panel(300, 1660, 480, 64, '#9fb4ff'); drawPixelText(x, 'ASSIST: THE WIND', 540, 1678, { px: 4, align: 'center' });
}
window.renderFrame = () => frame(); window.outCanvas = out; window.ready = true; frame();
