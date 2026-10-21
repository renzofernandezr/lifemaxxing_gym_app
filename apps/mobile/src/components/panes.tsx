import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { SubTabs, useLayout } from "./ui";

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
  if (isDesktop) return <>{desktop ? desktop(render) : tabs.map((t) => <View key={t.key} style={{ gap: 22 }}>{render(t.key)}</View>)}</>;
  return (
    <>
      <SubTabs options={tabs} value={cur} onChange={setCur} label={label} />
      <View style={{ gap: 16 }}>{render(cur)}</View>
    </>
  );
}
