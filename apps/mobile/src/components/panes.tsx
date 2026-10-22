import { useState, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useRestBarSpace } from "../store/workout";
import { useTheme } from "../theme/theme";
import { MAX_WIDTH } from "../theme/tokens";
import { SubTabs, useLayout } from "./ui";

/**
 * Pantalla con cabecera y sub-pestañas fijas, en móvil y en escritorio: solo hace scroll el contenido
 * de la sub-pestaña (y vuelve arriba al cambiar).
 */
export function PanesScreen<K extends string>({
  head,
  tabs,
  label,
  render,
  initial,
  refreshControl,
}: {
  head: ReactNode;
  tabs: { key: K; label: string }[];
  label: string;
  render: (k: K) => ReactNode;
  initial?: K;
  refreshControl?: ScrollViewProps["refreshControl"];
}) {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const [cur, setCur] = useState<K>(initial ?? tabs[0].key);
  const restSpace = useRestBarSpace();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: c.line }}>
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            paddingHorizontal: 16,
            paddingTop: isDesktop ? 30 : 22,
            paddingBottom: 10,
            gap: 14,
          }}
        >
          {head}
          <SubTabs options={tabs} value={cur} onChange={setCur} label={label} />
        </View>
      </View>
      <ScrollView key={cur} style={{ flex: 1 }} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            paddingHorizontal: 16,
            paddingTop: isDesktop ? 22 : 16,
            paddingBottom: 24 + restSpace,
            gap: isDesktop ? 22 : 16,
          }}
        >
          {render(cur)}
        </View>
      </ScrollView>
    </View>
  );
}
