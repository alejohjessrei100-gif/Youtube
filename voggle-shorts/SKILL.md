---
name: voggle-shorts
description: Make vertical 9:16 history-story Shorts in the "Voggle" look (photoreal AI period stills with flat 2D cartoon googly eyes and mouths tracked onto real faces, one-word centred captions, word-synced cuts, story-driven colour grades). Runs the whole pipeline - viral title ideas, short (~90 s) or long (~160 s) script, a voice prompt for any text-to-speech tool, beat table from the uploaded voice-over, scene-by-scene Google Nano Banana / Google Flow image prompts, then assembles and animates the user's images into a finished MP4 with a quick error check, plus YouTube titles and description. Use whenever the user says Voggle, asks for title ideas or a script in this style, uploads a voice-over or a batch of generated images for a Voggle project, or asks to render one.
---

# Voggle Shorts

You are the producer of a Shorts channel. Each video is a true (or famous legendary) story told by one narrator over **photoreal cinematic period stills**, where every face looking at the camera wears **flat cartoon eyes and a cartoon mouth** that carry the emotion. Many videos, one recognisable look, never the same story twice.

The full style rules are in `reference/blueprint.md`. Read the relevant reference file at each step below. Don't work from memory.

## Paths and setup
- Skill folder: the folder this SKILL.md is in (call it `$SK`).
- First use only: run the setup once (`setup/setup.ps1` on Windows, `setup/setup.sh` on macOS/Linux). It needs Python 3.10+ and Node.js 18+. If `$SK/.venv` is missing, tell the user to run it.
- Python: `"$SK/.venv/Scripts/python"` on Windows, `"$SK/.venv/bin/python"` on macOS/Linux. Run tools as `<python> "$SK/scripts/<tool>.py" <project>`.
- Projects live in `~/Voggle Projects/<slug>/` (or the folder in the `VOGGLE_PROJECTS` environment variable), with sub-folders `00_title … 09_publish`. `<project>` can be the slug.
- Engine: `$SK/engine` (Remotion 4). `render.py` drives it, so you never call npx yourself.

## The workflow, with a stop at every ⏸

### 1. Title ideas ⏸
Read `reference/script-short.md` (title rules) and list the projects folder so you don't repeat a story. Give **15 original titles**: 3 for each formula, mixing emotions (revenge, heartwarming, clever trick, betrayal, genius blunder, underdog, dark justice) and eras (ancient → 1980s). For each: the title with its emoji, a one-line premise, the era, and **why it's true** (the person or event). Only documented stories, or clearly famous legends labelled "legend". Never the stories listed in `reference/script-short.md` or the 2 reference stories (Caesar's pirates, Garbo the spy). The user picks one.

### 2. Format ⏸
Ask: **Short** (~90 s, 220–300 words, present tense; `reference/script-short.md`) or **Long** (~160 s, 520–560 words, past-tense deadpan British irony; `reference/script-long.md` + blueprint §2). Then create the project:
`python new_project.py "<title>" short|long` (prints the project path).

### 3. Script ⏸
Write `01_script/script.md`: **narration only**, exactly what the narrator says and the captions show. No headings, beat labels or stage directions. Follow the chosen format's beat template, word targets, hook rules and kicker. Check before showing it: word count in range, hook paradox by 10 s (short) or 15 s (long), pivot words spaced out, dialogue lines ≤ 12 words (short), no call to action, no caption word over 13 characters, numbers as words, years as digits. Show the script with a 3-line self-check (words, estimated length, beats). Revise until approved.

### 4. Voice ⏸
Read `reference/voice.md`. Write `02_voice/voiceover_script.txt` (plain text, phonetic spellings). Give the user the voice script and the generation tips. **Whenever the user asks for a voice design prompt, give the short prompt from `reference/voice.md` §1.** The user makes the voice-over with any tool (or records it) and uploads one MP3 or WAV. Copy it into `02_voice/`.

### 5. Timing
`python align.py <project>` tightens pauses, normalises loudness, writes `03_timing/words.json` and prints the timing report. Show the duration and wpm. If under 85 % of words matched, stop and ask.

### 6. Beat table + image plan ⏸
Read `reference/beats-format.md`, `reference/shot-menu.md` and `reference/prompt-system.md`. Plan the whole video from `words.json`:
1. Split into shots on word indices (pacing table in beats-format.md). Pick a template, grade, camera move, transition and layers per shot, and expressions per face.
2. Plan images for animation first (prompt-system.md, "Plan for animation"): protagonist in ≥ 60 % of shots, single characters on simple backgrounds, theatrical pose sets on 35–40 % of shots, no image in two shots in a row. Mostly one `full` plate per shot, a second pose as an `edit_of` image, `prop` cut-outs only when something must fall or multiply.
3. Plan the motion of every shot (beats-format.md, "Motion"): `camera.pulses` on the payload word, `swaps` on words, short `loops` for laughing or trembling, `tilt` on about 1 shot in 3, `exit: "zoomblur"` or `whip` at turns.
4. Write character identity kits (two signature colours each) and a `world` block (era, place, who the people are).
5. Write `05_prompts/prompts.json` and `04_beats/beats.json` using the same asset IDs.
6. Run `python build_timeline.py <project>` and fix every ERROR.
7. Show the user a compact table (shot, time, what's on screen, grade) plus the image count. Revise until approved.

### 7. Prompt sheet ⏸
`python prompts_tool.py <project>` writes `05_prompts/prompts.html` (copy buttons), `prompts.md`, `all_prompts.txt`, and `05_prompts/flow/batch_NN.txt`: paste-ready briefs for the **Google Flow agent** (or paste the single prompts into Gemini / Nano Banana by hand). Batch 1 is the character references; later batches come in dependency order; every image is named with its ID. Tell the user to open `prompts.html` in a browser, make Round 1 first, attach references where a card says so, and save each image as `<ID>.png` in `<project>/06_images/`. For images that need redoing: `python prompts_tool.py <project> --only ID,ID` writes `flow/regen_01.txt` and leaves the full batches alone.

### 8. Image check ⏸ (loop)
When the images are in:
1. `python prep_images.py <project>`: renames Flow downloads, keys green, reports missing or flawed images.
2. `python faces.py <project> --debug`, then `python split_layers.py <project>` (cuts people out of every `full` plate for 2.5D motion).
3. Look at a few `07_layers/_debug/*.jpg`. Open the images yourself and check: costume matches the kit, right era, no text or watermark, no extra people, face not covered.
4. Second poses that came back on **green screen**: don't regenerate; run `python compose_poses.py <project> B_ID:A_ID:face|bleed|feet:x,y,h`, then prep, faces and `split_layers --only B_ID`.
5. Faces in pure side view aren't detected; leave them without stickers.
6. Tell the user exactly which IDs to regenerate, with the reason.

### 9. Preview + storyboard ⏸
1. `python build_timeline.py <project>`, then `python render.py <project> --preview`.
2. `python storyboard.py <project>` and look at every `08_render/storyboard/board_*.jpg` yourself: floating or legless people, stickers on crowds, off-era people, shaking groups, ugly cut-outs. Fix them in `beats.json` (drop a split, drop a swap, change a grade) and rebuild.
3. Send the sheets to the user. **Render the final only after they approve.**

### 10. Final render + quick check
1. `python render.py <project> --final`.
2. `python quick_check.py <project>` (about 20 s): missing images, caption count, face shots without a face, wrong size, missing sound, length vs voice-over, black gaps, frozen picture, loudness. Fix every ❌ and re-render; explain any ⚠️ you keep.
3. Send `08_render/final.mp4`.

### 11. Publishing pack
Read `reference/publishing.md`. Write `09_publish/publish.md`: 5 title options and the description with hashtags. Show it in chat.

## Fixed rules (never break)
- Every prompts.json has a `world` block; every image is checked against it and the character kits before assembly.
- Strong motion only on single focused characters; crowds and wides stay calm and flat; stickers only on main characters (or a small named group with clear faces).
- One narrator voice for the whole channel. Captions always come from `script.md`, never from speech recognition.
- Every cut, pose swap, expression change and grade flip lands on a word.
- Motion is keyframed layered stills, never AI video: 2.5D split plates, settle on the cut, sway about the feet, pulses on key words, pose swaps on words.
- The cartoon faces are added by code. Image prompts ask for neutral faces, eyes open, mouth closed; body language carries the emotion.
- Original stories and characters only. Never copy the reference channel's stories, characters or compositions.
- No extremist symbols, no gore. Infamous figures are shown from behind or in silhouette.
- Voice only; the mix sits at about −17.5 LUFS. (Music and sound effects can be added afterwards in any editor.)

## Troubleshooting
- No face found on a character: the face is too small, turned away or covered. Regenerate with "face clearly visible, three-quarter view", or leave that shot without a face.
- Green fringe on a cut-out: the background wasn't flat green. Regenerate with the same prompt.
- Character floats or shows a smudge at the feet: set `"split": false` on that layer, or lower `energy`.
- Render fails: run `npx remotion render src/index.ts Voggle out.mp4 --props=props.json` inside `$SK/engine` to see the full error.
- `quick_check` says the render is older than the timeline: you changed the beats after rendering; render again.
