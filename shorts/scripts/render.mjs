// usage: node scripts/render.mjs <outDir> <from> <to> [chunk=60] [concurrency=2] [scale=1]
// renders [from, to] in chunks of `chunk` frames to <outDir>/c_<start>.mp4 (skips chunks that already exist)
import fs from "node:fs";
import path from "node:path";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [out, from, to, chunk = "60", conc = "2", scale = "1"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "EarShort", browserExecutable, chromiumOptions });
for (let a = Number(from); a <= Number(to); a += Number(chunk)) {
  const b = Math.min(Number(to), a + Number(chunk) - 1), file = path.join(out, `c_${String(a).padStart(4, "0")}.mp4`);
  if (fs.existsSync(file)) { console.log("skip", a); continue; }
  const t0 = Date.now();
  await renderMedia({ composition, serveUrl, codec: "h264", crf: 14, outputLocation: file + ".tmp.mp4", frameRange: [a, b], scale: Number(scale),
    concurrency: Number(conc), browserExecutable, chromiumOptions, imageFormat: "jpeg", jpegQuality: 92, muted: true, timeoutInMilliseconds: 300000,
    onProgress: ({ renderedFrames }) => { if (renderedFrames % 10 === 0) console.log(`chunk ${a}: ${renderedFrames}/${b - a + 1}`); } });
  fs.renameSync(file + ".tmp.mp4", file);
  console.log(`done ${a}-${b} in ${((Date.now() - t0) / 1000).toFixed(0)}s (${((Date.now() - t0) / 1000 / (b - a + 1)).toFixed(1)} s/frame)`);
}
