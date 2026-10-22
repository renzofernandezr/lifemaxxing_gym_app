import { fk } from "@lifemaxxing/core";
import { View } from "react-native";
import { useTheme } from "../theme/theme";
import { F, R } from "../theme/tokens";
import { T } from "./ui";

/**
 * 1RM estimado (grande) y las cargas de hoy que salen de él. Se ve en la serie de prueba (en vivo)
 * y en el descanso que la sigue.
 */
export function OneRmCard({
  e1rmKg,
  loads,
  perHand,
  reliable = true,
}: {
  e1rmKg: number;
  loads: number[];
  perHand: boolean;
  /** Fuera de 3–10 reps el cálculo es menos fiable: se marca en rojo. */
  reliable?: boolean;
}) {
  const { c } = useTheme();
  const ok = e1rmKg > 0 && loads.length > 0;
  const tone = reliable ? c.accentInk : c.bad;
  return (
    <View
      accessibilityLabel={ok ? `1RM estimado ${fk(Math.round(e1rmKg * 2) / 2)} kg. Series de hoy: ${loads.map(fk).join(", ")} kg` : undefined}
      style={{ alignSelf: "stretch", backgroundColor: c.accentSoft, borderRadius: R, borderWidth: 1, borderColor: c.accent, padding: 14, gap: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <View>
          <T v="eyebrow" color={c.accentInk}>
            1RM estimado
          </T>
          <T num style={{ fontFamily: F.extrabold, fontSize: 36, lineHeight: 40, letterSpacing: -0.8, color: tone }}>
            {ok ? fk(Math.round(e1rmKg * 2) / 2) : "—"}
            <T style={{ fontFamily: F.bold, fontSize: 17, color: tone }}> kg</T>
          </T>
        </View>
        <View style={{ alignItems: "flex-end", flexShrink: 1, paddingBottom: 4 }}>
          <T v="eyebrow" color={c.accentInk}>
            {perHand ? "Tus series · por mano" : "Tus series de hoy"}
          </T>
          <T num style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 24 }}>
            {ok ? `${loads.map(fk).join(" · ")} kg` : "—"}
          </T>
        </View>
      </View>
      {ok && !reliable ? (
        <T v="small" color={c.bad} style={{ fontFamily: F.semibold }}>
          Haz entre 3 y 10 reps para un cálculo fiable
        </T>
      ) : null}
    </View>
  );
}
