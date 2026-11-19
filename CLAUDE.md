# Project rules (YouTube Shorts: 3D toon videos)

## Video quality assurance protocol (non-negotiable)
A video is finished only when the RENDERED output has been inspected, corrected and re-verified. Quality first,
efficiency second (but work efficiently).

**Passes:** 1 produce → 2 inspect the whole render → 3 targeted fixes (find the root cause first, change only what is
broken) → 4 re-render the affected sections and re-inspect (check nothing regressed) → 5 repeat until clean.

**Inspect the entire timeline, not samples:**
- Automated checks over EVERY frame:
  - Actors vs walls, doorways and floors (`walls` check).
  - Props attached to hands.
  - Captions inside the Shorts safe zone.
  - Frame-to-frame flicker or pop detection (pixel diff spikes).
- Visual inspection:
  - Contact sheets of the full film at ≥ 6 fps.
  - Full frame rate (30 fps) around risky moments: entrances and exits, character/object interactions, fast moves,
    expression changes, camera transitions, scene cuts, crowded frames, the first and last frames of every action.

**Lessons from Biscuit (glitches got past a "clean" QA). These rules are mandatory:**
- Review contact sheets at no less than half resolution (540×960 per frame). Quarter-size sheets hide pops, shimmer and
  bad hands. Crop faces, hands and props at full resolution.
- Automated checks only catch what they test. Every film's checker must also cover:
  - hand↔prop distance every frame;
  - limb and joint angles within limits (no hyper-bent or flipped limbs);
  - head and face facing the lens when the character speaks;
  - every prop's position continuity (no teleport or pop);
  - the shadow camera covering the visible area.
- Do the frame-diff scan at full frame rate over the whole film, not only at risky moments. Review every spike at
  30 fps.
- The phone GPU renders differently from headless CPU Chromium:
  - Avoid coplanar or near-coplanar surfaces (keep a gap of at least 2 cm).
  - Keep shadow bias and normalBias safe and set `recv={false}` on large grazing-lit surfaces.
  - Keep the near/far camera planes tight.
  - Disclose that phone-GPU output was not verified.
- When reporting, list exactly which checks ran and which did not. Never say "clean" based on sampled frames.

**Defects to hunt:**
- Characters: distorted bodies, wrong, missing or extra limbs, facial glitches, broken expressions.
- Clipping: through walls, floors, objects or other characters.
- Objects: floating, popping in or out, unnatural physics.
- Surfaces and light: flicker, unstable shadows or lighting, backgrounds changing between frames.
- Camera: unintended cuts or jumps, a lens blocked by a head or wall.
- Continuity: position errors.
- Captions: covering key visuals or cut off by the YouTube UI.
- Motion: stutter, unnatural movement.

**Final checklist before delivery:**
- [ ] No visible glitches.
- [ ] Consistent character design.
- [ ] Faces and bodies animate correctly.
- [ ] Natural object interaction.
- [ ] Stable backgrounds, lights and shadows.
- [ ] Smooth, intentional camera.
- [ ] No clipping or unintended cuts.
- [ ] Captions readable and inside the safe zone.
- [ ] Audio in sync.
- [ ] The whole video reviewed.
- [ ] The final render checked after the last fix.

**Honesty:** never call a video glitch-free without inspecting the rendered output. State exactly what was and was not
verified, and disclose any known remaining issue.

## Standing preferences
- Ask the user before publishing a render to the phone page (artifact). Commit and push code as usual.
- Every film registered on the phone page gets its YouTube SEO title (`title` in web/main.tsx): the rendered file is
  saved under that title.
- Voiceover: use the user's requested speed (currently 1.10x). Speed it up only; do not trim pauses.
- SFX must be audible; music sits well under the voice (the approved gull/museum mix balance).
- What gets views (user, from channel results): a mystery that looks like a crime or something sinister (break-ins where
  nothing is stolen, meat raining from the sky, a fake town on a map), investigated, then an innocent, human twist at
  the end. Default new scripts to this shape.
- Scripts are written FOR the user's camera rules: few locations (2-4 scenes; cut only for a change of place, time or
  purpose), one continuous moving camera per scene, and the story itself must contain at least: one object handoff (a
  thrown / rolling / sliding object the lens follows, then hands to whoever reacts), one entrance the lens widens for,
  one walk or run the lens follows, and held reactions. List these camera beats under every script.
- COMPLETE DETAIL IS REQUIRED on every film, including tests and samples (user, repeatedly): no set goes to stills
  until the detail checklist in the youtube-shorts skill (section 4) is done. Reusing an old set bare is a defect.
  Report the checklist (done / not done) with every build.
- Every script gets a rating out of 10 with reasons. Scripts are original fiction, retention-driven, and not always
  time-related.
- Characters keep the locked look: squircle heads, wide clavicles, sharp elbows, straight arms at rest, hands.
