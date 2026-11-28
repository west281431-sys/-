import React from "react";
import { AbsoluteFill, Img, Audio, Sequence, staticFile, useCurrentFrame, interpolate, spring, Easing } from "remotion";
import { useFonts, s, FPS } from "./core";

// Chico Chicken — 15 s elevator-screen ad, 1080×1920, works without sound.
const ORANGE = "#F2661B", GREEN = "#08683A", DEEP = "#053F23", CREAM = "#FFF4E8", NIGHT = "#141B3A";
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sp = (f: number, at: number, d = 12, st = 180, m = 0.7) => spring({ frame: f - at, fps: FPS, config: { damping: d, stiffness: st, mass: m } });

// scene windows (seconds)
const A = [0, 2.3], B = [2.3, 6.5], C = [6.5, 9.8], D = [9.8, 12.0], E = [12.0, 15.0];

const Scene: React.FC<{ win: number[]; bg: string; children: (f: number, t: number) => React.ReactNode }> = ({ win, bg, children }) => {
  const frame = useCurrentFrame(), t = frame / FPS;
  if (t < win[0] || t >= win[1]) return null;
  const f = frame - s(win[0]);
  const wipe = win[0] === 0 ? 1 : interpolate(f, [0, 7], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: bg, clipPath: `circle(${wipe * 1500}px at 540px 960px)` }}>
      <BgWords f={f} />
      {children(f, t)}
    </AbsoluteFill>
  );
};

// big blurred brand words drifting behind everything
const BgWords: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", left: -400, top: -200, width: 1900, height: 2400, transform: "rotate(-14deg)", opacity: 0.11, filter: "blur(6px)" }}>
    {Array.from({ length: 9 }, (_, i) => (
      <div key={i} style={{ whiteSpace: "nowrap", fontFamily: "Head", fontWeight: 700, fontSize: 170, lineHeight: 1.45, color: "#FFFFFF", textTransform: "uppercase",
        transform: `translateX(${((i % 2 ? 1 : -1) * f * 1.6) % 700 - 350}px)` }}>
        Chico Chicken · Ақтау · Chico Chicken · Ақтау · Chico Chicken
      </div>
    ))}
  </div>
);

// Instagram watermark, visible the whole time
const Watermark: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: 0.85 }}>
    <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2}>
      <rect x={3} y={3} width={18} height={18} rx={5} /><circle cx={12} cy={12} r={4} /><circle cx={17.3} cy={6.7} r={1.1} fill="#FFFFFF" stroke="none" />
    </svg>
    <span style={{ fontFamily: "Mont", fontWeight: 700, fontSize: 42, color: "#FFFFFF", textShadow: "0 2px 10px rgba(0,0,0,.35)" }}>@chico_chicken_aktau</span>
  </div>
);

const Rays: React.FC<{ f: number; color: string; op?: number }> = ({ f, color, op = 0.18 }) => (
  <svg viewBox="-540 -540 1080 1080" width={2400} height={2400} style={{ position: "absolute", left: 540 - 1200, top: 900 - 1200, opacity: op, transform: `rotate(${f * 0.6}deg)` }}>
    {Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 0 L-60 -540 L60 -540 Z" fill={color} transform={`rotate(${i * 22.5})`} />)}
  </svg>
);

const Big: React.FC<{ text: string; top: number; size: number; color: string; k: number; stroke?: string; rot?: number }> = ({ text, top, size, color, k, stroke, rot = -3 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, textAlign: "center", transform: `scale(${0.4 + 0.6 * k}) rotate(${rot * k}deg)`, opacity: Math.min(1, k * 1.6) }}>
    <span style={{ fontFamily: "Head", fontWeight: 700, fontSize: size, lineHeight: 0.92, color, textTransform: "uppercase", whiteSpace: "pre-line",
      WebkitTextStroke: stroke ? `6px ${stroke}` : undefined, paintOrder: "stroke fill", textShadow: "0 14px 40px rgba(0,0,0,.28)" }}>{text}</span>
  </div>
);

const Food: React.FC<{ src: string; f: number; at: number; w: number; x: number; y: number; from?: "top" | "right" | "left" | "bottom"; rot?: number }> = ({ src, f, at, w, x, y, from = "bottom", rot = 0 }) => {
  const k = sp(f, at, 11, 150, 0.8);
  const off = (1 - k) * 1400;
  const dx = from === "right" ? off : from === "left" ? -off : 0, dy = from === "top" ? -off : from === "bottom" ? off : 0;
  const bob = Math.sin((f + at * 3) / 9) * 10;
  return <Img src={staticFile(src)} style={{ position: "absolute", left: x - w / 2 + dx, top: y + dy + bob, width: w, transform: `rotate(${rot * (1 - k) * 4 + Math.sin(f / 14) * 2}deg)`,
    filter: "drop-shadow(0 40px 50px rgba(0,0,0,.35))" }} />;
};

// real menu photo shown as a framed card (no cut-out edges)
const Photo: React.FC<{ src: string; f: number; at: number; w: number; x: number; y: number; from?: "top" | "right" | "left" | "bottom"; rot?: number }> = ({ src, f, at, w, x, y, from = "bottom", rot = -3 }) => {
  const k = sp(f, at, 12, 140, 0.8);
  const off = (1 - k) * 1400;
  const dx = from === "right" ? off : from === "left" ? -off : 0, dy = from === "top" ? -off : from === "bottom" ? off : 0;
  const bob = Math.sin((f + at * 3) / 10) * 8;
  return <Img src={staticFile(src)} style={{ position: "absolute", left: x - w / 2 + dx, top: y + dy + bob, width: w, borderRadius: 44, border: "12px solid #FFFFFF",
    transform: `rotate(${rot + (1 - k) * 8}deg) scale(${0.9 + 0.1 * k})`, boxShadow: "0 40px 80px rgba(0,0,0,.35)" }} />;
};

const Steam: React.FC<{ f: number; x: number; y: number; w?: number }> = ({ f, x, y, w = 300 }) => (
  <>{[0, 1, 2].map((i) => {
    const p = ((f / 40 + i / 3) % 1);
    return <div key={i} style={{ position: "absolute", left: x - w / 2 + (i - 1) * w * 0.3 + Math.sin(f / 8 + i) * 20, top: y - p * 260, width: w * 0.45, height: w * 0.7,
      borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,255,255,.75), rgba(255,255,255,0) 65%)", filter: "blur(14px)", opacity: Math.sin(p * Math.PI) * 0.8 }} />;
  })}</>
);

const LogoChip: React.FC<{ f: number }> = ({ f }) => {
  const k = sp(f, 2);
  return <Img src={staticFile("img/logo.png")} style={{ position: "absolute", left: 540 - 85, top: 150, width: 170, borderRadius: 34, transform: `scale(${k})`, boxShadow: "0 12px 30px rgba(0,0,0,.25)" }} />;
};

// ---------- A: hook ----------
const Hook = () => (
  <Scene win={A} bg={ORANGE}>
    {(f) => <>
      <Rays f={f} color="#FFFFFF" op={0.14} />
      <LogoChip f={f} />
      <Big text={"Қарның\nашты ма?"} top={360} size={190} color="#FFFFFF" k={sp(f, 3, 9, 200)} />
      <Photo src="img/c_wings.jpg" f={f} at={10} w={860} x={540} y={880} from="top" rot={-4} />
      <Steam f={f} x={540} y={860} w={420} />
    </>}
  </Scene>
);

// ---------- B: three tastes ----------
const Tastes = () => {
  const items = [
    { src: "img/c_wings2.jpg", w: 880, t1: "Қытырлақ", t2: "чикен" },
    { src: "img/c_burger.jpg", w: 920, t1: "Дәмді", t2: "бургер" },
    { src: "img/c_pizza.jpg", w: 860, t1: "Ыстық", t2: "пицца" },
  ];
  return (
    <Scene win={B} bg={GREEN}>
      {(f) => {
        const idx = Math.min(2, Math.floor(f / s(1.4)));
        const lf = f - idx * s(1.4);
        const it = items[idx];
        return <>
          <Rays f={f} color="#FFFFFF" op={0.06} />
          <div style={{ position: "absolute", left: 540 - 440, top: 980 - 440 + 120, width: 880, height: 880, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,0) 70%)" }} />
          <Big text={it.t1} top={360} size={190} color={CREAM} k={sp(lf, 1, 11, 220)} rot={-2} />
          <Big text={it.t2} top={560} size={210} color={ORANGE} k={sp(lf, 4, 9, 220)} rot={3} />
          <Photo key={idx} src={it.src} f={lf} at={2} w={it.w} x={540} y={840} from={idx % 2 ? "left" : "right"} rot={idx % 2 ? 3 : -3} />
          <Steam f={f} x={540} y={980} w={420} />
          {/* progress dots */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", justifyContent: "center", gap: 18 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: i === idx ? 60 : 18, height: 18, borderRadius: 9, background: i === idx ? ORANGE : "rgba(255,255,255,.4)" }} />)}
          </div>
        </>;
      }}
    </Scene>
  );
};

// ---------- C: combo price ----------
const Combo = () => (
  <Scene win={C} bg={ORANGE}>
    {(f) => {
      const badge = sp(f, 22, 7, 260, 0.6);
      return <>
        <Rays f={f} color="#FFFFFF" op={0.14} />
        <Big text="Комбо PLUS" top={360} size={180} color="#FFFFFF" k={sp(f, 2, 11, 200)} rot={-2} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", opacity: sp(f, 10), fontFamily: "Mont", fontWeight: 700, fontSize: 44, color: DEEP }}>
          бургер · кола · фри · соус
        </div>
        <Photo src="img/c_combo.jpg" f={f} at={6} w={620} x={540} y={640} from="bottom" rot={-3} />
        <div style={{ position: "absolute", left: 540 - 320, top: 1330, width: 640, height: 280, borderRadius: 140, background: GREEN, border: "10px solid #FFFFFF",
          display: "grid", placeItems: "center", transform: `scale(${badge}) rotate(${(1 - badge) * -25 - 4}deg)`, boxShadow: "0 24px 60px rgba(0,0,0,.35)" }}>
          <span style={{ fontFamily: "Head", fontWeight: 700, fontSize: 170, color: "#FFFFFF", lineHeight: 1, whiteSpace: "nowrap" }}>2 990<span style={{ fontFamily: "Mont", fontSize: 120, marginLeft: 14 }}>₸</span></span>
        </div>
        {badge > 0.9 && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const p = interpolate(f, [26, 44], [0, 1], cl), a = (i / 8) * Math.PI * 2;
          return <div key={i} style={{ position: "absolute", left: 540 + Math.cos(a) * (300 + p * 160) - 14, top: 1470 + Math.sin(a) * (170 + p * 110) - 14, width: 28, height: 28,
            borderRadius: 14, background: i % 2 ? "#FFE45C" : "#FFFFFF", opacity: 1 - p }} />;
        })}
      </>;
    }}
  </Scene>
);

// ---------- D: open late ----------
const Late = () => (
  <Scene win={D} bg={NIGHT}>
    {(f, t) => <>
      {Array.from({ length: 40 }, (_, i) => <div key={i} style={{ position: "absolute", left: (i * 137) % 1080, top: (i * 211) % 1700, width: 6, height: 6, borderRadius: 3,
        background: "#FFFFFF", opacity: 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i)) }} />)}
      <div style={{ position: "absolute", left: 640, top: 260, width: 200, height: 200, borderRadius: "50%", boxShadow: "-40px 20px 0 0 #FFE27A", transform: `scale(${sp(f, 2)})` }} />
      <Big text="Түнгі" top={520} size={170} color={CREAM} k={sp(f, 4)} rot={-2} />
      <Big text="04:00" top={690} size={330} color="#FFE27A" k={sp(f, 8, 9, 200)} rot={2} />
      <Big text="-ге дейін ашықпыз" top={1010} size={110} color={CREAM} k={sp(f, 14)} rot={-1} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1240, display: "flex", justifyContent: "center", gap: 20, opacity: sp(f, 22) }}>
        {["39 ш/а", "14 ш/а"].map((x) => <span key={x} style={{ fontFamily: "Mont", fontWeight: 700, fontSize: 52, color: NIGHT, background: ORANGE, padding: "14px 34px", borderRadius: 999 }}>{x}</span>)}
      </div>
    </>}
  </Scene>
);

// ---------- E: QR call to action ----------
const CTA = () => (
  <Scene win={E} bg={GREEN}>
    {(f, t) => {
      const q = sp(f, 4, 12, 170);
      const pulse = 1 + Math.max(0, Math.sin(t * 6)) * 0.025;
      return <>
        <Rays f={f} color="#FFFFFF" op={0.06} />
        <LogoChip f={f} />
        <Big text="Сканерле" top={380} size={190} color="#FFFFFF" k={sp(f, 1, 11, 200)} rot={-2} />
        <div style={{ position: "absolute", left: 540 - 330, top: 610, width: 660, padding: 30, background: "#FFFFFF", borderRadius: 48,
          transform: `scale(${q * pulse}) rotate(${(1 - q) * 10}deg)`, boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}>
          <Img src={staticFile("img/qr.png")} style={{ width: "100%", display: "block" }} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1410, textAlign: "center", opacity: sp(f, 14) }}>
          <span style={{ fontFamily: "Mont", fontWeight: 700, fontSize: 54, color: "#FFFFFF", background: "#25D366", padding: "16px 40px", borderRadius: 999 }}>WhatsApp арқылы тапсырыс</span>
        </div>
        <Photo src="img/c_hotdog.jpg" f={f} at={10} w={400} x={260} y={1520} from="left" rot={-6} />
        <Photo src="img/c_twister.jpg" f={f} at={14} w={380} x={820} y={1510} from="right" rot={6} />
      </>;
    }}
  </Scene>
);

const SFX: [number, string, number][] = [
  [0.1, "pop", 0.4], [0.35, "whoosh", 0.35], [0.4, "thud", 0.5],
  [2.3, "whoosh", 0.4], [2.4, "pop", 0.35], [3.7, "whoosh", 0.35], [5.1, "whoosh", 0.35],
  [6.5, "whoosh", 0.4], [7.2, "thud", 0.45], [7.25, "ding", 0.4],
  [9.8, "whoosh", 0.4], [10.1, "ding", 0.3],
  [12.0, "whoosh", 0.4], [12.2, "pop", 0.4],
];

export const LiftAd: React.FC = () => {
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: ORANGE }}>
      {ready && <><Hook /><Tastes /><Combo /><Late /><CTA /><Watermark /></>}
      <Audio src={staticFile("sfx/music.wav")} volume={0.55} />
      {SFX.map(([at, n, v], i) => <Sequence key={i} from={s(at)} durationInFrames={s(1.2)}><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
