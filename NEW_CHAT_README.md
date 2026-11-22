# Start a new video in a fresh chat (saves usage)

Open a new Claude Code chat on this repo (alejohjessrei-gif/Youtube) and send:

    Read SKILL.md and NEW_CHAT_README.md. New video, hero is Kuro, 45-60 seconds. Voice recording (already 1.35x, +6 pitch) + script attached.

## State of the project
- Hero: **Kuro** (black body, white spiky hair, white outfit) = `hero.json` / `hero_approved.json`. Velo (fedora + trench coat) is kept in `characters/velo.json` and can be used as a side character or switched back by copying it over hero.json.
- Faces for dark heads: `faces2_glow/` (used automatically).
- "Skies" stamp: the kit owner (Discord account "STAFF | skies", Founder) allowed rendering without it.
  `OWNER_PERMISSION.txt` records that. While that file is in the repo folder, tools/assemble.py leaves the stamp out.
  **Always work from this repo, not from the original RobloxShortsKit zip** - the original zip has no permission file, so a
  new chat would (correctly) put the stamp back. If you must use another copy, copy OWNER_PERMISSION.txt into it, and
  tell the new chat what the owner said (attach the screenshot of his reply).
- No PC: renders go to Kaggle (free T4 GPUs) with Blender's Cycles engine (EEVEE cannot use Kaggle GPUs).
  Notebooks: `kaggle/velo_cycles_part_a.ipynb` + `_b.ipynb` (two halves rendered in parallel, 16 samples, 720x1280).
  Dataset on Kaggle: `alejohjessrei/velo-kit` (rebuild `kaggle/velo_kit.zip` and push a new dataset version after any engine change).
  Kaggle CLI helper: `kaggle/kg.py` (see below).

## Kaggle key
The Kaggle token is stored as a network secret on the Claude cloud environment ("Youtube - Default"), for the hosts
`www.kaggle.com` and `api.kaggle.com` (type: Bearer token). New chats in the SAME environment already have it. If a chat
says there is no credential: ask Claude to call request_credential for both hosts and paste the token ONLY in that form
(Kaggle -> Settings -> API -> Create New Token). Never paste the key in chat. The username is `alejohjessrei`.
CLI use: `pip install kaggle; export KAGGLE_API_TOKEN=KGAT_proxyinjected00000000000000; python3 kaggle/kg.py kernels push -p <folder>`
(kg.py bypasses the CLI's local token check; the proxy injects the real token.)

## Voice and script
- Script prompt for any AI: `PROMPT_1_SCRIPT_CHAT.md` (separate chat; the render chat is `PROMPT_2_RENDER_CHAT.md`). Videos are 45-60 s (about 150-200 words at 1.35x).
- The creator's voice is sped up 1.35x and pitched +6 semitones BEFORE it reaches this pipeline (AI voice tool settings, or
  `python tools/voice_fx.py in.mp3 out.wav 1.35 6`). Do not stretch or pitch it again; just run tools/vo_clean.py on it.
- Length 45-60 s means about 1,350-1,800 frames: render in two parallel Kaggle notebooks (halves), 720x1280 first.

## Saving usage
Shorter video (45 s rather than 60 s), few sets/characters, one stills round, all changes in one message, let Claude start the render
and stop (say "check the render" later).
