"""Build the copyable Nano Banana prompt sheet from prompts.json.

Usage: python prompts_tool.py <project>

Reads : 05_prompts/prompts.json   (written by Claude, see reference/prompt-system.md)
Writes: 05_prompts/prompts.md     (scene-by-scene sections, every prompt in its own copy block)
        05_prompts/all_prompts.txt (every prompt in generation order, for bulk work)
        05_prompts/manifest.json  (asset list used by prep_images.py)
"""
import sys
from collections import OrderedDict
from common import d, project_dir, load_json, save_json

GREEN = (
    "Background: perfectly flat, uniform, evenly lit pure chroma-key green (#00B140), "
    "no shadows on the background, no gradient, no floor line, no props, no other people. "
    "Keep a clear gap of green all around the subject; nothing touches the frame edges. "
    "Do not use any green on the subject."
)
_LOOK = ("Low-key cinematic contrast with highlights held below clipping. Natural, balanced colour "
         "(the final colour grade is added later). No film grain.")
# people / finished frames
STYLE = (
    "Photorealistic cinematic film still, high-budget historical drama look. Real-looking people with natural "
    "proportions, clean smooth skin, pristine period-accurate costumes and props with rich fabric, leather, brass "
    "and wood textures. Shallow depth of field, 50-85 mm lens look. Soft large key light, gentle fill, warm golden "
    "rim light on hair and shoulders, subtle atmospheric haze. " + _LOOK
)
# cut-outs on green: everything sharp, no haze (it would spoil the key)
STYLE_CUT = (
    "Photorealistic, high-budget historical drama look, real-looking with natural proportions, clean smooth skin, "
    "pristine period-accurate materials with rich fabric, leather, brass and wood textures. Entire subject in sharp "
    "focus, no haze, no motion blur. Soft large key light, gentle fill, warm golden rim light. " + _LOOK
)
# empty sets
STYLE_ENV = (
    "Photorealistic cinematic film still, high-budget historical drama production design, period-accurate "
    "architecture and set dressing with rich wood, stone, fabric and brass textures, subtle atmospheric haze. " + _LOOK
)
FACE = (
    "Face fully visible and clearly lit, eyes open, mouth closed with a neutral expression, nothing covering the "
    "face (no hands, cups or hair over eyes or mouth)."
)
NEG = (
    "Avoid: text, letters, captions, watermark, logo, frame, border, film grain, cartoon or anime style, 3D render "
    "look, extra people, extra limbs or fingers, distorted faces, closed eyes, modern objects, swastikas or any "
    "extremist symbols, gore."
)


import re as _re
BY_ID = {}   # filled in main(): id -> entry, so edit prompts can restate their source scene


def cast_text(e, chars):
    """Self-contained character descriptions for every <CID>_REF a prompt mentions or attaches.
    Prompts must work even when the generator does NOT receive the attached reference image."""
    blob = " ".join([e.get("desc", ""), e.get("change", ""), " ".join(e.get("attach", []))])
    src = BY_ID.get(e.get("edit_of", ""), {})
    blob += " " + src.get("desc", "") + " " + " ".join(src.get("attach", []))
    cids = []
    for m in _re.findall(r"\b([A-Z][A-Z0-9]*)_REF\b", blob):
        if m in chars and m not in cids:
            cids.append(m)
    if e.get("character") in chars and e["character"] not in cids:
        cids.append(e["character"])
    if not cids:
        return ""
    return "Characters (keep them exactly like this): " + " ".join(f"{c}_REF is {chars[c]['kit']}" for c in cids) + " "


def compose(e, chars):
    k = e["kind"]
    kit = lambda cid: f"{chars[cid]['kit']}" if cid in chars else ""
    att = e.get("attach", [])
    att_txt = ""
    if att and k != "char":
        att_txt = "Use the attached reference image(s): " + ", ".join(att) + ". "
    if e.get("edit_of"):
        # second pose of an existing image: Nano Banana EDIT mode keeps place, framing and light identical.
        # The source scene is restated in full so the prompt still works if the image isn't attached.
        src = e["edit_of"]
        sd = BY_ID.get(src, {})
        return (
            f"EDIT the attached image {src} (attach it). Keep EVERYTHING identical: the same place and background, the same "
            f"camera angle, framing and lens, the same lighting and colours, the same people with the same faces, hair and "
            f"costumes, in the same positions. Change ONLY this: {e['change']}. "
            f"For reference, the original image {src} shows: {sd.get('desc', '')} Camera: {sd.get('camera', 'as in the original')}. "
            f"Light: {sd.get('light', 'as in the original')}. {cast_text(e, chars)}"
            f"Faces stay neutral with eyes open and mouths closed; the body language carries the emotion. "
            f"Vertical 9:16, photorealistic historical drama still, no text, no watermark, nothing modern."
        )
    if k == "ref":
        c = e["character"]
        return (
            f"Character reference image, vertical 9:16. {kit(c)} "
            f"Standing upright, relaxed neutral pose, arms slightly away from the body, facing the camera in a "
            f"front view, whole body visible from head to feet with a small margin, centred. {FACE} "
            f"Even soft studio lighting from the front-left. {STYLE_CUT} {GREEN} {NEG}"
        )
    if k == "char":
        c = e["character"]
        return (
            f"{att_txt}Same person as in the attached reference {c}_REF: identical face, hair, build and costume. {kit(c)} "
            f"Pose and action: {e['pose']}. View: {e.get('view', 'three-quarter view')}. "
            f"Framing: {e.get('framing', 'full body from head to feet, centred, small margin')}. {FACE} "
            f"Lighting to match the scene: {e.get('light', 'warm key light from the front-left, golden rim light')}. "
            f"Vertical 9:16. {STYLE_CUT} {GREEN} {NEG}"
        )
    if k == "prop":
        return (
            f"{att_txt}Single isolated object: {e['desc']}. View: {e.get('view', 'three-quarter view from slightly above')}. "
            f"Whole object in frame, centred, sharp. Lighting: {e.get('light', 'warm key light from the front-left')}. "
            f"Vertical 9:16. {STYLE_CUT} {GREEN} {NEG}"
        )
    if k == "bg":
        return (
            f"Empty background plate, vertical 9:16, NO people and no animals. Setting: {e['desc']}. "
            f"Camera: {e.get('camera', 'eye level, 35 mm lens look')}. Time and light: {e.get('light', 'golden late-afternoon sun')}. "
            f"{e.get('space', 'Leave open floor space in the centre and lower third where characters will be placed later')}. "
            f"Background softly out of focus beyond the mid-ground. {STYLE_ENV} {NEG}"
        )
    if k == "full":
        return (
            f"{att_txt}Single finished cinematic frame, vertical 9:16. {e['desc']} {cast_text(e, chars)}"
            f"Keep every character identical to their reference image (face, hair, costume). "
            f"Camera: {e.get('camera', 'eye level')}. Light: {e.get('light', 'warm key light from the front-left, golden rim light')}. "
            f"Every face fully visible and clearly lit, eyes open, mouths closed, neutral faces; the body language "
            f"carries the emotion. {STYLE} {NEG}"
        )
    if k == "insert":
        return (
            f"{att_txt}Close-up insert shot, vertical 9:16: {e['desc']}. Camera: {e.get('camera', 'top-down')}. "
            f"Light: {e.get('light', 'warm practical lamp light, soft shadows')}. Hands only if mentioned, no faces. {STYLE} {NEG}"
        )
    raise ValueError(f"unknown kind {k} in {e['id']}")


def block(e, chars):
    head = f"**`{e['id']}`** · {e['kind']}"
    if e.get("attach"):
        head += " · attach: " + ", ".join(f"`{a}`" for a in e["attach"])
    if e.get("note"):
        head += f" · {e['note']}"
    return f"{head}\n\n```text\n{e['text']}\n```\n"


def html_sheet(P, order, batches=()):
    import html as H
    import re as _re
    bcards = []
    for i, b in enumerate(batches, 1):
        ids = _re.findall(r"^ID: (\S+)", b, _re.M)
        bcards.append(
            f'<div class="card batch" data-id="flow-batch-{i}"><div class="head"><label><input type="checkbox"> '
            f'<b>Flow agent · batch {i} of {len(batches)}</b></label><span class="meta">{len(ids)} images: {H.escape(", ".join(ids))}</span>'
            f'<button onclick="cp(this)">Copy batch</button></div><pre class="hid">{H.escape(b)}</pre></div>')
    flow_html = ""
    if bcards:
        flow_html = ("<h2>Google Flow agent: paste one batch at a time</h2>"
                     "<p>Each batch is a full instruction for the agent: generate in order, name every image with its ID, use the "
                     "listed reference images. Do batch 1 (the character references) first and wait for it to finish. "
                     "Download the images with their ID names into <code>06_images</code>.</p>" + "".join(bcards) +
                     "<h2>Single prompts</h2>")
    r1 = {e["id"] for e in P["round1"]}
    cards = []
    for e in order:
        rnd = "Round 1 · reference" if e["id"] in r1 else "Round 2"
        att = (" · attach: " + ", ".join(e["attach"])) if e.get("attach") else ""
        used = (" · scenes: " + ", ".join(e.get("used_in", []))) if e.get("used_in") else ""
        cards.append(
            f'<div class="card" data-id="{H.escape(e["id"])}"><div class="head"><label><input type="checkbox"> '
            f'<b>{H.escape(e["id"])}</b></label><span class="meta">{rnd} · {e["kind"]}{H.escape(att)}{H.escape(used)}</span>'
            f'<button onclick="cp(this)">Copy</button></div><pre>{H.escape(e["text"])}</pre></div>')
    return f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Image prompts</title><style>
:root{{--bg:#f6f4ef;--card:#fff;--ink:#1d1b18;--muted:#6b665d;--line:#e2ddd2;--accent:#b5562d}}
@media (prefers-color-scheme:dark){{:root{{--bg:#171614;--card:#22201d;--ink:#eeeae2;--muted:#a39d92;--line:#36332e;--accent:#e08a5f}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}}
main{{max-width:900px;margin:0 auto;padding:24px 16px}} h1{{font-size:22px;margin:0 0 4px}} p{{color:var(--muted);margin:0 0 16px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:0 0 12px;overflow:hidden}}
.card.done{{opacity:.45}} .head{{display:flex;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}}
.meta{{color:var(--muted);font-size:13px;flex:1}} pre{{margin:0;padding:12px;white-space:pre-wrap;font:13px/1.5 ui-monospace,Consolas,monospace}}
button{{background:var(--accent);color:#fff;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;font-weight:600}}
.hid{{display:none}} h2{{font-size:17px;margin:22px 0 6px}} .batch{{border-color:var(--accent)}}
.bar{{position:sticky;top:0;background:var(--bg);padding:8px 0 12px;display:flex;gap:8px;z-index:2}}
</style></head><body><main><h1>{H.escape(P.get('title', 'Image prompts'))}</h1>
<p>Make Round 1 first. Save each image as <b>ID.png</b> in <code>06_images</code>. When a card says <i>attach</i>, upload those images with the prompt. Tick a card when it's done.</p>
<div class="bar"><button onclick="cpAll()">Copy all prompts</button></div>
{flow_html}{''.join(cards)}</main><script>
function cp(b){{const t=b.closest('.card').querySelector('pre').textContent;navigator.clipboard.writeText(t);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)}}
function cpAll(){{navigator.clipboard.writeText([...document.querySelectorAll('.card:not(.batch)')].map(c=>'### '+c.dataset.id+'\\n'+c.querySelector('pre').innerText).join('\\n\\n'))}}
document.querySelectorAll('.card input').forEach(i=>{{const k='done:'+location.pathname+i.closest('.card').dataset.id;try{{i.checked=localStorage.getItem(k)==='1'}}catch(e){{}}
i.closest('.card').classList.toggle('done',i.checked);i.onchange=()=>{{i.closest('.card').classList.toggle('done',i.checked);try{{localStorage.setItem(k,i.checked?'1':'0')}}catch(e){{}}}}}});
</script></body></html>"""


def main():
    proj = project_dir(sys.argv[1])
    pdir = d(proj, "prompts")
    P = load_json(pdir / "prompts.json")
    chars = P.get("characters", {})
    order = []
    BY_ID.clear()
    BY_ID.update({e["id"]: e for e in P["round1"] + P["round2"]})
    for e in P["round1"] + P["round2"]:
        if e.get("edit_of"):
            e["attach"] = [e["edit_of"]] + [a for a in e.get("attach", []) if a != e["edit_of"]]
        e["text"] = e.get("override") or compose(e, chars)
        if P.get("world") and e["kind"] != "prop":
            # era / people lock: stops the generator drifting to modern or wrong-region people
            e["text"] += " WORLD (must match): " + P["world"]
        if P.get("look") and e["kind"] != "prop":
            e["text"] += " LOOK: " + P["look"]
        order.append(e)

    md = [f"# Image prompts: {P.get('title', proj.name)}", "",
          "Generate in **Google Nano Banana** (Gemini app). Save every image as **`<ID>.png`** (exact ID, any of png/jpg/webp) "
          "and put them all in `06_images/`. When a prompt says *attach*, upload that already-made image together with the prompt.", "",
          f"Total images: **{len(order)}** ({len(P['round1'])} character references + {len(P['round2'])} scene images).", "",
          "## Round 1: character references (make these first)", ""]
    for e in P["round1"]:
        md.append(block(e, chars))
    md += ["## Round 2: scenes", ""]
    by_id = {e["id"]: e for e in P["round2"]}
    done = set()
    scenes = OrderedDict()
    for e in P["round2"]:
        for s in e.get("used_in", ["(unassigned)"]):
            scenes.setdefault(s, []).append(e["id"])
    for s in sorted(scenes, key=lambda x: (x == "(unassigned)", x)):
        line = P.get("scene_lines", {}).get(s, "")
        md.append(f"### Scene {s}" + (f": “{line}”" if line else ""))
        md.append("")
        for aid in scenes[s]:
            e = by_id[aid]
            if aid in done:
                md.append(f"- reuse `{aid}` ({e['kind']}), already made\n")
            else:
                md.append(block(e, chars))
                done.add(aid)
    (pdir / "prompts.md").write_text("\n".join(md), encoding="utf-8")
    (pdir / "all_prompts.txt").write_text(
        "\n\n".join(f"### {e['id']}" + (f"  [attach: {', '.join(e['attach'])}]" if e.get("attach") else "") + f"\n{e['text']}" for e in order),
        encoding="utf-8")
    save_json(pdir / "manifest.json", {"assets": [{"id": e["id"], "kind": e["kind"], "used_in": e.get("used_in", [])} for e in order]})
    only = []
    if "--only" in sys.argv:
        only = [x.strip() for x in sys.argv[sys.argv.index("--only") + 1].split(",") if x.strip()]
    batches = flow_batches(P, order, proj.name)
    if only:   # regeneration: just the listed images, refs assumed to exist already
        sub = [e for e in order if e["id"] in only]
        P2 = dict(P, round1=[])
        regen = flow_batches(P2, sub, proj.name)[1:] if sub else []
        fdir0 = pdir / "flow"
        fdir0.mkdir(exist_ok=True)
        for i, b in enumerate(regen, 1):
            (fdir0 / f"regen_{i:02d}.txt").write_text(b.replace("IMAGE GENERATION TASK", "IMAGE REGENERATION TASK (replace earlier versions)"), encoding="utf-8")
        print(f"regeneration: {len(sub)} images in {len(regen)} batch(es) -> {fdir0}")
        # keep the full batch_NN.txt files and prompts.html as they are (they used to be replaced by the regen batch)
        return
    fdir = pdir / "flow"
    fdir.mkdir(exist_ok=True)
    for old in fdir.glob("batch_*.txt"):
        old.unlink()
    for i, b in enumerate(batches, 1):
        (fdir / f"batch_{i:02d}.txt").write_text(b, encoding="utf-8")
    (pdir / "prompts.html").write_text(html_sheet(P, order, batches), encoding="utf-8")
    print(f"{len(order)} prompts -> {pdir / 'prompts.md'} | {len(batches)} Flow-agent batches -> {fdir}")


FLOW_BATCH = 8
KIND_ORDER = {"ref": 0, "bg": 1, "prop": 2, "char": 3, "insert": 4, "full": 5}


def flow_batches(P, order, slug):
    """Paste-ready briefs for an image-generation agent (Google Flow agent).
    Batch 1 = character references. Later batches are ordered so every reference an item needs
    was generated in an earlier batch or earlier in the same batch."""
    refs = [e for e in order if e["id"] in {x["id"] for x in P["round1"]}]
    rest = sorted([e for e in order if e not in refs], key=lambda e: KIND_ORDER.get(e["kind"], 9))
    # dependency-safe order: move an item after everything it attaches
    placed, queue = [], list(rest)
    done = {e["id"] for e in refs}
    while queue:
        for e in queue:
            if all(a in done for a in e.get("attach", [])):
                placed.append(e); done.add(e["id"]); queue.remove(e); break
        else:  # unresolvable reference: keep order and let the agent report it
            placed += queue; break
    groups = [refs] + [placed[i:i + FLOW_BATCH] for i in range(0, len(placed), FLOW_BATCH)]
    total = len(groups)
    out = []
    for gi, g in enumerate(groups, 1):
        names = ", ".join(e["id"] for e in g)
        head = [
            f"IMAGE GENERATION TASK, batch {gi} of {total}, project \"{P.get('title', slug)}\"",
            "",
            "Please generate the images below with the Nano Banana image model.",
            "Rules:",
            "1. Exactly ONE image per item, vertical 9:16, in the order listed.",
            "2. NAME each image exactly with its ID (for example C1_REF). When it is downloaded, the file name must be <ID>.png. Do not rename, number or add words to the IDs.",
            "3. Use each prompt word for word. Do not shorten it, change it or add text to the image.",
            "4. \"Reference images\" are images already generated earlier in this project, found by their ID name. Give them to the model as reference images (ingredients) for that item, so the character, plane or place stays identical.",
            "5. Items that ask for a green background must have a flat, pure chroma-key green background with nothing else on it.",
            "6. If an item fails or breaks a rule (text in the image, extra people, wrong costume, symbols), regenerate it once. At the end, list any ID you could not make.",
            f"7. When finished, reply with the list of IDs created in this batch: {names}",
            "",
            "=" * 60,
        ]
        items = []
        for e in g:
            refs_txt = ", ".join(e.get("attach", [])) or "none"
            items.append(f"ID: {e['id']}\nReference images: {refs_txt}\nPrompt: {e['text']}\n" + "-" * 60)
        out.append("\n".join(head) + "\n\n" + "\n\n".join(items) + "\n")
    return out


if __name__ == "__main__":
    main()
