// Tokens copiados del :root del prototipo (index.html), en claro y oscuro.
export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  fg: string;
  muted: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  onAccent: string;
  bronze: string;
  bronzeSoft: string;
  hdr: string;
  onHdr: string;
  hdrMuted: string;
  good: string;
  bad: string;
  bar: string;
  plates: Record<string, string>;
}

const plates = { "25": "#C2372F", "20": "#2D5DA6", "15": "#C9A225", "10": "#2F8A57", "5": "#F4F6F5", "2.5": "#232A2D", "1.25": "#8D979A" };

export const light: Palette = {
  bg: "#F5F5F5",
  surface: "#FFFFFF",
  surface2: "#F0F0F0",
  line: "#E3E3E3",
  fg: "#212338",
  muted: "#5B6B6B",
  accent: "#FF6600",
  accentInk: "#C24E00",
  accentSoft: "#FDE9DB",
  onAccent: "#FFFFFF",
  bronze: "#425252",
  bronzeSoft: "#E7EDED",
  hdr: "#FFFFFF",
  onHdr: "#212338",
  hdrMuted: "#5B6B6B",
  good: "#23753F",
  bad: "#B3261E",
  bar: "#98A2A5",
  plates,
};

export const dark: Palette = {
  bg: "#252C2E",
  surface: "#2F3739",
  surface2: "#3A4345",
  line: "#4A5456",
  fg: "#F3F5F5",
  muted: "#B3BFC0",
  accent: "#FF6A0A",
  accentInk: "#FF9A57",
  accentSoft: "#55392A",
  onAccent: "#FFFFFF",
  bronze: "#C7D5D5",
  bronzeSoft: "#3B4849",
  hdr: "#2F3739",
  onHdr: "#F3F5F5",
  hdrMuted: "#B3BFC0",
  good: "#5BC489",
  bad: "#F28B82",
  bar: "#6D777A",
  plates: { ...plates, "5": "#E3E8E6", "2.5": "#0A0E0F" },
};

export const F = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semibold: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold",
  extrabold: "Montserrat_800ExtraBold",
} as const;

export const R = 6;
export const MAX_WIDTH = 1140;
export const DESKTOP = 760;
/** Niveles del mapa de actividad (0 = sin entreno). */
export const heatLevels = (p: Palette) => [p.surface2, `${p.accent}40`, `${p.accent}73`, `${p.accent}A6`, p.accent];
