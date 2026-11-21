// Standalone frame renderer (no Remotion renderer, no Node needed on the render PC): the composition is shown frame by
// frame inside @remotion/player's <Thumbnail>, every frame is composited from the page's canvases (crossfade layers
// with their opacity, the white flash) onto one 2D canvas and POSTed as a PNG to the local Python server.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Thumbnail } from "@remotion/player";
import { Short, SHORT_FRAMES } from "./short/Short";

const W = window as unknown as Record<string, unknown>;
W.__PDB = true;
const OW = Number(new URLSearchParams(location.search).get("w") ?? 1440), OH = Math.round((OW * 16) / 9);
W.__DPR = OW / 1080; // render the 1080x1920 composition natively at OW x OH (sharper than upscaling)
const log = (m: string) => { try { fetch("/log", { method: "POST", body: m }); } catch { /* */ } };
window.addEventListener("error", (e) => log("ERROR " + e.message));
window.addEventListener("unhandledrejection", (e) => log("REJECT " + String((e as PromiseRejectionEvent).reason)));
const ce = console.error.bind(console), cw = console.warn.bind(console);
console.error = (...x: unknown[]) => { log("console.error " + x.map(String).join(" ").slice(0, 600)); ce(...x); };
console.warn = (...x: unknown[]) => { log("console.warn " + x.map(String).join(" ").slice(0, 300)); cw(...x); };
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const App: React.FC = () => {
  const [f, setF] = useState(0);
  useEffect(() => { W.__setFrame = setF; W.__ready = true; }, []);
  return <Thumbnail component={Short} compositionWidth={1080} compositionHeight={1920} frameToDisplay={f} durationInFrames={SHORT_FRAMES} fps={30} style={{ width: 1080, height: 1920 }} />;
};

const out = document.createElement("canvas"); out.width = OW; out.height = OH;
const g = out.getContext("2d")!;
const opacityOf = (el: HTMLElement | null) => {
  let a = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) { const o = parseFloat(getComputedStyle(e).opacity); if (!isNaN(o)) a *= o; }
  return a;
};
const capture = async () => {
  g.globalAlpha = 1; g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, OW, OH);
  for (const c of Array.from(document.querySelectorAll("canvas"))) {
    if (c === out) continue;
    g.globalAlpha = opacityOf(c); g.drawImage(c, 0, 0, OW, OH);
  }
  // white flash overlay (a plain div with a white background inside the composition)
  for (const d of Array.from(document.querySelectorAll("div")) as HTMLElement[]) {
    const bg = d.style.background || d.style.backgroundColor;
    if (bg === "rgb(255, 255, 255)" || bg === "#ffffff") { g.globalAlpha = opacityOf(d); g.fillStyle = "#ffffff"; g.fillRect(0, 0, OW, OH); }
  }
  g.globalAlpha = 1;
  return new Promise<Blob>((r) => out.toBlob((b) => r(b!), "image/png"));
};
const run = async () => {
  const q = new URLSearchParams(location.search), a = Number(q.get("a") ?? 0), b = Number(q.get("b") ?? SHORT_FRAMES - 1);
  const list = q.get("list") ? q.get("list")!.split(",").map(Number) : null;
  const frames = list ?? Array.from({ length: b - a + 1 }, (_, i) => a + i);
  while (!W.__ready) await sleep(50);
  const setF = W.__setFrame as (n: number) => void;
  setF(frames[0]); await sleep(4000);
  let canvases = 0;
  for (const f of frames) {
    setF(f);
    // wait until every mounted layer has drawn this exact frame (Titanic.tsx stamps window.__rf[shot] = frame after its composer)
    const t0 = performance.now();
    for (;;) {
      await raf();
      const n = document.querySelectorAll("canvas").length, rf = (W.__rf ?? {}) as Record<number, number>;
      const ok = Object.values(rf).filter((v) => v === f).length;
      if (n > 0 && ok >= n) break;
      if (performance.now() - t0 > 90000) { log(`timeout frame ${f} canvases ${n} ok ${ok}`); break; }
    }
    if (f === frames[0]) log(`first frame ${f}: ${document.querySelectorAll("canvas").length} canvas(es)`);
    for (let i = 0; i < 2; i++) await raf();
    void canvases;
    const png = await capture();
    await fetch(`/frame?i=${f}`, { method: "POST", body: png });
  }
  await fetch("/done", { method: "POST", body: "ok" });
};
createRoot(document.getElementById("root")!).render(<App />);
run().catch((e) => log("RUN ERROR " + String(e)));
