import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";

/* ---------------------------------------------------------------- helpers */

const ease = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => lerp(v, b[i], t)) as [number, number, number];

// 3-step gradient for cel shading
const useToonGradient = () =>
  useMemo(() => {
    const data = new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

type Face = "calm" | "determined" | "laugh";

const faceTexture = (face: Face) => {
  // Equirectangular canvas for SphereGeometry UVs. The +z (front) of the
  // sphere sits at u = 0.25, v = 0.5. Horizontal is drawn at half scale
  // because 360° spans 1024 px while 180° spans 512 px.
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 1024, 512);
  g.translate(256, 256);
  g.scale(0.5, 1);
  g.strokeStyle = g.fillStyle = "#121212";
  g.lineCap = "round";
  g.lineJoin = "round";
  const eyeX = 120,
    eyeY = -30;
  if (face === "laugh") {
    g.lineWidth = 22;
    for (const x of [-eyeX, eyeX]) {
      g.beginPath();
      g.moveTo(x - 40, eyeY + 14);
      g.lineTo(x, eyeY - 22);
      g.lineTo(x + 40, eyeY + 14);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-90, 40);
    g.quadraticCurveTo(0, 190, 90, 40);
    g.closePath();
    g.fill();
    g.fillStyle = "#e0566a";
    g.beginPath();
    g.ellipse(0, 105, 46, 22, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    for (const x of [-eyeX, eyeX]) {
      g.beginPath();
      g.ellipse(x, eyeY, 24, 34, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.lineWidth = 18;
    if (face === "determined") {
      g.beginPath();
      g.moveTo(-eyeX - 50, eyeY - 80);
      g.lineTo(-eyeX + 35, eyeY - 55);
      g.moveTo(eyeX + 50, eyeY - 80);
      g.lineTo(eyeX - 35, eyeY - 55);
      g.stroke();
      g.beginPath();
      g.moveTo(-45, 70);
      g.quadraticCurveTo(0, 82, 45, 60);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(-55, 55);
      g.quadraticCurveTo(0, 100, 55, 55);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

/* ------------------------------------------------------------- character */

const Outlined: React.FC<{
  geo: THREE.BufferGeometry;
  color: string;
  outline?: number;
  position?: [number, number, number];
  scale?: [number, number, number];
  map?: THREE.Texture;
}> = ({ geo, color, outline = 0.045, position, scale, map }) => {
  const grad = useToonGradient();
  return (
    <group position={position} scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshToonMaterial color={color} gradientMap={grad} map={map} />
      </mesh>
      {/* inverted-hull outline */}
      <mesh geometry={geo} scale={1 + outline * 2}>
        <meshBasicMaterial color="#0b0b0b" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

const Limb: React.FC<{ from: [number, number, number]; angle: number; len: number }> = ({
  from,
  angle,
  len,
}) => (
  <group position={from} rotation={[0, 0, angle]}>
    <mesh position={[0, -len / 2, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.035, len, 8]} />
      <meshBasicMaterial color="#111" />
    </mesh>
  </group>
);

type CharProps = {
  position: [number, number, number];
  rotY?: number;
  shirt: string;
  face: Face;
  hair?: "bun" | "cap";
  armL?: number; // radians, 0 = hanging
  armR?: number;
  bounce?: number;
  headTilt?: number;
  children?: React.ReactNode; // held item, attached to right hand
};

const Character: React.FC<CharProps> = ({
  position,
  rotY = 0,
  shirt,
  face,
  hair,
  armL = 0.25,
  armR = -0.25,
  bounce = 0,
  headTilt = 0,
  children,
}) => {
  const faceTex = useMemo(() => faceTexture(face), [face]);
  const sphere = useMemo(() => new THREE.SphereGeometry(0.5, 64, 40), []);
  const body = useMemo(() => new THREE.CapsuleGeometry(0.3, 0.42, 8, 20), []);
  const small = useMemo(() => new THREE.SphereGeometry(0.17, 20, 14), []);
  const armLen = 0.75;
  // hand position (right arm) for the held item
  const handR: [number, number, number] = [
    -0.32 + Math.sin(armR) * armLen,
    1.55 - Math.cos(armR) * armLen,
    0,
  ];
  return (
    <group position={[position[0], position[1] + bounce, position[2]]} rotation={[0, rotY, 0]}>
      <Limb from={[-0.13, 0.95, 0]} angle={0.04} len={0.95} />
      <Limb from={[0.13, 0.95, 0]} angle={-0.04} len={0.95} />
      <Outlined geo={body} color={shirt} position={[0, 1.3, 0]} />
      <Limb from={[0.32, 1.55, 0]} angle={armL} len={armLen} />
      <Limb from={[-0.32, 1.55, 0]} angle={armR} len={armLen} />
      <group position={handR}>{children}</group>
      <group position={[0, 2.05, 0]} rotation={[headTilt, 0, 0]}>
        <Outlined geo={sphere} color="#ffffff" outline={0.035} map={faceTex} />
        {hair === "bun" && <Outlined geo={small} color="#5a3423" position={[0, 0.52, -0.12]} />}
        {hair === "cap" && (
          <Outlined geo={sphere} color="#c0392b" position={[0, 0.2, -0.02]} scale={[1.04, 0.62, 1.04]} />
        )}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------ set pieces */

const Lantern: React.FC<{ flicker: number }> = ({ flicker }) => (
  <group position={[0, -0.18, 0]}>
    <mesh>
      <boxGeometry args={[0.2, 0.26, 0.2]} />
      <meshBasicMaterial color="#ffd27a" />
    </mesh>
    <mesh position={[0, 0.17, 0]}>
      <coneGeometry args={[0.16, 0.1, 4]} />
      <meshBasicMaterial color="#2b1d12" />
    </mesh>
    <pointLight color="#ffab4a" intensity={14 * flicker} distance={9} decay={1.6} castShadow shadow-bias={-0.002} shadow-normalBias={0.04} />
  </group>
);

const Sky: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vP; void main(){
          float h = clamp(vP.y*1.4+0.1,0.0,1.0);
          vec3 top = vec3(0.05,0.07,0.22), mid = vec3(0.18,0.20,0.48), low = vec3(0.42,0.32,0.55);
          vec3 c = mix(low, mid, smoothstep(0.0,0.35,h)); c = mix(c, top, smoothstep(0.35,1.0,h));
          gl_FragColor = vec4(c,1.0);}`,
      }),
    []
  );
  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 500; i++) {
      const th = rnd() * Math.PI * 2, y = 0.15 + rnd() * 0.85, r = Math.sqrt(1 - y * y);
      p.push(Math.cos(th) * r * 180, y * 180, Math.sin(th) * r * 180);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <>
      <mesh material={mat}>
        <sphereGeometry args={[200, 32, 16]} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={0.7} sizeAttenuation transparent opacity={0.8} fog={false} />
      </points>
    </>
  );
};

const Moon: React.FC = () => {
  const halo = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    gr.addColorStop(0, "rgba(255,250,230,0.55)");
    gr.addColorStop(1, "rgba(255,250,230,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group position={[-4, 13, -45]}>
      <mesh>
        <sphereGeometry args={[5, 48, 32]} />
        <meshBasicMaterial color="#fff6dc" fog={false} />
      </mesh>
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
    </group>
  );
};

const House: React.FC<{ position: [number, number, number]; color: string; rotY?: number }> = ({
  position,
  color,
  rotY = 0,
}) => {
  const grad = useToonGradient();
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.8, 2.6]} />
        <meshToonMaterial color={color} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 3.45, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[2.5, 1.5, 4]} />
        <meshToonMaterial color="#5b2f2a" gradientMap={grad} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.7, 1.31]}>
          <planeGeometry args={[0.6, 0.7]} />
          <meshBasicMaterial color="#ffc766" />
        </mesh>
      ))}
      <pointLight position={[0, 1.7, 2.2]} color="#ffb357" intensity={6} distance={6} decay={1.8} />
    </group>
  );
};

const Hill: React.FC<{ position: [number, number, number]; s: [number, number, number]; color: string }> = ({
  position,
  s,
  color,
}) => (
  <mesh position={position} scale={s} receiveShadow>
    <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
    <meshStandardMaterial color={color} roughness={1} />
  </mesh>
);

/* ---------------------------------------------------------------- shots */

type Shot = {
  start: number; // seconds
  from: { pos: number[]; look: number[]; fov: number };
  to: { pos: number[]; look: number[]; fov: number };
};

// cuts land on the narration: "moon" (2.09 s) and "village" (3.21 s)
const SHOTS: Shot[] = [
  {
    start: 0,
    from: { pos: [1.4, 2.6, 11.5], look: [0, 1.1, 0], fov: 42 },
    to: { pos: [0.6, 2.3, 7.2], look: [0, 1.3, 0], fov: 40 },
  },
  {
    start: 2.09,
    from: { pos: [-0.6, 1.9, 4.4], look: [-0.45, 2.45, 0], fov: 46 },
    to: { pos: [-0.45, 2.0, 3.5], look: [-0.45, 2.55, 0], fov: 44 },
  },
  {
    start: 3.21,
    from: { pos: [13.6, 2.6, 6.6], look: [12, 1.3, -2.5], fov: 44 },
    to: { pos: [12.8, 2.3, 4.2], look: [12, 1.4, -2.5], fov: 40 },
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
    camera.far = 500;
    camera.updateProjectionMatrix();
    camera.lookAt(...lerp3(shot.from.look, shot.to.look, u));
  }, [t, camera, size]);
  return null;
};

/* ---------------------------------------------------------------- world */

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flicker = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1);

  // hero raises the lantern toward the moon during shot 2
  const raise = ease((t - 2.1) / 0.55);
  const armR = lerp(-0.35, -2.6, raise);
  const heroFace: Face = t < 2.09 ? "calm" : "determined";

  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.fog = new THREE.Fog("#2a2e66", 18, 70);
  }, [scene]);

  return (
    <>
      <CameraRig t={t} />
      <Sky />
      <Moon />

      {/* cool moonlight + lifted, blue-ish fill so blacks never go fully black */}
      <hemisphereLight args={["#8fa2ff", "#2a2244", 1.1]} />
      <directionalLight
        position={[-6, 14, -10]}
        color="#b9c6ff"
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* ground + hills */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[120, 64]} />
        <meshStandardMaterial color="#2e4a3f" roughness={1} />
      </mesh>
      <Hill position={[0, -0.6, 0]} s={[3.2, 0.7, 3.2]} color="#38594a" />
      <Hill position={[-14, -1, -25]} s={[16, 6, 10]} color="#1f3533" />
      <Hill position={[18, -1, -32]} s={[20, 8, 12]} color="#1b2f2f" />

      {/* hero on the hill */}
      <Character
        position={[0, 0.1, 0]}
        rotY={0.15}
        shirt="#3fb08f"
        face={heroFace}
        hair="bun"
        armR={armR}
        headTilt={-0.4 * raise}
      >
        <Lantern flicker={flicker} />
      </Character>

      {/* village */}
      <House position={[9.5, 0, -6]} color="#c96f4a" rotY={0.25} />
      <House position={[14.5, 0, -7]} color="#6a7fc9" rotY={-0.2} />
      {[
        { x: 10.9, shirt: "#d4a12a", hair: "cap" as const, ph: 0 },
        { x: 12.1, shirt: "#8c4fb3", hair: undefined, ph: 1.7 },
        { x: 13.3, shirt: "#d65151", hair: "bun" as const, ph: 3.1 },
      ].map((v) => (
        <Character
          key={v.x}
          position={[v.x, 0, -2.4]}
          rotY={-0.25}
          shirt={v.shirt}
          face="laugh"
          hair={v.hair}
          armL={0.6 + 0.25 * Math.sin(t * 14 + v.ph)}
          armR={-0.6 - 0.25 * Math.sin(t * 14 + v.ph)}
          bounce={Math.abs(Math.sin(t * 9 + v.ph)) * 0.12}
          headTilt={-0.15}
        />
      ))}
    </>
  );
};
