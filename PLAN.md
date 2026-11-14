# Plan: "Same island" (vertical Short, 1080×1920, 30 fps, 34.0 s)

29 beats, one new framing about every 1.17 s (51 per minute) on a 60 BPM pulse. Every cut lands on a word of the
voice-over (`vo/timings.json`); to change the plan, edit `plan/plan_src.py` (cuts) and `src/film/shots.ts` (picture).

## Story, in pictures
Hook (0–4.3 s): the Grafton in a night gale, a sailor's terror, the impact on the rocks, the Invercauld breaking up under
the cliffs. The chart (4.3–5.6 s): one island, two crosses. Then the two camps, by match cuts: Carnley Harbour (a sheltered
cove, rata forest, five men) against the north-west coast (a ledge under 36 m of basalt, nineteen men). The Grafton five
carry a spar, raise the hut, cook, share; the camera flies the 40 km on the chart; the nineteen come ashore, reach for
help, turn their backs; nineteen months on a tally post; the boat; the crossing; the count (5 of 5, 3 of 19); same
island, same cold, same storms; and the one warm place on the island.

| Beat | Time | Light | Words | Picture and camera |
|---|---|---|---|---|
| B01 | 0.00–1.48 s | storm | In 1864, | HOOK: a gale at night; from the wave tops, the schooner heels toward the shore as lightning strikes |
| B02 | 1.48–1.94 s | storm | two ships | close-up on deck: a sailor's face as he sees the rocks |
| B03 | 1.94–2.84 s | storm | wrecked on the same | IMPACT: the schooner grounds, shudders, her foremast goes over in the spray |
| B04 | 2.84–4.28 s | storm | cold, remote island, | the big Invercauld breaking up under a wall of cliffs; tilt up the cliff as a mast falls |
| B05 | 4.28–5.57 s | day | just months apart. | the chart: one island, two crosses at opposite ends |
| B06 | 5.57–6.51 s | overcast | Neither crew ever | grey dawn: a Grafton man looks up at the wall of forest; crane over his shoulder |
| B07 | 6.51–7.91 s | overcast | knew the other was there. | the match: an Invercauld man under the cliffs; tilt up 36 m of basalt |
| B08 | 7.91–9.30 s | overcast | On the Grafton, five men | five men carry one spar up the beach; the camera backs away ahead of them |
| B09 | 9.30–10.08 s | overcast | built a hut, | the hut goes up (time-lapse) while they hammer and bring thatch |
| B10 | 10.08–10.92 s | dusk | took turns cooking, | one stirs the pot and hands a mug across the fire |
| B11 | 10.92–12.48 s | dusk | and shared every job. | all five round the fire in front of the finished hut; a slow arc |
| B12 | 12.48–13.79 s | day | Forty kilometres away, | the chart: the camera flies the 40 km north from one cross to the other |
| B13 | 13.79–15.27 s | overcast | nineteen men from the Invercauld | nineteen men on the ledge under the cliffs; drift in from the surf |
| B14 | 15.27–16.31 s | overcast | crawled ashore... | at rock level, a man drags himself out of the foam toward us |
| B15 | 16.31–17.34 s | overcast | and it was every man for | one reaches up for help; the other turns his back and walks away |
| B16 | 17.34–18.38 s | overcast | himself. | straight down from the cliff top: nineteen figures drift apart |
| B17 | 18.38–19.56 s | overcast | After nineteen months, | a man cuts a notch into the tally post; push-in on the marks |
| B18 | 19.56–20.57 s | break | the Grafton crew built | hammer on the gunwale, close |
| B19 | 20.57–21.44 s | break | their own boat, | the camera rises: the finished boat with all five around her |
| B20 | 21.44–22.93 s | break | and three of them sailed it across the | over the shoulders of the two who stay, the boat stands out with three aboard |
| B21 | 22.93–24.49 s | storm | open ocean to bring help. | the boat, tiny on a mountain of grey water; the camera comes down to her |
| B22 | 24.49–25.90 s | break | All five lived. | the camera tracks close along five faces; five gold figures count up |
| B23 | 25.90–26.89 s | overcast | From the Invercauld, | nineteen stand on the ledge; nineteen figures on screen |
| B24 | 26.89–28.31 s | overcast | only three survived. | three men on an empty ledge; the count drops to three |
| B25 | 28.31–29.18 s | day | Same island. | the whole chart, both crosses and the route |
| B26 | 29.18–30.04 s | storm | Same cold. | one survivor alone in the dark, arms round himself, shaking |
| B27 | 30.04–31.26 s | storm | Same storms. | a sea bursts against the ledge and the cliff in a lightning flash |
| B28 | 31.26–32.36 s | fire | The biggest difference? | out of the dark, the one warm place: five men round a fire |
| B29 | 32.36–34.03 s | fire | How they treated each other. | close: one man puts a hot mug into another's hands; push-in to the end |

## Places (src/film/world.ts)
- **Carnley Harbour, north arm (set G):** gravel beach, grassy terrace, steep southern-rata forest, a hut of the schooner's
  spars with thatch and canvas and a stone hearth (as the Epigwaitt survivors' hut: [DOC](https://www.doc.govt.nz/parks-and-recreation/places-to-go/southland/places/subantarctic-islands/auckland-islands/heritage-sites/grafton-wreck-and-epigwaitt/)).
- **North-west coast (set I):** a rock ledge 0–7 m wide under basalt sea cliffs 36 m high, open-ocean swell, sea stacks.
- Every object has a footprint and a job in the story; nothing is painted on the world (no invented signs).

## Look
Four new moods (`src/film/moods.ts`: storm, overcast, fire, break) with a strong key and rim against low ambient; baked
ambient occlusion on the terrain, contact shadows under props, depth fog, rain, lightning as exposure, spray, a sea that is
flat at every shore (water can never show on land).

## Camera
One purposeful move per beat (push-in, tracking shot, tilt, crane, follow-cam, a rolled overhead), aimed at the subject;
no random pans. `plan/check_scene.ts` verifies every beat before any render.

## Sound (`plan/audio_build.py`)
An original 60 BPM bed (a pulse every second, chords per act, risers into the launch and the last beat); scene beds (rain,
wind, sea, fire) that follow the cuts; ~160 one-shots placed from the film's own data (flashes, impact, hammer strikes from
the arm swing, footfalls from the walk phase, the on-screen count). Effects are ducked under the voice and limited to
6.5 dB under the speech level; mastered to −14 LUFS.
