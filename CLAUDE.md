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
- Voiceover: use the user's requested speed (currently 1.10x). Speed it up only; do not trim pauses.
- SFX must be audible; music sits well under the voice (the approved gull/museum mix balance).
- Every script gets a rating out of 10 with reasons. Scripts are original fiction, retention-driven, and not always
  time-related.
- Characters keep the locked look: squircle heads, wide clavicles, sharp elbows, straight arms at rest, hands.
