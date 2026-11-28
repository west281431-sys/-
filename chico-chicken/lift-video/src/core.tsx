import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill, OffthreadVideo, Audio, Img, Sequence, staticFile, useCurrentFrame, getInputProps,
  interpolate, spring, Easing, delayRender, continueRender,
} from "remotion";

export const FPS = 30;
export const s = (sec: number) => Math.round(sec * FPS);
export const CREAM = "#F6EBD6";

// ---------- fonts (all free, OFL licence) ----------
const FONTS: [string, string, string][] = [
  ["Head", "fonts/Oswald.ttf", "200 700"],             // big condensed titles (Cyrillic + Kazakh)
  ["Script", "fonts/GreatVibes.ttf", "normal"],       // handwritten line (Russian)
  ["ScriptKz", "fonts/LoraItalic.ttf", "normal"],     // italic line (Kazakh letters)
  ["Mont", "fonts/Montserrat-600.ttf", "600"],
  ["Mont", "fonts/Montserrat-700.ttf", "700"],
];
export const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(FONTS.map(([fam, file, weight]) =>
      new FontFace(fam, `url(${staticFile(file)})`, { weight }).load().then((l) => document.fonts.add(l)),
    )).then(() => { setReady(true); requestAnimationFrame(() => continueRender(handle)); });
  }, [handle]);
  return ready;
};

// ---------- colour pairs: title + handwritten line. Alternate them, never one pair for the whole reel ----------
export type Pair = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const PAIRS: Record<Pair, { title: string; script: string; glow: string }> = {
  1: { title: CREAM, script: "#FFF27A", glow: "255,220,40" },     // cream + yellow neon
  2: { title: CREAM, script: "#FFBEF0", glow: "240,110,220" },    // cream + pink
  3: { title: "#FFE650", script: "#FFFFFF", glow: "255,255,255" }, // yellow + white
  4: { title: "#C9B2FF", script: "#FFFFFF", glow: "160,110,255" }, // lavender + white
  5: { title: "#FFFFFF", script: "#D7C2FF", glow: "140,80,255" },  // white + lilac
  6: { title: "#FFB8E1", script: "#FFFFFF", glow: "255,120,200" }, // pink + white
  7: { title: "#9FE8FF", script: "#FFF27A", glow: "255,220,40" },  // sky + yellow
};

// ---------- safe zones (Reels UI covers 0–400 px top and 1560–1920 px bottom) ----------
export const T_TOP = 410;   // title
export const S_TOP = 532;   // handwritten line under the title
export const SUB_TOP = 1320; // subtitles

// ---------- animation helpers ----------
export const useLife = (from: number, to: number, inDur = 0.28, outDur = 0.22) => {
  const t = useCurrentFrame() / FPS;
  const o = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const pin = interpolate(t, [from, from + inDur], [0, 1], { ...o, easing: Easing.out(Easing.cubic) });
  const pout = interpolate(t, [to - outDur, to], [0, 1], { ...o, easing: Easing.in(Easing.cubic) });
  return { pin, pout, visible: t >= from && t < to, t };
};
export const pop = (f: number, at: number, damping = 12, stiffness = 200) =>
  spring({ frame: f - s(at), fps: FPS, config: { damping, stiffness, mass: 0.6 } });

// scales content down so it always fits on ONE line
export const Fit: React.FC<{ maxW?: number; children: React.ReactNode }> = ({ maxW = 860, children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    if (ref.current) { const nk = Math.min(1, maxW / ref.current.offsetWidth); if (Math.abs(nk - k) > 0.001) setK(nk); }
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <span ref={ref} style={{ display: "inline-block", flexShrink: 0, whiteSpace: "nowrap", transform: `scale(${k})` }}>{children}</span>
    </div>
  );
};

// ---------- 1. Title: big condensed caps, blur-in ----------
export const Title: React.FC<{ from: number; to: number; text: string; p?: Pair; top?: number; size?: number }> =
  ({ from, to, text, p = 1, top = T_TOP, size = 190 }) => {
    const { pin, pout, visible } = useLife(from, to);
    if (!visible) return null;
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top, filter: `blur(${(1 - pin) * 22 + pout * 18}px)`, opacity: pin * (1 - pout),
        transform: `translateY(${(1 - pin) * 30}px) scale(${interpolate(pin, [0, 1], [1.15, 1]) * (1 + pout * 0.08)})` }}>
        <Fit maxW={860}><span style={{ fontFamily: "Head", fontWeight: 700, fontSize: size, color: PAIRS[p].title, lineHeight: 0.92, textTransform: "uppercase",
          textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}>{text}</span></Fit>
      </div>
    );
  };

// ---------- 2. Script: handwritten neon line that "writes" left to right ----------
export const Script: React.FC<{ from: number; to: number; text: string; p?: Pair; top?: number; size?: number; kz?: boolean }> =
  ({ from, to, text, p = 1, top = S_TOP, size = 104, kz = false }) => {
    const { pin, pout, visible, t } = useLife(from, to, 0.45, 0.22);
    if (!visible) return null;
    const reveal = interpolate(t, [from, from + 0.55], [0, 100], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
    const g = PAIRS[p].glow;
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top, opacity: 1 - pout, filter: `blur(${pout * 14}px)`, transform: "rotate(-3deg)" }}>
        <Fit maxW={780}><span style={{ fontFamily: kz ? "ScriptKz" : "Script", fontSize: kz ? size * 0.75 : size, color: PAIRS[p].script, lineHeight: 1,
          textShadow: `0 4px 14px rgba(0,0,0,0.7), 0 0 12px rgba(${g},0.85), 0 0 34px rgba(${g},0.55), 0 0 70px rgba(${g},0.3)`,
          clipPath: `inset(-40% ${100 - reveal}% -40% -10%)`, display: "inline-block", padding: "0 30px", opacity: Math.min(1, pin * 2) }}>{text}</span></Fit>
      </div>
    );
  };

// ---------- 3. Pill: glass capsule on the side, can be crossed out ----------
export const Pill: React.FC<{ from: number; to: number; text: string; x: number; y: number; rotate?: number; size?: number; strikeAt?: number }> =
  ({ from, to, text, x, y, rotate = -5, size = 60, strikeAt }) => {
    const f = useCurrentFrame();
    const { pout, visible, t } = useLife(from, to);
    if (!visible) return null;
    const p = pop(f, from, 11, 170);
    const strike = strikeAt === undefined ? 0 : interpolate(t, [strikeAt, strikeAt + 0.3], [0, 84], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div style={{ position: "absolute", left: x, top: y + Math.sin(t * 2.2 + x) * 6, opacity: 1 - pout, filter: `blur(${pout * 12}px)`,
        transform: `translate(-50%,-50%) rotate(${rotate}deg) scale(${p * (1 - pout * 0.3)})` }}>
        <div style={{ position: "relative", padding: "20px 46px", borderRadius: 999, overflow: "hidden",
          background: "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(40,50,90,0.30) 60%, rgba(20,25,50,0.42))",
          border: "2.5px solid rgba(255,255,255,0.75)", backdropFilter: "blur(16px) saturate(1.5)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.7)" }}>
          <span style={{ fontFamily: "Head", fontWeight: 700, fontSize: size, color: "white", textTransform: "uppercase", whiteSpace: "nowrap" }}>{text}</span>
          {strikeAt !== undefined && <div style={{ position: "absolute", left: "8%", top: "52%", height: 8, borderRadius: 4, width: `${strike}%`,
            background: "#FF4B3E", boxShadow: "0 0 12px rgba(255,75,62,0.8)" }} />}
        </div>
      </div>
    );
  };

// ---------- 4. Card: screenshot flies in from the side and floats ----------
export const Card: React.FC<{ from: number; to: number; src: string; x: number; y: number; w: number; rotate?: number; fromX?: number }> =
  ({ from, to, src, x, y, w, rotate = -6, fromX = -700 }) => {
    const f = useCurrentFrame();
    const { pout, visible } = useLife(from, to);
    if (!visible) return null;
    const p = spring({ frame: f - s(from), fps: FPS, config: { damping: 14, stiffness: 120, mass: 0.8 } });
    return (
      <div style={{ position: "absolute", left: x + (1 - p) * fromX, top: y + Math.sin((f / FPS) * 1.8 + y) * 8, width: w,
        transform: `translate(-50%,-50%) rotate(${rotate * p}deg) scale(${0.6 + 0.4 * p - pout * 0.2})`,
        opacity: Math.min(1, p * 1.5) * (1 - pout), filter: `blur(${(1 - Math.min(1, p)) * 16 + pout * 12}px)` }}>
        <Img src={staticFile(src)} style={{ width: "100%", borderRadius: 26, display: "block", border: "4px solid rgba(255,255,255,0.9)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)" }} />
      </div>
    );
  };

// ---------- 5. Sticker: character / 3D object bounces up from the bottom edge ----------
export const Sticker: React.FC<{ from: number; to: number; src: string; x: number; bottom: number; h: number; rotate?: number }> =
  ({ from, to, src, x, bottom, h, rotate = 0 }) => {
    const f = useCurrentFrame();
    const { pout, visible } = useLife(from, to);
    if (!visible) return null;
    const p = spring({ frame: f - s(from), fps: FPS, config: { damping: 9, stiffness: 140, mass: 0.8 } });
    const t = f / FPS;
    return <Img src={staticFile(src)} style={{ position: "absolute", left: x, bottom: bottom - (1 - p) * 700 + Math.sin(t * 3) * 6, height: h,
      transform: `translateX(-50%) rotate(${rotate + Math.sin(t * 2.4) * 3}deg) scale(${1 - pout * 0.3})`, opacity: 1 - pout,
      filter: `drop-shadow(0 25px 35px rgba(0,0,0,0.35)) blur(${pout * 10}px)` }} />;
  };

// ---------- 6. Behind: huge word/number BEHIND the person (needs person cut-outs, see scripts/cutout.py) ----------
export type Behind = { from: number; to: number; text: string; p: Pair; top?: number; size?: number };
const BehindText: React.FC<Behind> = ({ from, to, text, p, top = 470, size = 420 }) => {
  const { pin, pout, visible } = useLife(from, to, 0.3, 0.22);
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, opacity: pin * (1 - pout), filter: `blur(${(1 - pin) * 20 + pout * 14}px)`,
      transform: `scale(${interpolate(pin, [0, 1], [0.75, 1]) * (1 + pout * 0.06)})` }}>
      <Fit maxW={900}><span style={{ fontFamily: "Head", fontWeight: 700, fontSize: size, color: PAIRS[p].title, lineHeight: 0.9, textTransform: "uppercase",
        textShadow: "0 10px 60px rgba(0,0,0,0.3)" }}>{text}</span></Fit>
    </div>
  );
};
const PersonCut: React.FC<{ windows: [number, number][]; dir: string }> = ({ windows, dir }) => {
  const f = useCurrentFrame();
  if (!windows.some(([a, b]) => f / FPS >= a && f / FPS <= b)) return null;
  return <Img src={staticFile(`${dir}/f${f}.webp`)} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />;
};

// ---------- 7. Flash + Chevrons (transition and final call to action) ----------
export const Flash: React.FC<{ at: number; dur?: number; color?: string }> = ({ at, dur = 0.32, color = "white" }) => {
  const t = useCurrentFrame() / FPS;
  const o = interpolate(t, [at - 0.06, at, at + dur], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null;
};
export const Chevrons: React.FC<{ from: number; to: number; y?: number }> = ({ from, to, y = 1440 }) => {
  const { pin, pout, visible, t } = useLife(from, to, 0.3, 0.2);
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center",
      opacity: pin * (1 - pout), transform: `scale(${0.7 + 0.3 * pin})` }}>
      {[0, 1, 2].map((i) => {
        const ph = ((t * 1.6 - i * 0.18) % 1 + 1) % 1;
        return (
          <svg key={i} width={170} height={72} viewBox="0 0 170 72" style={{ marginTop: -18, opacity: 0.35 + 0.65 * Math.sin(ph * Math.PI),
            transform: `translateY(${Math.sin(ph * Math.PI) * 10}px)`, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))" }}>
            <path d="M12 10 L85 58 L158 10" fill="none" stroke="white" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
};

// ---------- subtitles: 1–2 words, key word in a yellow plate ----------
// in WORDS: "|" before a word = start a new subtitle, "*" = highlight this word
type Wd = { text: string; t: number; hl: boolean; brk: boolean };
type Ch = { words: Wd[]; start: number; end: number };
export function buildChunks(words: [string, number][], speechEnd: number): Ch[] {
  const chunks: Ch[] = [];
  let cur: Wd[] = [];
  const flush = () => { if (cur.length) chunks.push({ words: cur, start: cur[0].t, end: 0 }); cur = []; };
  for (const [raw, t] of words) {
    const text0 = raw.replace("|", "").replace(/\*/g, "");
    const len = cur.map((w) => w.text).join(" ").length + text0.length;
    if (raw.includes("|") || cur.length >= 2 || len > 17 || (cur.length > 0 && cur[cur.length - 1].brk)) flush();
    cur.push({ text: text0.replace(/\.+$/, ""), t, hl: raw.includes("*"), brk: /[.?!,»—]$/.test(text0) });
  }
  flush();
  chunks.forEach((c, i) => {
    const next = chunks[i + 1];
    c.end = next ? Math.min(next.start, c.words[c.words.length - 1].t + 1.0) : speechEnd;
  });
  return chunks;
}
const Subs: React.FC<{ chunks: Ch[]; top: number }> = ({ chunks, top }) => {
  const f = useCurrentFrame();
  const t = f / FPS + 0.04;
  const c = chunks.find((ch) => t >= ch.start && t < ch.end);
  if (!c) return null;
  const p = spring({ frame: f - s(c.start - 0.04), fps: FPS, config: { damping: 13, stiffness: 300, mass: 0.45 } });
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top, textAlign: "center", transform: `scale(${0.8 + 0.2 * p})`, opacity: Math.min(1, p * 1.5) }}>
      {c.words.map((w, i) => {
        const active = t >= w.t - 0.02;
        const base: React.CSSProperties = { fontFamily: "Mont", fontWeight: 700, fontSize: 56, marginRight: i < c.words.length - 1 ? 14 : 0, display: "inline-block" };
        if (w.hl && active) {
          const k = spring({ frame: f - s(w.t), fps: FPS, config: { damping: 10, stiffness: 320, mass: 0.4 } });
          return <span key={i} style={{ ...base, color: "#1a1406", background: "#FFE45C", padding: "2px 16px 6px", borderRadius: 12,
            transform: `scale(${0.85 + 0.15 * k}) rotate(${(1 - k) * -4}deg)`, boxShadow: "0 0 24px rgba(255,228,92,0.5)" }}>{w.text}</span>;
        }
        return <span key={i} style={{ ...base, color: "white", opacity: active ? 1 : 0.55, textShadow: "0 3px 14px rgba(0,0,0,0.6)" }}>{w.text}</span>;
      })}
    </div>
  );
};

// ---------- camera: soft push-ins, at most one every ~2.6 s ----------
const ZoomLayer: React.FC<{ punch: number[]; origin: string; children: React.ReactNode }> = ({ punch, origin, children }) => {
  const t = useCurrentFrame() / FPS;
  let z = 1.02, last = -10;
  for (const at of punch) {
    if (at - last < 2.6) continue;
    last = at;
    if (t < at) continue;
    const k = interpolate(t, [at, at + 0.35, at + 1.6], [0, 1, 0.6], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const fade = interpolate(t, [at + 1.6, at + 2.6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    z += 0.04 * k * fade;
  }
  return <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: origin }}>{children}</AbsoluteFill>;
};

// overlayOnly = render only the graphics (used by facecheck)
const OVERLAY_ONLY = (getInputProps() as any)?.overlayOnly === true;

export type ReelCfg = {
  src: string;                         // video in public/media
  words: [string, number][];           // from scripts/words.py
  speechEnd: number;                   // seconds, when the last subtitle disappears
  punch?: number[];                    // seconds of soft camera push-ins
  sfx?: [number, string, number?][];   // [second, name in public/sfx, volume 0.10–0.16]
  brand?: { name: string; icon?: string }; // small badge at the top, optional
  behind?: Behind[]; cutDir?: string; cutWindows?: [number, number][];
  subTop?: number; zoomOrigin?: string;
};

export const ReelBase: React.FC<{ cfg: ReelCfg; children: React.ReactNode }> = ({ cfg, children }) => {
  const ready = useFonts();
  const chunks = React.useMemo(() => buildChunks(cfg.words, cfg.speechEnd), [cfg]);
  const origin = cfg.zoomOrigin ?? "540px 950px";
  return (
    <AbsoluteFill style={{ background: OVERLAY_ONLY ? "transparent" : "black" }}>
      {!OVERLAY_ONLY && <ZoomLayer punch={cfg.punch ?? []} origin={origin}><OffthreadVideo src={staticFile(cfg.src)} /></ZoomLayer>}
      {!OVERLAY_ONLY && ready && (cfg.behind ?? []).map((b, i) => <BehindText key={i} {...b} />)}
      {!OVERLAY_ONLY && cfg.cutDir && <ZoomLayer punch={cfg.punch ?? []} origin={origin}><PersonCut windows={cfg.cutWindows ?? []} dir={cfg.cutDir} /></ZoomLayer>}
      {ready && <>
        {cfg.brand && <div style={{ position: "absolute", left: 0, right: 0, top: 150, display: "flex", justifyContent: "center", alignItems: "center", gap: 16 }}>
          {cfg.brand.icon && <Img src={staticFile(cfg.brand.icon)} style={{ width: 64, height: 64, borderRadius: 14 }} />}
          <span style={{ fontFamily: "Mont", fontWeight: 600, fontSize: 41, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{cfg.brand.name}</span>
        </div>}
        {children}
        {!OVERLAY_ONLY && <Subs chunks={chunks} top={cfg.subTop ?? SUB_TOP} />}
      </>}
      {(cfg.sfx ?? []).map(([at, name, vol = 0.12], i) => (
        <Sequence key={i} from={Math.max(0, s(at) - 1)} durationInFrames={s(1.2)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
