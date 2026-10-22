import { fk, platesPerSide } from "@lifemaxxing/core";
import { View } from "react-native";
import { useTheme } from "../theme/theme";
import { T } from "./ui";

const SIZE: Record<string, [number, number]> = { "25": [68, 14], "20": [68, 12], "15": [58, 11], "10": [48, 10], "5": [36, 8], "2.5": [30, 7], "1.25": [24, 6] };

/** Barra con discos por lado (colores de competición), como el prototipo. */
export function Plates({ total }: { total: number }) {
  const { c } = useTheme();
  const r = platesPerSide(total);
  if (!r) return <T v="small" muted center>Menos que la barra (20 kg)</T>;
  const plate = (p: number, i: number) => {
    const [h, w] = SIZE[String(p)];
    return <View key={i} style={{ height: h, width: w, borderRadius: 3, backgroundColor: c.plates[String(p)], borderWidth: 1, borderColor: "rgba(0,0,0,0.18)" }} />;
  };
  const bar = { backgroundColor: c.bar };
  return (
    <View style={{ gap: 4 }}>
      <View aria-hidden style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 78, gap: 2, overflow: "hidden" }}>
        <View style={[bar, { height: 8, width: 26, borderRadius: 2 }]} />
        {r.perSide.slice().reverse().map(plate)}
        <View style={[bar, { width: 6, height: 18, borderRadius: 2 }]} />
        <View style={[bar, { height: 6, flex: 1, maxWidth: 160 }]} />
        <View style={[bar, { width: 6, height: 18, borderRadius: 2 }]} />
        {r.perSide.map(plate)}
        <View style={[bar, { height: 8, width: 26, borderRadius: 2 }]} />
      </View>
      <T v="small" muted center num>
        Barra 20 kg + por lado: {r.perSide.length ? r.perSide.map(fk).join(" + ") : "nada"}
        {r.remainder ? ` (faltan ${fk(r.remainder)} kg)` : ""}
      </T>
    </View>
  );
}

export function platesText(total: number): string {
  const r = platesPerSide(total);
  if (!r) return "menos que la barra";
  return r.perSide.length ? `por lado: ${r.perSide.map(fk).join(" + ")}${r.remainder ? ` (+${fk(r.remainder)})` : ""}` : "solo barra";
}
