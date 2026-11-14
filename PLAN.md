# Plan: "Same island" (vertical Short, 1080×1920, 30 fps)

Length 34.0 s, 13 shots (voice 33.4 s + 0.6 s tail). Every time below comes from a word of the voice-over (`vo/timings.json`); to change the plan, edit `plan/plan_src.py` and re-run it.

| Shot | Time | Light | Words | Picture and camera |
|---|---|---|---|---|
| S01 | 0.0–5.6 s | cold | In 1864, two ships wrecked on the same cold, remote island, just months apart. | HOOK: the 1864 board on the beach with the wrecked Grafton behind it; a slow push-in |
| S02 | 5.6–7.9 s | cold | Neither crew ever knew the other was there. | the whole island from above its west end: the Grafton camp below, the ridge, the other wreck far away |
| S03 | 7.9–12.5 s | golden | On the Grafton, five men built a hut, took turns cooking, and shared every job. | a tracking shot along the Grafton camp: sawing, hammering, the 5 MEN door, the cooking, the fire |
| S04 | 12.5–13.8 s | night | Forty kilometres away, | the 40 KM sign, face-on and unobstructed; a slow push-in |
| S04B | 13.8–18.4 s | night | nineteen men from the Invercauld crawled ashore... and it was every man for himself. | the Invercauld men come out of the surf toward us, then turn away from each other |
| S05 | 18.4–21.6 s | dusk | After nineteen months, the Grafton crew built their own boat, and | the Grafton crew builds the boat on the beach; a slow arc around the bow |
| S06 | 21.6–24.5 s | day | three of them sailed it across the open ocean to bring help. | three men sail for help; a follow-cam keeps the boat in frame on the swell |
| S07 | 24.5–25.9 s | golden | All five lived. | 'All five lived': the five together on the beach, cheering |
| S08 | 25.9–28.3 s | night | From the Invercauld, only three survived. | 'only three survived': three men standing apart on the dark shore; a slow pull-back |
| S09 | 28.3–29.2 s | cold | Same island. | 'Same island.': the Grafton five standing on their beach |
| S09B | 29.2–30.0 s | cold | Same cold. | 'Same cold.': the Invercauld three on theirs, the same framing |
| S09C | 30.0–31.3 s | cold | Same storms. | 'Same storms.': the wrecked Grafton in the swell (a bookend of the hook) |
| S10 | 31.3–34.0 s | golden | The biggest difference? How they treated each other. | PAYOFF: the five around their fire in front of the hut; a slow push-in |

## Light follows the story
- **Warm (golden)** = the Grafton camp: fire, teamwork, the payoff.
- **Cold / night** = the Invercauld camp and the island itself.
- Dusk and day only for the boat building and the crossing.

## Sound-off tags (painted in the world, unlit)
- **1864** at 0.1 s: painted on a broken hull board of the Grafton wreck, unlit
- **5 MEN** at 8.7 s: painted on the Grafton hut door
- **40 KM** at 12.5 s: a painted signpost on the ridge between the two camps

## Captions
All white, 1–2 lowercase words, swapped on each word; accent color on: difference, five, three.

## Camera
One intentional move per shot, at constant speed, always aimed at the subject: a slow push-in, a tracking shot along
the action, or a follow-cam (the boat). Shots change on clean cuts. No whip pans, no shake. `plan/check_scene.ts`
verifies every shot before rendering: the subject stays in frame, nothing blocks the view, the camera never enters an
object, nothing overlaps or floats, no one stands in the sea, and the sea never rises onto land.

## Sound-off tags (painted in the world, unlit)
- **1864** at 0.1 s: painted on a broken hull board of the Grafton wreck, unlit
- **5 MEN** at 8.7 s: painted on the Grafton hut door
- **40 KM** at 12.5 s: a painted signpost on the ridge between the two camps

## Captions
All white, 1–2 lowercase words, swapped on each word; accent color on: difference, five, three.

## Camera
No hard cuts: every change of setup is a camera move (crane, push, whip, dissolve). Inside each setup the beat rig moves about once a second, starting just before sentence starts: about 32 beats over 34 s (target 56 ± 4 per minute). Fastest in the first 40%, calmer for the payoff.

## Sound
A light music bed about 14 dB under the voice. Story sound effects on the exact words: waves and a hull crack ("wrecked"), wind ("cold"), hammering ("built a hut"), a crackling fire ("cooking"), surf ("crawled ashore"), sawing ("built their own boat"), a big wave ("open ocean"). Mastered to −14 LUFS.

## Characters
Sailors from our cast family in the Animated feature style: five Grafton men, nineteen Invercauld men shown as a few figures. Invented people, not likenesses. Nothing graphic.
