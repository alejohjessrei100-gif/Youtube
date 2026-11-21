// "Point at One Person": a man collapses in a busy station; a ten-year-old breaks the bystander effect. Data in
// shots.ts; places in world.tsx; two 2D inserts here (the group chat, the effect's name).
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Character3D } from "../inkbeat/char/Character3D";
import { Captions, makeChunks } from "../inkbeat/core/captions";
import { CastLight } from "../inkbeat/core/castLight";
import { useFonts } from "../inkbeat/core/frame";
import { moodOf } from "../inkbeat/core/moods";
import { View } from "../inkbeat/core/View";
import { sceneAt, T } from "./shots";
import { Backpack, Briefcase, Hall, Lab, MedBag, Phone } from "./world";
import { DURATION, FPS, SECONDS, WORDS } from "./words";

const LAST = WORDS[WORDS.length - 1][2];
const CHUNKS = makeChunks(WORDS, SECONDS);
const ACCENT = new Set(["collapsed", "hundreds", "nobody", "girl,", "backpack,", "red", "you!", "ambulance!", "instantly.", "thirty", "bystander", "alone", "waited.", "finger.", "point"]);
const ease = (u: number) => Math.max(0, Math.min(1, u)) ** 2 * (3 - 2 * Math.max(0, Math.min(1, u)));
const GRAIN = "repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 2px, rgba(255,255,255,0.02) 2px 4px)";
/** the group-chat insert: a phone with one unanswered question, "Seen by 30" */
const Chat: React.FC<{ t: number }> = ({ t }) => {
  const a = ease((t - (T.ever - 0.15)) / 0.3), seen = t > T.chat - 0.1, thirty = t > T.ever + 1.6;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 230, opacity: a, transform: `translateY(${(1 - a) * 80}px)` }}>
      <div style={{ width: 620, height: 1000, borderRadius: 70, background: "#16181e", padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.55)", border: "6px solid #2a2d36" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 48, background: `#ece5dd ${GRAIN}`, overflow: "hidden", fontFamily: "Poppins, sans-serif" }}>
          <div style={{ background: "#2a7a6a", color: "#fff", padding: "34px 30px 24px", display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, background: "#f2c230", fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>🏠</div>
            <div><div style={{ fontSize: 34, fontWeight: 700 }}>Building 4B Neighbors</div><div style={{ fontSize: 24, opacity: 0.85 }}>31 members</div></div>
          </div>
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 22, color: "#6a6a6a", textAlign: "center", margin: "6px 0 22px" }}>Today 9:41 AM</div>
            <div style={{ background: "#fff", borderRadius: 26, padding: "22px 26px", maxWidth: 470, fontSize: 32, lineHeight: 1.3, color: "#1a1a1a", boxShadow: "0 2px 0 rgba(0,0,0,0.08)" }}>
              <div style={{ color: "#c8402e", fontWeight: 700, fontSize: 24, marginBottom: 6 }}>Mrs. Ortiz (3C)</div>
              My car battery died 😩 Does anyone have jumper cables? I'm in the lot right now.
              <div style={{ fontSize: 20, color: "#8a8a8a", textAlign: "right", marginTop: 8 }}>9:41</div>
            </div>
            {seen ? <div style={{ fontSize: 26, color: "#2a7a6a", fontWeight: 700, marginTop: 26, textAlign: "right" }}>✓✓ Seen by {thirty ? 30 : Math.min(30, Math.floor((t - T.chat) * 22) + 3)}</div> : null}
            {t > T.ever + 2.0 ? <div style={{ fontSize: 24, color: "#8a8a8a", marginTop: 220, textAlign: "center", fontStyle: "italic" }}>0 replies</div> : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
/** the name of the effect, on a paper card */
const Title: React.FC<{ t: number }> = ({ t }) => {
  const a = ease((t - (T.psych - 0.1)) / 0.25);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 420, background: `rgba(10,12,18,${0.45 * a})` }}>
      <div style={{ transform: `scale(${0.8 + 0.2 * a}) rotate(-2deg)`, opacity: a, background: `#f4ecd8 ${GRAIN}`, padding: "50px 60px", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "4px solid #d8c8a0", textAlign: "center", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ fontSize: 30, letterSpacing: 6, color: "#8a6a3a", fontWeight: 700 }}>PSYCHOLOGISTS CALL IT</div>
        <div style={{ fontSize: 92, lineHeight: 1.0, color: "#a82a2a", fontWeight: 900, margin: "18px 0" }}>THE BYSTANDER<br />EFFECT</div>
        <div style={{ fontSize: 26, color: "#5a4a3a" }}>Darley &amp; Latané, 1968</div>
      </div>
    </AbsoluteFill>
  );
};
export const StationFilm: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1814" }} />;
  const t = Math.min(f / FPS, SECONDS - 1e-3);
  const s = sceneAt(t);
  const cam = s.cam(t);
  const m = moodOf(s.mood);
  const actors = s.actors(t);
  const ex = s.extra(t);
  const lead = actors.find((a) => !a.lying) ?? actors[0];
  const dip = s.dip ? Math.max(0, 1 - (t - s.t0) / 0.22) : 0;
  return (
    <AbsoluteFill style={{ background: "#1a1814" }}>
      <View mood={m} cam={cam} t={t} focus={s.focus(t)} blur={s.blur} exposure={s.set === "hall" ? -0.45 : 0} sky fogK={0}>
        {s.set === "hall" ? <Hall t={t} clockMin={ex.clockMin ?? 41} /> : <Lab t={t} talk={ex.talk ?? 0} door={ex.door ?? 0} />}
        {ex.backpack ? <Backpack p={ex.backpack.p} r={ex.backpack.r} /> : null}
        {ex.briefcase ? <Briefcase p={ex.briefcase.p} r={ex.briefcase.r} /> : null}
        {ex.phone ? <Phone p={ex.phone.p} r={[0, (actors[2]?.yaw ?? 0) + Math.PI / 2, 0]} /> : null}
        {(ex.bags ?? []).map((b, i) => <MedBag key={i} p={b.p} r={b.r} />)}
        {actors.map((a, k) =>
          a.lying ? (
            <group key={`${s.id}-${k}`} position={a.lying.p} rotation={a.lying.r}>
              <Character3D {...a.spec} position={[0, 0, 0]} yaw={0} t={t + k * 0.7} face={a.face} pose={a.pose} />
            </group>
          ) : (
            <Character3D key={`${s.id}-${k}`} {...a.spec} position={a.p} yaw={a.yaw} t={t + k * 0.7} face={a.face} pose={a.pose} />
          ),
        )}
        {lead ? <CastLight at={[lead.p[0], lead.p[1] + 1.4, lead.p[2]]} cam={cam.pos} mood={m} k={0.6} /> : null}
      </View>
      {s.sepia ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(255,210,140,0.12) 40%, rgba(70,40,15,0.5) 100%)", mixBlendMode: "multiply" }} /> : null}
      {ex.overlay === "chat" ? <Chat t={t} /> : null}
      {ex.overlay === "title" ? <Title t={t} /> : null}
      {dip > 0 ? <AbsoluteFill style={{ background: "#000", opacity: dip }} /> : null}
      <Captions chunks={CHUNKS} t={t} until={LAST + 0.3} accent={ACCENT} accentColor="#ffd34d" />
      {audio ? <Audio src={staticFile("audio/station-mix.mp3")} /> : null}
    </AbsoluteFill>
  );
};
export const STATION_FRAMES = DURATION;
