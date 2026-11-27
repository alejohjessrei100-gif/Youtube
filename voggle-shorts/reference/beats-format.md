# Beat table format (`04_beats/beats.json`)

Claude writes this file after the voice-over is aligned. `build_timeline.py` turns it into `timeline.json` (seconds) and `beats.md` (the table the user reviews).

**All timing is by WORD INDEX** (`"w"`), from `03_timing/words.json` (`i` = index). A shot starts on its first word, and the cut lands one frame before that word's onset. Every swap, expression change, animation and grade flip is also tied to a word, so everything lands on the voice. Add `"dt": 0.1` to shift by seconds when needed.

## Shape

```json
{
  "protagonist": "C1",
  "shots": [
    {
      "id": "S01",                 // S01, S02 ... in order
      "w": 0,                      // first word of the shot (first shot must be 0)
      "template": "T1",            // shot menu id (reference/shot-menu.md)
      "grade": "WARM",             // WARM COOL NIGHT MONO ANGER OLIVE BURGUNDY TEAL NONE
      "gradeFlip": {"w": 12, "to": "COOL"},        // optional, instant re-grade on a turn word
      "camera": {"move": "creep", "amount": 0.025, "focus": [0.5, 0.35]},
      "transition": "cut",         // "whip" = blur-whip INTO this shot (location / time jumps only)
      "dof": 3,                    // px blur on bg / plate layers (0 for wides and inserts)
      "vignette": 0.45,            // 0..0.8
      "layers": [ ... back to front ... ]
    }
  ]
}
```

### Camera moves (MASTER_BLUEPRINT §5.3)
Extra camera fields: `handheld` (0..1, default 0.6), `tilt` (degrees of slow roll across the shot), `drift` (constant slow pan, fraction of width per second, default 0.02), `keys` (explicit camera keyframes `s`, `r`, `x`, `y`; override `move`), `pulses` (`[{"w": 12}]`: eased push pulses on key words for split plates; one automatic pulse mid-shot in shots > 1.3 s), `parallax` (override the split-plate motion amounts: `fgPan`, `fgZoom`, `fgRot`, `bgPan`, `bgZoom`, `settle`, `settleX`, `pulse`, `pulseX`).
Shot fields: `transition` `cut` | `whip` | `zoomblur` (into this shot); `exit`: `zoomblur` (punch out of this shot through a blur).

| move | default amount | use |
|---|---|---|
| `creep` | 0.025 over the shot | default on almost every shot |
| `push` | 0.13, eased | about 1 shot in 3, for building attention |
| `punch` | 0.20 in 0.9 s | punch words, reactions (about 1 per 8–10 s) |
| `pull` | 0.08 | reveals, "it was all for nothing" |
| `pan_l` / `pan_r` | 0.10 of width | wide establishing shots, crowds |
| `static` | none | when the frozen frame is the joke |

`focus` = the point the camera pushes toward (x, y fractions of the frame). Usually the main face, e.g. `[0.5, 0.33]`.

## Layers

| field | meaning |
|---|---|
| `asset` | image ID from the prompt sheet (`BG_03`, `C1_P04`, `P_02`, `S12_FULL`) |
| `kind` | `bg` (empty set, fills the frame), `full` (finished combined frame), `insert` (close-up plate), `char` (green-screen cut-out), `prop` (cut-out object) |
| `character` | `C1`, `C2` … for char layers and full plates that show that character |
| `x`, `y`, `h` | cut-outs only: centre x, **bottom** (feet/base) y, and height, as fractions of the frame. Feet on the floor line of the background, e.g. `y: 0.94`. Full body `h` ≈ 0.55–0.75 (LS/MLS), waist-up crops `h` up to 1.1 with `y` > 1 |
| `depth` | 0 far … 1 subject … 1.3 foreground (parallax). Defaults: plates 0, cut-outs 1 |
| `flip` | mirror horizontally (make a character face the other way) |
| `shadow` | contact shadow under feet (default on for `char`) |
| `idle` | very slow breathing scale, good for held close-ups |
| `opacity` | 0..1 |
| `anim` | entrance or action, see below |
| `swaps` | `[{"w": 9, "asset": "C1_P05"}]`: hard pose swaps on words (same framing, new pose). Options: `"blur": true` (zoom-blur punch-in swap), `"zoom": 1.2` (scene punches closer at the swap), `"keepBg": true` (keep the first image's background and place the new pose's cut-out so its face lands where the old face was; use when the second pose image drifted to another location) |
| `keys` | eased keyframes, offsets from the base placement: `[{"w": 5, "x": 0, "s": 1}, {"w": 8, "x": 0.03, "s": 1.05, "r": -2, "ease": "out"}]` (x/y fraction of frame, s scale, r degrees, o opacity; ease linear/in/out/inOut/back/hold) |
| `loops` | mechanical wiggles: `[{"type": "rock", "amp": 1.2, "period": 3, "from": {"w": 38}, "to": {"w": 44}}]`. Types: `shake` (x, amp fraction of width), `bob` (y), `rock` (rotation, amp degrees), `pulse` (scale), `jitter` (stepped random). `period` in frames (3 = 8 Hz like the reference) |
| `flipbook` | alternate images every N frames: `{"assets": ["S20_A", "S20_B"], "every": 2, "from": {"w": 40}}` (typing hands, flapping, trembling) |
| `pivot` | rotation/scale origin inside the layer box, e.g. `[0.5, 0.85]` (default centre for plates, feet for cut-outs) |
| `split` | `full` plates are split automatically into subject + background by `split_layers.py` and animated in 2.5D (see Motion); set `"split": false` to keep a plate flat |
| `repeat` | number build-ups: `{"n": 5, "dx": 0.12, "dy": -0.02, "every": 0.25, "scaleJitter": 0.08}`, drawn n times, staggered |
| `faces` | cartoon expressions, see below |

### `anim`
`{"type": "...", "w": <word>, "dur": 0.4, "dir": "left|right", "dist": 0.25}`

| type | effect |
|---|---|
| `slide_in` | enters from the side (`dir`) on the word |
| `drop` | falls from above and lands (money bags, coins, crates); combine with `repeat` |
| `pop` | springs in from scale 0 (objects appearing, pins on a map) |
| `rise` | rises from below |
| `fade` | fades in |
| `shake` | short horizontal shake (fear, impact), `dur` = how long |
| `walk` | crosses the frame across the rest of the shot (`dist` = fraction of width) with a slight step bob; use pose swaps for leg changes |

### `faces`
One entry per detected face of that layer's image (face 0 = left-most face in the image):

```json
"faces": [
  {"face": 0, "exprs": [
    {"w": 14, "eyes": "E3", "mouth": "M1", "gaze": [0.5, 0]},
    {"w": 19, "eyes": "E1", "mouth": "M6", "gaze": [0, 0.2]}
  ]},
  {"face": 1, "hidden": true}
]
```
- `eyes`: E1 round · E2 terror (pin-prick pupils) · E3 half-lid smug · E4 angry slant · E5 sad slant · E6 mischief · E7 closed/asleep
- `mouth`: M0 none · M1 line · M2 smirk · M3 frown · M4 wavy (nervous) · M5 open smile + tongue · M6 big grin + teeth · M7 gasp, buck teeth · M8 grimace · M9 shout "O" · M10 small "o" · M11 sad open
- `gaze`: pupils, x/y in −1..1 (both eyes look the same way; usually off-centre)
- `mouthScale`: optional size multiplier
- `"face": "*"` applies to every face not listed (crowds share one emotion; gaze varies slightly per face automatically).
- Use M0 whenever a hand, cup or object covers the mouth. Use `hidden` for faces that should get no overlay.
- Faces not listed get a default: the protagonist gets E3 + M1 (calm, smug), everyone else E1 + M1.
- Rules: 0–1 changes per shot (at most 2), each on a word, held ≥ 0.8 s. No blinking, no lip-sync. Crowds share one emotion.

## Motion and face rules (learned from real productions): these override anything above

1. **Energy by shot content** (shot field `energy`, 0..1; auto if omitted):
   - one focused character, split: 0.8–1.0
   - one character, flat: about 0.5
   - two characters: about 0.4
   - groups, crowds, wides, maps, inserts: 0.1–0.3

   Shakes and wiggle `loops` go only on a single focused character, as short bursts on a word (`to` plus `decay`), with amp ≤ 0.004. Never on crowds, objects or landscapes.
2. **Layers (`"split": true`) only for 1–2 main characters with a clean cut-out.** Groups, crowds, caravans and wides stay ONE flat layer with a smooth push or pan. Splitting them tears people and leaves faces floating. Split subjects are grounded: they scale and rotate around their base and never drift vertically.
3. **Faces on main characters only.** Use the top-level `"mainFaces": {asset: [[x, y] point near the face] | [index, …] | []}`. Assets not listed keep their faces only when they have 1–2; with 3 or more faces, none are kept. Faces under 4 % of the image width are dropped. Never put stickers on crowd members.
4. **Camera moves for one character:**
   - `"move": "dolly_face", "from": 1.0, "to": 1.5–1.8, "until": {"w": N}, "faceY": 0.3` pushes from wide to the main face and lands on a key word. Use it on openings and character introductions.
   - `"move": "frame_face", "s": 1.3–1.6` frames a standing character from the knees or waist up, so broken legs and feet stay out of frame.
5. **Pose swaps:** use a whole-image swap (`blur` plus optional `zoom`) when the second image shows the right place. Use `"keepBg": true, "matchBody": true` only when the second pose came back on green screen or in the wrong place; that aligns feet and height. Drop the swap (use an expression change plus `camera.pulses`) when the poses can't be aligned.
6. **Props at real scale:** coins and small objects are `h` 0.018–0.025 in crowd and wide shots.
7. **Map shots always get a `route` layer:** an animated line, pins and a camel or ship icon.
8. **Camera:** push ≤ 0.05, punch ≤ 0.07, dolly_face ≤ 1.18, frame_face ≤ 1.3. `tilt` ±1–2° on about 1 in 3 shots. About 30 % of flat shots use `"move": "static"` (drift and tilt only).
9. **Before the final render:** run `python storyboard.py <project>` after the preview, check every sheet against these rules, then show the user the sheets and wait for approval.

## Motion: the reference method (measured frame by frame on the reference videos)
The reference is **keyframed, layered stills**, not video. Every shot must move like this:
1. **Plates are 2.5D.** `full` plates are split into a subject cut-out and a cleaned background. The background barely moves (0.2–2.5 % of width per s); the subject drifts, zooms and rotates against it. This is automatic.
2. **Settle on the cut.** The subject decelerates into place over about 8 frames (scale about 1.12 → 1, slight slide and rotation). This is automatic.
3. **Hold, then pulse on a key word.** Add `camera.pulses` on the payload word of the line (the noun, verb or number that matters): an eased push of about 0.5 s. Shots over 1.3 s get one automatic pulse mid-shot when none is given.
4. **Pose swaps on words** in about 35–40 % of shots. Use `"blur": true` plus `"zoom": 1.15–1.25` when the second image is the "punch-in" (laughing, insulted, shocked).
5. **Loops for physical states:** laughing = `rock` 1–1.5° period 3 plus `bob` 0.004; straining or trembling = `shake` 0.005–0.008 period 5; nervous = `jitter`; patting or knocking = `bob` with period 3 on a hand layer.
6. **Build-ups:** props `drop` in batches (`repeat`, `every` 0.3), then the full pile pops in on the number word.
7. **Exits:** `exit: "zoomblur"` before a big turn; `transition: "whip"` for place or time jumps.
8. The camera always has `handheld` life and a slow `drift`. Use `tilt` ±1–1.5° on about 1 shot in 3.


## Pacing rules the beat table must meet
| | short (~90 s) | long (~160 s) |
|---|---|---|
| shots | 45–55 | 82–90 |
| mean shot | 1.7–2.0 s | 1.85–1.95 s |
| first 10 s | ≥ 6 shots (hook ≈ 1.1–1.3 s each) | 8–9 shots |
| cut on | every sentence start + 70–85 % of after-comma phrases | same |
| longest shot | ≤ 4.7 s, anything > 2.5 s needs a swap / expression change / motion | same |
| visual change | every ≤ 1.3 s (cut, swap, face change, grade flip, object) | same |
| blur-whips | 3–5, only location/time jumps at sentence starts | 5–8 |
| grade flips | 1–3 on turn words | 1–3 |
| grade share | ~45 % WARM, 20–30 % COOL, rest MONO/NIGHT/story tints | same |
| ending | ironic wide payoff (2.5–3 s) then a smug MCU of the protagonist looking toward the lens | same |

## Example (one shot with a cut-out and a money drop)
```json
{"id": "S05", "w": 41, "template": "T10", "grade": "COOL", "camera": {"move": "push", "focus": [0.5, 0.55]}, "dof": 2,
 "layers": [
   {"asset": "BG_02", "kind": "bg"},
   {"asset": "P_SACK", "kind": "prop", "x": 0.3, "y": 0.9, "h": 0.16, "depth": 1.1,
    "anim": {"type": "drop", "w": 43, "dur": 0.35}, "repeat": {"n": 6, "dx": 0.08, "dy": -0.03, "every": 0.22, "scaleJitter": 0.1}},
   {"asset": "C2_P01", "kind": "char", "character": "C2", "x": 0.72, "y": 0.95, "h": 0.6,
    "faces": [{"face": 0, "exprs": [{"w": 41, "eyes": "E1", "mouth": "M1"}, {"w": 45, "eyes": "E2", "mouth": "M7"}]}]}
 ]}
```

### Continuous subject motion
- Every split subject now sways about its feet and "breathes" all through the shot (`Shot.tsx`: about 2° at 1.5 s, scale ±2 % at 1.2 s), scaled by shot `energy` and by the layer's `sway` setting (0 turns it off, 2 doubles it). The feet stay fixed, so nothing floats.
- Smaller motion than this reads as a still image.
- Set `"sway": 0` on any split layer where the sway tears an edge or reveals the filled-in background badly.
- Cartoon eye size is **0.26 × face size**. WARM grade: saturate 1.45, contrast 0.9, brightness 0.8, tint 0.08. COOL: saturate 0.95, brightness 0.82. Default vignette **0.75**. Cartoon eye whites stay bright white under every grade.
- **Faces on named groups:** when a shot shows a small named group (generals, hunters, the men with sticks) with 2–4 clearly visible faces of at least 4 % of the image width, list those face indices in `mainFaces` and give the group one shared expression. Leave crowds, side views and faces in the caption band without stickers. Plan stories so a face is on screen in at least 60 % of shots.
