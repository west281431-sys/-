# «ҚЫС-2026» рилсінің дыбысы: тактикалық музыка + сирена + «тырррт» + соққылар.
# python3 -I audio.py timeline.json sfx_dir out.wav
import sys, json, wave, numpy as np
T = json.load(open(sys.argv[1])); SFX = sys.argv[2]; OUT = sys.argv[3]
SR = 48000; DUR = T['dur']; N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)
BPM = 120; beat = 60 / BPM

def add(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    if sig.ndim == 1: sl = sr_ = sig
    else: sl, sr_ = sig[0], sig[1]
    j = min(N, i + len(sl)); n = j - i
    L[i:j] += sl[:n] * g * (1 - max(0, pan)); R[i:j] += sr_[:n] * g * (1 + min(0, pan))

def load(name):
    w = wave.open(f'{SFX}/{name}.wav'); fr = w.getframerate(); ch = w.getnchannels()
    a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    a = a.reshape(-1, ch).T
    if fr != SR:
        x = np.arange(0, a.shape[1], fr / SR); a = np.array([np.interp(x, np.arange(a.shape[1]), c) for c in a])
    return a if ch == 2 else a[0]
S = {k: load(k) for k in ['boom', 'impact', 'thud', 'whoosh', 'glitch', 'tick', 'click', 'rumble', 'cin1', 'cin2', 'ding']}

tt = lambda d: np.arange(int(SR * d)) / SR
def lp(x, a):  # бір полюсті төменгі жиілік сүзгісі
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y
def saw(f, d):
    t = tt(d); return 2 * ((f * t) % 1) - 1

# ---------- МУЗЫКА (0-ден басталады) ----------
m = lambda n: 440 * 2 ** ((n - 69) / 12)
# дрон: D минор, детюн саw, сүзілген
t = tt(DUR)
drone = sum(np.sin(2*np.pi*f*t + ph) for f, ph in [(m(38), 0), (m(38)*1.003, 1), (m(45), 2), (m(50)*0.998, .5)]) / 4
drone *= 0.5 + 0.5 * np.sin(2*np.pi*t/8) ** 2
add(drone * np.minimum(1, t / 0.4) * np.clip((DUR - t) / 1.5, 0, 1), 0, 0.22)

def kick():
    d = tt(0.5); f = 45 + 110 * np.exp(-d * 30)
    return np.tanh(2.2 * np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-d * 6.5))
def hat(o=False):
    n = int(SR * (0.1 if o else 0.035)); z = np.diff(np.r_[0, rng.standard_normal(n)])
    return z * np.exp(-np.arange(n)/SR * (28 if o else 110))
def snare():
    d = tt(0.32); z = rng.standard_normal(len(d))
    return 0.6 * z * np.exp(-d * 16) + 0.5 * np.sin(2*np.pi*180*d) * np.exp(-d * 22)
def pulse(f, d=0.22):
    x = saw(f, d) + 0.6 * saw(f * 1.006, d); x = lp(x, 0.08)
    e = np.minimum(1, tt(d)/0.004) * np.exp(-tt(d) * 9); return x * e
def pluck(f, d=0.3):
    x = np.sign(np.sin(2*np.pi*f*tt(d))) * 0.5 + saw(f, d) * 0.5; x = lp(x, 0.25)
    return x * np.exp(-tt(d) * 14)

prog = [38, 38, 34, 36]  # D D Bb C
fin = T['finale']
nb = int(DUR / beat)
for b in range(nb):
    tb = b * beat; bar = b // 4; root = prog[bar % len(prog)]
    if tb >= DUR - 0.6: break
    in_hook = tb < 1.6; after_fin = tb >= fin
    # бас пульс (сегізінші)
    for k in range(2):
        g = 0.32 if not after_fin else 0.18
        add(pulse(m(root + (12 if k else 0))), tb + k * beat / 2, g)
    # кик
    if after_fin:
        if b % 2 == 0: add(kick(), tb, 0.55)
    else:
        add(kick(), tb, 0.8 if not in_hook else 0.6)
    if not in_hook and not after_fin:
        if b % 2 == 1: add(snare(), tb, 0.32)
        for h in range(4):
            add(hat(h == 2), tb + h * beat / 4, 0.09 if h % 2 else 0.14, 0.3)
        # плак-арпеджио Ақтау/Жаңаөзеннен кейін — энергия
        if tb >= 4.0:
            notes = [root + 24, root + 27, root + 31, root + 27]
            for h in range(4): add(pluck(m(notes[h])), tb + h * beat / 4, 0.07, -0.3 if h % 2 else 0.3)

# райзер (ақ шу өседі) титр мен финал алдында
def riser(d):
    x = rng.standard_normal(int(SR*d)); e = (tt(d)/d) ** 2.2
    return lp(x, 0.05 + 0.4 * 0) * e
add(riser(1.4), 0.2, 0.35); add(riser(1.0), fin - 1.0, 0.35)

# ---------- СИРЕНА ----------
def siren(d, period=0.8, f0=620, f1=1350):
    tt_ = tt(d); ph = (tt_ % period) / period
    f = f0 + (f1 - f0) * (0.5 - 0.5 * np.cos(2*np.pi*ph))
    x = np.sin(2*np.pi*np.cumsum(f)/SR); x = np.tanh(2.5 * x) + 0.3 * np.sin(4*np.pi*np.cumsum(f)/SR)
    e = np.minimum(1, tt_/0.08) * np.clip((d - tt_)/0.25, 0, 1)
    return x * e
add(siren(1.75), 0.0, 0.16)
add(siren(1.4, 0.35, 700, 1500), fin, 0.12)

# ---------- «ТЫРРРТ» — айналатын цифрлар ----------
def roll(t0, d, g=0.5, rate=38):
    k = 0
    while k / rate < d:
        add(S['tick'], t0 + k / rate, g * (0.75 + 0.25 * rng.random())); k += 1
hookRolls = [(0.05, 0.45), (0.2, 0.35), (0.4, 0.35), (0.55, 0.4), (1.6, 0.35), (2.15, 0.25), (2.45, 0.25), (2.75, 0.25)]
for a, d in hookRolls: roll(a, d)
for i, r in enumerate(T['regions']):
    st = T['hookEnd'] if i == 0 else r['start']
    if i > 0:
        roll(st - 0.1, 0.35, 0.5); roll(st + 0.2, 0.4, 0.4)
        add(S['whoosh'], st - 0.4, 0.6); add(S['glitch'], st + 0.15, 0.45); add(S['thud'], st, 0.65)
        d = tt(0.28); f = 300 + 2200 * (d / 0.28) ** 2   # сканер-свип
        add(np.sin(2*np.pi*np.cumsum(f)/SR) * np.minimum(1, d/0.02) * np.exp(-d*4), st - 0.28, 0.09)
        d = tt(0.12); add(np.sin(2*np.pi*1800*d) * np.exp(-d*30), st + 0.02, 0.12)  # «lock» пип
    else:
        roll(st, 0.42, 0.45)
        add(S['glitch'], st - 0.3, 0.5); add(S['whoosh'], st - 0.4, 0.5); add(S['thud'], st, 0.6)
roll(fin + 0.25, 0.55, 0.55)

# таймер пиптері (кері санақ)
for k, tb in enumerate(np.arange(0.0, 1.6, 0.2)):
    d = tt(0.06); f = 1500 + k * 120
    add(np.sin(2*np.pi*f*d) * np.exp(-d * 40), tb, 0.12)
# радар пингі
for tb in (0.6, 1.0, 1.4):
    d = tt(0.5); add(np.sin(2*np.pi*1250*d) * np.exp(-d * 9), tb, 0.08, 0.4)

# соққылар
add(S['boom'], 1.6, 0.95); add(S['impact'], 1.6, 0.6); add(S['cin1'], 1.6, 0.5)
for k in range(3): add(S['thud'], 2.15 + 0.3 * k + 0.25, 0.55)
add(S['boom'], fin, 0.7); add(S['boom'], fin + 0.8, 0.95); add(S['impact'], fin + 0.8, 0.6); add(S['cin2'], fin + 0.8, 0.45)
# жазу дыбыстары
for t0, d in [(1.8, 0.3), (fin + 1.0, 0.35), (fin + 1.4, 0.45)]:
    k = 0
    while k * 0.045 < d: add(S['click'], t0 + k * 0.045, 0.25); k += 1
add(S['ding'], fin + 1.9, 0.4)
for a in (6.0, 16.2, 30.0, 42.0):
    roll(a, 0.3, 0.3)
    k = 0
    while k * 0.05 < 0.9: add(S['click'], a + 0.2 + k * 0.05, 0.12); k += 1

# ---------- шығару ----------
mix = np.vstack([L, R]); mix = np.tanh(mix * 0.9)
fade = np.clip((DUR - np.arange(N)/SR) / 0.35, 0, 1); mix *= fade
mix /= np.max(np.abs(mix)) * 1.05
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix.T * 32767).astype(np.int16).tobytes()); w.close()
print('ok', OUT)
