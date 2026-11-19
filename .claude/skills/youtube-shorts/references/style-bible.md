# Style bible: lessons from the reference channel (RicksClips3000)

> **STATUS: built from still images only. No video has been watched yet.** Nothing here describes motion, cut timing,
> camera moves, acting in motion, sound or script beats. Those sections stay open until user-provided recordings are run
> through `tools/research/watch.py` and watched.

Sources: the public titles + view counts of his last 20 Shorts (read 2026-11-19) and 80 official stills from
YouTube's public image server (each video's cover + automatic stills at ~25/50/75%), measured and looked at. No video
was downloaded. Raw research: `research/ricksclips/` (dataset, per-video notes; images kept locally, git-ignored).
Stills show light, colour, sets, framing, shot sizes and structure; they say NOTHING about motion, cut timing, camera
moves or script beats — that needs screen recordings the user makes (priority list in `research/ricksclips/notes.md`).

## Measured (mean of 20 cover frames vs our Graves stills, 0..1)
| | his | ours | action |
|---|---|---|---|
| mean luminance | 0.43 | 0.61 | darker overall |
| 5th percentile (blacks) | 0.13 | 0.24 | real blacks, not grey |
| saturation | 0.45 | 0.28 | ~+60% saturation |
| deep shadow (L < 0.12) | 10% | 2% | let ~10% of the frame go to shadow |
| warmth (R-B) | +0.03 | -0.06 | slight warm bias |
| contrast (std) | 0.21 | 0.20 | same, over a wider range |

## Look
- **Light:** one strong key with real cast shadows; a motivated source in every scene (window shaft, desk lamp,
  torches, moon, lit shop windows); warm/cool contrast (orange/purple dusk, deep-blue night + warm windows).
- **Sets:** simple characters in RICH, textured worlds — brick, planks, grass blades, patterned rugs and wallpaper,
  dense props, readable signage. This contrast is the signature.
- **Camera:** lens low (~chest height), often looking slightly up, wide-lens perspective; a big foreground character
  filling the frame with a smaller one behind (depth staging); strong vanishing lines (tracks, corridors, walls).
- **Effects:** light shafts, floating particles (money, confetti), glowing practicals, exaggerated props.
- **Characters:** costume/hat = identity at a glance; brows carry the acting. (Ours keep the user's locked look.)
- **Captions:** 1–2 words per chunk, white with black outline, ~70% down the frame (ours already match).

## Structure seen in the 80 stills
- **Home set + cutaways:** one main set (the characters talking; also the cover) that the video keeps returning to
  (13/20 are back home at 50% or 75%), with illustrative cutaways in between — a blast, a crash, an army, a wave.
- **Shot variety:** medium two-shots most; face-filling close-ups; POV shots (hands on a phone, a rifle on a cart,
  the driver's seat); extreme wides (armies, races); big object inserts (gold pot, dragon jar, giant red button).
- **One spectacle beat per video:** explosion, crash, electrocution, giant wave, flying debris.
- **A colour identity per set:** pink cell, gold mine, blue night street, purple dusk, yellow store.
- **Signs carry story:** "DON'T", "FIRST LINE IN GETS IT ALL!", "MEMORIES bought & sold", "SOLD".
- **Two-handers:** a straight character + a reactor, one bigger in the foreground. Faces mostly deadpan-smug; big
  emotion saved for peaks (glowing eyes, sweat drops).

## Applying it to our films (with the user's camera rules)
- Keep the user's rule of one continuous lens inside a set; add his structure around it: a **home set** we return
  to, and **cutaways** that illustrate the narration (each its own small, rich set with a colour identity).
- Plan per film: 1 home set, 2–4 cutaways, at least one **spectacle beat**, one **POV shot**, one **big object
  insert**, one **extreme wide**, and signs that say something.
- Grade, light and set dressing as in "Look" above.

## Titles and stories
- Biggest hits pay off a clever mechanism or loophole: "The Ancient Jar That Warned an Empire" (35M), "Why Perfect
  Railroads Don't Work" (30M), "The Job Nobody Wants in Japan" (18M). Crime-like ones win when the twist is clever:
  "The Burglar Who Only Moved Furniture" (10M).
- Weakest: plain science explainers (147–327K), meme titles (55–413K), abstract premises (574K).
- Title formula: 4–7 words, no emoji, no #shorts; "Why…", "How…", "The [object] That/Who…", "This [object]…";
  one concrete object + an odd effect.
