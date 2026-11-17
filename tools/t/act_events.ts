import { ACT_EVENTS, WALKS } from "../../src/actlab/ActLab";
import { footfalls } from "../../src/inkbeat/anim/acting";
console.log(JSON.stringify({ ...ACT_EVENTS, steps: footfalls(WALKS) }));
