export type ThemeColors = {
  bg: string;
  bgElev: string;
  bgElev2: string;
  fg: string;
  fgDim: string;
  accent: string;
  accentFg: string;
  danger: string;
  border: string;
  gradientStart: string;
  gradientEnd: string;
};

export type Theme = {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
};

export const THEMES: Theme[] = [
  {
    id: "ocean",
    name: "Ocean",
    description: "Calm blues under a shallow sunlit surface.",
    colors: {
      bg: "#06101c",
      bgElev: "rgba(14, 34, 56, 0.72)",
      bgElev2: "rgba(22, 50, 78, 0.78)",
      fg: "#eaf4ff",
      fgDim: "#8fb4d0",
      accent: "#5ee0c2",
      accentFg: "#042018",
      danger: "#ff6c7a",
      border: "rgba(110, 180, 220, 0.18)",
      gradientStart: "#2c6d98",
      gradientEnd: "#05101d",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm coral and amber fading to dusk.",
    colors: {
      bg: "#1a0a12",
      bgElev: "rgba(48, 20, 30, 0.72)",
      bgElev2: "rgba(68, 30, 40, 0.78)",
      fg: "#fff3ea",
      fgDim: "#d4a89c",
      accent: "#ffb26c",
      accentFg: "#2a1308",
      danger: "#ff5560",
      border: "rgba(255, 180, 140, 0.18)",
      gradientStart: "#c4632a",
      gradientEnd: "#1a0a14",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep pines and soft moss lamplight.",
    colors: {
      bg: "#061410",
      bgElev: "rgba(14, 38, 30, 0.72)",
      bgElev2: "rgba(22, 54, 42, 0.78)",
      fg: "#e8f5ea",
      fgDim: "#9fc4a8",
      accent: "#9be085",
      accentFg: "#08240f",
      danger: "#ef6a5a",
      border: "rgba(140, 200, 150, 0.18)",
      gradientStart: "#2a6a4a",
      gradientEnd: "#04120d",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Violet and teal dancing over a night sky.",
    colors: {
      bg: "#0a0818",
      bgElev: "rgba(26, 20, 54, 0.72)",
      bgElev2: "rgba(38, 30, 72, 0.78)",
      fg: "#f0ecff",
      fgDim: "#a9a0d0",
      accent: "#b58aff",
      accentFg: "#1a0a30",
      danger: "#ff5a8a",
      border: "rgba(170, 140, 220, 0.2)",
      gradientStart: "#3a2a7a",
      gradientEnd: "#07061a",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "The original deep-space charcoal.",
    colors: {
      bg: "#0b0b0f",
      bgElev: "#14141b",
      bgElev2: "#1c1c26",
      fg: "#f4f4f8",
      fgDim: "#9a9aab",
      accent: "#6ee7b7",
      accentFg: "#04221a",
      danger: "#ef5454",
      border: "#272734",
      gradientStart: "#0b0b0f",
      gradientEnd: "#0b0b0f",
    },
  },
];

export function findTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
