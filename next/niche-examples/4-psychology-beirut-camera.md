# Script 4 camera pacing (spec only, nothing built)

Camera BPM: **52** (allowed range 50 to 55). One beat = 1.154 s. At 50 BPM a beat is 1.200 s, at 55 BPM 1.091 s.

Rules:
- Every camera cut and every camera move starts on a beat. No whip pans, no off-grid cuts.
- A move runs 2 or 4 beats (about 2.3 s or 4.6 s). Holds are whole beats too.
- Each sentence begins on a beat. Short sentences get 1 to 2 beats, long ones 3 to 5.
- The voice is not recorded yet, so the beat counts below are estimates (about 2.9 words per second at 1.15x). Once the voice-over exists, run forced alignment and snap each sentence start to the nearest beat, then re-pick the BPM within 50 to 55 that makes the fewest snaps move more than a quarter beat.

| # | Sentence | Words | Est. beats |
|---|----------|-------|-----------|
| 1 | He splits eighteen boys into two teams, at a summer camp in Beirut. | 13 | 4 |
| 2 | Ten are Christian. | 3 | 1 |
| 3 | Eight are Muslim. | 3 | 1 |
| 4 | So he mixes them. | 4 | 1 |
| 5 | Five Christians and four Muslims on the Red Genies. | 9 | 3 |
| 6 | Five and four on the Blue Ghost. | 7 | 2 |
| 7 | He's repeating an American experiment. | 5 | 1 |
| 8 | In Oklahoma, researchers posing as camp staff took twenty-two boys who'd never met, split them in two, and made the teams compete. | 22 | 7 |
| 9 | The boys ended up enemies. | 5 | 1 |
| 10 | But these boys arrive with a label the Oklahoma boys never had. | 12 | 4 |
| 11 | So which line will they fight along? | 7 | 2 |
| 12 | The competitions begin. | 3 | 1 |
| 13 | Fighting breaks out. | 3 | 1 |
| 14 | Not Christians against Muslims. | 4 | 1 |
| 15 | Red against Blue. | 3 | 1 |

Estimated total: 31 beats = 35.8 s at 52 BPM.
