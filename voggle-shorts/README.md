# Voggle Shorts (Claude skill)

Makes vertical history-story Shorts: photoreal AI period stills, cartoon eyes and mouths tracked onto the faces, one-word captions and cuts on every word.

## Install
1. Install **Python 3.10+** and **Node.js 18+**.
2. Copy this `voggle-shorts` folder into your Claude skills folder (`~/.claude/skills/voggle-shorts`).
3. Run the setup once from inside the folder:
   - Windows: `powershell -ExecutionPolicy Bypass -File setup\setup.ps1`
   - macOS / Linux: `bash setup/setup.sh`

## Use
Ask Claude: **"Voggle: give me title ideas."** It walks you through title → script → voice-over → image prompts → storyboard → final video.

You need:
- a voice-over for each script, from any text-to-speech tool or your own recording;
- images from Google Nano Banana. The skill writes paste-ready batches for the Google Flow agent, or you can paste single prompts into Gemini.

Videos are saved in `~/Voggle Projects/`. Set `VOGGLE_PROJECTS` to use another folder.
