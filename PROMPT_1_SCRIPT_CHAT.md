# CHAT 1 - the script chat (any normal chat, no repo needed)

Copy everything in the box as your first message. Replace the idea in the brackets.

```
You are my script writer for a Roblox-style YouTube Short. Write ONE script for me.

MY IDEA: [your idea here, or write "surprise me"]

RULES
- Narrator = the hero, a blocky Roblox character called Kuro (black body, white spiky hair). First person ("I...").
- Spoken length 45-60 seconds AFTER the voice is sped up to 1.35x. That is about 150-200 words in total.
- Hook in the first sentence (first 2 seconds): shocking, funny or mysterious. No "Hey guys", no intro, no "welcome back".
- Short sentences. Something new happens every 2-4 seconds. Every punchline gets its own short line.
- Simple story: setup -> problem escalates -> twist/punchline -> a last line that makes people comment or rewatch.
- Max 3 locations and max 3 side characters (one-word roles like "teacher", "dog").
- Easy to animate with blocky characters: walking, running, pointing, shocked faces, things growing or exploding.
- Clean and safe: no real people, brands, logos or copyrighted characters; no swearing; only cartoon slapstick.

GIVE ME EXACTLY THIS, nothing else:
1. TITLE (max 8 words).
2. SCRIPT - only the words to read out loud, plain text, no stage directions, no emojis. Numbers and sounds written as words.
3. BEATS - 8-14 numbered beats: [location] + what we see + Kuro's face (neutral, happy, smirk, shocked, scared, angry, sad,
   laugh). Add a meme sound to 2-3 of the funniest beats (whoosh, pop, vine boom, ding, bonk, gulp, scream, gasp, sad trombone).
4. WORD COUNT of the script.
5. VOICE SETTINGS to use in my AI voice tool: Speed 1.35x, Pitch +6. Voice style: energetic, young, fast storyteller.

If I ask for changes, send the full updated version again in the same format.
```

## After you have the script
1. Put the SCRIPT text into your AI voice tool with **speed 1.35x** and **pitch +6**, export .mp3 or .wav.
   (No tool that can do that? Make the voice normally and run `python tools/voice_fx.py in.mp3 out.wav 1.35 6`,
   or ask the render chat to run it for you.)
2. Go to Chat 2 and send the audio + the SCRIPT + the BEATS (see PROMPT_2_RENDER_CHAT.md).
