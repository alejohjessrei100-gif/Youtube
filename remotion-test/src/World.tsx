import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  dirtTex,
  fabricTex,
  flameTex,
  glowTex,
  grassTex,
  rnd,
  reseed,
  roofTex,
  stoneTex,
  woodTex,
  leafTex,
} from "./textures";

/* ---------------------------------------------------------------- helpers */

const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => lerp(v, b[i], t)) as [number, number, number];

type V3 = [number, number, number];
const OUTLINE = "#0a0a0a";

/* ------------------------------------------------------------------ faces */

type Face = "calm" | "determined" | "laugh";

const faceTexture = (face: Face) => {
  // Equirectangular canvas for SphereGeometry UVs; front (+z) is u = 0.25.
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 2048, 1024);
  g.translate(512, 512);
  g.scale(1, 2); // 360° spans 2048 px, 180° spans 1024 px -> make strokes round
  g.scale(0.5, 0.5);
  g.strokeStyle = g.fillStyle = "#101010";
  g.lineCap = "round";
  g.lineJoin = "round";
  const ex = 200,
    ey = -90;
  if (face === "laugh") {
    g.lineWidth = 34;
    for (const x of [-ex, ex]) {
      g.beginPath();
      g.moveTo(x - 62, ey + 26);
      g.lineTo(x, ey - 34);
      g.lineTo(x + 62, ey + 26);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-150, 70);
    g.quadraticCurveTo(0, 330, 150, 70);
    g.closePath();
    g.fill();
    g.fillStyle = "#d9475b";
    g.beginPath();
    g.ellipse(0, 190, 74, 40, 0, 0, 7);
    g.fill();
    g.fillStyle = "#ffffff";
    g.fillRect(-110, 72, 220, 34);
  } else {
    // eyes: black ovals with a white glint
    for (const x of [-ex, ex]) {
      g.fillStyle = "#101010";
      g.beginPath();
      g.ellipse(x, ey, 40, 58, 0, 0, 7);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.ellipse(x + 12, ey - 20, 12, 14, 0, 0, 7);
      g.fill();
    }
    g.fillStyle = "#101010";
    g.lineWidth = 30;
    if (face === "determined") {
      g.beginPath();
      g.moveTo(-ex - 80, ey - 150);
      g.lineTo(-ex + 60, ey - 100);
      g.moveTo(ex + 80, ey - 150);
      g.lineTo(ex - 60, ey - 100);
      g.stroke();
      g.beginPath();
      g.moveTo(-70, 130);
      g.quadraticCurveTo(10, 150, 90, 110);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(-ex - 60, ey - 130);
      g.quadraticCurveTo(-ex, ey - 160, -ex + 60, ey - 130);
      g.moveTo(ex - 60, ey - 130);
      g.quadraticCurveTo(ex, ey - 160, ex + 60, ey - 130);
      g.stroke();
      g.beginPath();
      g.moveTo(-90, 110);
      g.quadraticCurveTo(0, 190, 90, 110);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/* ------------------------------------------------------------- character */

// Inverted hull with an *absolute* thickness, so thin and thick parts get the
// same bold ink line (the reference characters have a constant thick outline).
const Inked: React.FC<{
  geo: THREE.BufferGeometry;
  size: V3; // half-extents of the shape, used to compute the hull scale
  ink?: number;
  position?: V3;
  rotation?: V3;
  children: React.ReactNode; // the material
}> = ({ geo, size, ink = 0.04, position, rotation, children }) => (
  <group position={position} rotation={rotation}>
    <mesh geometry={geo} castShadow receiveShadow>
      {children}
    </mesh>
    <mesh geometry={geo} scale={size.map((s) => (s + ink) / s) as V3}>
      <meshBasicMaterial color={OUTLINE} side={THREE.BackSide} />
    </mesh>
  </group>
);

const Stick: React.FC<{ from: V3; angle: number; len: number; r?: number; tiltX?: number }> = ({
  from,
  angle,
  len,
  r = 0.032,
  tiltX = 0,
}) => (
  <group position={from} rotation={[tiltX, 0, angle]}>
    <mesh position={[0, -len / 2, 0]} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshBasicMaterial color={OUTLINE} />
    </mesh>
  </group>
);

type CharProps = {
  position: V3;
  rotY?: number;
  robe: [string, string, string];
  face: Face;
  hair?: "bun" | "cap" | "bald";
  armL?: number;
  armR?: number;
  bounce?: number;
  headTilt?: number;
  headTurn?: number;
  children?: React.ReactNode;
};

const Character: React.FC<CharProps> = ({
  position,
  rotY = 0,
  robe,
  face,
  hair,
  armL = 0.22,
  armR = -0.22,
  bounce = 0,
  headTilt = 0,
  headTurn = 0,
  children,
}) => {
  const faceTex = useMemo(() => faceTexture(face), [face]);
  const robeTex = useMemo(() => fabricTex(...robe), [robe]);
  const head = useMemo(() => new THREE.SphereGeometry(0.5, 64, 40), []);
  const body = useMemo(() => new THREE.CapsuleGeometry(0.22, 0.86, 10, 28), []);
  const bun = useMemo(() => new THREE.SphereGeometry(0.17, 24, 16), []);
  const foot = useMemo(() => new THREE.SphereGeometry(0.09, 16, 10), []);
  const armLen = 0.8;
  const shoulderY = 1.78;
  const handR: V3 = [-0.24 + Math.sin(armR) * armLen, shoulderY - Math.cos(armR) * armLen, 0.02];
  return (
    <group position={[position[0], position[1] + bounce, position[2]]} rotation={[0, rotY, 0]}>
      {/* legs + feet */}
      <Stick from={[-0.11, 1.0, 0]} angle={0.03} len={0.98} />
      <Stick from={[0.11, 1.0, 0]} angle={-0.03} len={0.98} />
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} geometry={foot} position={[x, 0.05, 0.05]} scale={[1, 0.55, 1.6]} castShadow>
          <meshStandardMaterial color="#141414" roughness={0.6} />
        </mesh>
      ))}
      {/* tall tube body with woven robe */}
      <Inked geo={body} size={[0.22, 0.65, 0.22]} ink={0.045} position={[0, 1.45, 0]}>
        <meshStandardMaterial map={robeTex} roughness={0.85} />
      </Inked>
      {/* arms */}
      <Stick from={[0.24, shoulderY, 0.02]} angle={armL} len={armLen} />
      <Stick from={[-0.24, shoulderY, 0.02]} angle={armR} len={armLen} />
      <group position={handR}>{children}</group>
      {/* neck */}
      <Stick from={[0, 2.22, 0]} angle={0} len={0.2} r={0.03} />
      {/* head */}
      <group position={[0, 2.62, 0]} rotation={[headTilt, headTurn, 0]}>
        <Inked geo={head} size={[0.5, 0.5, 0.5]} ink={0.045}>
          <meshStandardMaterial
            map={faceTex}
            roughness={0.92}
            metalness={0}
            emissive="#ffffff"
            emissiveIntensity={0.16}
            emissiveMap={faceTex}
          />
        </Inked>
        {hair === "bun" && (
          <Inked geo={bun} size={[0.17, 0.17, 0.17]} ink={0.03} position={[0, 0.55, -0.1]}>
            <meshStandardMaterial color="#24170f" roughness={0.5} />
          </Inked>
        )}
        {hair === "cap" && (
          <Inked geo={head} size={[0.52, 0.31, 0.52]} ink={0.03} position={[0, 0.22, -0.02]}>
            <meshStandardMaterial color="#b3261e" roughness={0.6} />
          </Inked>
        )}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------ set pieces */

const Flame: React.FC<{ t: number; s?: number; seed?: number }> = ({ t, s = 1, seed = 0 }) => {
  const tex = flameTex();
  const glow = glowTex();
  const f = 0.9 + 0.12 * Math.sin(t * 19 + seed) + 0.08 * Math.sin(t * 31 + seed * 2);
  return (
    <group>
      <sprite scale={[0.42 * s, 0.85 * s * f, 1]} position={[0, 0.35 * s, 0]}>
        <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthWrite={false} color="#ffffff" fog={false} />
      </sprite>
      <sprite scale={[0.28 * s, 0.55 * s * (2 - f), 1]} position={[0.04 * s, 0.3 * s, 0.01]}>
        <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthWrite={false} color="#ffd18a" fog={false} />
      </sprite>
      <sprite scale={[2.2 * s, 2.2 * s, 1]} position={[0, 0.35 * s, 0]}>
        <spriteMaterial map={glow} blending={THREE.AdditiveBlending} depthWrite={false} color="#ff8a2a" opacity={0.45} transparent fog={false} />
      </sprite>
    </group>
  );
};

const Torch: React.FC<{ position: V3; t: number; seed?: number; light?: boolean }> = ({ position, t, seed = 0, light = true }) => {
  const wood = woodTex([1, 1], "#5b3a22", 2);
  const flick = 0.85 + 0.15 * Math.sin(t * 17 + seed) * Math.sin(t * 6.1 + seed);
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.065, 2.2, 10]} />
        <meshStandardMaterial map={wood} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <cylinderGeometry args={[0.12, 0.07, 0.2, 10]} />
        <meshStandardMaterial color="#2a2018" roughness={0.6} metalness={0.4} />
      </mesh>
      <group position={[0, 2.3, 0]}>
        <Flame t={t} s={0.7} seed={seed} />
      </group>
      {light && (
        <pointLight position={[0, 2.6, 0]} color="#ff9a40" intensity={18 * flick} distance={13} decay={1.7} />
      )}
    </group>
  );
};

const Lantern: React.FC<{ t: number }> = ({ t }) => {
  const flick = 0.88 + 0.12 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1);
  return (
    <group position={[0, -0.22, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <torusGeometry args={[0.07, 0.012, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1410" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.11, 0.11, 0.26, 6]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.1 * flick} transparent opacity={0.9} />
      </mesh>
      {[0.14, -0.14].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 6]} />
          <meshStandardMaterial color="#1a1410" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      <sprite scale={[0.9, 0.9, 1]}>
        <spriteMaterial map={glowTex()} blending={THREE.AdditiveBlending} depthWrite={false} color="#ffb04a" opacity={0.25} transparent fog={false} />
      </sprite>
      <pointLight position={[0.15, -0.3, 0.45]} color="#ffab4a" intensity={4 * flick} distance={7} decay={1.9} castShadow shadow-bias={-0.003} shadow-normalBias={0.05} shadow-mapSize={[512, 512]} />
    </group>
  );
};

const Sky: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { moonDir: { value: new THREE.Vector3(-4, 13, -45).normalize() } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
          varying vec3 vP; uniform vec3 moonDir;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
          void main(){
            vec3 d = normalize(vP);
            float y = clamp(d.y, 0.0, 1.0);
            vec3 top = vec3(0.07,0.10,0.20), mid = vec3(0.17,0.23,0.40), hor = vec3(0.36,0.40,0.55);
            vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, y)); c = mix(c, top, smoothstep(0.25, 0.9, y));
            // moon glow in the sky
            float m = max(dot(d, moonDir), 0.0);
            c += vec3(0.35,0.38,0.55) * pow(m, 40.0) + vec3(0.12,0.14,0.25) * pow(m, 6.0);
            // clouds: fbm on a projected plane, lit on the moon side
            vec2 uv = d.xz / max(d.y + 0.15, 0.05) * 1.3;
            float cl = fbm(uv * 1.2 + vec2(3.0, 1.0));
            cl = smoothstep(0.42, 0.7, cl) * smoothstep(0.0, 0.12, y);
            float edge = fbm(uv * 1.2 + vec2(3.05, 1.04));
            vec3 cloudCol = mix(vec3(0.12,0.14,0.22), vec3(0.55,0.58,0.70), smoothstep(0.45, 0.85, edge) * (0.35 + 0.9 * pow(m, 4.0)));
            c = mix(c, cloudCol, cl * 0.9);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    []
  );
  const stars = useMemo(() => {
    reseed(77);
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 700; i++) {
      const th = rnd() * Math.PI * 2, y = 0.25 + rnd() * 0.75, r = Math.sqrt(1 - y * y);
      p.push(Math.cos(th) * r * 180, y * 180, Math.sin(th) * r * 180);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <>
      <mesh material={mat} renderOrder={-10}>
        <sphereGeometry args={[220, 48, 24]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={0.55} sizeAttenuation transparent opacity={0.7} fog={false} />
      </points>
    </>
  );
};

const Moon: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fffbea";
    g.fillRect(0, 0, 256, 256);
    reseed(5);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(190,185,170,${0.15 + rnd() * 0.25})`;
      g.beginPath();
      g.ellipse(rnd() * 256, rnd() * 256, 8 + rnd() * 26, 8 + rnd() * 22, 0, 0, 7);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[-4, 13, -45]}>
      <mesh>
        <sphereGeometry args={[2.3, 48, 32]} />
        <meshBasicMaterial map={tex} color="#ffffff" fog={false} toneMapped={false} />
      </mesh>
      <sprite scale={[11, 11, 1]} position={[0, 0, -1]}>
        <spriteMaterial map={glowTex()} blending={THREE.AdditiveBlending} depthWrite={false} color="#cdd6ff" opacity={0.35} transparent fog={false} />
      </sprite>
    </group>
  );
};

const House: React.FC<{ position: V3; rotY?: number; w?: number; d?: number; h?: number; wall?: string; roof?: string; t: number }> = ({
  position,
  rotY = 0,
  w = 3.4,
  d = 3,
  h = 2.7,
  wall = "#8a5a34",
  roof = "#7d3328",
  t,
}) => {
  const wood = woodTex([w / 1.6, h / 1.6], wall, 7);
  const stone = stoneTex([w / 1.5, 0.4]);
  const tiles = roofTex([2.5, 2], roof);
  const beam = woodTex([1, 1], "#3d2616", 2);
  const ridge = h + 1.5;
  const roofGeo = useMemo(() => {
    // gabled roof as a triangular prism with overhang
    const s = new THREE.Shape();
    s.moveTo(-w / 2 - 0.35, 0);
    s.lineTo(0, 1.5);
    s.lineTo(w / 2 + 0.35, 0);
    s.lineTo(w / 2 + 0.2, -0.08);
    s.lineTo(0, 1.35);
    s.lineTo(-w / 2 - 0.2, -0.08);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.7, bevelEnabled: false });
    g.translate(0, 0, -(d + 0.7) / 2);
    return g;
  }, [w, d]);
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(0, 1.35);
    s.lineTo(w / 2, 0);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [w]);
  const win = 0.85 + 0.15 * Math.sin(t * 3 + position[0]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.15, 0.5, d + 0.15]} />
        <meshStandardMaterial map={stone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.5 + (h - 0.5) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h - 0.5, d]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>
      {[1, -1].map((z) => (
        <mesh key={z} geometry={gable} position={[0, h, (z * d) / 2 + z * 0.001]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
          <meshStandardMaterial map={wood} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh geometry={roofGeo} position={[0, h, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={tiles} roughness={0.8} />
      </mesh>
      {/* corner beams */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[(x * w) / 2, h / 2 + 0.25, (z * d) / 2]} castShadow>
          <boxGeometry args={[0.18, h - 0.5, 0.18]} />
          <meshStandardMaterial map={beam} roughness={0.9} />
        </mesh>
      ))}
      {/* windows: frame + warm glass + glow */}
      {[-w / 4, w / 4].map((x) => (
        <group key={x} position={[x, 1.65, d / 2 + 0.02]}>
          <mesh position={[0, 0, -0.01]}>
            <boxGeometry args={[0.8, 0.9, 0.06]} />
            <meshStandardMaterial color="#2b1a0e" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.62, 0.72]} />
            <meshStandardMaterial color="#ffcf7a" emissive="#ffae4a" emissiveIntensity={2.4 * win} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.05, 0.72, 0.03]} />
            <meshStandardMaterial color="#2b1a0e" />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.62, 0.05, 0.03]} />
            <meshStandardMaterial color="#2b1a0e" />
          </mesh>
          <mesh position={[0, -0.5, 0.12]}>
            <boxGeometry args={[0.9, 0.08, 0.25]} />
            <meshStandardMaterial map={beam} />
          </mesh>
        </group>
      ))}
      {/* door */}
      <mesh position={[0, 1.05, d / 2 + 0.03]}>
        <boxGeometry args={[0.85, 1.4, 0.06]} />
        <meshStandardMaterial map={woodTex([1, 1], "#4a2c18", 5)} roughness={0.8} />
      </mesh>
      {/* chimney */}
      <mesh position={[w / 4, ridge - 0.2, -d / 6]} castShadow>
        <boxGeometry args={[0.45, 1.3, 0.45]} />
        <meshStandardMaterial map={stone} roughness={0.95} />
      </mesh>
      <pointLight position={[0, 1.7, d / 2 + 1.3]} color="#ffaa50" intensity={9 * win} distance={7} decay={1.8} />
    </group>
  );
};

const Barrel: React.FC<{ position: V3; rot?: number }> = ({ position, rot = 0 }) => {
  const wood = woodTex([3, 1], "#7a4c2a", 1);
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 1, 18, 3]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {[0.15, 0.85].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.39, 0.025, 6, 24]} />
          <meshStandardMaterial color="#2d2d2d" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const Crate: React.FC<{ position: V3; rot?: number; s?: number }> = ({ position, rot = 0, s = 0.8 }) => (
  <mesh position={[position[0], position[1] + s / 2, position[2]]} rotation={[0, rot, 0]} castShadow receiveShadow>
    <boxGeometry args={[s, s, s]} />
    <meshStandardMaterial map={woodTex([1, 1], "#a0703f", 4)} roughness={0.85} />
  </mesh>
);

const Fence: React.FC<{ from: V3; to: V3 }> = ({ from, to }) => {
  const wood = woodTex([1, 1], "#6b4528", 2);
  const dx = to[0] - from[0], dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.round(len / 1.4));
  const ang = Math.atan2(-dz, dx);
  return (
    <group position={from} rotation={[0, ang, 0]}>
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[(i / n) * len, 0.55, 0]} castShadow>
          <boxGeometry args={[0.12, 1.1, 0.12]} />
          <meshStandardMaterial map={wood} roughness={0.9} />
        </mesh>
      ))}
      {[0.4, 0.85].map((y) => (
        <mesh key={y} position={[len / 2, y, 0]} castShadow>
          <boxGeometry args={[len, 0.09, 0.06]} />
          <meshStandardMaterial map={wood} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const Tree: React.FC<{ position: V3; s?: number; seed?: number }> = ({ position, s = 1, seed = 1 }) => {
  const blobs = useMemo(() => {
    reseed(seed * 101);
    return Array.from({ length: 16 }, () => ({
      p: [(rnd() - 0.5) * 2.8, 3.0 + rnd() * 2.2, (rnd() - 0.5) * 2.8] as V3,
      r: 0.7 + rnd() * 0.6,
      c: new THREE.Color().setHSL(0.24 + rnd() * 0.06, 0.38, 0.30 + rnd() * 0.1),
    }));
  }, [seed]);
  const geo = useMemo(() => {
    // lumpy leaf clump: displaced icosphere
    const g = new THREE.IcosahedronGeometry(1, 4);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 7.1) * Math.sin(v.y * 6.3) * Math.sin(v.z * 5.7);
      v.multiplyScalar(1 + 0.16 * n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const leaves = leafTex();
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.32, 3.2, 10]} />
        <meshStandardMaterial map={woodTex([1, 2], "#4a3020", 1)} roughness={1} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={geo} position={b.p} scale={b.r} castShadow receiveShadow>
          <meshStandardMaterial color={b.c} map={leaves} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

const Grass: React.FC<{ center: V3; radius: number; count: number; seed: number; avoid?: [number, number, number][] }> = ({
  center,
  radius,
  count,
  seed,
  avoid = [],
}) => {
  const mesh = useMemo(() => {
    reseed(seed);
    const geo = new THREE.ConeGeometry(0.016, 0.17, 3);
    geo.translate(0, 0.085, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
    const im = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < count * 3 && k < count; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
      const x = center[0] + Math.cos(a) * r, z = center[2] + Math.sin(a) * r;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5));
      const sc = 0.6 + rnd() * 0.9;
      m.compose(new THREE.Vector3(x, center[1], z), q, new THREE.Vector3(sc, sc * (0.7 + rnd()), sc));
      im.setMatrixAt(k, m);
      im.setColorAt(k, col.setHSL(0.18 + rnd() * 0.08, 0.32, 0.2 + rnd() * 0.12));
      k++;
    }
    im.count = k;
    im.receiveShadow = true;
    return im;
  }, [center, radius, count, seed, avoid]);
  return <primitive object={mesh} />;
};

const Rock: React.FC<{ position: V3; s: V3; rot?: number }> = ({ position, s, rot = 0 }) => (
  <mesh position={position} scale={s} rotation={[0, rot, 0.2]} castShadow receiveShadow>
    <dodecahedronGeometry args={[1, 0]} />
    <meshStandardMaterial color="#6b6660" roughness={0.95} flatShading />
  </mesh>
);

const FirePit: React.FC<{ position: V3; t: number }> = ({ position, t }) => {
  const flick = 0.85 + 0.15 * Math.sin(t * 21) * Math.sin(t * 5.3);
  return (
    <group position={position}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return <Rock key={i} position={[Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75]} s={[0.2, 0.15, 0.18]} rot={a} />;
      })}
      {[0, 1.2, 2.4].map((a) => (
        <mesh key={a} position={[0, 0.12, 0]} rotation={[0, a, Math.PI / 2 - 0.25]}>
          <cylinderGeometry args={[0.06, 0.06, 0.9, 8]} />
          <meshStandardMaterial color="#2c1a0f" roughness={1} emissive="#ff4a10" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <Flame t={t} s={1.3} seed={3} />
      <pointLight position={[0, 0.9, 0]} color="#ff8a30" intensity={20 * flick} distance={14} decay={1.6} castShadow shadow-bias={-0.003} shadow-normalBias={0.05} shadow-mapSize={[512, 512]} />
    </group>
  );
};

/* ---------------------------------------------------------------- shots */

type Shot = {
  start: number;
  from: { pos: number[]; look: number[]; fov: number };
  to: { pos: number[]; look: number[]; fov: number };
};

// cuts land on the narration: "moon" (2.09 s) and "village" (3.21 s)
const SHOTS: Shot[] = [
  {
    start: 0,
    from: { pos: [1.6, 2.9, 11.5], look: [0, 1.6, 0], fov: 40 },
    to: { pos: [0.7, 2.6, 7.4], look: [0, 1.8, 0], fov: 38 },
  },
  {
    start: 2.09,
    from: { pos: [-0.7, 2.3, 4.6], look: [-0.5, 3.0, 0], fov: 46 },
    to: { pos: [-0.55, 2.4, 3.7], look: [-0.5, 3.1, 0], fov: 44 },
  },
  {
    start: 3.21,
    from: { pos: [14.2, 3.3, 10.5], look: [12, 1.6, -3], fov: 44 },
    to: { pos: [13.2, 3.0, 8.0], look: [12, 1.7, -3], fov: 42 },
  },
];

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    let i = SHOTS.length - 1;
    while (i > 0 && t < SHOTS[i].start) i--;
    const shot = SHOTS[i];
    const end = i + 1 < SHOTS.length ? SHOTS[i + 1].start : 5;
    const u = ease((t - shot.start) / (end - shot.start));
    camera.position.set(...lerp3(shot.from.pos, shot.to.pos, u));
    camera.fov = lerp(shot.from.fov, shot.to.fov, u);
    camera.aspect = size.width / size.height;
    camera.near = 0.1;
    camera.far = 600;
    camera.updateProjectionMatrix();
    camera.lookAt(...lerp3(shot.from.look, shot.to.look, u));
  }, [t, camera, size]);
  return null;
};

/* ---------------------------------------------------------------- world */

const HERO_ROBE: [string, string, string] = ["#2f9e8a", "#3fc0a8", "#e8d27a"];
const VILLAGERS = [
  { x: 10.8, robe: ["#a8673a", "#d9b48a", "#2a2f5a"] as [string, string, string], hair: "cap" as const, ph: 0 },
  { x: 12.0, robe: ["#4f3a78", "#8a7ab0", "#c9a24a"] as [string, string, string], hair: "bald" as const, ph: 1.7 },
  { x: 13.2, robe: ["#8e2f2c", "#d8b08a", "#1d2a5a"] as [string, string, string], hair: "bun" as const, ph: 3.1 },
];

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const raise = ease((t - 2.1) / 0.55);
  const armR = lerp(-0.35, -2.05, raise);
  const heroFace: Face = t < 2.09 ? "calm" : "determined";

  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    scene.fog = new THREE.FogExp2("#3a4668", 0.016);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [scene, gl]);

  const dirt = dirtTex([30, 30]);
  const grass = grassTex([6, 6]);

  return (
    <>
      <CameraRig t={t} />
      <Sky />
      <Moon />

      {/* moonlight key (cool) + bright blue ambient so the night reads, not murky */}
      <hemisphereLight args={["#8a9ccc", "#4a3a2c", 1.2]} />
      <directionalLight
        position={[-6, 14, -10]}
        color="#aebfff"
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      {/* cool rim from behind-left so characters separate from the background */}
      <directionalLight position={[-8, 6, -12]} color="#8fa8ff" intensity={1.2} />

      {/* ground: textured dirt square, grassy mound for the hero */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial map={dirt} roughness={1} />
      </mesh>
      <mesh position={[0, -0.55, 0]} scale={[5.2, 0.65, 5.2]} receiveShadow>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <Grass center={[0, 0.02, 0]} radius={4.6} count={2600} seed={3} avoid={[[0, 0, 0.6]]} />
      <Grass center={[0, 0, 0]} radius={7.5} count={700} seed={8} avoid={[[0, 0, 5.0]]} />
      <Rock position={[-1.6, 0.2, 1.2]} s={[0.35, 0.25, 0.3]} />
      <Rock position={[1.9, 0.15, 0.6]} s={[0.25, 0.2, 0.25]} rot={1} />

      {/* background: distant hills, trees */}
      {[
        { p: [-30, -3, -60], s: [40, 14, 18], c: "#1c2a3a" },
        { p: [25, -3, -70], s: [45, 18, 20], c: "#18243a" },
        { p: [-5, -2, -48], s: [26, 8, 12], c: "#22324a" },
      ].map((h, i) => (
        <mesh key={i} position={h.p as V3} scale={h.s as V3}>
          <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={h.c} roughness={1} />
        </mesh>
      ))}
      {/* far village behind the hero: depth layers with lit windows + torches */}
      <House position={[-7, 0, -20]} rotY={0.5} wall="#6a4a32" roof="#5a2a22" t={t} />
      <House position={[-1.5, 0, -24]} rotY={0.1} w={4} wall="#7a5236" roof="#3f4f7a" t={t} />
      <House position={[4.5, 0, -21]} rotY={-0.4} wall="#6a4a32" roof="#5a2a22" t={t} />
      <House position={[10, 0, -27]} rotY={-0.2} wall="#7a5236" roof="#5a2a22" t={t} />
      <Torch position={[-3.8, 0, -16]} t={t} seed={5} light={false} />
      <Torch position={[2.2, 0, -17]} t={t} seed={6} light={false} />
      <Fence from={[-10, 0, -15]} to={[-4.5, 0, -14]} />
      <Fence from={[3, 0, -14.5]} to={[8, 0, -15.5]} />

      {/* hero + torches flanking the mound */}
      <Torch position={[-2.4, 0, -1.6]} t={t} seed={1} />
      <Torch position={[2.6, 0, -2.2]} t={t} seed={2} />
      <Character
        position={[0, 0.08, 0]}
        rotY={0.12}
        robe={HERO_ROBE}
        face={heroFace}
        hair="bun"
        armR={armR}
        headTilt={-0.38 * raise}
        headTurn={-0.15 * raise}
      >
        <Lantern t={t} />
      </Character>

      {/* village square */}
      <House position={[8.2, 0, -8.5]} rotY={0.35} wall="#8a5a34" roof="#8a3428" t={t} />
      <House position={[12.4, 0, -9.6]} rotY={0} w={3.8} wall="#a06a3c" roof="#3f4f7a" t={t} />
      <House position={[16.6, 0, -8.4]} rotY={-0.35} wall="#7a4a2c" roof="#8a3428" t={t} />
      <FirePit position={[9.8, 0, -0.2]} t={t} />
      <Torch position={[9.4, 0, -2.6]} t={t} seed={3} />
      <Torch position={[14.8, 0, -2.8]} t={t} seed={4} light={false} />
      <Barrel position={[9.6, 0, -6.4]} />
      <Barrel position={[10.3, 0, -6.9]} rot={1} />
      <Crate position={[15.2, 0, -6.2]} rot={0.3} />
      <Crate position={[15.3, 0.8, -6.2]} rot={0.8} s={0.6} />
      <Crate position={[16.0, 0, -5.6]} rot={-0.2} s={0.7} />
      <Fence from={[6.2, 0, -2]} to={[6.8, 0, -7]} />
      <Fence from={[17.6, 0, -6.8]} to={[18.4, 0, -1.5]} />

      {VILLAGERS.map((v) => (
        <Character
          key={v.x}
          position={[v.x, 0, -1.9]}
          rotY={-0.12}
          robe={v.robe}
          face="laugh"
          hair={v.hair === "bald" ? undefined : v.hair}
          armL={0.55 + 0.3 * Math.sin(t * 14 + v.ph)}
          armR={-0.55 - 0.3 * Math.sin(t * 14 + v.ph)}
          bounce={Math.abs(Math.sin(t * 9 + v.ph)) * 0.1}
          headTilt={-0.18 + 0.05 * Math.sin(t * 9 + v.ph)}
        />
      ))}
    </>
  );
};
