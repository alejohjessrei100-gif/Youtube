// Phone studio: preview every composition with the Remotion Player and render stills / MP4s
// in the phone's own browser (its GPU does the WebGL) with @remotion/web-renderer.
import { Player, type PlayerRef } from "@remotion/player";
import { renderFramesOnWeb, renderMediaOnWeb, renderStillOnWeb } from "@remotion/web-renderer";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Demo, DEMO_MOODS } from "../src/demo/Demo";
import { DemoCast } from "../src/demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "../src/demo/DemoMove";
import { StyleCloseUp, StyleLineup, StyleTrio } from "../src/demo/StyleSheet";
import { STYLES } from "../src/styles/styles";
import { AGLOE_FRAMES, Agloe } from "../src/agloe/Agloe";
import { DAGENH_FRAMES, DagenH } from "../src/dagenh/DagenH";
import { PEIGNEUR_FRAMES, Peigneur } from "../src/peigneur/Peigneur";
import { ACT_FRAMES, ActLab } from "../src/actlab/ActLab";
import { MEAT_FRAMES, MeatShower } from "../src/meat/MeatShower";
import { DIR_FRAMES, DirectorLab } from "../src/directorlab/DirectorLab";
import { GULL_FRAMES, GullShort } from "../src/gull/Gull";
import { MUSEUM_FRAMES, MuseumShort } from "../src/museum/Museum";
import { BISCUIT_FRAMES, BiscuitShort } from "../src/biscuit/Biscuit";

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
  { id: "Biscuit", label: "Lost Dog: Biscuit (40 s)", component: BiscuitShort, width: 1080, height: 1920, fps: 30, durationInFrames: BISCUIT_FRAMES, defaultProps: { audio: true } },
  { id: "Museum", label: "The Man Who Steals Nothing (35 s)", component: MuseumShort, width: 1080, height: 1920, fps: 30, durationInFrames: MUSEUM_FRAMES, defaultProps: { audio: true } },
  { id: "Gull", label: "The Gull at 9:14 (35 s)", component: GullShort, width: 1080, height: 1920, fps: 30, durationInFrames: GULL_FRAMES, defaultProps: { audio: true } },
  { id: "DirectorLab", label: "Camera + expressions test (10 s)", component: DirectorLab, width: 1080, height: 1920, fps: 30, durationInFrames: DIR_FRAMES, defaultProps: {} },
  { id: "MeatShower", label: "Kentucky meat shower (34 s)", component: MeatShower, width: 1080, height: 1920, fps: 30, durationInFrames: MEAT_FRAMES, defaultProps: { audio: true } },
  { id: "ActLab", label: "Character animation trial (12 s)", component: ActLab, width: 1080, height: 1920, fps: 30, durationInFrames: ACT_FRAMES, defaultProps: { audio: true } },
  { id: "Peigneur", label: "Lake Peigneur: the lake that drained (30 s)", component: Peigneur, width: 1080, height: 1920, fps: 30, durationInFrames: PEIGNEUR_FRAMES, defaultProps: { sub: false, audio: true } },
  { id: "DagenH", label: "Dagen H: Sweden switches sides (33 s)", component: DagenH, width: 1080, height: 1920, fps: 30, durationInFrames: DAGENH_FRAMES, defaultProps: { sub: false, audio: true } },
  { id: "Agloe", label: "Agloe: the fake town (34 s)", component: Agloe, width: 1080, height: 1920, fps: 30, durationInFrames: AGLOE_FRAMES, defaultProps: { sub: false, audio: true } },
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
  { v: 1, label: "Full res 1080 × 1920 (final)" },
  { v: 0.5, label: "Half res (quick test)" },
];

type ClaudeRuntime = { use: (name: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> } | null> };
/** save a rendered file: the platform's `downloads` capability first (the page is sandboxed, so a plain download is
 * blocked), then the share sheet, then a plain link. Returns a message for the viewer. */
const save = async (blob: Blob, name: string): Promise<string> => {
  const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
  const dl = claude ? await claude.use("downloads").catch(() => null) : null;
  if (dl) {
    try {
      const r = await dl.save({ filename: name, data: blob });
      return r.status === "saved" ? `Saved ${name}.` : `Sent ${name}.`;
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code === "declined") return "Save cancelled. Tap Save again when you're ready.";
      if (code === "rate_limited") return "A save prompt is already open. Answer it, or wait a moment and tap Save again.";
      if (code === "too_large") return "That file is too big to save here. Render at half resolution and save that.";
      /* any other code: try the fallbacks below */
    }
  }
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return `Shared ${name}.`;
    } catch {
      /* cancelled or blocked: fall back to a link */
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  return dl ? "Tried a plain download too." : "Saving is not available in this view. Open the artifact in claude.ai (not a preview), or press and hold the video to save it.";
};

const App: React.FC = () => {
  const [compId, setCompId] = useState(COMPS[0].id);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [prog, setProg] = useState<{ r: number; e: number; total: number; eta: number; at: number; start: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [vFrom, setVFrom] = useState(0);
  const [vTo, setVTo] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string; kind: "image" | "video" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [frame, setFrame] = useState(0);
  const player = useRef<PlayerRef>(null);
  const abort = useRef<AbortController | null>(null);
  const comp = useMemo(() => COMPS.find((c) => c.id === compId)!, [compId]);
  useEffect(() => {
    if (!busy) return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [busy]);

  const composition = { id: comp.id, component: comp.component, width: comp.width, height: comp.height, fps: comp.fps, durationInFrames: comp.durationInFrames, defaultProps: comp.defaultProps };

  const finish = (blob: Blob, name: string, kind: "image" | "video") => {
    if (result) URL.revokeObjectURL(result.url);
    setSaveMsg(null);
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
        const from = Math.max(0, Math.min(comp.durationInFrames - 1, vFrom));
        const to = Math.max(from, Math.min(comp.durationInFrames - 1, vTo ?? comp.durationInFrames - 1));
        const total = to - from + 1;
        const start = Date.now();
        setProg({ r: 0, e: 0, total, eta: 0, at: start, start });
        const r = await renderMediaOnWeb({
          frameRange: [from, to],
          composition,
          inputProps: comp.defaultProps,
          scale,
          container: "mp4",
          videoBitrate: "high",
          licenseKey: "free-license",
          signal: ac.signal,
          delayRenderTimeoutInMilliseconds: 240_000,
          onProgress: (p) => {
            setProgress(p.progress);
            setProg({ r: p.renderedFrames, e: p.encodedFrames, total, eta: p.renderEstimatedTime, at: Date.now(), start });
          },
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
        <h1>Shorts Renderer</h1>
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

      {comp.durationInFrames > 1 ? (
        <div className="field">
          <span>Video range (frames, leave as is for the whole film)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" inputMode="numeric" min={0} max={comp.durationInFrames - 1} value={vFrom} disabled={!!busy} onChange={(e) => setVFrom(Number(e.target.value) || 0)} aria-label="From frame" />
            <input type="number" inputMode="numeric" min={0} max={comp.durationInFrames - 1} value={vTo ?? comp.durationInFrames - 1} disabled={!!busy} onChange={(e) => setVTo(Number(e.target.value))} aria-label="To frame" />
          </div>
        </div>
      ) : null}

      <div className="buttons">
        <button onClick={() => run("still")} disabled={!!busy}>Render still</button>
        <button className="primary" onClick={() => run("video")} disabled={!!busy}>Render MP4</button>
      </div>

      {busy ? (
        <div className="status">
          <div>{busy} {progress > 0 ? `${Math.round(progress * 100)}%` : ""}</div>
          {prog ? (
            <div className="sub" role="status">
              Frame {prog.e} of {prog.total} done · {Math.round((now - prog.start) / 1000)} s elapsed
              {prog.eta > 0 ? ` · about ${Math.max(1, Math.round(prog.eta / 1000))} s left` : ""}
              {now - prog.at > 45_000 ? ` · No progress for ${Math.round((now - prog.at) / 1000)} s. Frame ${prog.r} is the slow one. If this goes past 3 minutes, tap Cancel, render at Half res, and tell me this frame number.` : ""}
            </div>
          ) : null}
          <div className="bar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <button className="ghost" onClick={() => abort.current?.abort()}>Cancel</button>
        </div>
      ) : null}
      {error ? <div className="error">{error}</div> : null}

      {result ? (
        <div className="result">
          {result.kind === "image" ? <img src={result.url} alt="Rendered still" /> : <video src={result.url} controls playsInline loop />}
          <button className="primary" onClick={async () => { setSaveMsg("Waiting for your confirmation…"); setSaveMsg(await save(result.blob, result.name)); }}>Save {result.name}</button>
          {saveMsg ? <p className="sub" role="status">{saveMsg}</p> : null}
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
