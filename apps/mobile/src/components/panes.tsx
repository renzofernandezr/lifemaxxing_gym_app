import { useState, type ReactNode } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useRestBarSpace } from "../store/workout";
import { useTheme } from "../theme/theme";
import { MAX_WIDTH } from "../theme/tokens";
import { Screen, SubTabs, useLayout } from "./ui";

/**
 * Sub-pestañas en móvil; en escritorio (≥ 760 px) se muestran todas las secciones, como el prototipo.
 * `desktop` permite agrupar secciones (p. ej. dos en columnas).
 */
export function Panes<K extends string>({
  tabs,
  label,
  render,
  desktop,
  initial,
}: {
  tabs: { key: K; label: string }[];
  label: string;
  render: (k: K) => ReactNode;
  desktop?: (render: (k: K) => ReactNode) => ReactNode;
  initial?: K;
}) {
  const { isDesktop } = useLayout();
  const [cur, setCur] = useState<K>(initial ?? tabs[0].key);
  if (isDesktop)
    return (
      <>
        {desktop
          ? desktop(render)
          : tabs.map((t) => (
              <View key={t.key} style={{ gap: 22 }}>
                {render(t.key)}
              </View>
            ))}
      </>
    );
  return (
    <>
      <SubTabs options={tabs} value={cur} onChange={setCur} label={label} />
      <View style={{ gap: 16 }}>{render(cur)}</View>
    </>
  );
}

/**
 * Pantalla con cabecera y sub-pestañas fijas: en móvil solo hace scroll el contenido de la sub-pestaña
 * (y vuelve arriba al cambiar). En escritorio no hay sub-pestañas: toda la página hace scroll, como antes.
 */
export function PanesScreen<K extends string>({
  head,
  tabs,
  label,
  render,
  desktop,
  initial,
  refreshControl,
}: {
  head: ReactNode;
  tabs: { key: K; label: string }[];
  label: string;
  render: (k: K) => ReactNode;
  desktop?: (render: (k: K) => ReactNode) => ReactNode;
  initial?: K;
  refreshControl?: ScrollViewProps["refreshControl"];
}) {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const [cur, setCur] = useState<K>(initial ?? tabs[0].key);
  const restSpace = useRestBarSpace();
  if (isDesktop) {
    return (
      <Screen refreshControl={refreshControl}>
        {head}
        <Panes tabs={tabs} label={label} render={render} desktop={desktop} initial={initial} />
      </Screen>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          width: "100%",
          maxWidth: MAX_WIDTH,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: 22,
          paddingBottom: 10,
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        }}
      >
        {head}
        <SubTabs options={tabs} value={cur} onChange={setCur} label={label} />
      </View>
      <ScrollView key={cur} style={{ flex: 1 }} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
        <View
          style={{
            width: "100%",
            maxWidth: MAX_WIDTH,
            alignSelf: "center",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24 + restSpace,
            gap: 16,
          }}
        >
          {render(cur)}
        </View>
      </ScrollView>
    </View>
  );
}
