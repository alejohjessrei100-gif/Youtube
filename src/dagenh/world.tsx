// The Dagen H short's sets. Only one set is drawn at a time, so every set is built around the origin:
//   street  : a Swedish town street at 4:50 am (road along x, far lane z < 0, buildings at z ≈ -8, open toward +z)
//   vote    : the 1955 polling hall with the tally board
//   stamp   : a government office, the stamp comes down
//   border  : the Norway / Sweden border road
//   country : a country road with birches and red cottages (the open car drives here)
//   chart   : the statistics office with the accident chart
import React from "react";
import * as THREE from "three";
import { boxG, coneG, coreMat, cylG, Label, M, sphG, torG } from "../inkbeat/core/kit";
import type { V3 } from "../inkbeat/types";
import { House, LampPost, Planter } from "../demo/Street";

const PI = Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const pop = (u: number) => {
  const x = clamp(u);
  const c = 1.9;
  return x >= 1 ? 1 : 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
export const ROAD_Z = 1.75; // lane centers at ±ROAD_Z
export const CURB = 3.5;

// ------------------------------------------------------------------ a 1960s car, nose toward +x
/** where the driver of the open car sits (car-local; the wheel is on the LEFT, local -z) */
export const DRIVER_LOCAL: V3 = [-0.3, 0.05, -0.38];
export const WHEEL_LOCAL: V3 = [0.16, 1.08, -0.38];
export type CarState = { p: V3; yaw: number; color: string; d?: number; open?: boolean; lights?: number };
export const Car60: React.FC<CarState> = ({ p, yaw, color, d = 0, open = false, lights = 0 }) => {
  const spin = -d / 0.32;
  const dark = new THREE.Color(color).multiplyScalar(0.7).getStyle();
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(3.66, 0.55, 1.62)} c={color} tex="metal" p={[0, 0.58, 0]} />
      <M g={boxG(3.3, 0.24, 1.4)} c="#1a1a20" p={[0, 0.2, 0]} />
      <M g={boxG(1.05, 0.1, 1.5)} c={color} tex="metal" p={[1.25, 0.88, 0]} r={[0, 0, -0.08]} />
      <M g={boxG(0.9, 0.1, 1.5)} c={color} tex="metal" p={[-1.35, 0.88, 0]} r={[0, 0, 0.06]} />
      {open ? (
        <>
          {/* open top: seats, a windshield, the steering wheel on the left */}
          <M g={boxG(0.5, 0.12, 1.3)} c="#e8dcc0" tex="fabric" p={[-0.3, 0.9, 0]} />
          <M g={boxG(0.12, 0.5, 1.3)} c="#e8dcc0" tex="fabric" p={[-0.6, 1.1, 0]} />
          <group position={[0.62, 1.07, 0]} rotation={[0, 0, 0.3]}>
            {[-0.72, 0.72].map((z) => (
              <M key={z} g={boxG(0.04, 0.42, 0.04)} c="#c8ccd4" tex="metal" p={[0, 0, z]} />
            ))}
            <M g={boxG(0.04, 0.04, 1.48)} c="#c8ccd4" tex="metal" p={[0, 0.2, 0]} />
            <mesh geometry={boxG(0.01, 0.36, 1.4)} material={coreMat("#cfe6ff", 0.9, 0.18)} position={[0, -0.01, 0]} userData={{ outline: false }} />
          </group>
          <M g={boxG(0.3, 0.12, 1.5)} c="#2a2a30" p={[0.42, 0.92, 0]} />
          <group position={WHEEL_LOCAL} rotation={[0, PI / 2, 0]}>
            <group rotation={[0.5, 0, 0]}>
              <M g={torG(0.15, 0.018)} c="#1a1a20" />
              <M g={boxG(0.28, 0.02, 0.02)} c="#c8ccd4" tex="metal" />
            </group>
          </group>
          <M g={cylG(0.02, 0.02, 0.3, 8)} c="#2a2a30" p={[0.3, 0.98, -0.38]} r={[0, 0, 1.0]} />
        </>
      ) : (
        <>
          <M g={boxG(1.8, 0.5, 1.46)} c={dark} tex="metal" p={[-0.25, 1.1, 0]} />
          <M g={boxG(1.74, 0.05, 1.44)} c={color} tex="metal" p={[-0.25, 1.37, 0]} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={boxG(1.5, 0.36, 0.02)} material={coreMat("#2a3a5a", 0.85)} position={[-0.25, 1.12, s * 0.74]} />
          ))}
          <mesh geometry={boxG(0.02, 0.36, 1.26)} material={coreMat("#3a4a6a", 0.9)} position={[0.66, 1.12, 0]} />
        </>
      )}
      {/* chrome: bumpers, grille, round headlights; wheels */}
      {[1.9, -1.9].map((x) => (
        <M key={x} g={boxG(0.1, 0.14, 1.66)} c="#d0d4dc" tex="metal" p={[x, 0.42, 0]} />
      ))}
      <M g={boxG(0.04, 0.24, 0.7)} c="#d0d4dc" tex="metal" p={[1.84, 0.62, 0]} />
      {[-0.56, 0.56].map((z) => (
        <mesh key={z} geometry={cylG(0.11, 0.11, 0.04, 16)} material={coreMat("#fff4d0", 0.7 + 0.5 * lights)} position={[1.84, 0.72, z]} rotation={[0, 0, PI / 2]} />
      ))}
      {[-0.6, 0.6].map((z) => (
        <mesh key={z} geometry={boxG(0.04, 0.1, 0.2)} material={coreMat("#c8281e", 0.6 + 0.4 * lights)} position={[-1.84, 0.7, z]} />
      ))}
      {[[1.2, -1], [1.2, 1], [-1.2, -1], [-1.2, 1]].map(([x, z], i) => (
        <group key={i} position={[x, 0.32, z * 0.74]} rotation={[0, 0, spin]}>
          <M g={cylG(0.32, 0.32, 0.2, 20)} c="#1a1a1e" r={[PI / 2, 0, 0]} />
          <M g={cylG(0.16, 0.16, 0.22, 14)} c="#d0d4dc" tex="metal" r={[PI / 2, 0, 0]} />
          <M g={boxG(0.04, 0.3, 0.23)} c="#8a8a92" />
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------------ street furniture
/** a street clock showing `minutes` past 4:00 (50 = ten to five) */
export const ClockPost: React.FC<{ p: V3; minutes: number }> = ({ p, minutes }) => {
  const mA = (minutes / 60) * PI * 2;
  const hA = ((4 + minutes / 60) / 12) * PI * 2;
  return (
    <group position={p}>
      <M g={cylG(0.08, 0.12, 3.4, 12)} c="#1f2a3a" tex="metal" p={[0, 1.7, 0]} />
      <group position={[0, 3.7, 0]}>
        <M g={cylG(0.5, 0.5, 0.18, 32)} c="#1f2a3a" tex="metal" r={[PI / 2, 0, 0]} />
        {[1, -1].map((s) => (
          <group key={s} rotation={[0, s > 0 ? 0 : PI, 0]}>
            <mesh geometry={cylG(0.43, 0.43, 0.02, 32)} material={coreMat("#fff2d0", 1.0)} position={[0, 0, 0.09]} rotation={[PI / 2, 0, 0]} />
            {Array.from({ length: 12 }, (_, i) => (
              <mesh key={i} geometry={boxG(0.03, i % 3 ? 0.06 : 0.1, 0.01)} material={coreMat("#1a1420", 1)} position={[Math.sin((i / 12) * PI * 2) * 0.36, Math.cos((i / 12) * PI * 2) * 0.36, 0.105]} rotation={[0, 0, -(i / 12) * PI * 2]} />
            ))}
            <group position={[0, 0, 0.112]} rotation={[0, 0, -s * hA]}>
              <mesh geometry={boxG(0.045, 0.22, 0.01)} material={coreMat("#1a1420", 1)} position={[0, 0.09, 0]} />
            </group>
            <group position={[0, 0, 0.118]} rotation={[0, 0, -s * mA]}>
              <mesh geometry={boxG(0.03, 0.34, 0.01)} material={coreMat("#c8281e", 1)} position={[0, 0.15, 0]} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};
/** the H sign of the switch: a yellow H on blue */
export const HSign: React.FC<{ p: V3; s?: number; yaw?: number }> = ({ p, s = 1, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]} scale={s}>
    <M g={cylG(0.05, 0.06, 2.6, 10)} c="#c8ccd4" tex="metal" p={[0, 1.3, 0]} />
    <M g={boxG(0.9, 0.9, 0.05)} c="#1f4ab0" p={[0, 2.85, 0.03]} />
    <Label text="H" p={[0, 2.85, 0.058]} w={0.8} h={0.8} fg="#ffd21a" bg="none" font={0.95} />
  </group>
);
const Tree: React.FC<{ p: V3; s?: number; birch?: boolean }> = ({ p, s = 1, birch = false }) => (
  <group position={p} scale={s}>
    <M g={cylG(0.1, 0.14, 2.2, 10)} c={birch ? "#efeee8" : "#6a4a32"} tex="wood" p={[0, 1.1, 0]} />
    {birch ? (
      <>
        {[0.5, 1.0, 1.5].map((y) => (
          <M key={y} g={cylG(0.105, 0.105, 0.05, 10)} c="#2a2a2a" p={[0, y, 0]} />
        ))}
        <M g={sphG(0.9, 14)} c="#7ab04a" p={[0, 2.7, 0]} s={[0.9, 1.25, 0.9]} />
        <M g={sphG(0.6, 12)} c="#8ac25a" p={[0.4, 3.2, 0.1]} />
      </>
    ) : (
      <>
        <M g={sphG(1.0, 16)} c="#3f7e36" p={[0, 2.7, 0]} />
        <M g={sphG(0.7, 14)} c="#4a8a3a" p={[0.5, 3.2, 0.2]} />
      </>
    )}
  </group>
);

// ------------------------------------------------------------------ the street (origin)
export type StreetState = { cars: CarState[]; minutes: number; lamps?: number; banner?: number; dawn?: number };
export const Street: React.FC<{ s: StreetState }> = ({ s }) => (
  <group>
    <M g={boxG(200, 0.2, 200)} c="#5a6a5a" tex="grass" p={[0, -0.1, 0]} cast={false} />
    <M g={boxG(140, 0.02, CURB * 2)} c="#4a4c56" tex="stone" ts={1.4} p={[0, 0.01, 0]} cast={false} />
    {/* the center line, dashed */}
    {Array.from({ length: 24 }, (_, i) => (
      <mesh key={i} geometry={boxG(1.6, 0.004, 0.14)} material={coreMat("#f4f0e0", 0.8)} position={[-46 + i * 4, 0.022, 0]} userData={{ outline: false }} />
    ))}
    {/* sidewalks with curbs */}
    {[-1, 1].map((z) => (
      <group key={z}>
        <M g={boxG(140, 0.16, 2.6)} c="#9a96a0" tex="stone" p={[0, 0.08, z * (CURB + 1.3)]} cast={false} />
        <M g={boxG(140, 0.17, 0.2)} c="#c8c4cc" tex="stone" p={[0, 0.085, z * (CURB + 0.1)]} cast={false} />
      </group>
    ))}
    {/* the far block of houses, lamps lit in a few windows */}
    {[
      [-22, 5, 7.2, "#e8c89a", "plaster", "#7a3a3a"], [-16.2, 5.4, 9, "#b8604a", "brick", "#4a4a6a"], [-10.4, 5, 6.6, "#d8dcc0", "plaster", "#5a3a3a"],
      [-4.8, 5.6, 8.4, "#e0b8a0", "plaster", "#3a3a5a"], [1.2, 5.2, 7.6, "#9ab8c8", "plaster", "#7a3a3a"], [7, 5.4, 9.2, "#c8a060", "brick", "#4a4a6a"],
      [12.8, 5, 7, "#e8dca8", "plaster", "#5a4a6a"], [18.6, 5.6, 8.2, "#b8604a", "brick", "#3a3a4a"],
    ].map(([x, w, h, c, tx, r], i) => (
      <House key={i} p={[x as number, 0.16, -8.4]} w={w as number} h={h as number} d={4} wall={c as string} tex={tx as "plaster" | "brick"} roof={r as string} windows={2} lit={i % 3 === 0 ? [0] : i % 3 === 1 ? [1] : []} />
    ))}
    {/* the HÖGERTRAFIK banner across the street, between two poles */}
    <group position={[-1.5, 0, 0]}>
      {[-1, 1].map((z) => (
        <M key={z} g={cylG(0.07, 0.09, 6.2, 10)} c="#c8ccd4" tex="metal" p={[0, 3.1, z * (CURB + 0.6)]} />
      ))}
      <M g={cylG(0.015, 0.015, CURB * 2 + 1.2, 6)} c="#2a2a30" p={[0, 5.9, 0]} r={[PI / 2, 0, 0]} />
      <group scale={[1, pop(s.banner ?? 1), 1]} position={[0, 5.9, 0]}>
        <M g={boxG(0.04, 0.9, 6.4)} c="#1f4ab0" tex="fabric" p={[0, -0.5, 0]} />
        <Label text="HÖGERTRAFIK" p={[0.025, -0.5, 0]} r={[0, PI / 2, 0]} w={6} h={0.7} fg="#ffd21a" bg="none" font={0.85} />
        <Label text="HÖGERTRAFIK" p={[-0.025, -0.5, 0]} r={[0, -PI / 2, 0]} w={6} h={0.7} fg="#ffd21a" bg="none" font={0.85} />
      </group>
    </group>
    <ClockPost p={[-6.0, 0.16, -(CURB + 0.9)]} minutes={s.minutes} />
    <HSign p={[4.2, 0.16, -(CURB + 0.7)]} />
    <HSign p={[-12, 0.16, CURB + 0.8]} yaw={PI} />
    {[-14, -2, 10, 22].map((x) => (
      <LampPost key={x} p={[x, 0.16, -(CURB + 0.5)]} on={s.lamps ?? 1} />
    ))}
    {[-8, 6, 18].map((x) => (
      <LampPost key={`n${x}`} p={[x, 0.16, CURB + 0.5]} on={s.lamps ?? 1} />
    ))}
    {[-18, 9, 15].map((x) => (
      <Planter key={x} p={[x, 0.16, -(CURB + 1.9)]} />
    ))}
    {/* a newspaper kiosk and a bench on the far sidewalk */}
    <group position={[-9.5, 0.16, -(CURB + 1.6)]}>
      <M g={boxG(1.6, 2.0, 1.0)} c="#2a6a4a" tex="planks" p={[0, 1.0, 0]} />
      <M g={boxG(1.9, 0.12, 1.3)} c="#c8402e" p={[0, 2.1, 0]} />
      <M g={boxG(1.2, 0.5, 0.02)} c="#f4ead6" tex="paper" p={[0, 1.2, 0.51]} />
    </group>
    <group position={[1.5, 0.16, -(CURB + 1.4)]}>
      <M g={boxG(1.6, 0.08, 0.4)} c="#8a5a3a" tex="wood" p={[0, 0.45, 0]} />
      <M g={boxG(1.6, 0.4, 0.06)} c="#8a5a3a" tex="wood" p={[0, 0.7, -0.18]} />
      {[-0.7, 0.7].map((x) => (
        <M key={x} g={boxG(0.06, 0.45, 0.4)} c="#2a2a30" tex="metal" p={[x, 0.22, 0]} />
      ))}
    </group>
    {[-26, 26].map((x) => (
      <Tree key={x} p={[x, 0.16, CURB + 2]} s={1.3} />
    ))}
    {s.cars.map((c, i) => (
      <Car60 key={i} {...c} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the 1955 polling hall
export const VoteHall: React.FC<{ count: number; ballot?: V3 | null }> = ({ count, ballot }) => {
  // the numbers count in steps of 5 (each number is a texture: keep their count small)
  const nej = count >= 1 ? 83 : Math.round((83 * clamp(count)) / 5) * 5;
  const ja = count >= 1 ? 16 : Math.round((16 * clamp(count)) / 4) * 4;
  return (
    <group>
      <M g={boxG(9, 0.1, 9)} c="#8a6a4a" tex="planks" p={[0, -0.05, 0]} cast={false} />
      <M g={boxG(9, 3.6, 0.2)} c="#d8d0b8" tex="plaster" p={[0, 1.8, -3.0]} cast={false} />
      <M g={boxG(9, 1.0, 0.06)} c="#6a4a32" tex="planks" p={[0, 0.5, -2.87]} cast={false} />
      <M g={boxG(0.2, 3.6, 9)} c="#ccc4aa" tex="plaster" p={[-3.6, 1.8, 0.5]} cast={false} />
      <M g={boxG(0.2, 3.6, 9)} c="#ccc4aa" tex="plaster" p={[3.6, 1.8, 0.5]} cast={false} />
      <M g={boxG(9, 0.12, 9)} c="#eee8d8" tex="plaster" p={[0, 3.66, 0.5]} cast={false} />
      {/* a Swedish flag, the year, voting booths with curtains */}
      <group position={[-2.3, 2.35, -2.88]}>
        <M g={boxG(1.2, 0.76, 0.02)} c="#1f5ab0" tex="fabric" />
        <M g={boxG(1.2, 0.14, 0.024)} c="#ffd21a" />
        <M g={boxG(0.14, 0.76, 0.024)} c="#ffd21a" p={[-0.2, 0, 0.008]} />
      </group>
      <group position={[0, 2.75, -2.88]}>
        <M g={boxG(1.5, 0.6, 0.03)} c="#f4ecd8" tex="paper" />
        <Label text="1955" p={[0, 0, 0.02]} w={1.3} h={0.5} fg="#2a1a12" bg="none" font={0.85} />
      </group>
      {[-2.9, -1.9].map((x) => (
        <group key={x} position={[x, 0, -1.9]}>
          <M g={boxG(0.9, 2.0, 0.06)} c="#5a4a3a" tex="wood" p={[0, 1.0, -0.45]} />
          <M g={boxG(0.06, 2.0, 0.9)} c="#5a4a3a" tex="wood" p={[-0.45, 1.0, 0]} />
          <M g={boxG(0.06, 2.0, 0.9)} c="#5a4a3a" tex="wood" p={[0.45, 1.0, 0]} />
          <M g={boxG(0.9, 1.6, 0.03)} c="#3a5a8a" tex="fabric" p={[0, 1.2, 0.45]} />
        </group>
      ))}
      {/* the ballot box on a table; the ballot falls through the slot */}
      <group position={[0.2, 0, -0.6]}>
        <M g={boxG(1.4, 0.06, 0.8)} c="#8a5a3a" tex="wood" p={[0, 0.78, 0]} />
        {[[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].map(([x, z], i) => (
          <M key={i} g={boxG(0.06, 0.75, 0.06)} c="#6a4430" tex="wood" p={[x, 0.375, z]} />
        ))}
        <M g={boxG(0.56, 0.46, 0.42)} c="#3a3a44" tex="metal" p={[0, 1.04, 0]} />
        <M g={boxG(0.3, 0.012, 0.04)} c="#0a0a10" p={[0, 1.272, 0]} />
      </group>
      {ballot ? <M g={boxG(0.14, 0.2, 0.004)} c="#f4f0e4" tex="paper" p={ballot} /> : null}
      {/* the tally board: NEJ and JA bars */}
      <group position={[1.9, 0, -2.4]} rotation={[0, -0.25, 0]}>
        <M g={boxG(1.9, 2.2, 0.06)} c="#2a3a2e" tex="wood" p={[0, 1.9, 0]} />
        {[-0.75, 0.75].map((x) => (
          <M key={x} g={boxG(0.07, 2.0, 0.07)} c="#5a3a22" tex="wood" p={[x, 1.0, 0.05]} r={[0.12, 0, 0]} />
        ))}
        <Label text="NEJ" p={[-0.45, 2.75, 0.04]} w={0.7} h={0.3} fg="#f4ead6" bg="none" font={0.9} />
        <Label text="JA" p={[0.45, 2.75, 0.04]} w={0.7} h={0.3} fg="#f4ead6" bg="none" font={0.9} />
        <mesh geometry={boxG(0.56, 1.25 * clamp(count), 0.02)} material={coreMat("#e8402e", 1)} position={[-0.45, 0.95 + 0.625 * clamp(count), 0.04]} />
        <mesh geometry={boxG(0.56, (1.25 * 16 / 83) * clamp(count), 0.02)} material={coreMat("#4aa04a", 1)} position={[0.45, 0.95 + (0.625 * 16 / 83) * clamp(count), 0.04]} />
        {count > 0 ? <Label text={`${nej}%`} p={[-0.45, 0.98 + 1.25 * clamp(count) + 0.18, 0.045]} w={0.62} h={0.26} fg="#ffffff" bg="none" font={0.9} /> : null}
        {count > 0 ? <Label text={`${ja}%`} p={[0.45, 0.98 + (1.25 * 16 / 83) * clamp(count) + 0.18, 0.045]} w={0.62} h={0.26} fg="#ffffff" bg="none" font={0.9} /> : null}
      </group>
      <group position={[-2.6, 0, 1.0]}>
        <M g={cylG(0.25, 0.2, 0.5, 14)} c="#a85a3a" tex="brick" p={[0, 0.25, 0]} />
        <M g={sphG(0.36, 14)} c="#3a7a3a" p={[0, 0.8, 0]} />
      </group>
    </group>
  );
};

// ------------------------------------------------------------------ the government office: the stamp
export const STAMP_PAPER: V3 = [0.15, 0.81, 0.05];
export const StampRoom: React.FC<{ stamped: number; stampY: number; stampAt: V3 }> = ({ stamped, stampY, stampAt }) => (
  <group>
    <M g={boxG(8, 0.1, 8)} c="#5a3424" tex="planks" p={[0, -0.05, 0]} cast={false} />
    <M g={boxG(8, 3.8, 0.2)} c="#4a5a7a" tex="plaster" p={[0, 1.9, -2.8]} cast={false} />
    <M g={boxG(8, 1.2, 0.06)} c="#3a2418" tex="planks" p={[0, 0.6, -2.67]} cast={false} />
    <M g={boxG(0.2, 3.8, 8)} c="#44526e" tex="plaster" p={[-3.4, 1.9, 0.6]} cast={false} />
    <M g={boxG(0.2, 3.8, 8)} c="#44526e" tex="plaster" p={[3.4, 1.9, 0.6]} cast={false} />
    <M g={boxG(8, 0.12, 8)} c="#e0dccf" tex="plaster" p={[0, 3.86, 0.6]} cast={false} />
    {/* a flag on a pole, a portrait frame, tall bookcase */}
    <group position={[-2.2, 0, -2.2]}>
      <M g={cylG(0.03, 0.03, 2.6, 8)} c="#c8a040" tex="metal" p={[0, 1.3, 0]} />
      <group position={[0.48, 2.25, 0]}>
        <M g={boxG(0.9, 0.58, 0.02)} c="#1f5ab0" tex="fabric" />
        <M g={boxG(0.9, 0.1, 0.024)} c="#ffd21a" />
        <M g={boxG(0.1, 0.58, 0.024)} c="#ffd21a" p={[-0.15, 0, 0.008]} />
      </group>
    </group>
    <group position={[0.6, 2.3, -2.68]}>
      <M g={boxG(1.1, 0.8, 0.05)} c="#c8a040" tex="metal" />
      <M g={boxG(0.96, 0.66, 0.02)} c="#6a7a5a" tex="paper" p={[0, 0, 0.03]} />
      <M g={sphG(0.2, 12)} c="#8a6a4a" p={[0.0, 0.08, 0.04]} s={[1, 1, 0.2]} />
    </group>
    <group position={[2.5, 0, -2.3]}>
      <M g={boxG(1.0, 2.5, 0.36)} c="#3a2418" tex="wood" p={[0, 1.25, 0]} />
      {[0.6, 1.2, 1.8].map((y, k) =>
        ["#8a2a2a", "#2a3a6a", "#d8c8a0", "#2a5a4a", "#6a4a2a", "#1a1a2a"].map((c, i) => <M key={`${k}${i}`} g={boxG(0.12, 0.3, 0.24)} c={c} tex="paper" p={[-0.36 + i * 0.14, y + 0.17, 0.04]} />),
      )}
    </group>
    {/* the desk, the paper, the ink pad, the stamp */}
    <M g={boxG(1.8, 0.06, 0.9)} c="#6a3a24" tex="wood" p={[0, 0.76, 0]} />
    <M g={boxG(0.5, 0.72, 0.84)} c="#5a2e1c" tex="wood" p={[-0.62, 0.36, 0]} />
    <M g={boxG(0.5, 0.72, 0.84)} c="#5a2e1c" tex="wood" p={[0.62, 0.36, 0]} />
    <M g={boxG(0.42, 0.004, 0.56)} c="#f6f2e6" tex="paper" p={STAMP_PAPER} />
    <Label text="BESLUT" p={[STAMP_PAPER[0], STAMP_PAPER[1] + 0.003, STAMP_PAPER[2] - 0.2]} r={[-PI / 2, 0, 0]} w={0.3} h={0.07} fg="#1a1a22" bg="none" font={0.9} />
    {[0, 1, 2, 3].map((i) => (
      <M key={i} g={boxG(0.3 - (i % 2) * 0.08, 0.002, 0.014)} c="#7a7a82" p={[STAMP_PAPER[0], STAMP_PAPER[1] + 0.003, STAMP_PAPER[2] - 0.1 + i * 0.045]} />
    ))}
    {stamped > 0 ? (
      <group position={[STAMP_PAPER[0], STAMP_PAPER[1] + 0.004, STAMP_PAPER[2] - 0.08]} rotation={[-PI / 2, 0, 0.12]} scale={0.9 + 0.1 * pop(stamped)}>
        <Label text="HÖGERTRAFIK" p={[0, 0, 0]} w={0.36} h={0.11} fg="#c8241c" bg="none" font={0.8} stamp />
      </group>
    ) : null}
    <M g={boxG(0.16, 0.025, 0.1)} c="#2a2a3a" p={[-0.45, 0.805, 0.1]} />
    <group position={[stampAt[0], stampY, stampAt[2]]}>
      <M g={boxG(0.15, 0.03, 0.09)} c="#5a2a1a" tex="wood" p={[0, 0.015, 0]} />
      <M g={cylG(0.025, 0.03, 0.1, 10)} c="#8a5a3a" tex="wood" p={[0, 0.08, 0]} />
      <M g={sphG(0.045, 12)} c="#3a1a12" tex="wood" p={[0, 0.15, 0]} />
    </group>
    <group position={[0, 0, -1.1]}>
      <M g={boxG(0.6, 0.08, 0.55)} c="#7a2a2a" tex="fabric" p={[0, 0.5, 0]} />
      <M g={boxG(0.6, 0.9, 0.08)} c="#7a2a2a" tex="fabric" p={[0, 0.98, -0.27]} />
    </group>
    <M g={cylG(0.06, 0.08, 0.03, 12)} c="#c8a040" tex="metal" p={[0.7, 0.795, -0.25]} />
    <M g={cylG(0.012, 0.012, 0.2, 8)} c="#c8a040" tex="metal" p={[0.7, 0.9, -0.25]} />
  </group>
);

// ------------------------------------------------------------------ the border road (Norway at -x, Sweden at +x)
export const Border: React.FC<{ cars: CarState[] }> = ({ cars }) => (
  <group>
    <M g={boxG(200, 0.2, 200)} c="#6a9a4a" tex="grass" ts={1.4} p={[0, -0.1, 0]} cast={false} />
    <M g={boxG(140, 0.02, CURB * 2)} c="#55575f" tex="stone" ts={1.4} p={[0, 0.01, 0]} cast={false} />
    {Array.from({ length: 24 }, (_, i) => (
      <mesh key={i} geometry={boxG(1.6, 0.004, 0.14)} material={coreMat("#f4f0e0", 0.8)} position={[-46 + i * 4, 0.022, 0]} userData={{ outline: false }} />
    ))}
    {/* the border line across the road, the customs hut, the barrier, two signs */}
    <mesh geometry={boxG(0.3, 0.004, CURB * 2)} material={coreMat("#ffd21a", 0.9)} position={[0, 0.023, 0]} userData={{ outline: false }} />
    <group position={[1.2, 0, -CURB - 2.2]}>
      <M g={boxG(2.4, 2.4, 2.0)} c="#c8402e" tex="planks" p={[0, 1.2, 0]} />
      <M g={boxG(2.8, 0.14, 2.4)} c="#3a3a4a" tex="shingles" p={[0, 2.5, 0]} />
      <mesh geometry={boxG(0.9, 0.7, 0.02)} material={coreMat("#ffe2a0", 0.8)} position={[0, 1.4, 1.01]} />
      <M g={boxG(0.9, 1.9, 0.04)} c="#f4ead6" tex="planks" p={[0.8, 0.95, 1.02]} />
    </group>
    <group position={[2.2, 0, -CURB - 0.4]}>
      <M g={boxG(0.3, 1.0, 0.3)} c="#4a4a52" tex="metal" p={[0, 0.5, 0]} />
      <group position={[0, 1.0, 0]} rotation={[0, 0, 1.2]}>
        {Array.from({ length: 6 }, (_, i) => (
          <M key={i} g={boxG(0.12, 0.5, 0.12)} c={i % 2 ? "#f4f0e8" : "#c8241c"} p={[0, 0.25 + i * 0.5, 0]} />
        ))}
      </group>
    </group>
    {[
      ["NORGE", -1.6, "#c8241c"], ["SVERIGE", 1.6, "#1f5ab0"],
    ].map(([txt, x, c]) => (
      <group key={txt as string} position={[x as number, 0, CURB + 0.9]}>
        <M g={cylG(0.05, 0.06, 2.2, 8)} c="#c8ccd4" tex="metal" p={[0, 1.1, 0]} />
        <M g={boxG(1.5, 0.5, 0.05)} c={c as string} p={[0, 2.3, 0.03]} />
        <Label text={txt as string} p={[0, 2.3, 0.058]} w={1.36} h={0.38} fg="#ffffff" bg="none" font={0.85} />
      </group>
    ))}
    {[[-14, -12, 1.4], [-24, -14, 1.2], [12, -12, 1.5], [22, -15, 1.3], [-18, 10, 1.4], [16, 11, 1.2], [6, -16, 1.6], [-8, -18, 1.3]].map(([x, z, sc], i) => (
      <Tree key={i} p={[x, 0, z]} s={sc} birch={i % 2 === 0} />
    ))}
    {[[-40, -60, 30], [30, -70, 34], [80, -50, 26]].map(([x, z, r], i) => (
      <M key={i} g={sphG(r, 28)} c={i % 2 ? "#4a7a46" : "#5a8a4e"} p={[x, -r * 0.8, z]} s={[1.6, 1, 1]} cast={false} />
    ))}
    {cars.map((c, i) => (
      <Car60 key={i} {...c} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the country road (the open car drives along +x)
export const Country: React.FC<{ cars: CarState[] }> = ({ cars }) => (
  <group>
    <M g={boxG(600, 0.2, 200)} c="#6a9a4a" tex="grass" ts={1.4} p={[0, -0.1, 0]} cast={false} />
    <M g={boxG(600, 0.02, CURB * 2)} c="#55575f" tex="stone" ts={1.4} p={[0, 0.01, 0]} cast={false} />
    {Array.from({ length: 80 }, (_, i) => (
      <mesh key={i} geometry={boxG(1.6, 0.004, 0.14)} material={coreMat("#f4f0e0", 0.8)} position={[-60 + i * 4, 0.022, 0]} userData={{ outline: false }} />
    ))}
    {Array.from({ length: 30 }, (_, i) => (
      <Tree key={i} p={[-50 + i * 9 + (i % 3) * 2, 0, (i % 2 ? -1 : 1) * (CURB + 3 + (i % 4) * 2)]} s={1.1 + (i % 3) * 0.25} birch={i % 3 !== 1} />
    ))}
    {[[-20, -16], [25, -18], [70, -15], [110, 14], [40, 16]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]} rotation={[0, z > 0 ? PI : 0, 0]}>
        <M g={boxG(5, 3, 4)} c="#a8322a" tex="planks" p={[0, 1.5, 0]} />
        {[-1, 1].map((s) => (
          <M key={s} g={boxG(5.6, 0.14, 2.7)} c="#3a3a44" tex="shingles" p={[0, 3.4, s * 1.05]} r={[s * 0.62, 0, 0]} />
        ))}
        <M g={boxG(0.9, 1.9, 0.06)} c="#f4ead6" tex="planks" p={[-1.2, 0.95, 2.02]} />
        <mesh geometry={boxG(0.8, 0.8, 0.02)} material={coreMat("#bfe0ff", 0.85)} position={[1.0, 1.7, 2.011]} />
      </group>
    ))}
    {[[-60, -70, 34], [10, -80, 40], [90, -66, 30], [170, -74, 36]].map(([x, z, r], i) => (
      <M key={i} g={sphG(r, 28)} c={i % 2 ? "#4a7a46" : "#5a8a4e"} p={[x, -r * 0.8, z]} s={[1.6, 1, 1]} cast={false} />
    ))}
    {cars.map((c, i) => (
      <Car60 key={i} {...c} />
    ))}
  </group>
);

// ------------------------------------------------------------------ the statistics office: the accident chart
export const ChartRoom: React.FC<{ fall: number; reveal: number }> = ({ fall, reveal }) => {
  const before = [0.92, 0.96, 0.9, 0.94];
  const after = [0.7, 0.55, 0.5, 0.48];
  return (
    <group>
      <M g={boxG(8, 0.1, 8)} c="#6a5a4a" tex="planks" p={[0, -0.05, 0]} cast={false} />
      <M g={boxG(8, 3.6, 0.2)} c="#c8d4c0" tex="plaster" p={[0, 1.8, -2.8]} cast={false} />
      <M g={boxG(0.2, 3.6, 8)} c="#b8c4b0" tex="plaster" p={[-3.4, 1.8, 0.6]} cast={false} />
      <M g={boxG(0.2, 3.6, 8)} c="#b8c4b0" tex="plaster" p={[3.4, 1.8, 0.6]} cast={false} />
      <M g={boxG(8, 0.12, 8)} c="#eee8dc" tex="plaster" p={[0, 3.66, 0.6]} cast={false} />
      <group position={[-2.0, 1.9, -2.68]}>
        <mesh geometry={boxG(1.2, 1.3, 0.02)} material={coreMat("#cfe8ff", 0.95)} />
        <M g={boxG(1.3, 0.07, 0.06)} c="#e8e4dc" p={[0, 0.68, 0.02]} />
        <M g={boxG(1.3, 0.07, 0.06)} c="#e8e4dc" p={[0, -0.68, 0.02]} />
        <M g={boxG(0.04, 1.3, 0.04)} c="#e8e4dc" p={[0, 0, 0.025]} />
      </group>
      {/* the chart: monthly accident bars, before (grey) and after the switch (falling, green) */}
      <group position={[0.6, 0, -2.4]} scale={[1, 0.6 + 0.4 * pop(reveal), 1]}>
        <M g={boxG(2.6, 1.9, 0.06)} c="#f4f0e4" tex="paper" p={[0, 1.95, 0]} />
        {[-1.15, 1.15].map((x) => (
          <M key={x} g={boxG(0.07, 2.2, 0.07)} c="#5a3a22" tex="wood" p={[x, 1.1, 0.05]} r={[0.1, 0, 0]} />
        ))}
        <Label text="OLYCKOR" p={[0, 2.7, 0.04]} w={1.6} h={0.28} fg="#2a1a12" bg="none" font={0.85} />
        {before.map((h, i) => (
          <mesh key={i} geometry={boxG(0.22, 1.25 * h, 0.02)} material={coreMat("#7a7a86", 1)} position={[-1.0 + i * 0.27, 1.1 + 0.625 * h, 0.04]} />
        ))}
        {after.map((h0, i) => {
          const h = 0.94 + (h0 - 0.94) * clamp(fall * 1.6 - i * 0.2);
          return <mesh key={`a${i}`} geometry={boxG(0.22, 1.25 * h, 0.02)} material={coreMat("#3a9a4a", 1)} position={[0.12 + i * 0.27, 1.1 + 0.625 * h, 0.04]} />;
        })}
        <mesh geometry={boxG(0.03, 1.4, 0.02)} material={coreMat("#c8241c", 1)} position={[0.0, 1.8, 0.045]} />
        <Label text="H" p={[0.0, 2.58, 0.045]} w={0.2} h={0.2} fg="#c8241c" bg="none" font={0.9} />
      </group>
      <M g={boxG(1.6, 0.06, 0.8)} c="#7a5a3a" tex="wood" p={[-1.6, 0.76, -0.6]} />
      <M g={boxG(1.5, 0.7, 0.7)} c="#6a4a2e" tex="wood" p={[-1.6, 0.37, -0.6]} />
      <M g={boxG(0.4, 0.3, 0.3)} c="#3a3a44" tex="metal" p={[-1.9, 0.94, -0.7]} />
      {[0, 1, 2].map((i) => (
        <M key={i} g={boxG(0.24, 0.01, 0.32)} c="#f4eedc" tex="paper" p={[-1.3 + i * 0.03, 0.795 + i * 0.01, -0.5]} r={[0, 0.1 * i, 0]} />
      ))}
      <group position={[2.6, 0, -1.8]}>
        <M g={boxG(0.6, 1.4, 0.6)} c="#5a6a5a" tex="metal" p={[0, 0.7, 0]} />
        <M g={cylG(0.18, 0.15, 0.3, 14)} c="#a85a3a" tex="brick" p={[0, 1.55, 0]} />
        <M g={sphG(0.28, 12)} c="#3a7a3a" p={[0, 1.9, 0]} />
      </group>
    </group>
  );
};
void coneG;
