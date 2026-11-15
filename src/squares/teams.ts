// Eight football nations as racers. Flags are drawn as simple stripes (see Flag in Race.tsx).
export type Team = { code: string; name: string; main: string; stripes: { dir: "v" | "h"; colors: string[] }; extra?: "brazil" | "argentina" | "portugal" };
export const TEAMS: Team[] = [
  { code: "FRA", name: "France", main: "#2a49b8", stripes: { dir: "v", colors: ["#2a49b8", "#ffffff", "#e0322e"] } },
  { code: "BRA", name: "Brazil", main: "#1f9a4a", stripes: { dir: "h", colors: ["#1f9a4a"] }, extra: "brazil" },
  { code: "ARG", name: "Argentina", main: "#6cb6e8", stripes: { dir: "h", colors: ["#6cb6e8", "#ffffff", "#6cb6e8"] }, extra: "argentina" },
  { code: "GER", name: "Germany", main: "#e8b923", stripes: { dir: "h", colors: ["#1b1b1f", "#d8262b", "#f2c230"] } },
  { code: "ESP", name: "Spain", main: "#d5202b", stripes: { dir: "h", colors: ["#d5202b", "#f6c400", "#f6c400", "#d5202b"] } },
  { code: "ITA", name: "Italy", main: "#1f8f4e", stripes: { dir: "v", colors: ["#1f8f4e", "#ffffff", "#d7282f"] } },
  { code: "POR", name: "Portugal", main: "#c8202a", stripes: { dir: "v", colors: ["#1f7a3a", "#c8202a", "#c8202a"] }, extra: "portugal" },
  { code: "NED", name: "Netherlands", main: "#f07a1a", stripes: { dir: "h", colors: ["#c8202a", "#ffffff", "#2a49b8"] } },
];
