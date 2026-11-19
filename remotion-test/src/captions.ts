// One word at a time, timed by hand at ~220 wpm (no voice track yet).
// Original line — hook format: a strange, specific action stated flat.
const LINE =
  "She traded her only lantern for the moon, and the whole village laughed.";

const START = 0.15; // seconds
const WPS = 3.6; // words per second ≈ 216 wpm

export type Word = { text: string; start: number; end: number };

export const WORDS: Word[] = LINE.split(" ").map((text, i, arr) => {
  // punctuation-ending words hold a touch longer, like a speaker would
  const start = START + i / WPS;
  const next = START + (i + 1) / WPS;
  return { text, start, end: i === arr.length - 1 ? 5 : next };
});
