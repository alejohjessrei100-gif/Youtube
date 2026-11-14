// Character3D: a 3D cartoon person built from the family in family.ts. Real lit meshes: an egg head with a drawn
// face decal and ears, a skin neck, a shaped torso with a painted outfit, thick two-tone limbs (sleeves, pants)
// with skin hands and small shoes, hair and hat meshes that cast shadows, inverted-hull ink on every part, a soft
// contact shadow. Acting: expressions, auto blinks and breathing from `t`, head tilt / nod / turn, lean, stoop, walk,
// props held in the hand (the arm chain is shared with core/ik.ts).
//   <Character3D {...CAST.adult} position={[0, 0, 0]} yaw={0.4} faceCamera={cam.pos} t={t} face={{ mouth: "smile" }} />
import { useThree } from "@react-three/fiber";
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Eyes, Hat, Mouth, V3 } from "../types";
import { clothTexture, hairTexture, hatTexture, outfitColors, shade } from "./clothes";
import type { Outfit, OutfitColors } from "./clothes";
import { faceTexture } from "./face";
import {
  ANKLE_Y,
  ARM_R,
  buildOf,
  CLOTH,
  CONTACT,
  DEFAULT_FACE_STYLE,
  EYE_X,
  EYE_Y,
  FACE_SPAN,
  FOOT_X,
  HAIR,
  HAND_R,
  HAT_COLORS,
  HEAD_BOT,
  HEAD_HW,
  HEAD_ROLL,
  HIP_X,
  INK_K,
  INK_PARTS,
  LEG_R,
  LIGHT,
  NECK_R,
  SKIN,
  TORSO_DEPTH,
  TORSO_R,
  WALK,
} from "./family";
import type { Build, FaceStyle } from "./family";
import {
  bunGeo,
  cuffGeo,
  earGeo,
  glassesGeo,
  hairGeo,
  hairHemGeo,
  handGeo,
  hatParts,
  hattedHairGeo,
  headGeo,
  profileOf,
  shoeGeo,
  taperTube,
  torsoGeo,
} from "./geometry";
import type { HairKind } from "./geometry";
import { HandProp } from "./handProps";
import type { HandPropKind } from "./handProps";
import { Inked } from "./Inked";
import { charMat, faceMat, hullUniforms, inkMat, skinMat } from "./material";
import type { FaceUniforms } from "./material";
import { armChain, layoutOf, toCharacter, torsoRadiusAt } from "./skeleton";
import type { ArmPose, Layout } from "./skeleton";

export type { V3 };

export type Look = {
  skin?: string;
  outfit?: Outfit;
  /** outfit colors (top, inner shirt, bottom, shoes, accent / buttons) */
  colors?: Partial<OutfitColors>;
  hair?: HairKind;
  hairColor?: string;
  hat?: Hat;
  hatColor?: string;
  /** the hat band / pom-pom color */
  hatBand?: string;
  /** round glasses; a string sets the frame color */
  glasses?: boolean | string;
  /** facial hair drawn in the face decal; a string sets its color (default: the hair color) */
  mustache?: boolean | string;
  beard?: boolean | string;
  ears?: boolean;
  /** face style overrides (eye color, brows, nose, blush, lash, lines) */
  face?: Partial<FaceStyle>;
  /** head shape variant (any integer); default derived from the look */
  seed?: number;
};

export type FaceState = {
  eyes?: Eyes;
  mouth?: Mouth;
  brows?: "none" | "neutral" | "angry" | "worried" | "raised";
  /** -1..1: the eyes look sideways */
  look?: number;
  /** force a blink (otherwise blinks come from `t`) */
  blink?: boolean;
  /** 0..1 red face, cheeks first */
  flush?: number;
  /** a sweat drop on the temple */
  sweat?: boolean;
};

export type Pose = ArmPose & {
  /** walk phase in radians (advance ~2π per stride) */
  walk?: number;
  /** head roll (degrees, + = toward the character's right), nod (+ = down), extra turn (+ = toward its left) */
  headTilt?: number;
  headNod?: number;
  headYaw?: number;
};

/** a reusable character definition (see cast.ts) */
export type CharacterSpec = { height: number; build?: Partial<Build>; look: Look; face?: FaceState };

export type CharacterProps = {
  /** the soles, world units */
  position: V3;
  /** radians, 0 = facing +z */
  yaw?: number;
  /** soles to the top of the skull (no hat), world units */
  height?: number;
  /** turn toward this point (usually the camera): the body by faceCameraAmount, the head the rest, stopping
   *  threeQuarter degrees short so the face reads 3/4 (0 = allow a frontal face) */
  faceCamera?: V3;
  faceCameraAmount?: number;
  threeQuarter?: number;
  build?: Partial<Build>;
  look?: Look;
  face?: FaceState;
  pose?: Pose;
  /** seconds: drives the automatic blinks and breathing (omit for a still pose) */
  t?: number;
  /** a prop in the hand */
  hold?: HandPropKind | null;
  holdSide?: "L" | "R";
  castShadow?: boolean;
};

const D2R = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const strHash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
/** bright hats are capped to this sRGB luminance so they never bloom into a halo next to the face */
const HAT_MAX_L = 0.82;
const capLum = (c: string, maxL: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const v = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const l = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  if (l <= maxL) return c;
  return "#" + v.map((x) => Math.round(Math.min(1, (x * maxL) / l) * 255).toString(16).padStart(2, "0")).join("");
};

/** deterministic blinks: one every ~3.9 s, 0.1 s long, about 18% doubles, none in the first 0.6 s */
export const blinkAt = (t: number, seed: number) => {
  if (t < 0.6) return false;
  const P = 3.9;
  const x = t + seed * 1.37;
  const k = Math.floor(x / P);
  const ph = x - k * P;
  const dbl = (k * 7919 + seed * 31) % 100 < 18;
  const on = (u: number) => u >= 0 && u < 0.1;
  return on(ph - 1.2) || (dbl && on(ph - 1.42));
};

/** the body yaw a character ends up with (pass it to core/ik.ts when the character uses faceCamera) */
export const bodyYawOf = (position: V3, yaw: number, faceCamera?: V3, amount = 0.5) => {
  if (!faceCamera) return yaw;
  const target = Math.atan2(faceCamera[0] - position[0], faceCamera[2] - position[2]);
  return yaw + wrap(target - yaw) * amount;
};

/** the head center in world space (for CastLight, focus and framing) */
export const headOf = (position: V3, height = 1.7, build?: Partial<Build>, pose: ArmPose = {}): V3 => {
  const l = layoutOf(build);
  const p = toCharacter(new THREE.Vector3(0, l.headY, 0), l, pose);
  return [position[0], position[1] + p.y * height, position[2] + p.z * height];
};

// push a point out of the torso so sleeves never sink into it
const clearTorso = (p: THREE.Vector3, l: Layout, margin: number) => {
  const rx = torsoRadiusAt(p.y, l);
  if (rx > 0) {
    const rz = rx * TORSO_DEPTH * l.b.torsoDepth;
    const e = Math.hypot(p.x / (rx * 1.08 + margin), p.z / (rz * 1.08 + margin));
    if (e < 1 && e > 1e-4) {
      p.x /= e;
      p.z /= e;
    }
  }
  return p;
};

const sstep01 = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const curvePts = (ctrl: THREE.Vector3[], n: number) => new THREE.CatmullRomCurve3(ctrl, false, "centripetal").getPoints(n);

export const Character3D: React.FC<CharacterProps> = (props) => {
  const { position } = props;
  const height = props.height ?? 1.7;
  const look = props.look ?? {};
  const face = props.face ?? {};
  const pose = props.pose ?? {};
  const b = buildOf(props.build);
  const l = layoutOf(b);
  const size = useThree((s) => s.size);
  hullUniforms.uViewH.value = size.height || 1920;

  const hat: Hat = look.hat ?? "none";
  const hair: HairKind = look.hair ?? "crop";
  const skin = look.skin ?? SKIN.light;
  const hairColor = look.hairColor ?? HAIR.espresso;
  const colors: OutfitColors = { top: CLOTH.teal, inner: CLOTH.cream, bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: CLOTH.horn, ...(look.colors ?? {}) };
  const outfit: Outfit = look.outfit ?? "shirt";
  const oc = outfitColors(outfit, colors);
  const seed = look.seed ?? Math.floor(strHash(colors.top + hat + hairColor + skin + height.toFixed(2)) * 16);
  const style: FaceStyle = { ...DEFAULT_FACE_STYLE, ...(look.face ?? {}) };
  const cast = props.castShadow ?? true;
  const hs = b.headScale;
  // ink hull base width; thinner on small heads (realistic proportions) so the ink never outweighs the face
  const W = INK_K * HEAD_HW * 2 * Math.min(1, Math.sqrt(hs));
  const ink = (part: keyof typeof INK_PARTS, k = 1) => INK_PARTS[part][0] * W * k;
  const under = (part: keyof typeof INK_PARTS) => INK_PARTS[part][1];

  // ---------------------------------------------------------------- orientation: body, then a 3/4 head
  const yaw0 = props.yaw ?? 0;
  const yaw = bodyYawOf(position, yaw0, props.faceCamera, props.faceCameraAmount);
  let headYaw = (pose.headYaw ?? 0) * D2R;
  if (props.faceCamera) {
    const target = Math.atan2(props.faceCamera[0] - position[0], props.faceCamera[2] - position[2]);
    const rest = wrap(target - yaw);
    const tq = (props.threeQuarter ?? 22) * D2R;
    const sgn = rest >= 0 ? 1 : -1;
    headYaw += Math.max(-50 * D2R, Math.min(50 * D2R, rest - sgn * tq));
  }
  const t = props.t;
  const breath = t === undefined ? 0 : Math.sin(t * 1.7 + seed);
  const blink = face.blink ?? (t !== undefined && blinkAt(t, seed));
  const walking = pose.walk !== undefined;
  const ph = pose.walk ?? 0;
  const walkBob = walking ? Math.abs(Math.cos(ph)) * 0.011 - 0.0055 : 0;
  const rollSeed = strHash(String(seed) + "roll") * 2 - 1;
  const seedRoll = Math.sign(rollSeed || 1) * (HEAD_ROLL[0] + (HEAD_ROLL[1] - HEAD_ROLL[0]) * Math.abs(rollSeed));
  const headTilt = (pose.headTilt ?? 0) + seedRoll;
  const headNod = (pose.headNod ?? 0) - b.stoop * 0.75;

  // ---------------------------------------------------------------- materials
  const headMat = useMemo(() => faceMat(skin, 1 / (2 * FACE_SPAN * HEAD_HW), FACE_SPAN), [skin]);
  useEffect(() => () => headMat.dispose(), [headMat]);
  const facial = (v: boolean | string | undefined) => (v ? (typeof v === "string" ? v : hairColor) : false);
  const ftex = faceTexture({
    eyes: face.eyes,
    mouth: face.mouth,
    brows: face.brows,
    look: face.look,
    blink,
    sweat: face.sweat,
    style,
    skin,
    browColor: style.browColor ?? (hair === "none" ? shade(skin, 0.45) : shade(hairColor, 0.72)),
    mustache: facial(look.mustache),
    beard: facial(look.beard),
  });
  {
    const u = headMat.userData.u as FaceUniforms;
    u.uFaceMap.value = ftex;
    u.uFlush.value = face.flush ?? 0;
  }
  const skinM = skinMat(skin);
  const torsoMat = charMat("#ffffff", { spec: LIGHT.clothSpec, map: clothTexture(outfit, colors, seed + 1) });
  const sleeveMat = charMat(oc.sleeve, { spec: LIGHT.clothSpec * 0.8 });
  const cuffMat = charMat(oc.cuff, { spec: LIGHT.clothSpec * 0.6 });
  const legMat = charMat(oc.leg, { spec: LIGHT.clothSpec * 0.7 });
  const hemMat = charMat(oc.hem, { spec: LIGHT.clothSpec * 0.5 });
  const shoeMat = charMat(colors.shoes, { spec: 0.55, gloss: 0.3 });
  const soleMat = charMat(shade(colors.shoes, 0.5), { spec: 0.1 });
  const hairMat = charMat(hairColor, { spec: 0.12, rim: 0.4, map: hairTexture() });

  // ---------------------------------------------------------------- limbs (rebuilt when the pose changes)
  const armL = pose.armL;
  const armR = pose.armR;
  const limbKey = [JSON.stringify(b), armL, armR, pose.armLFwd ?? 0, pose.armRFwd ?? 0, walking ? ph.toFixed(3) : "-"].join("|");
  const limbs = useMemo(() => {
    const arm = (side: "L" | "R") => {
      const s = side === "L" ? -1 : 1;
      const { S, E, H } = armChain(pose, side, l);
      if (walking) {
        const sw = -s * Math.sin(ph) * WALK.arm;
        E.z += sw * 0.45;
        H.z += sw;
      }
      const fore = H.clone().sub(E).normalize();
      const wrist = H.clone().addScaledVector(fore, -HAND_R * b.hand * 0.85);
      // the sleeve starts inside the torso, level with the shoulder joint, so its full root rounds over the
      // torso's shoulder corner (a shoulder, not an arm stuck on the side) and its open end never shows
      const S0 = new THREE.Vector3(S.x * 0.45, S.y + 0.022, S.z); // above S: a gentle bend (a sharp one folds the tube)
      const raw = curvePts([S0, S, E, wrist], 28);
      const cleared = raw.map((p, i) => (i < 6 || i > raw.length - 3 ? p : clearTorso(p.clone(), l, ARM_R[0] * b.limb * 1.15) /* the shaped arm is up to 1.14x the base radius */));
      // refit a smooth curve through every fourth cleared point, so pushing out of the torso never leaves a kink
      const pts = curvePts(cleared.filter((_, i) => i % 4 === 0 || i === cleared.length - 1), 28);
      // a shaped arm, not a tube: a full shoulder cap, the upper arm, a narrower elbow, the forearm, a slim wrist
      const d0 = S0.distanceTo(S);
      const d1 = S.distanceTo(E);
      const d2 = E.distanceTo(wrist);
      const uS = d0 / (d0 + d1 + d2);
      const uE = (d0 + d1) / (d0 + d1 + d2);
      const prof = profileOf([
        [0, 1.16],
        [uS, 1.14],
        [uS + (uE - uS) * 0.32, 1.06],
        [uE, 0.84],
        [uE + (1 - uE) * 0.28, 1.0],
        [1, 0.8],
      ]);
      const geo = taperTube(pts, ARM_R[0] * b.limb, ARM_R[1] * b.limb, 40, 14, prof);
      // hand roll about the forearm: relaxed hands turn palm-back so the fingers read from the front; raised hands
      // turn palm-forward (a wave)
      const ang = (side === "L" ? pose.armL : pose.armR) ?? [6, 6];
      const raise = ang[0] + ang[1] * 0.5;
      const roll = s * (45 - 135 * sstep01(25, 75, raise)) * D2R;
      return { geo, hand: H, wrist, fore, side: s, S, roll, open: raise > 50 };
    };
    const leg = (side: 1 | -1) => {
      const sw = walking ? side * Math.sin(ph) * WALK.stride : 0;
      const lift = walking ? Math.max(0, side * Math.cos(ph)) * WALK.lift : 0;
      const hx = side * TORSO_R * b.torsoWidth * HIP_X;
      const fx = side * TORSO_R * b.torsoWidth * FOOT_X;
      const hip = new THREE.Vector3(hx, l.hipY, 0);
      const ankle = new THREE.Vector3(fx, ANKLE_Y + lift, sw);
      const knee = new THREE.Vector3((hx + fx) / 2, (l.hipY + ankle.y) / 2 + lift * 0.3, sw * 0.45 + 0.008 + lift * 0.6);
      const pts = curvePts([hip, knee, ankle], 30);
      const r = LEG_R.map((x) => x * b.limb) as [number, number];
      return { geo: taperTube(pts, r[0], r[1], 34, 16), ankle, lift, r1: r[1], dir: ankle.clone().sub(knee).normalize() };
    };
    return { aL: arm("L"), aR: arm("R"), lL: leg(-1), lR: leg(1) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limbKey]);
  useEffect(
    () => () => {
      limbs.aL.geo.dispose();
      limbs.aR.geo.dispose();
      limbs.lL.geo.dispose();
      limbs.lR.geo.dispose();
    },
    [limbs],
  );

  const holdArm = (props.holdSide ?? "R") === "L" ? limbs.aL : limbs.aR;
  const quatAlong = (d: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  // a hand frame with no arbitrary roll: +y along the forearm, +z toward the body's front (or up when the forearm
  // points forward). Local +x then maps to the body's -x, so handGeo gets the mirrored side.
  const handQuat = (d: THREE.Vector3, roll = 0) => {
    const Y = d.clone().normalize();
    let Z = new THREE.Vector3(0, 0, 1).addScaledVector(Y, -Y.z);
    if (Z.length() < 0.35) Z = UP.clone().addScaledVector(Y, -Y.y);
    Z.normalize();
    const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
  };

  // ---------------------------------------------------------------- head parts
  const head = headGeo(seed);
  const parts = hatParts(hat, seed);
  const hatColor = capLum(look.hatColor ?? HAT_COLORS[hat] ?? CLOTH.charcoal, HAT_MAX_L);
  const hatBand = look.hatBand ?? (hat === "beanie" ? CLOTH.cream : hat === "sunhat" ? CLOTH.rose : shade(hatColor, 0.6));
  const hairG = hair === "none" ? null : hat !== "none" ? hattedHairGeo(hat, hair, seed) : hairGeo(hair, seed);
  const hairHem = hairG && hat !== "none" ? hairHemGeo(hairG) : null;
  const bun = hair === "bun" && hat === "none" ? bunGeo(seed) : null;
  const ears = (look.ears ?? true) && !(hair === "bob" && hat === "none");
  const glasses = look.glasses ? glassesGeo(seed, EYE_X, EYE_Y) : null;
  const glassesMat = charMat(typeof look.glasses === "string" ? look.glasses : "#4a3426", { spec: 0.8, gloss: 0.5 });

  const lean = (pose.lean ?? 0) * D2R;
  const bob = (pose.bob ?? 0) / 430 + walkBob;
  const shoes = shoeGeo();
  const handScale = HAND_R * b.hand;
  // idle arm swing: the finished arm turns a little about its shoulder (no geometry rebuild); not on a holding arm,
  // so a held prop stays exactly in the hand. A pure function of t.
  const holdSide = props.hold ? (props.holdSide ?? "R") : null;
  const swing = (side: number) =>
    walking || props.t === undefined || (holdSide && (holdSide === "R" ? 1 : -1) === side) ? 0 : (1.3 * Math.sin(props.t * 1.1 + side * 1.7) + 0.5 * Math.sin(props.t * 0.47 + side)) * D2R;

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={height}>
      <ContactShadow w={TORSO_R * 2 * b.torsoWidth * CONTACT.size} />
      <group rotation={[lean, 0, 0]}>
        {/* legs, pant hems and shoes */}
        {[limbs.lL, limbs.lR].map((g, i) => (
          <group key={i}>
            <Inked geo={g.geo} mat={legMat} ink={ink("limb")} under={under("limb")} cast={cast} />
            <Inked geo={cuffGeo()} mat={hemMat} ink={ink("limb", 0.6)} under={0.2} cast={cast} position={g.ankle.clone().addScaledVector(g.dir, -g.r1 * 0.6)} quaternion={quatAlong(g.dir)} scale={[g.r1 * 1.12, g.r1 * 0.9, g.r1 * 1.12]} />
            <group position={[g.ankle.x, g.lift, g.ankle.z]} rotation={[-g.lift * 3, 0, 0]}>
              <Inked geo={shoes.upper} mat={shoeMat} ink={ink("shoe")} under={under("shoe")} cast={cast} />
              <Inked geo={shoes.sole} mat={soleMat} ink={ink("shoe", 0.7)} under={0.1} cast={cast} />
            </group>
          </group>
        ))}
        <group position={[0, bob, 0]}>
          {/* upper body: stoops about the hips */}
          <group position={[0, l.hipY, 0]} rotation={[b.stoop * D2R, 0, 0]}>
            <group position={[0, -l.hipY, 0]}>
              <group position={[0, l.torsoY0, 0]} scale={[1 + breath * 0.004, 1 + breath * 0.007, 1 + breath * 0.006]}>
                <Inked geo={torsoGeo(b.torso, b.torsoWidth, b.torsoDepth, b.torsoHeight)} mat={torsoMat} ink={ink("torso")} under={under("torso")} cast={cast} />
              </group>
              <Neck l={l} mat={skinM} ink={ink("ear")} cast={cast} />
              {/* arms, cuffs, hands */}
              {[limbs.aL, limbs.aR].map((a, i) => (
                <group key={i} position={a.S} rotation={[swing(a.side), 0, 0]}>
                  <group position={[-a.S.x, -a.S.y, -a.S.z]}>
                    <Inked geo={a.geo} mat={sleeveMat} ink={ink("limb")} under={under("limb")} cast={cast} />
                    <Inked geo={cuffGeo()} mat={cuffMat} ink={ink("limb", 0.6)} under={0.2} cast={cast} position={a.wrist} quaternion={quatAlong(a.fore)} scale={[ARM_R[1] * b.limb * 1.12, ARM_R[1] * b.limb * 0.7, ARM_R[1] * b.limb * 1.12]} />
                    <group position={a.hand} quaternion={handQuat(a.fore, a.roll)}>
                      {/* fingers are thin: a lighter hull so it never fills the gaps between them */}
                      <Inked geo={handGeo(-a.side as 1 | -1, holdSide !== null && (holdSide === "R" ? 1 : -1) === a.side, a.open)} mat={skinM} ink={ink("hand", 0.55)} under={0.25} cast={cast} scale={handScale} />
                    </group>
                  </group>
                </group>
              ))}
              {props.hold ? (
                <group position={holdArm.hand} quaternion={quatAlong(holdArm.fore)}>
                  <HandProp kind={props.hold} />
                </group>
              ) : null}
              {/* head: pivots at the chin */}
              <group position={[0, l.chinY + breath * 0.0012, 0]} rotation={[0, headYaw, 0]}>
                <group rotation={[headNod * D2R, 0, -headTilt * D2R]}>
                  <group position={[0, HEAD_BOT * HEAD_HW * hs, 0]} scale={hs}>
                    <Inked geo={head} mat={headMat} ink={ink("head") / hs} under={under("head")} cast={cast} />
                    {ears
                      ? ([1, -1] as const).map((s) => <Inked key={s} geo={earGeo(s, seed)} mat={skinM} ink={ink("ear") / hs} under={under("ear")} cast={cast} />)
                      : null}
                    {hairG ? <Inked geo={hairG} mat={hairMat} ink={ink("hair") / hs} under={under("hair")} cast={cast} /> : null}
                    {hairHem ? <mesh geometry={hairHem} material={inkMat()} /> : null}
                    {bun ? <Inked geo={bun} mat={hairMat} ink={ink("hair") / hs} under={under("hair")} cast={cast} /> : null}
                    {/* thin wire: no post ink on the glasses (it would fill the rims) */}
                    {glasses ? <mesh geometry={glasses} material={glassesMat} castShadow={cast} userData={{ outline: false }} /> : null}
                    {parts.map((p, i) => (
                      <Inked
                        key={i}
                        geo={p.geo}
                        mat={charMat(p.color === "hat" ? hatColor : p.color === "band" ? hatBand : p.color, { spec: p.spec ?? 0, gloss: (p.spec ?? 0) * 0.2, rim: p.rim, map: p.tex ? hatTexture(p.tex) : null })}
                        ink={p.hull ? (ink("hat") * (p.inkK ?? 1)) / hs : 0}
                        under={under("hat")}
                        cast={cast && (p.cast ?? false)}
                      />
                    ))}
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ neck
const neckCache = new Map<string, THREE.BufferGeometry>();
const Neck: React.FC<{ l: Layout; mat: THREE.Material; ink: number; cast: boolean }> = ({ l, mat, ink, cast }) => {
  const r = NECK_R * Math.sqrt(l.b.headScale) * (0.85 + 0.15 * l.b.torsoWidth);
  const key = [r.toFixed(4), l.neckY0.toFixed(4), l.neckY1.toFixed(4)].join("|");
  let g = neckCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r * 0.94, r, l.neckY1 - l.neckY0, 24, 1, true);
    g.translate(0, (l.neckY0 + l.neckY1) / 2, -r * 0.15);
    if (neckCache.size > 64) neckCache.clear();
    neckCache.set(key, g);
  }
  return <Inked geo={g} mat={mat} ink={ink} under={0.2} cast={cast} />;
};

// ------------------------------------------------------------------ soft contact shadow
let shadowTex: THREE.CanvasTexture | null = null;
const contactTex = () => {
  if (shadowTex) return shadowTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const ctx = cv.getContext("2d")!;
  const [r, g0, b] = CONTACT.rgb;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${r},${g0},${b},1)`);
  g.addColorStop(0.5, `rgba(${r},${g0},${b},0.7)`);
  g.addColorStop(1, `rgba(${r},${g0},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(cv);
  shadowTex.colorSpace = THREE.SRGBColorSpace;
  return shadowTex;
};
let shadowMat: THREE.MeshBasicMaterial | null = null;
let shadowGeo: THREE.PlaneGeometry | null = null;
const ContactShadow: React.FC<{ w: number }> = ({ w }) => {
  shadowMat ??= new THREE.MeshBasicMaterial({ map: contactTex(), transparent: true, opacity: CONTACT.opacity, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
  shadowGeo ??= new THREE.PlaneGeometry(1, 1);
  return <mesh geometry={shadowGeo} material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.012]} scale={[w, w * 0.72, 1]} renderOrder={1} />;
};

export { charLook, setCharInk } from "./material";
export type { Outfit, OutfitColors } from "./clothes";
export type { HairKind } from "./geometry";
export type { HandPropKind } from "./handProps";
export type { Build, FaceStyle } from "./family";
