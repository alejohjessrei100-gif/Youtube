// The state of the world in one frame (pure types).
import type { V3 } from "../inkbeat/types";
import type { Pose, SetId } from "./world";

export type Rig = {
  /** canvas set (0 = bare poles, 1 = storm canvas, 2 = full sail) */
  sails?: number;
  /** fall angle of each mast (radians); 0 = standing */
  fall?: number[];
  /** fraction of each mast left standing (1 = whole, 0.3 = a stump) */
  stump?: number[];
  kind: "schooner" | "ship" | "boat";
};

export type WorldState = {
  set: SetId;
  /** swell: 1 calm harbour … 3 storm ocean */
  swell: number;
  /** rain streaks (0 = none) */
  rain?: number;
  /** lightning: 0..1 flash strength and where the bolt stands */
  flash?: number;
  bolt?: V3;
  /** the Grafton: afloat at a pose, lying wrecked, or not in the shot */
  grafton?: { pose: Pose; rig: Rig } | "wreck" | "none";
  invercauld?: { pose: Pose; rig: Rig } | "wreck" | "none";
  /** the hut: -1 = not built yet, 0..1 = being raised, 1 = finished */
  hut?: number;
  hutLit?: number;
  /** fire strength (0 = no fire yet) */
  fire?: number;
  /** the boat: on the stocks (0..1 built) or afloat at a pose */
  boat?: "none" | { built: number } | Pose;
  /** bursts of spray */
  spray?: { p: V3; t0: number; s: number; period?: number; seed?: number }[];
  /** the chart (set MAP): which marks show (0..1 each) and how far the route between them is drawn */
  chart?: { grafton: number; invercauld: number; route: number };
  /** carried by the men, not part of the set: a spar between two points */
  spar?: { a: V3; b: V3 };
};

