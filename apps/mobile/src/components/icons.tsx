import Svg, { Circle, Path, Rect } from "react-native-svg";

interface P {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const });

export const IconProgress = ({ size = 22, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M3 20h18M6 16l4-5 3 3 5-7" />
  </Svg>
);
export const IconBarbell = ({ size = 22, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8" />
  </Svg>
);
export const IconPlan = ({ size = 22, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Rect x={4} y={3} width={16} height={18} rx={2} />
    <Path d="M8 8h8M8 12h8M8 16h5" />
  </Svg>
);
export const IconSun = ({ size = 19, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Circle cx={12} cy={12} r={4.5} />
    <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const IconMoon = ({ size = 19, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Svg>
);
export const IconUser = ({ size = 19, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Circle cx={12} cy={8} r={4} />
    <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Svg>
);
export const IconCheck = ({ size = 18, color, strokeWidth = 3 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconPlus = ({ size = 18, color, strokeWidth = 2.5 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = ({ size = 18, color, strokeWidth = 2.5 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M5 12h14" />
  </Svg>
);
export const IconClose = ({ size = 20, color, strokeWidth = 2.2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
    <Path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconChevron = ({ size = 18, color, strokeWidth = 2.2, dir = "right" }: P & { dir?: "right" | "down" | "left" | "up" }) => {
  const d = { right: "M9 5l7 7-7 7", left: "M15 5l-7 7 7 7", down: "M5 9l7 7 7-7", up: "M5 15l7-7 7 7" }[dir];
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
};
export const IconArrow = ({ size = 14, color, strokeWidth = 2.4, up = false }: P & { up?: boolean }) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d={up ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} />
  </Svg>
);
export const IconFlame = ({ size = 16, color, strokeWidth = 2 }: P) => (
  <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.5-6-4-8-.5 2-1.5 3-3 3 0-3-1-5.5-3-8-.5 4-5 6.5-5 13 0 4.2 3 7 8 7z" />
  </Svg>
);
