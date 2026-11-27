// Colour grades from MASTER_BLUEPRINT §3.4. Applied to the whole shot (images AND cartoon
// overlays), so the cartoon whites pick up the scene tint exactly like the reference.
// Images are generated with their scene lighting already (moonlight etc.), so grades shift colour
// more than brightness; darkening an already-dark plate twice makes it unreadable.
export type Grade = {filter: string; tint: string; tintOpacity: number; blend: string};

export const GRADES: Record<string, Grade> = {
  WARM: {filter: 'saturate(1.45) contrast(0.9) brightness(0.8)', tint: '#ffb060', tintOpacity: 0.08, blend: 'soft-light'},
  COOL: {filter: 'saturate(0.95) contrast(0.95) brightness(0.82)', tint: '#4a6d94', tintOpacity: 0.32, blend: 'color'},
  NIGHT: {filter: 'saturate(0.85) contrast(1.04) brightness(1.18)', tint: '#1c3570', tintOpacity: 0.3, blend: 'soft-light'},
  MONO: {filter: 'grayscale(0.88) sepia(0.28) contrast(0.95) brightness(1.03)', tint: '#d8c8a8', tintOpacity: 0.08, blend: 'soft-light'},
  ANGER: {filter: 'sepia(0.35) saturate(1.6) contrast(1.1) hue-rotate(-12deg)', tint: '#ff4a12', tintOpacity: 0.28, blend: 'soft-light'},
  OLIVE: {filter: 'sepia(0.3) saturate(0.9) contrast(1.1) brightness(0.88) hue-rotate(18deg)', tint: '#4b5a12', tintOpacity: 0.25, blend: 'multiply'},
  BURGUNDY: {filter: 'saturate(1.2) contrast(1.0) brightness(0.88)', tint: '#6a1424', tintOpacity: 0.22, blend: 'multiply'},
  TEAL: {filter: 'saturate(0.75) contrast(1.05) brightness(0.85)', tint: '#3f5a50', tintOpacity: 0.3, blend: 'color'},
  NONE: {filter: 'none', tint: '#000000', tintOpacity: 0, blend: 'normal'},
};

export const grade = (name: string) => GRADES[name] ?? GRADES.WARM;
