// FPV Assemble — фотолардан «өзі құрастырылып жатқан» FPV-ролик.
// window.render(t) — t секундтағы кадрды салады. window.DUR, window.SFX — render.mjs оқиды.
// Барлық кездейсоқтық тұқыммен (seed) берілген: бір кадр әр рендерде бірдей шығады.
(() => {
const W = 1080, H = 1920;
const C = window.CONFIG;
const cv = document.getElementById('c'), g = cv.getContext('2d');
cv.width = W; cv.height = H;

// ---------- көмекші функциялар ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
const back = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mul = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const PAL = {
  dust:  { puff: ['#8a5a3a', '#a8754f', '#6e4a33', '#c39a72'], chip: '#3b2a1e', tint: 'rgba(120,80,50,.10)' },
  spray: { puff: ['#ffffff', '#eef6ff', '#d5e8f6', '#a9cbe3'], chip: '#e9f4ff', tint: 'rgba(40,90,140,.10)' },
  smoke: { puff: ['#4a4a4a', '#6b6b6b', '#8d8d8d', '#2f2f2f'], chip: '#1d1d1d', tint: 'rgba(0,0,0,.10)' },
  snow:  { puff: ['#ffffff', '#f2f6fb', '#e3ebf3', '#cfdbe7'], chip: '#ffffff', tint: 'rgba(160,190,220,.10)' },
};
const pal = PAL[C.palette] || PAL.dust;

// ---------- монтаж уақыты ----------
const TR = C.transition ?? 0.22;          // өтпенің жартысы, секунд
let acc = 0;
const shots = C.shots.map((s, i) => { const o = { ...s, i, s: acc, e: acc + s.dur }; acc += s.dur; return o; });
const DUR = acc;
window.DUR = DUR;

// дыбыстар: [секунд, файл, қаттылық]
const SFX = [];
const sfx = (t, n, v) => { if (t >= 0 && t < DUR) SFX.push([+t.toFixed(3), n, v]); };
const P = C.sound || {};
const burstName = C.palette === 'spray' ? 'splash' : 'rumble';
shots.forEach((S, i) => {
  if (i > 0) { sfx(S.s - 0.28, 'whoosh', P.whoosh ?? 0.22); if (S.burst !== false) sfx(S.s - 0.1, burstName, P.burst ?? 0.35); }
  if (i === 0 && S.burst !== false) sfx(0.05, burstName, P.burst ?? 0.35);
  if (S.kind === 'assemble') {
    const K = S.strips || 6;
    for (let k = 0; k < K; k++) { const tl = S.s + landAt(S, k); sfx(tl, k === K - 1 ? 'impact' : 'thud', k === K - 1 ? (P.impact ?? 0.4) : (P.thud ?? 0.3)); sfx(tl + 0.02, 'clank', (P.clank ?? 0.12) * (k % 2 ? 0.7 : 1)); }
    sfx(S.s + 0.05, 'tick', 0.25);
  }
  if (S.sparks) sfx(S.s + S.sparks * S.dur, 'spark', P.spark ?? 0.3);
  if (S.title) sfx(S.s + (S.titleAt ?? 0.25), 'thud', P.title ?? 0.25);
  if (S.kind === 'final') sfx(S.e - 0.9, 'boom', P.final ?? 0.25);
  if (S.kind === 'sail') { sfx(S.s + 0.05, 'splash', (P.water ?? 0.16)); if (S.dur > 1.4) sfx(S.s + S.dur * 0.45, 'whoosh', (P.flyby ?? 0.14)); }
  if (S.kind === 'pan') sfx(S.s + 0.05, 'cin' + (i % 3 + 1), P.pan ?? 0.12);
});
window.SFX = SFX;

// қабаттардың түсу уақыты (сахна басынан)
function landAt(S, k) { const K = S.strips || 6; const a = S.dur * 0.30, b = S.dur * 0.82; return a + (b - a) * (k / Math.max(1, K - 1)); }

// ---------- суреттер ----------
const imgs = {};
const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

// каркас: фотоның контур-сызықтары (Собель) — «арматура» сияқты
function edgesOf(im) {
  const w = 540, h = Math.round(540 * im.height / im.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h), p = d.data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = p[i * 4] * .3 + p[i * 4 + 1] * .59 + p[i * 4 + 2] * .11;
  const o = x.createImageData(w, h), q = o.data;
  const col = C.wireColor || [255, 255, 255];
  for (let y = 1; y < h - 1; y++) for (let X = 1; X < w - 1; X++) {
    const i = y * w + X;
    const gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1];
    const gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1];
    const m = Math.sqrt(gx * gx + gy * gy);
    const a = clamp((m - 60) / 160);
    q[i * 4] = col[0]; q[i * 4 + 1] = col[1]; q[i * 4 + 2] = col[2]; q[i * 4 + 3] = a * 255;
  }
  x.putImageData(o, 0, 0);
  return c;
}
// фон: суреттің қатты бұлыңғыр, күңгірт нұсқасы (құрастыру кезінде «бос алаң»)
function plateOf(im) {
  const c = document.createElement('canvas'); c.width = 270; c.height = 480;
  const x = c.getContext('2d'); const k = Math.max(270 / im.width, 480 / im.height);
  x.filter = 'blur(14px) saturate(.6) brightness(.55)';
  x.drawImage(im, (270 - im.width * k) / 2, (480 - im.height * k) / 2, im.width * k, im.height * k);
  return c;
}

// ---------- камера ----------
// әр сахна түріне өз қозғалысы: push — алға ұшу, rise — төменнен көтерілу, orbit — бүйірден айналу, assemble/final — артқа шегіну
function cam(S, u) {
  if (S.kind === 'pan' || S.from) {
    const im = imgs[S.src], k = Math.max(W / im.width, H / im.height);
    const a = S.from || [.5, .5, 1.1], b = S.to || a, x = eio(u);
    const sc = lerp(a[2] ?? 1.1, b[2] ?? 1.1, x), fx = lerp(a[0], b[0], x), fy = lerp(a[1], b[1], x);
    const mx = Math.max(0, (im.width * k * sc - W) / 2), my = Math.max(0, (im.height * k * sc - H) / 2);
    return { s: sc, x: clamp(-(fx - .5) * im.width * k * sc, -mx, mx), y: clamp(-(fy - .5) * im.height * k * sc, -my, my), r: lerp(S.roll ?? -1, -(S.roll ?? -1), x) * .6 };
  }
  const m = S.move || ({ push: 'push', rise: 'rise', orbit: 'orbit', assemble: 'pull', final: 'pull', sail: 'orbitL' })[S.kind] || 'push';
  const x = eio(u);
  if (S.fly) { const a = S.fly[0], b = S.fly[1]; return { x: lerp(a[0], b[0], x), y: lerp(a[1], b[1], x), s: lerp(a[2], b[2], x), r: lerp(a[3] || 0, b[3] || 0, x) }; }
  if (m === 'orbitL') return { s: lerp(1.12, 1.28, x), x: lerp(430, -430, x), y: lerp(40, -30, x), r: lerp(-7, 5, x) };
  if (m === 'orbitR') return { s: lerp(1.12, 1.28, x), x: lerp(-430, 430, x), y: lerp(40, -30, x), r: lerp(7, -5, x) };
  if (m === 'dive')   return { s: lerp(1.75, 1.12, x), x: lerp(120, 0, x), y: lerp(-420, 0, x), r: lerp(6, 0, x) };
  if (m === 'chase')  return { s: lerp(0.98, 1.42, x), x: lerp(-60, 40, x), y: lerp(80, -40, x), r: lerp(-3, 2, x) };
  if (m === 'pass')   return { s: lerp(1.38, 1.30, x), x: lerp(-380, 380, x), y: 0, r: lerp(-4, 4, x) };
  if (m === 'push')  return { s: lerp(1.06, 1.34, x), x: lerp(0, -30, x), y: lerp(20, -40, x), r: lerp(-1.5, 1.2, x) };
  if (m === 'rise')  return { s: lerp(1.55, 1.12, x), x: 0, y: lerp(380, -60, x), r: lerp(2, -1, x) };
  if (m === 'orbit') return { s: lerp(1.28, 1.18, x), x: lerp(160, -160, x), y: 0, r: lerp(-3, 3, x) };
  if (m === 'pull')  return { s: lerp(1.30, 1.04, eo(u)), x: lerp(-40, 0, x), y: lerp(-60, 0, x), r: lerp(1.5, 0, x) };
  return { s: 1.1, x: 0, y: 0, r: 0 };
}

function drawImg(im, c, alpha = 1, src) {
  const k = Math.max(W / im.width, H / im.height);
  g.save(); g.globalAlpha = alpha;
  g.translate(W / 2 + c.x, H / 2 + c.y); g.rotate(c.r * Math.PI / 180); g.scale(k * c.s, k * c.s);
  if (src) g.drawImage(im, src[0], src[1], src[2], src[3], -im.width / 2 + src[0], -im.height / 2 + src[1] + (src[4] || 0), src[2], src[3]);
  else g.drawImage(im, -im.width / 2, -im.height / 2);
  g.restore();
}
// zoom blur: суретті бірнеше рет үлкейтіп мөлдір салу
function zoomBlur(im, c, amt) {
  drawImg(im, c);
  if (amt < 0.01) return;
  const n = 7;
  for (let j = 1; j <= n; j++) drawImg(im, { ...c, s: c.s * (1 + amt * 0.09 * j) }, 0.32 * (1 - j / (n + 2)));
}

// ---------- бөлшектер ----------
// шаң/шашыранды бұлты: кадрға қарай ұшып, бүкіл экранды жауып, ашылады
const fx = document.createElement('canvas'); fx.width = W / 2; fx.height = H / 2;
const fg = fx.getContext('2d');
// жұмсақ бұлт-спрайттар: бірнеше мөлдір дақтан тұрады, шеті бұлыңғыр
const sprites = pal.puff.map((col, ci) => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const R = mul(500 + ci);
  for (let i = 0; i < 18; i++) {
    const cx = 128 + (R() - .5) * 120, cy = 128 + (R() - .5) * 120, r = 40 + R() * 70;
    const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = .18 + R() * .2; x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  }
  return c;
});
function burst(t, t0, seed, power = 1) {
  const age = t - t0; if (age < 0 || age > 1.1) return;
  const R = mul(seed);
  fg.clearRect(0, 0, fx.width, fx.height);
  const n = Math.round(150 * power);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, sp = 300 + R() * 900, life = 0.55 + R() * 0.5;
    const ox = W / 2 + (R() - .5) * 500, oy = H * (0.55 + R() * 0.4);
    const p = age / life; if (p > 1) { R(); R(); continue; }
    const x = ox + Math.cos(a) * sp * age, y = oy + Math.sin(a) * sp * age * 0.8 - 250 * age;
    const r = (60 + R() * 140) * (1 + age * 5) * power;
    const al = (1 - p) ** 1.6 * (0.55 + R() * 0.4) * Math.min(1, age * 12);
    fg.globalAlpha = Math.min(1, al * 1.6); const sp2 = sprites[i % sprites.length], d = r * 1.3;
    fg.drawImage(sp2, (x - d) / 2, (y - d) / 2, d, d);
  }
  g.save(); g.filter = C.palette === 'spray' || C.palette === 'snow' ? 'blur(6px) brightness(1.25)' : 'blur(6px)'; g.drawImage(fx, 0, 0, W, H); g.restore();
  // ұсақ қиыршықтар / тамшылар — анық, жылдам
  const round = C.palette === 'spray' || C.palette === 'snow';
  g.save(); g.fillStyle = pal.chip;
  for (let i = 0; i < 90 * power; i++) {
    const a = R() * Math.PI * 2, sp = 900 + R() * 1800, life = .35 + R() * .45, p = age / life;
    if (p > 1) continue;
    const x = W / 2 + Math.cos(a) * sp * age, y = H * .65 + Math.sin(a) * sp * age + 900 * age * age;
    const s = (round ? 3 + R() * 9 : 6 + R() * 22) * (1 + age * 3);
    g.globalAlpha = (1 - p) * .9; g.translate(x, y);
    if (round) { g.rotate(Math.atan2(Math.sin(a) * sp + 1800 * age, Math.cos(a) * sp)); g.beginPath(); g.ellipse(0, 0, s * 1.6, s * .32, 0, 0, 7); g.fill(); }
    else { g.rotate(a + age * 9); g.fillRect(-s / 2, -s / 3, s, s * .66); }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  g.restore();
}
// бір қабат түскенде көтерілетін кішкене бұлт
function puffLine(t, t0, y, seed) {
  const age = t - t0; if (age < 0 || age > 0.9) return;
  const R = mul(seed); g.save();
  for (let i = 0; i < 26; i++) {
    const x = R() * W, dx = (R() - .5) * 400, r = (30 + R() * 60) * (1 + age * 3.5);
    g.globalAlpha = (1 - age / .9) ** 2 * .45; const d = r * 2.6;
    g.drawImage(sprites[i % sprites.length], x + dx * age - d / 2, y - 120 * age * R() - d / 2, d, d);
  }
  g.restore();
}
// дәнекер ұшқындары
function sparks(t, t0, seed, x0 = W * .62, y0 = H * .45) {
  const age = t - t0; if (age < 0 || age > 1.4) return;
  const R = mul(seed); g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const born = R() * 0.7, a = -Math.PI / 2 + (R() - .5) * 2.6, sp = 500 + R() * 900, life = .4 + R() * .5;
    const tt = age - born; if (tt < 0 || tt > life) { continue; }
    const x = x0 + Math.cos(a) * sp * tt, y = y0 + Math.sin(a) * sp * tt + 1300 * tt * tt;
    const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp + 2600 * tt;
    g.strokeStyle = `rgba(255,${170 + R() * 70 | 0},80,${(1 - tt / life)})`; g.lineWidth = 2.5 + R() * 3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - vx * .03, y - vy * .03); g.stroke();
  }
  const fl = Math.max(0, 1 - age / 0.7) * (0.6 + 0.4 * Math.sin(age * 90));
  const gr = g.createRadialGradient(x0, y0, 0, x0, y0, 160); gr.addColorStop(0, `rgba(255,220,150,${fl})`); gr.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = gr; g.fillRect(x0 - 160, y0 - 160, 320, 320);
  g.restore();
}

// ---------- мәтін ----------
function title(S, t) {
  if (!S.title) return;
  const lt = t - S.s - (S.titleAt ?? 0.25); if (lt < 0) return;
  const k = back(lt / 0.45), a = clamp(lt * 5);
  const y = S.titleY ?? 300;
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.translate(W / 2, y); g.scale(lerp(1.25, 1, clamp(k)), lerp(.6, 1, clamp(k)));
  g.font = `800 ${S.titleSize || 112}px Inter`; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40; g.shadowOffsetY = 8;
  const grd = g.createLinearGradient(0, -100, 0, 10); grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#cfd6dc');
  g.fillStyle = grd; wrap(S.title, 0, 0, 980, (S.titleSize || 112) * .95);
  if (S.sub) { g.font = `400 ${S.subSize || 46}px Inter`; g.fillStyle = '#fff'; g.shadowBlur = 24; g.fillText(S.sub, 0, -(S.titleSize || 112) * 1.02 - 18); }
  g.restore();
}
function wrap(s, x, y, maxW, lh) {
  const lines = String(s).split('\n'); lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
}


// ---------- SAIL: объект (кеме) теңізде жүзеді, камера айналып ұшады ----------
// Қабаттар: _bg.jpg (объектісіз фон, экранды толық жабады, камераға қарсы жылжиды) → артқы көбік → _obj.png (кеме, ортада, тербеледі) → тұмсық шашырандысы
// shipW — кеменің ені экран еніне қатынасы (0.9 = толық көрінеді), shipY — кеме ортасы экранның қай биіктігінде (0..1)
function bbox(im) {
  const w = 400, h = Math.round(400 * im.height / im.width), c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) if (d[(y * w + X) * 4 + 3] > 120) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const k = im.width / w; return { x0: x0 * k, y0: y0 * k, x1: x1 * k, y1: y1 * k, cx: (x0 + x1) / 2 * k, cy: (y0 + y1) / 2 * k };
}
function shipT(S, ob, c, bob) {
  const bb = imgs['bb:' + S.src], ref = S.shipW ?? 0.9;
  const sk = ref * W / (bb.x1 - bb.x0) * (c.s / 1.2) * (S.shipMax ? Math.min(1, S.shipMax * H / ((bb.y1 - bb.y0) * ref * W / (bb.x1 - bb.x0))) : 1);
  return { cx: W / 2 + c.x * 0.3, cy: H * (S.shipY ?? 0.56) + c.y * 0.3 + bob.y, sk, r: c.r + bob.r, bb };
}
function drawShip(ob, T, dx = 0, dy = 0, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.translate(T.cx + dx, T.cy + dy); g.rotate(T.r * Math.PI / 180); g.scale(T.sk, T.sk);
  g.drawImage(ob, -T.bb.cx, -T.bb.cy); g.restore();
}
function ptShip(im, T, fx, fy) {
  const x = (fx * im.width - T.bb.cx) * T.sk, y = (fy * im.height - T.bb.cy) * T.sk, a = T.r * Math.PI / 180;
  return { x: T.cx + x * Math.cos(a) - y * Math.sin(a), y: T.cy + x * Math.sin(a) + y * Math.cos(a) };
}
function bgCam(S, im, c, t0) {
  const k = Math.max(W / im.width, H / im.height), hd = S.heading || [1, 0], sp = S.speed ?? 320;
  const sc = 1 + (c.s - 1) * 0.5 + 0.22 + (S.zoomFlow || 0) * t0;
  const mx = (im.width * k * sc - W) / 2, my = (im.height * k * sc - H) / 2;
  return { s: sc, x: clamp(-c.x * 0.9 - hd[0] * sp * t0 + (S.bgx || 0), -mx, mx), y: clamp(c.y * 0.4 - hd[1] * sp * t0 + (S.bgy || 0), -my, my), r: c.r * 0.8 };
}
function foam(S, im, T, t0, pt, seed, kind) {
  const hd = S.heading || [1, 0], sp = (S.speed ?? 320) * 1.1, R = mul(seed);
  const E = ptShip(im, T, pt[0], pt[1]); g.save(); g.globalCompositeOperation = 'screen';
  const N = kind === 'wake' ? 70 : 40, life = kind === 'wake' ? 1.1 : 0.55, sz = (S.foamSize || 1) * Math.min(1.6, T.sk * 2.2);
  for (let i = 0; i < N; i++) {
    const per = life / N, born = -life + i * per + R() * per;
    let age = (t0 - born) % life; if (age < 0) age += life;
    const ang = R() * Math.PI * 2, spr = (kind === 'wake' ? 60 + R() * 120 : 120 + R() * 200) * sz;
    const x = E.x - hd[0] * sp * age * sz + Math.cos(ang) * spr * age;
    const y = E.y - hd[1] * sp * age * sz + Math.sin(ang) * spr * age * (kind === 'wake' ? .3 : .5) - (kind === 'bow' ? (240 * age - 420 * age * age) * sz : 0);
    const r = (kind === 'wake' ? 38 : 24) * (1 + age * 3) * sz;
    g.globalAlpha = (1 - age / life) ** 1.4 * (kind === 'wake' ? .55 : .75);
    g.drawImage(sprites[i % sprites.length], x - r, y - r, r * 2, r * 2);
  }
  g.restore();
}
function drawSail(S, t, c, inA, outA) {
  const im = imgs[S.src], bg = imgs['bg:' + S.src], ob = imgs['obj:' + S.src], t0 = t - S.s;
  // свайп-өтпе: кадр бүйірге жылдам кетеді, келесісі қарсы жақтан кіреді
  const wd = S.whip ?? 1, wx = (outA * outA - inA * inA) * W * 0.95 * wd;
  const cc = { ...c, x: c.x - wx / 0.9 };
  const bob = { y: Math.sin(t0 * 2.3 + S.i) * 7, r: Math.sin(t0 * 1.7 + S.i) * 0.9 };
  const bc = bgCam(S, im, cc, t0);
  const T = shipT(S, ob, { ...cc, x: cc.x - wx * 0.6 / 0.3 * 0 }, bob);
  T.cx -= wx * 1.0;                          // свайпта кеме де кадрдан шығады
  // қозғалыс бұлыңғырлығы
  const c2 = cam(S, clamp((t0 + 1 / 30) / S.dur)), vx = (c2.x - c.x), vy = (c2.y - c.y);
  const wv = Math.max(inA, outA) * W * 0.18;
  const bx = Math.abs(-vx * 0.9) + wv, sx = Math.abs(vx * 0.3) + wv;
  const hd = S.heading || [1, 0], fl = (S.speed ?? 320) / 30;
  const nb = Math.min(8, 2 + Math.round(bx / 12));
  for (let j = 0; j < nb; j++) {             // фон: камера + су ағысы бойымен бұлыңғыр
    const f = j / (nb - 1) - .5;
    drawImg(bg, { ...bc, x: bc.x + bx * f * Math.sign(vx || 1) + hd[0] * fl * f * 2, y: bc.y + hd[1] * fl * f * 2 }, j === 0 ? 1 : 0.3);
  }
  // кемені суға «отырғызу»: астына жұмсақ көлеңке
  const bb = T.bb, wl = (S.waterline ?? 0.97), bw = (bb.x1 - bb.x0) * T.sk;
  const sy = T.cy + (bb.y0 + (bb.y1 - bb.y0) * wl - bb.cy) * T.sk;
  g.save(); g.translate(T.cx, sy); g.scale(1, 0.16);
  const sg = g.createRadialGradient(0, 0, 0, 0, 0, bw * .55); sg.addColorStop(0, 'rgba(0,15,30,.45)'); sg.addColorStop(1, 'rgba(0,15,30,0)');
  g.fillStyle = sg; g.fillRect(-bw, -bw, bw * 2, bw * 2); g.restore();
  if (S.stern) foam(S, im, T, t0, S.stern, 300 + S.i, 'wake');
  const ns = Math.min(6, 1 + Math.round(sx / 14));
  for (let j = 0; j < ns; j++) { const f = ns > 1 ? j / (ns - 1) - .5 : 0; drawShip(ob, T, sx * f * Math.sign(vx || 1), 0, j === 0 ? 1 : 0.35); }
  // су сызығы бойындағы көбік
  if (S.waterFoam !== false) { const R = mul(900 + S.i); g.save(); g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 16; i++) { const fx = R(), x = T.cx + (bb.x0 + (bb.x1 - bb.x0) * fx - bb.cx) * T.sk, ph = R() * 6;
      const r = (26 + R() * 30) * Math.min(1.5, T.sk * 2) * (1 + .25 * Math.sin(t0 * 7 + ph));
      g.globalAlpha = .5 + .25 * Math.sin(t0 * 5 + ph); g.drawImage(sprites[i % sprites.length], x - r * 1.6, sy - r * .55, r * 3.2, r * 1.1); }
    g.restore(); }
  if (S.bow) foam(S, im, T, t0, S.bow, 500 + S.i, 'bow');
  if (S.bow2) foam(S, im, T, t0, S.bow2, 700 + S.i, 'bow');
}

// ---------- кадр ----------
function shake(t) {
  let a = 0;
  shots.forEach(S => { if (S.kind !== 'assemble') return; const K = S.strips || 6;
    for (let k = 0; k < K; k++) { const d = t - (S.s + landAt(S, k)); if (d >= 0 && d < .5) a += (k === K - 1 ? 26 : 14) * Math.exp(-d * 11); } });
  shots.forEach((S, i) => { if (i === 0) return; const d = t - S.s; if (d >= -0.05 && d < .4) a += 10 * Math.exp(-Math.max(0, d) * 9); });
  return { x: Math.sin(t * 93) * a, y: Math.cos(t * 71) * a * .8 };
}

function frame(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const S = shots.find(s => t >= s.s && t < s.e) || shots[shots.length - 1];
  const u = (t - S.s) / S.dur, im = imgs[S.src];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const sh = shake(t); g.translate(sh.x, sh.y);
  let c = cam(S, u);
  // өтпе: соңында үлкейіп бұлыңғырланады, басында бұлыңғырдан шығады
  const last = S.i === shots.length - 1;
  const inA = S.i > 0 ? clamp(1 - (t - S.s) / TR) : 0;
  const outA = !last ? clamp(1 - (S.e - t) / TR) : 0;
  const blur = Math.max(inA, outA);
  c = { ...c, s: c.s * (1 + outA * outA * 0.35) * (1 + inA * inA * 0.18) };

  if (S.kind === 'sail') {
    drawSail(S, t, c, inA, outA);
  } else if (S.kind === 'assemble') {
    // 1) бос алаң  2) каркас төменнен жоғары өседі  3) қабаттар жоғарыдан түседі
    const k = Math.max(W / im.width, H / im.height);
    const plate = imgs['plate:' + S.src], edge = imgs['edge:' + S.src];
    g.save(); g.filter = 'none'; g.drawImage(plate, -40, -40, W + 80, H + 80); g.restore();
    const wf = eo((t - S.s) / (S.dur * 0.32));
    if (wf > 0) { const rows = Math.round(edge.height * wf);
      g.save(); g.globalAlpha = .9; drawEdge(edge, im, c, rows); g.restore(); }
    const K = S.strips || 6, hh = im.height / K;
    for (let j = 0; j < K; j++) {           // j=0 — ең төменгі қабат
      const tl = S.s + landAt(S, j), p = (t - (tl - 0.38)) / 0.38;
      if (p <= 0) continue;
      const row = K - 1 - j, off = -(1 - back(p)) * (H * 0.75) / (k * c.s);
      drawImg(im, c, clamp(p * 2.5), [0, row * hh, im.width, hh + 1, off]);
      puffLine(t, tl, H / 2 + c.y + (-im.height / 2 + (row + 1) * hh) * k * c.s, 900 + j * 17);
    }
    if (blur > 0) zoomBlur(im, c, blur * 2.2);
  } else {
    zoomBlur(im, c, blur * 2.4);
  }
  if (S.sparks) sparks(t, S.s + S.sparks * S.dur, 77 + S.i, W * (S.sparkX ?? .62), H * (S.sparkY ?? .45));
  // шаң/шашыранды: әр өтпеде және бірінші кадрда
  shots.forEach((B, i) => { if (B.burst === false) return; burst(t, i === 0 ? -0.05 : B.s - 0.16, 31 + i * 13, B.burstPower ?? (i === 0 ? 1.2 : 1)); });
  g.setTransform(1, 0, 0, 1, 0, 0);
  // түс және виньетка
  g.fillStyle = pal.tint; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  title(S, t);
  // басы мен соңы: қараңғыдан шығу / қараңғыға кету
  const fin = clamp(1 - t / 0.25), fout = C.fadeOut === false ? 0 : clamp((t - (DUR - 0.35)) / 0.35);
  if (fin + fout > 0) { g.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; g.fillRect(0, 0, W, H); }
}
function drawEdge(edge, im, c, rows) {
  const k = Math.max(W / im.width, H / im.height), sc = im.width / edge.width;
  g.translate(W / 2 + c.x, H / 2 + c.y); g.rotate(c.r * Math.PI / 180); g.scale(k * c.s * sc, k * c.s * sc);
  const y0 = edge.height - rows;
  g.drawImage(edge, 0, y0, edge.width, rows, -edge.width / 2, -edge.height / 2 + y0, edge.width, rows);
}

window.READY = (async () => {
  await document.fonts.load('800 100px Inter'); await document.fonts.load('400 40px Inter'); await document.fonts.ready;
  for (const S of shots) if (!imgs[S.src]) {
    const im = await load(S.src); if (!im) throw new Error('Сурет табылмады: ' + S.src);
    imgs[S.src] = im; imgs['edge:' + S.src] = edgesOf(im); imgs['plate:' + S.src] = plateOf(im);
    if (S.kind === 'sail') {
      const b = S.src.replace(/\.(jpe?g|png)$/i, '');
      imgs['obj:' + S.src] = await load(S.obj || b + '_obj.png'); imgs['bg:' + S.src] = await load(S.bg || b + '_bg.jpg');
      if (!imgs['obj:' + S.src] || !imgs['bg:' + S.src]) throw new Error('cutout.py іске қосылмаған: ' + S.src);
      imgs['bb:' + S.src] = bbox(imgs['obj:' + S.src]);
    }
  }
  frame(0); return true;
})();
window.render = t => { frame(t); return true; };
})();
