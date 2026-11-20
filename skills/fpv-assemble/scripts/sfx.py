# Синтез дыбыстары (лицензиясыз, өзіміз жасаймыз): python3 -I scripts/sfx.py template/a/sfx
# clank — металл соққысы, spark — дәнекер ұшқыны, rumble — төмен гүріл, splash — су шашырауы, impact — ауыр соққы
import sys, wave, numpy as np
out = sys.argv[1] if len(sys.argv) > 1 else 'template/a/sfx'
SR = 44100
rng = np.random.default_rng(3)

def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    w = wave.open(f'{out}/{name}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()

def t_(d): return np.arange(int(SR * d)) / SR

def lowpass(x, a):  # бір полюсті сүзгі
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

# clank: үйлесімсіз жиіліктер, тез сөнеді
t = t_(0.9)
x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * g for f, d, g in
        [(420, 9, 1), (1130, 12, .6), (1810, 16, .45), (2770, 20, .3), (3960, 26, .2)])
x[:300] += rng.standard_normal(300) * np.linspace(1, 0, 300)
save('clank', x)

# spark: кездейсоқ шытырлаған импульстер
t = t_(1.2); x = np.zeros_like(t)
for _ in range(260):
    i = int(rng.uniform(0, 0.95) * len(t)); n = int(SR * rng.uniform(.002, .008))
    x[i:i + n] += rng.standard_normal(n) * np.exp(-np.arange(n) / (n / 3)) * rng.uniform(.3, 1)
x = np.diff(np.r_[0, x]) * np.exp(-t * 1.5)
save('spark', x)

# rumble: төмен жиілікті шу, баяу көтеріліп сөнеді
t = t_(1.6)
x = lowpass(rng.standard_normal(len(t)), 0.02) * np.minimum(1, t / 0.15) * np.exp(-t * 2.2)
x += np.sin(2 * np.pi * 45 * t) * np.exp(-t * 3) * 0.3
save('rumble', x)

# splash: су шашырауы — сүзілген шу, тез шабуыл
t = t_(1.1)
n = rng.standard_normal(len(t)); n = n - lowpass(n, 0.08)
x = n * np.minimum(1, t / 0.01) * np.exp(-t * 4.5) + lowpass(rng.standard_normal(len(t)), 0.15) * np.exp(-t * 3) * .5
save('splash', x)

# impact: ауыр соққы (төмен «бум» + шытыр)
t = t_(1.0)
f = 38 + 120 * np.exp(-t * 22)
x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
x[:1500] += rng.standard_normal(1500) * np.exp(-np.arange(1500) / 300) * .6
save('impact', x)
print('ok')
