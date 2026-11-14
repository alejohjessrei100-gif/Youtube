// Phone studio: preview every composition with the Remotion Player and render stills / MP4s
// in the phone's own browser (its GPU does the WebGL) with @remotion/web-renderer.
import { Player, type PlayerRef } from "@remotion/player";
import { renderFramesOnWeb, renderMediaOnWeb, renderStillOnWeb } from "@remotion/web-renderer";
import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Demo, DEMO_MOODS } from "../src/demo/Demo";
import { DemoCast } from "../src/demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "../src/demo/DemoMove";
import { StyleCloseUp, StyleLineup, StyleTrio } from "../src/demo/StyleSheet";
import { STYLES } from "../src/styles/styles";
import { SAME_ISLAND_FRAMES, SameIsland } from "../src/island/SameIsland";

// staticFile() (fonts) resolves against this folder, wherever the page is hosted.
(window as unknown as { remotion_staticBase: string }).remotion_staticBase = new URL(".", location.href).pathname.replace(/\/$/, "");

type Comp = {
  id: string;
  label: string;
  component: React.FC<any>;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  defaultProps: Record<string, unknown>;
};

const COMPS: Comp[] = [
  { id: "SameIsland", label: "Same island (final, 34 s)", component: SameIsland, width: 1080, height: 1920, fps: 30, durationInFrames: SAME_ISLAND_FRAMES, defaultProps: {} },
  { id: "StyleLineup", label: "Character styles: all 5 side by side", component: StyleLineup, width: 1920, height: 1080, fps: 30, durationInFrames: 30, defaultProps: { mood: "day" } },
  ...STYLES.map((s) => ({ id: `Close-${s.id}`, label: `Close-up: ${s.name}`, component: StyleCloseUp, width: 1080, height: 1920, fps: 30, durationInFrames: 30, defaultProps: { style: s.id, mood: "day" } })),
  ...STYLES.map((s) => ({ id: `Style-${s.id}`, label: `Style: ${s.name} (${s.heads})`, component: StyleTrio, width: 1920, height: 1080, fps: 30, durationInFrames: 30, defaultProps: { style: s.id, mood: "day" } })),
  { id: "Demo", label: "Demo (day)", component: Demo, width: 1080, height: 1920, fps: 30, durationInFrames: 30, defaultProps: { mood: "day", wide: false } },
  { id: "DemoHero", label: "Demo hero (dusk)", component: Demo, width: 1080, height: 1920, fps: 30, durationInFrames: 30, defaultProps: { mood: "dusk", wide: false, hero: true } },
  { id: "DemoCast", label: "Cast sheet", component: DemoCast, width: 1920, height: 1080, fps: 30, durationInFrames: 30, defaultProps: { mood: "day" } },
  { id: "DemoWide", label: "Demo wide", component: Demo, width: 1080, height: 1920, fps: 30, durationInFrames: 30, defaultProps: { mood: "day", wide: true } },
  ...DEMO_MOODS.map((m) => ({ id: `Demo-${m}`, label: `Mood: ${m}`, component: Demo, width: 1080, height: 1920, fps: 30, durationInFrames: 30, defaultProps: { mood: m, wide: false } })),
  { id: "DemoMove", label: "Camera move (3 s video)", component: DemoMove, width: 1080, height: 1920, fps: 30, durationInFrames: MOVE_FRAMES, defaultProps: { sub: false } },
];

const LOG = (new URLSearchParams(location.search).get("log") ?? "info") as "info" | "verbose";

const SCALES = [
  { v: 0.5, label: "Half res (fast)" },
  { v: 1, label: "Full res 1080p" },
];

const save = async (blob: Blob, name: string) => {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return;
    } catch {
      /* cancelled: fall back to a download */
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
};

const App: React.FC = () => {
  const [compId, setCompId] = useState(COMPS[0].id);
  const [scale, setScale] = useState(0.5);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string; kind: "image" | "video" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [frame, setFrame] = useState(0);
  const player = useRef<PlayerRef>(null);
  const abort = useRef<AbortController | null>(null);
  const comp = useMemo(() => COMPS.find((c) => c.id === compId)!, [compId]);

  const composition = { id: comp.id, component: comp.component, width: comp.width, height: comp.height, fps: comp.fps, durationInFrames: comp.durationInFrames, defaultProps: comp.defaultProps };

  const finish = (blob: Blob, name: string, kind: "image" | "video") => {
    if (result) URL.revokeObjectURL(result.url);
    setResult({ url: URL.createObjectURL(blob), blob, name, kind });
  };

  const run = async (what: "still" | "video") => {
    setError(null);
    setProgress(0);
    player.current?.pause();
    setPreview(false); // free the GPU for the render
    const ac = new AbortController();
    abort.current = ac;
    try {
      if (what === "still") {
        setBusy("Rendering still…");
        const f = Math.min(comp.durationInFrames - 1, Math.max(0, preview ? (player.current?.getCurrentFrame() ?? frame) : frame));
        const r = await renderStillOnWeb({ composition, inputProps: comp.defaultProps, frame: f, scale, licenseKey: "free-license", signal: ac.signal, delayRenderTimeoutInMilliseconds: 240_000, logLevel: LOG });
        finish(await r.blob({ format: "jpeg", quality: 0.92 }), `${comp.id}-f${f}.jpg`, "image");
      } else {
        setBusy("Rendering video…");
        const r = await renderMediaOnWeb({
          composition,
          inputProps: comp.defaultProps,
          scale,
          container: "mp4",
          videoBitrate: "high",
          licenseKey: "free-license",
          signal: ac.signal,
          delayRenderTimeoutInMilliseconds: 240_000,
          onProgress: (p) => setProgress(p.progress),
        });
        finish(await r.getBlob(), `${comp.id}.mp4`, "video");
      }
    } catch (e) {
      setError(ac.signal.aborted ? "Cancelled." : String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
      abort.current = null;
    }
  };

  const landscape = comp.width > comp.height;
  return (
    <div className="wrap">
      <header>
        <h1>Inkbeat Studio</h1>
        <p className="sub">Preview and render on this device. Keep the screen on while it renders.</p>
      </header>

      <label className="field">
        <span>Scene</span>
        <select value={compId} onChange={(e) => { setCompId(e.target.value); setResult(null); setFrame(0); }} disabled={!!busy}>
          {COMPS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </label>

      {preview ? (
        <div className={`stage ${landscape ? "land" : "port"}`}>
          <Player
            key={comp.id}
            ref={player}
            component={comp.component}
            inputProps={comp.defaultProps}
            compositionWidth={comp.width}
            compositionHeight={comp.height}
            fps={comp.fps}
            durationInFrames={comp.durationInFrames}
            initialFrame={frame}
            controls
            loop
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      ) : null}
      <button className="ghost wide" onClick={() => { if (preview) setFrame(player.current?.getCurrentFrame() ?? frame); setPreview(!preview); }} disabled={!!busy}>
        {preview ? "Hide live preview" : "Show live preview"}
      </button>

      {comp.durationInFrames > 1 ? (
        <label className="field">
          <span>Still frame (0–{comp.durationInFrames - 1}){preview ? ": uses the preview's current frame" : ""}</span>
          <input type="number" inputMode="numeric" min={0} max={comp.durationInFrames - 1} value={frame} disabled={preview || !!busy} onChange={(e) => setFrame(Number(e.target.value) || 0)} />
        </label>
      ) : null}

      <label className="field">
        <span>Quality</span>
        <select value={scale} onChange={(e) => setScale(Number(e.target.value))} disabled={!!busy}>
          {SCALES.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </label>

      <div className="buttons">
        <button onClick={() => run("still")} disabled={!!busy}>Render still</button>
        <button className="primary" onClick={() => run("video")} disabled={!!busy}>Render MP4</button>
      </div>

      {busy ? (
        <div className="status">
          <div>{busy} {progress > 0 ? `${Math.round(progress * 100)}%` : ""}</div>
          <div className="bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <button className="ghost" onClick={() => abort.current?.abort()}>Cancel</button>
        </div>
      ) : null}
      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <div className="result">
          {result.kind === "image" ? <img src={result.url} alt="Rendered still" /> : <video src={result.url} controls playsInline loop />}
          <button className="primary" onClick={() => save(result.blob, result.name)}>Save {result.name}</button>
        </div>
      ) : null}

      <footer>Built with Remotion (free license for individuals and companies of up to 3 people).</footer>
    </div>
  );
};

// QA hook: render several frames of one composition in one pass (used by the contact-sheet check)
(window as unknown as { __qaFrames: unknown }).__qaFrames = async (id: string, frames: number[], scale = 0.25) => {
  const c = COMPS.find((x) => x.id === id)!;
  const res = await renderFramesOnWeb({ composition: { id: c.id, component: c.component, width: c.width, height: c.height, fps: c.fps, durationInFrames: c.durationInFrames, defaultProps: c.defaultProps }, inputProps: c.defaultProps, frames, scale, licenseKey: "free-license", delayRenderTimeoutInMilliseconds: 240_000 });
  const out: string[] = [];
  for (const r of res) {
    const b = await r.blob({ format: "jpeg", quality: 0.85 });
    out.push(await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.readAsDataURL(b); }));
  }
  return out;
};

// QA hook: a short MP4 of a frame range (checks that video and audio both make it into the file)
(window as unknown as { __qaMedia: unknown }).__qaMedia = async (id: string, from: number, to: number, scale = 0.25) => {
  const c = COMPS.find((x) => x.id === id)!;
  const r = await renderMediaOnWeb({ composition: { id: c.id, component: c.component, width: c.width, height: c.height, fps: c.fps, durationInFrames: c.durationInFrames, defaultProps: c.defaultProps }, inputProps: c.defaultProps, frameRange: [from, to], scale, container: "mp4", licenseKey: "free-license", delayRenderTimeoutInMilliseconds: 240_000 });
  const b = await r.getBlob();
  return await new Promise<string>((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result as string); fr.readAsDataURL(b); });
};

createRoot(document.getElementById("root")!).render(<App />);
