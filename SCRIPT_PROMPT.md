# Prompt for writing the script (copy everything in the box into any AI chat)

```
Write a Roblox-style story script for a YouTube Short, to be narrated by one voice.

TOPIC / IDEA: [put your idea here, or write "surprise me"]

FORMAT
- Spoken length: 45-60 seconds AFTER the voice is sped up 1.35x. That means about 150-200 words in total.
- The narrator is the hero, a blocky Roblox character called Kuro (black body, white spiky hair). First person ("I...").
- Hook in the first sentence (first 2 seconds): something shocking, funny or mysterious. No "Hey guys", no intro, no "welcome back".
- Fast pacing: short sentences. Something new happens every 2-4 seconds. Every punchline gets its own short line.
- Simple story: setup -> problem escalates -> twist or punchline -> a last line that makes people comment or rewatch.
- Maximum 3 locations and maximum 3 side characters (give each a one-word role, e.g. "teacher", "bully", "dog").
- Easy to animate with blocky Roblox characters: walking, running, pointing, shocked faces, things growing or exploding.
- Clean and safe: no real people, no brands or logos, no copyrighted characters, no swearing, no violence beyond cartoon slapstick.

OUTPUT (exactly this, nothing else)
1. TITLE (max 8 words).
2. SCRIPT: the words to read out loud, as plain text paragraphs. No stage directions, no emojis, no hashtags. Write numbers
   and sounds as words so they read naturally.
3. BEATS: a numbered list of 8-14 short beats, each = [location] + what we see + the emotion on Kuro's face
   (neutral, happy, smirk, shocked, scared, angry, sad, laugh...). Optional: a meme sound for 2-3 of the funniest beats
   (whoosh, pop, vine boom, ding, bonk, gulp, scream, gasp, sad trombone).
4. WORD COUNT of the SCRIPT.
```

## Voice settings (put these in your AI voice tool)
- Speed: **1.35x**
- Pitch: **+6** (semitones)
- Export as .mp3 or .wav, then send it to Claude with the script and say "new video".

No AI voice tool that can change speed/pitch? Record or generate the voice normally and run:

    python tools/voice_fx.py my_voice.mp3 my_voice_fx.wav 1.35 6

That does the same thing (1.35x faster, +6 semitones higher) with ffmpeg. Do this BEFORE the video pipeline.
The pipeline itself never stretches or pitches a voice, so send the already-processed file.
