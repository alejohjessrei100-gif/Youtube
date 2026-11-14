// Framing check for the Beirut film: at the start, middle and end of every shot, how many actors have their head inside
// the frame (with a 4% margin), and the camera's height / speed. Run: npx esbuild plan/check_beirut.ts --bundle --platform=node --outfile=out/check_beirut.js && node out/check_beirut.js
import * as THREE from "three";
import { BEATS } from "../src/beirut/shots";
import { BEAT } from "../src/beirut/timing.gen";

const proj = (cam: { pos: number[]; look: number[]; fov: number; roll?: number }, p: number[]) => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1080 / 1920, 0.02, 600);
  c.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  const dir = new THREE.Vector3(cam.look[0], cam.look[1], cam.look[2]).sub(c.position).normalize();
  c.up.copy(new THREE.Vector3(0, 1, 0).applyAxisAngle(dir, ((cam.roll ?? 0) * Math.PI) / 180));
  c.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(c);
  return { x: v.x * 0.5 + 0.5, y: 0.5 - v.y * 0.5, z: v.z };
};
for (const s of BEATS) {
  const row: string[] = [];
  for (const u of [0, 0.5, 1]) {
    const t = (s.b + u * s.len) * BEAT;
    const cam = s.cam(u);
    const A = s.actors(t, u);
    let inn = 0;
    let minD = 1e9;
    for (const a of A) {
      const q = proj(cam, [a.p[0], a.p[1] + a.spec.height * 0.9, a.p[2]]);
      if (q.z < 1 && q.x > -0.04 && q.x < 1.04 && q.y > -0.04 && q.y < 1.04) inn++;
      minD = Math.min(minD, Math.hypot(a.p[0] - cam.pos[0], a.p[1] - cam.pos[1], a.p[2] - cam.pos[2]));
    }
    // pairwise overlap (two actors closer than 0.45 m on the ground)
    let overlap = 0;
    for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (Math.hypot(A[i].p[0] - A[j].p[0], A[i].p[2] - A[j].p[2]) < 0.45) overlap++;
    row.push(`u${u}: ${inn}/${A.length} in frame, nearest ${minD.toFixed(1)} m, overlaps ${overlap}`);
  }
  console.log(`S${String(s.id).padStart(2, "0")} ${row.join(" | ")}`);
}
