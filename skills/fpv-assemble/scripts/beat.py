# Фондық бит (өзіміз синтездейміз, лицензиясыз): python3 -I scripts/beat.py ҰЗАҚТЫҒЫ ФАЙЛ.wav [BPM]
import sys, numpy as np, wave
DUR=float(sys.argv[1]) if len(sys.argv)>1 else 20; OUT=sys.argv[2] if len(sys.argv)>2 else 'beat.wav'; BPM=float(sys.argv[3]) if len(sys.argv)>3 else 112
SR=44100; beat=60/BPM
N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def add(sig,t,pan=0.0,g=1.0):
    i=int(t*SR)
    if i>=N: return
    j=min(N,i+len(sig)); s=sig[:j-i]*g
    L[i:j]+=s*(1-pan)*0.5*2**.5; R[i:j]+=s*(1+pan)*0.5*2**.5
def env(n,a=0.005,r=0.2):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/r); return e
def kick():
    n=int(SR*.45); t=np.arange(n)/SR; f=48+90*np.exp(-t*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7)
def snare():
    n=int(SR*.3); t=np.arange(n)/SR; nz=rng.standard_normal(n)
    nz=np.convolve(nz,[1,-0.6],'same'); return (0.55*nz*np.exp(-t*18)+0.4*np.sin(2*np.pi*190*t)*np.exp(-t*25))
def hat(open_=False):
    n=int(SR*(.12 if open_ else .04)); nz=rng.standard_normal(n); nz=np.diff(np.r_[0,nz])
    return nz*np.exp(-np.arange(n)/SR*(25 if open_ else 90))
def note(freq,dur,kind='pad'):
    n=int(SR*dur); t=np.arange(n)/SR
    if kind=='pad':
        s=sum(np.sin(2*np.pi*freq*d*t+ph) for d,ph in [(1,0),(1.004,1),(0.996,2),(2,0.5)])/4
        e=np.minimum(1,t/0.25)*np.minimum(1,(dur-t)/0.3).clip(0,1)
    elif kind=='bass':
        s=np.sin(2*np.pi*freq*t)+0.25*np.sin(2*np.pi*2*freq*t); e=np.minimum(1,t/0.01)*np.exp(-t*1.6)
    else: # keys (e-piano-ish)
        s=np.sin(2*np.pi*freq*t+0.8*np.sin(2*np.pi*freq*t)*np.exp(-t*4)); e=np.minimum(1,t/0.004)*np.exp(-t*3.2)
    return s*e
m=lambda n:440*2**((n-69)/12)
# Am7 – Fmaj7 – C – G  (pleasant, warm)
prog=[[57,60,64,67],[53,57,60,64],[48,55,60,64],[55,59,62,67]]
bassn=[45,41,48,43]
bar=4*beat; t=0; k=0
while t<DUR:
    ch=prog[k%4]
    for n_ in ch: add(note(m(n_),bar,'pad'),t,0,0.10)
    add(note(m(bassn[k%4]),beat*1.5,'bass'),t,0,0.42); add(note(m(bassn[k%4]),beat*1.2,'bass'),t+beat*2.5,0,0.32)
    # keys arpeggio on offbeats
    for i,st in enumerate([0.5,1.5,2.5,3.25,3.5]):
        add(note(m(ch[i%4]+12),0.6,'keys'),t+st*beat,(-0.4 if i%2 else 0.4),0.07)
    for b in range(4):
        tb=t+b*beat
        if b in (0,2): add(kick(),tb,0,0.85)
        if b==2: add(kick(),tb+beat*0.75,0,0.45)
        if b in (1,3): add(snare(),tb,0,0.35)
        for h in range(4): add(hat(h==2 and b==3),tb+h*beat/4,0.3,0.10 if h%2 else 0.16)
    t+=bar; k+=1
x=np.stack([L,R],1); x/=np.abs(x).max()*1.12
fade=int(SR*0.8); x[:fade]*=np.linspace(0,1,fade)[:,None]
w=wave.open(OUT,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype(np.int16).tobytes()); w.close()
