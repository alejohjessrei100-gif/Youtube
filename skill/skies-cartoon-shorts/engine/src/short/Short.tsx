// Skies Cartoon Shorts engine (story template: "The Knocker-Upper"), flat characters in a 3D toon world.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps as rawInputProps, useCurrentFrame } from "remotion";
const getInputProps = (): Record<string, unknown> => { try { return rawInputProps() as Record<string, unknown>; } catch { return {}; } };
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode, EffectComposer, RenderPass, EffectPass, Effect, Pass } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect, MotionBlurEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { FLASH_AT, SHOTS, TOTAL, layersAt, dofAt, camAt } from "./story";

export const SHORT_FRAMES = TOTAL; // the cleaned Loyal voiceover, 73.96 s

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; mblur: boolean; bloom: boolean; grade: boolean; grain: boolean; ms: number; shadows: boolean };
const urlMs = (() => { try { const q = new URLSearchParams(location.search), v = q.get("ms"), p = q.get("post"); return { ...(v ? { ms: Number(v) } : {}), ...(p ? JSON.parse(p) : {}) }; } catch { return {}; } })();
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, mblur: true, bloom: true, grade: true, grain: false, ms: 4, shadows: true, ...urlMs, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  // Below 1920 px tall (cloud renders) the chain runs at the real size with one level fewer per halving, so the
  // coarsest level covers the same share of the frame and the glow looks the same, at a fraction of the cost.
  mip.setSize = (w: number, h: number) => {
    const big = h >= 1900;
    const lv = big ? 6 : Math.max(3, 6 - Math.round(Math.log2(1920 / Math.max(h, 1))));
    const W = big ? Math.round((1920 * w) / Math.max(h, 1)) : w, H = big ? 1920 : h;
    if (mip.levels !== lv) { mip.resolution.set(W, H); mip.levels = lv; }
    setSize(W, H);
  };
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), prevCam = new THREE.PerspectiveCamera();

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("netflix kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; v: number; kit: Kit }> = ({ id, v, kit }) => {
  const raw = useCurrentFrame(), f = raw;
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    mblur: new MotionBlurEffect(),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  // manual composer (the @react-three/postprocessing wrapper renders nothing under Remotion's headless capture here)
  const { gl, size } = useThree();
  const comp = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: on.ms, frameBufferType: THREE.HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    if (on.ink) c.addPass(fx.ink as unknown as Pass);
    if (on.lens && on.pre) c.addPass(new EffectPass(camera, fx.lens.pre));
    if (on.lens) c.addPass(new EffectPass(camera, fx.lens.main));
    if (on.mblur) c.addPass(new EffectPass(camera, fx.mblur));
    const tail: Effect[] = [];
    if (on.bloom) tail.push(fx.bloom);
    tail.push(fx.tone);
    if (on.grade) tail.push(fx.grade);
    if (on.grain) tail.push(fx.grain);
    c.addPass(new EffectPass(camera, ...tail));
    return c;
  }, [gl, scene, camera, fx, on]);
  useEffect(() => { comp.setSize(size.width, size.height); }, [comp, size]);
  useFrame((_, dt) => { comp.render(dt); const w = window as unknown as { __rf?: Record<number, number> }; (w.__rf ??= {})[`${id}:${v}`] = raw; }, 1);
  const post = null;
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene, v));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(id, f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  // camera motion blur: where the look point and a far point were on screen one frame ago (prev camera) vs now
  { const c0 = camAt(id, f - 1, v); prevCam.position.set(...c0.pos); prevCam.up.set(0, 1, 0); prevCam.lookAt(...c0.look); prevCam.rotateZ(c0.roll);
    prevCam.fov = c0.fov; prevCam.aspect = cam.aspect; prevCam.updateProjectionMatrix(); prevCam.updateMatrixWorld();
    const dist = target.distanceTo(cam.position);
    let vx = 0, vy = 0;
    for (const p of [target.clone(), target.clone().addScaledVector(fwd, dist * 1.5)]) {
      const a = p.clone().project(cam), b = p.clone().project(prevCam); vx += (a.x - b.x) * 540 * 0.5; vy += (a.y - b.y) * 960 * 0.5; }
    const sc = (c: THREE.PerspectiveCamera) => 1 / (target.distanceTo(c.position) * Math.tan((c.fov * Math.PI) / 360));
    fx.mblur.set(vx / 2, vy / 2, (sc(cam) / sc(prevCam) - 1) * 0.5); }
  gradeFor(fx.grade, SHOTS[id - 1].light);
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr ?? (window as unknown as { __DPR?: number }).__DPR;
const ShotView: React.FC<{ id: number; v: number; kit: Kit; alpha: number }> = ({ id, v, kit, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: !!(window as unknown as { __PDB?: boolean }).__PDB }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} v={v} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const Short: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][Math.floor(f - FLASH_AT)] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} v={l.v} kit={kit} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
