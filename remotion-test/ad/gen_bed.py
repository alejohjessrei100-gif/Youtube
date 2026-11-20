"""Synth music bed + whooshes for the ad (30 s, stereo, 44.1 kHz)."""
import numpy as np, wave
sr=44100; dur=30.0; n=int(sr*dur); t=np.arange(n)/sr
rng=np.random.default_rng(3)
bpm=124; beat=60/bpm
out=np.zeros(n)
def add(sig,start,gain=1.0):
    i=int(start*sr); j=min(n,i+len(sig))
    if i<n: out[i:j]+=sig[:j-i]*gain
def kick():
    L=int(0.28*sr); x=np.arange(L)/sr
    f=120*np.exp(-x*22)+42
    return np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-x*9)
def hat():
    L=int(0.06*sr); x=rng.standard_normal(L); x=np.diff(x,prepend=0)
    return x*np.exp(-np.arange(L)/sr*70)*0.35
def tone(freq,L,dec,harm=(1,0.5,0.25)):
    x=np.arange(int(L*sr))/sr
    return sum(h*np.sin(2*np.pi*freq*(k+1)*x) for k,h in enumerate(harm))*np.exp(-x*dec)
K=kick(); H=hat()
roots=[110.0,87.31,98.0,82.41]  # Am F G E  (bass)
chords=[[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66],[164.81,207.65,246.94]]
bars=int(dur/(beat*4))+1
for bar in range(bars):
    c=bar%4; t0=bar*beat*4
    for b in range(4):
        tb=t0+b*beat
        add(K,tb,0.9)
        add(H,tb+beat/2,0.8)
        add(tone(roots[c],beat*0.9,3.5,(1,0.4)),tb+beat/2,0.28)
        for k,f in enumerate(chords[c]):
            add(tone(f*2,beat*0.5,7,(1,0.3)),tb+k*beat/4*1.0,0.07)
            add(tone(f*2,beat*0.5,7,(1,0.3)),tb+beat/2+k*beat/4,0.05)
# whooshes at scene changes (seconds)
for s in (3.33,5.5,15.5,20.0,23.5,27.5):
    L=int(0.55*sr); x=rng.standard_normal(L)
    env=np.sin(np.linspace(0,np.pi,L))**2
    # moving low-pass via cumulative smoothing
    y=np.zeros(L); a=0.02
    for i in range(1,L):
        a=0.02+0.5*(i/L)
        y[i]=y[i-1]+a*(x[i]-y[i-1])
    add(y*env*1.4,s-0.38,0.5)
out=np.tanh(out*1.1)*0.8
# fade in/out
out[:int(0.02*sr)]*=np.linspace(0,1,int(0.02*sr)); out[-int(1.0*sr):]*=np.linspace(1,0,int(1.0*sr))
pcm=(np.stack([out,out*0.98],1)*32767).astype(np.int16)
with wave.open("public/bed.wav","wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
print("bed ok")
