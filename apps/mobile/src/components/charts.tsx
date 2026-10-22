// Gráficas SVG propias, portadas de niceTicks()/lineChart() del prototipo (index.html):
// línea + área + línea de referencia punteada + meta + punto final con su valor.
import { fk } from "@lifemaxxing/core";
import { useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme/theme";
import { F } from "../theme/tokens";
import { T } from "./ui";

/** Marcas "bonitas" del eje Y (paso 1, 2, 2.5, 5 o 10 × 10^n). */
export function niceTicks(min: number, max: number, n: number): { lo: number; hi: number; t: number[] } {
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const st = [1, 2, 2.5, 5, 10].map((x) => x * mag).find((x) => x >= raw) ?? 10 * mag;
  const lo = Math.floor(min / st) * st;
  const hi = Math.ceil(max / st) * st;
  const t: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += st) t.push(+v.toFixed(4));
  return { lo, hi, t };
}

export interface LineChartProps {
  ys: number[];
  /** Etiquetas del eje X (una por punto). */
  labels?: string[];
  /** Posición X de cada punto (p. ej. número de día) para espaciar según el tiempo. Por defecto, equiespaciados. */
  xs?: number[];
  /** Línea de referencia punteada (bronce), un valor por punto. Se llama `refLine` porque `ref` está reservado en React. */
  refLine?: number[];
  /** Meta: línea horizontal punteada (verde) con su etiqueta. */
  goal?: number | null;
  goalLabel?: string;
  height?: number;
  /** Modo mini: sin grilla ni etiquetas, punto inicial atenuado. */
  spark?: boolean;
  aria: string;
  ticks?: number;
  endPad?: number;
}

const W_MIN = 280;
const CHAR_W = 9.4; // ancho aproximado de un dígito en Montserrat 700 a 15 px
const LABEL_GAP = 40; // separación mínima entre etiquetas del eje X ("19 oct" mide ~34 px a 11 px)

export function LineChart({ ys, labels = [], xs, refLine, goal, goalLabel, height, spark, aria, ticks = 4, endPad }: LineChartProps) {
  const { c } = useTheme();
  const [cw, setCw] = useState(0);
  const H = height ?? (spark ? 84 : 210);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== cw) setCw(w);
  };
  if (!ys.length) return null;

  // Ancho lógico mínimo de 280: si el contenedor es más angosto, el SVG se escala (como el viewBox del prototipo).
  const Wd = Math.max(W_MIN, cw);
  const scale = cw > 0 ? cw / Wd : 1;
  const n = ys.length;
  const last = ys[n - 1];
  const endText = fk(last);
  const pl = spark ? 6 : 40;
  const pr = Math.max(endPad ?? (spark ? 46 : 54), 16 + endText.length * CHAR_W);
  const pt = spark ? 10 : 12;
  const pb = spark ? 10 : 26;

  const ref = refLine && refLine.length === n ? refLine : undefined;
  const all = ys.concat(ref ?? [], goal != null ? [goal] : []);
  const { lo, hi, t } = niceTicks(Math.min(...all), Math.max(...all), ticks);
  const X = xs && xs.length === n ? xs : ys.map((_, i) => i);
  const x0 = X[0];
  const span = X[n - 1] - x0;
  const plotW = Wd - pl - pr;
  const x = (i: number) => (n === 1 || span <= 0 ? pl + plotW / 2 : pl + (plotW * (X[i] - x0)) / span);
  const y = (v: number) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  const pts = ys.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const base = H - pb;

  // Etiquetas X: se anclan desde el final para que la última siempre se vea; en pantallas angostas va una sí y
  // otra no, y nunca dos a menos de LABEL_GAP px (con `xs` los puntos pueden quedar muy juntos).
  const maxLabels = Math.max(2, Math.floor(plotW / LABEL_GAP));
  const every = Math.max(Wd < 420 ? 2 : 1, Math.ceil(n / maxLabels));
  const shownLabels = new Set<number>();
  let lastLabelX = Infinity;
  for (let i = Math.min(n, labels.length) - 1; i >= 0; i--) {
    if ((n - 1 - i) % every !== 0 || lastLabelX - x(i) < LABEL_GAP) continue;
    shownLabels.add(i);
    lastLabelX = x(i);
  }
  const ly = y(last);

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={aria} style={{ width: "100%", minHeight: H * scale }}>
      {cw > 0 ? (
        <Svg width={cw} height={H * scale} viewBox={`0 0 ${Wd} ${H}`}>
          {!spark
            ? t.map((v) => (
                <Line key={`g${v}`} x1={pl} x2={Wd - pr} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={1} />
              ))
            : null}
          {!spark
            ? t.map((v) => (
                <SvgText key={`t${v}`} x={pl - 8} y={y(v) + 4} textAnchor="end" fill={c.muted} fontSize={11} fontFamily={F.medium}>
                  {fk(v)}
                </SvgText>
              ))
            : null}
          {!spark
            ? labels.map((l, i) =>
                shownLabels.has(i) ? (
                  <SvgText key={`x${i}`} x={x(i)} y={H - 6} textAnchor="middle" fill={c.muted} fontSize={11} fontFamily={F.medium}>
                    {l}
                  </SvgText>
                ) : null,
              )
            : null}
          {goal != null ? (
            <>
              <Line x1={pl} x2={Wd - pr} y1={y(goal)} y2={y(goal)} stroke={c.good} strokeWidth={1.5} strokeDasharray="2 4" />
              <SvgText x={pl + 4} y={y(goal) - 6} fill={c.good} fontSize={11} fontFamily={F.semibold}>
                {goalLabel ?? `Meta ${fk(goal)}`}
              </SvgText>
            </>
          ) : null}
          {n > 1 ? <Path d={`M${pts.join(" L")} L${x(n - 1)},${base} L${x(0)},${base} Z`} fill={c.accent} fillOpacity={0.12} /> : null}
          {ref && n > 1 ? (
            <Polyline
              points={ref.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={c.bronze}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
          ) : null}
          {n > 1 ? (
            <Polyline points={pts.join(" ")} fill="none" stroke={c.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
          {spark && n > 1 ? <Circle cx={x(0)} cy={y(ys[0])} r={3.5} fill={c.muted} stroke={c.surface} strokeWidth={3} /> : null}
          <Circle cx={x(n - 1)} cy={ly} r={6} fill={c.accent} stroke={c.surface} strokeWidth={3} />
          <SvgText x={x(n - 1) + 12} y={ly + 5} fill={c.fg} fontSize={15} fontFamily={F.bold}>
            {endText}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}

/** Muestra de leyenda: línea sólida (acento), referencia (bronce punteada) o meta (verde punteada). */
export function LegendSwatch({ kind }: { kind: "line" | "ref" | "goal" }) {
  const { c } = useTheme();
  const stroke = kind === "line" ? c.accent : kind === "ref" ? c.bronze : c.good;
  return (
    <Svg width={18} height={6} aria-hidden>
      <Line
        x1={0}
        x2={18}
        y1={3}
        y2={3}
        stroke={stroke}
        strokeWidth={kind === "line" ? 2.5 : 1.5}
        strokeDasharray={kind === "ref" ? "5 3" : kind === "goal" ? "2 3" : undefined}
      />
    </Svg>
  );
}

export function Legend({ items }: { items: { kind: "line" | "ref" | "goal" | "none"; label: ReactNode }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {it.kind !== "none" ? <LegendSwatch kind={it.kind} /> : null}
          {typeof it.label === "string" ? (
            <T v="small" muted style={{ fontSize: 12, lineHeight: 16 }}>
              {it.label}
            </T>
          ) : (
            it.label
          )}
        </View>
      ))}
    </View>
  );
}
