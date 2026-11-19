# RicksClips3000 research notes (dataset: his 20 most recent Shorts, read 2026-11-19)

Sources (all public, authorised): his channel page (titles, view counts, video IDs: `dataset.json`) and YouTube's public
image server: the cover image + three automatic stills (~25%, 50%, 75% through) per video = 80 real frames.
Media lives in `media/` (git-ignored: his images are kept locally for study, never committed or published).
`media/strips_0..3.jpg`: 5 videos per sheet, 4 frames each (cover, 25%, 50%, 75%).

Acquisition check (2026-11-19): no creator-provided files, no website / press kit / Patreon, no Creative Commons
licence on any readable Short, no official TikTok/Instagram (the TikTok handle @ricksclips is an empty account).
Full motion therefore needs recordings the user makes. Correction made: an earlier title list was shifted by one
video; `dataset.json` is now verified against the frames.

## Per video (what the 4 frames show)
| # | Title | Views | Frames |
|---|---|---|---|
| 0 | Why Samurai Feared The Flying Thunder | 1.2M | tent interior, lord + aide; a pot of gold opened before officers; mushroom-cloud blast behind two men |
| 1 | The Instinct That Makes You Crash | 10M | roadside field with a hole; a man with glowing red eyes before a "DON'T" sign; driver close-up inside a car |
| 2 | How Mine Salting Worked | 6.7M | mine, top-hat swindler + mark; POV down the cart track with a rifle; a glittering gold vein |
| 3 | How One Cart Stopped an Entire Army | 9.2M | castle gate with a cart; soldiers with a torch; a huge army with banners (extreme wide) |
| 4 | Why Drivers Started Filming The Road | 4.7M | garage with a green car and money; a red car crashing into a white one; driver's-seat interior |
| 5 | This Shape Saved Roller Coasters | 12M | wooden coaster scaffold; riders in a car with a balloon; a car flying off the track |
| 6 | The Pink Prison Cell Experiment | 11M | cell with a pink light shaft; prison canteen; inmate knitting in the pink cell |
| 7 | Why Perfect Railroads Don't Work | 30M | two men on the tracks; station banner "FIRST LINE IN GETS IT ALL!"; conductor hanging off a rail |
| 8 | Why Sailors Carried Storm Oil | 16M | captain on deck; mast and open sea; a giant night wave lit by searchlight beams |
| 9 | How a Mirror Rigged a Horse Race | 5.6M | bettors at a "MILK RUN" window; a mirror on an easel in a field; a horse spooking mid-race |
| 10 | The Town Built Around a Button | 3.8M | three kids in a town square with a device; a tiny man climbing a giant wall; a giant red button |
| 11 | Why the Second Draw Always Wins | 9.8M | night western street, duel at the bank; a gunslinger electrocuted; sweating at "PHOTOGRAPHS" |
| 12 | Every Memory Has a Price | 574K | a clinic gauge; a pool float on endless water; "MEMORIES bought & sold" shop close-up |
| 13 | He Could Spot Winning Tickets Just by Looking | 6.7M | night desk, lamp; ticket factory "WINNERS 400,000"; call-centre close-up |
| 14 | What the Grave Bell Really Meant | 13M | dusk graveyard, two men by an open grave; a man with a shovel; townsfolk queued at a garden plot |
| 15 | Why Cashiers Keep Winning The Lottery | 10M | "OUR WINNERS" store; night boat "FINDERS KEEPERS"; a man driving a red truck |
| 16 | The Job Nobody Wants in Japan | 18M | office POV, a phone showing an empty inbox; a door with a "MON 7" calendar; a man alone in a blue room |
| 17 | The Burglar Who Only Moved Furniture | 10M | police officer close-up; night yard, a figure by an AC unit; a family with a SOLD sign |
| 18 | The Ancient Jar That Warned an Empire | 35M | night castle wall, guards; throne room; a bronze dragon-head jar (big object insert) |
| 19 | Levels of Pirate Cannonballs | 9.9M | pirate holding chain shot; deck exploding into splinters; a giant cannonball on a sling |

## Patterns across the 80 frames
- **A home set plus cutaways.** Each video has a home set (the cover scene: the main characters talking) and keeps
  returning to it: in 13 of 20 videos the 50% or 75% still is back in the home set. Between visits, the narration
  drives illustrative cutaways to other places (a blast, a crash, an army, a wave). Within a set the camera can still
  be continuous; the stills can't show that. (In many videos the cover is the same image as the 25% still.)
- **Shot sizes vary hard:** medium two-shots (most common), big face-filling close-ups, POV shots (hands on a phone,
  a rifle on a mine cart, a driver's seat), extreme wides (armies, races), and big object inserts (gold pot, dragon
  jar, red button).
- **Spectacle beats:** explosions, crashes, electrocution, giant waves, flying debris — at least one per video.
- **Each set has its own colour identity:** pink cell, gold mine, blue night street, purple dusk, yellow store.
- **Signage tells the story:** "DON'T", "FIRST LINE IN GETS IT ALL!", "MEMORIES bought & sold", "WINNERS 400,000",
  "FINDERS KEEPERS", "SOLD".
- **Two-hander staging:** a straight character and a reacting one, usually one larger in the foreground.
- **Faces:** mostly smug, sideways-glancing deadpan; big emotion is saved for peaks (glowing red eyes, sweat drops,
  electrocution).
- **Brightness varies inside a video** (range of mean brightness across its 4 frames: 0.14–0.43): night and day
  sets alternate.

## Unknown until footage
Cut timing, camera paths and speed, transitions, effect timing, sound design, voice pacing, script beats.

## Six to record first (most value per minute)
1. **The Ancient Jar That Warned an Empire** (35M): the channel's biggest recent hit.
2. **Why Perfect Railroads Don't Work** (30M): second biggest; a pure mechanism payoff.
3. **The Burglar Who Only Moved Furniture** (10M): closest to our "crime that isn't" format.
4. **What the Grave Bell Really Meant** (13M): a graveyard story — a direct comparison with our Graves film.
5. **Why Sailors Carried Storm Oil** (16M): night sea, storm, giant wave — the effects our boat scene lacks.
6. **Every Memory Has a Price** (574K): the control — a weak performer, to see what fails.
