import { handWorld, solveArm } from "../../src/inkbeat/core/ik";
import { styleOf } from "../../src/styles/styles";
const B = { ...styleOf("toon").adult, shoulders: 1.1 };
const P: [number, number, number] = [0, 0, 0];
for (const lean of [0, 10, 18]) for (const pose of [[60, 0, 60], [80, 30, 80], [100, 40, 90], [70, 50, 70]] as const) {
  const h = handWorld({ position: P, yaw: 0, height: 1.74, build: B, side: "R", pose: { armR: [pose[0], pose[1]], armRFwd: pose[2], lean } });
  console.log(lean, pose.join(","), h.map((v) => v.toFixed(2)).join(","));
}
const s = solveArm({ position: P, yaw: 0, side: "R", target: [0.1, 0.98, 0.42], height: 1.74, build: B, base: { lean: 12 } });
console.log("solve", JSON.stringify(s));
