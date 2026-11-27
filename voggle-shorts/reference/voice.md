# Voice-over (made by you, with any tool)

Use **one narrator for every video**: design or pick the voice once and reuse it. Any text-to-speech tool with a natural, expressive voice works, or record it yourself. The skill only needs **one MP3 or WAV of the whole script**.

## 1. Voice design prompt
When the user asks for a voice design prompt, give this one. It matches the narrator of the reference videos (dry, close, expressive, about 200 words per minute, no pauses). Paste it into any tool that can design a voice from a description, or use it as a casting note to pick a stock voice:
```text
Male British narrator, 30s, low-to-mid warm voice. Dry, deadpan, quietly amused storyteller of absurd true history. Lively rising-falling pitch on key words, never shouting. Fast, about 200 words per minute, no pauses. Close, dry studio mic, no reverb.
```
For the punchy short format, a neutral international accent also works: clear, warm, urgent in tense moments, soft in emotional ones.

## 2. Generation tips (any tool)
- Pick the most expressive model or style the tool offers. Keep it consistent across videos.
- Speed slightly above normal: about 170–185 wpm (short) or 200–210 wpm (long).
- Generate the **whole script in one go** so the delivery flows. Export MP3 (44.1 kHz) or WAV.

## 3. Voice script Claude gives the user (`02_voice/voiceover_script.txt`)
- Plain text only. No headings, beat labels or stage directions.
- Numbers as words ("twenty-two orphans"); years can be written as spoken ("eighteen-oh-seven"). The captions still show digits, because they come from `01_script/script.md`.
- Names that may be mispronounced: write them phonetically in the voice script only ("Berthier" → "Bair-tee-ay").
- Optional delivery tags such as `[whispers]` only if the user's tool supports them; otherwise leave them out.

## 4. After upload
`align.py` converts the audio, tightens long pauses, normalises loudness, and matches every word of the approved script to the audio. If under 85 % of words matched, the voice-over doesn't follow the script, so ask the user before continuing.
