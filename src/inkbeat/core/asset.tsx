// Imported 3D assets (Poly Haven / Sketchfab glTF, fetched by tools/assets/fetch.py into public/assets/<film>/<name>/):
// loaded once behind delayRender, cloned per placement, every material swapped for a toon material on the model's own
// base-colour texture (so the ink pass outlines it like the rest of the set), and fitted to a real-world size.
import { useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useState } from "react";
import { staticFile, useDelayRender } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toonMapMaterial } from "../mat/materials";
import type { V3 } from "../types";

const cache = new Map<string, Promise<THREE.Group>>();
const load = (url: string) => {
  let p = cache.get(url);
  if (!p) {
    p = new Promise<THREE.Group>((ok, bad) => new GLTFLoader().load(url, (g) => ok(g.scene), undefined, bad));
    cache.set(url, p);
  }
  return p;
};

export type AssetProps = {
  film: string;
  name: string;
  p?: V3;
  r?: V3;
  /** fit: scale so this axis of the model's box measures `size` metres ("x" | "y" | "z" | "max") */
  fit?: { axis: "x" | "y" | "z" | "max"; size: number };
  /** rotate the raw model first (fix a model authored lying down / facing another way) */
  pre?: V3;
  tint?: string;
  cast?: boolean;
  recv?: boolean;
  /** ground the model: its lowest point sits at y = 0 of the placement (default true); centre it on x/z (default true) */
  ground?: boolean;
  center?: boolean;
  doubleSide?: boolean;
};

export const Asset: React.FC<AssetProps> = ({ film, name, p, r, fit, pre, tint = "#ffffff", cast = true, recv = true, ground = true, center = true, doubleSide = false }) => {
  const url = staticFile(`assets/${film}/${name}/model.gltf`);
  const [src, setSrc] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);
  // useDelayRender (not the global delayRender) so the in-browser renderer waits too; release only after React has drawn
  // the loaded model (same pattern as useFonts)
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`asset ${film}/${name}`, { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    let live = true;
    load(url).then(
      (g) => { if (live) setSrc(g); },
      (e) => { console.error("asset failed", url, e); if (live) setFailed(true); },
    );
    return () => { live = false; };
  }, [url]);
  const invalidate = useThree((st) => st.invalidate);
  const advance = useThree((st) => st.advance);
  const obj = useMemo(() => {
    if (!src) return null;
    const inner = src.clone(true);
    if (pre) inner.rotation.set(pre[0], pre[1], pre[2]);
    inner.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const toon = mats.map((x) => {
        const sm = x as THREE.MeshStandardMaterial;
        const base = sm.color ? "#" + sm.color.getHexString() : "#ffffff";
        const col = new THREE.Color(base).multiply(new THREE.Color(tint));
        return toonMapMaterial(sm.map ?? null, "#" + col.getHexString(), doubleSide ? THREE.DoubleSide : THREE.FrontSide);
      });
      m.material = Array.isArray(m.material) ? toon : toon[0];
      m.castShadow = cast;
      m.receiveShadow = recv;
    });
    const wrap = new THREE.Group();
    wrap.add(inner);
    wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrap);
    const sz = box.getSize(new THREE.Vector3());
    let k = 1;
    if (fit) {
      const cur = fit.axis === "max" ? Math.max(sz.x, sz.y, sz.z) : sz[fit.axis];
      k = cur > 0 ? fit.size / cur : 1;
    }
    inner.scale.multiplyScalar(k);
    wrap.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(wrap);
    const c = b2.getCenter(new THREE.Vector3());
    inner.position.set(center ? -c.x : 0, ground ? -b2.min.y : 0, center ? -c.z : 0);
    if ((globalThis as { __assetDebug?: boolean }).__assetDebug) console.log("asset ready", name, "k", k.toFixed(4), "size", b2.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join(","));
    return wrap;
  }, [src, pre?.[0], pre?.[1], pre?.[2], fit?.axis, fit?.size, tint, cast, recv, ground, center, doubleSide]);
  // the canvas must redraw with the model before the frame is grabbed: invalidate, then release after two frames
  useEffect(() => {
    if (!obj && !failed) return;
    // Remotion's canvas uses frameloop "never" (one draw per frame), so an object that arrives later must force a draw
    invalidate();
    advance(performance.now());
    let a = 0, b = 0;
    a = requestAnimationFrame(() => { advance(performance.now()); b = requestAnimationFrame(() => continueRender(handle)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [obj, failed]); // eslint-disable-line react-hooks/exhaustive-deps -- continue exactly once
  if (!obj) return null;
  return <primitive object={obj} position={p} rotation={r} />;
};
