import { Children, type ReactNode } from "react";
import { View } from "react-native";
import { useLayout } from "../../components/ui";

/** Dos columnas desde 900 px (como `.grid2` del prototipo); apiladas en pantallas más angostas. */
export function Pair({ children, stretch = false, gap = 16 }: { children: ReactNode; stretch?: boolean; gap?: number }) {
  const { wide } = useLayout();
  const items = Children.toArray(children);
  if (!wide) return <View style={{ gap }}>{items}</View>;
  return (
    <View style={{ flexDirection: "row", gap, alignItems: stretch ? "stretch" : "flex-start" }}>
      {items.map((x, i) => (
        <View key={i} style={{ flex: 1, minWidth: 0, gap }}>
          {x}
        </View>
      ))}
    </View>
  );
}
