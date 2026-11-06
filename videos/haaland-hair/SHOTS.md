# Can Haaland score using only his hair? — shot list (as built)

Voice: `voice/voice.mp3` (59.95 s, the 159-word script in `SCRIPT.txt`). Word timings are in `voice/words.json`, aligned with `tools/asr.py` and `tools/align.py`. Video: 61.0 s, 1080x1920, 30 fps.

Resource key: **bean** = `football-kit/characters/bean.js`, **px** = `football-kit/font/pixelfont.js`, **fs** = `football-kit/sfx/football_sfx.py`, **motion** = `cartoon-short-kit.zip → engine/motion.js`, **toon** = `toon.txt.zip → toon.txt`, **G** = `cartoon-short-kit.zip → templates/audio/sfx_gen.py`, **SX** = `templates/audio/sfx.py`, **I** = `templates/audio/instruments.py`, **sol** = `example/soldier/audio.py`.

| # | Time (s) | Picture | Animation | VFX | SFX / music | Overlays (px) |
|---|---|---|---|---|---|---|
| 1 | 0–3.1 | Aerial dive onto Haaland (#9, ponytail) | motion `camFromKeys`, ponytail `M.spring`-style wobble, bean `idle` | — | G `whoosh`, fs `stadium_chant` bed, I groove | score bug, name tag HAALAND, big word ONLY HIS HAIR?? |
| 2 | 3.1–6.0 | Behind the head, ponytail | bean `pose({tail, tailSwing})` whip | toon `fxRing` | G `whoosh` | pills FEET: BANNED / HEAD: BANNED / HAIR: ✓ |
| 3 | 6.0–12.3 | Studio, "Scientist" | bean `setFace` smug → sad | — | sol `ting` | name tag SCIENTIST, card HAIR POWER, pill LAST PREDICTION: WRONG |
| 4 | 12.3–17.2 | Referee explains the rules | bean poses, motion `M.back` | — | fs `whistle("pip")` | card THE RULES, big word DISALLOWED |
| 5 | 17.2–22.0 | Minute 1: foot shot, keeper dives wrong way | motion `M.anticip` kick, `M.easeOut` dive, net bulge | toon `fxContact` | fs `ball_kick`, `net_swish`, `whistle("long")`, G `oof`, SX `_groans`, I `timpani` stop | pill FOOT DETECTED, big word DISALLOWED |
| 6 | 22.0–28.5 | Minute 12: cross, spin, ponytail swing, crossbar | motion `M.anticip` spin, `spline` ball path | toon `fxBurst` ×2 | G `whoosh` ×3, fs `ball_kick(.5)`, G `clink` ×3, SX `_whoas`, I `timpani` | 12' >> FAST FORWARD, big word CROSSBAR! |
| 7 | 28.5–31.7 | Freeze: xG | motion `camFromKeys` path | — | sol `drum("kick")` ×3 | card EXPECTED GOALS (xG) with bars, PAUSED |
| 8 | 31.7–37.6 | Studio, "Expert" (same guy) | bean poses, face shocked | toon `fxStars` | I pads | name tag EXPERT, pill (SAME GUY), card PONYTAIL REPORT |
| 9 | 37.6–40.0 | Dressing room: team talk to the hair | ponytail perks `M.back` | — | SX `_murmur` | big word TEAM TALK, name tag THE HAIR |
| 10 | 40.0–41.7 | Tunnel: door shuts on Haaland | door `M.easeOut` | — | G `creak` | bubble NOT YOU., pill INVITED: ✗ |
| 11 | 41.7–49.3 | Free kick, back to goal, head flick, top corner | `M.smooth` turn, `M.anticip` flick, `spline` ball, net bulge, crowd bounce | toon `fxContact`, `fxBurst`, flash | G `whoosh`, fs `ball_kick`, `net_swish`, SX `_cheer`, G `hurrah`, I snare build + `cymbal`, sol `ting` | big words 2ND HALF / GOAL!!, pill ASSIST: THE PONYTAIL, card HAIR GOALS IN HISTORY |
| 12 | 49.3–53.3 | Hair volley, hair scissor-kick, hat-trick | `M.anticip` whips | toon `fxBurst`, `fxPuff` | fs `ball_kick` ×2, `net_swish` ×2, SX `_cheer` ×3, I `cymbal` | big words HAIR VOLLEY / HAIR SCISSOR-KICK / HAT-TRICK |
| 13 | 53.3–61.0 | POTM to the hair, Haaland subbed off, manager quote, full time | motion `walk`, trophy `M.back` | toon `fxStars` | G `applause`, sol `ting`, sol `sting`, fs `whistle("full_time")`, I pad + cymbal | card PLAYER OF THE MATCH, pill SUBBED OFF, sub board OFF 9, bubble BETTER MOVEMENT., FULL TIME card, end CTA |

Captions are one word at a time, lowercase, from `voice/words.json`.

## Rebuild
```
bash setup.sh                   # unzips three.js, motion.js, toon.txt -> toon.js and the audio kit into work/
python3 audio.py                # -> work/mix.wav
node render.mjs work/frames     # -> work/frames/f0000.jpg … f1829.jpg (run several ranges in parallel)
ffmpeg -framerate 30 -i work/frames/f%04d.jpg -i work/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest haaland_hair.mp4
```
