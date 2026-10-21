// Vista Progreso: Resumen · Peso y grasa · Fuerza · Constancia · Historial (sub-pestañas en móvil, todo en escritorio).
import { programPosition } from "@lifemaxxing/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Platform, RefreshControl, View } from "react-native";
import { PanesScreen } from "../../components/panes";
import { ViewHead } from "../../components/ui";
import { isDemo } from "../../lib/demo";
import { useTheme } from "../../theme/theme";
import { BodyPane } from "./Body";
import { CheckinSheet } from "./CheckinSheet";
import { ConsistencyPane } from "./Consistency";
import { HistoryPane } from "./History";
import { Pair } from "./layout";
import { StrengthPane } from "./Strength";
import { SummaryPane } from "./Summary";
import { longDate, useProfileDates } from "./util";

type PaneKey = "resumen" | "cuerpo" | "fuerza" | "constancia" | "historial";
const TABS: { key: PaneKey; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "cuerpo", label: "Peso y grasa" },
  { key: "fuerza", label: "Fuerza" },
  { key: "constancia", label: "Constancia" },
  { key: "historial", label: "Historial" },
];

export function ProgressScreen() {
  const { c } = useTheme();
  const { start, tz } = useProfileDates();
  const qc = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pos = programPosition(new Date(), start, tz);
  const eyebrow =
    (pos.beforeStart ? `Empiezas el ${longDate(start)}` : pos.finished ? "Programa completo" : `Semana ${pos.week} de 24`) +
    (isDemo() ? " · simulación" : "");

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  };
  const openCheckin = () => setSheet(true);

  const render = (k: PaneKey) => {
    switch (k) {
      case "resumen":
        return <SummaryPane onRegister={openCheckin} />;
      case "cuerpo":
        return <BodyPane onRegister={openCheckin} />;
      case "fuerza":
        return <StrengthPane />;
      case "constancia":
        return <ConsistencyPane />;
      default:
        return <HistoryPane />;
    }
  };

  return (
    <>
      <PanesScreen
        refreshControl={
          Platform.OS === "web" ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />
          )
        }
        head={<ViewHead eyebrow={eyebrow} title="Tu progreso" />}
        tabs={TABS}
        label="Secciones de progreso"
        render={render}
        desktop={(r) => (
          <>
            <View style={{ gap: 22 }}>{r("resumen")}</View>
            <View style={{ gap: 22 }}>{r("cuerpo")}</View>
            <View style={{ gap: 22 }}>{r("fuerza")}</View>
            <Pair gap={22}>
              <View style={{ gap: 16 }}>{r("constancia")}</View>
              <View style={{ gap: 16 }}>{r("historial")}</View>
            </Pair>
          </>
        )}
      />
      <CheckinSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
