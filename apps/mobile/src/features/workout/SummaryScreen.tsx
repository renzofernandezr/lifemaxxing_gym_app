import { fk, thousands } from "@lifemaxxing/core";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../components/toast";
import { Button, Card, CardHead, Grid, Pill, T, useLayout, ViewHead } from "../../components/ui";
import { useWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F, MAX_WIDTH } from "../../theme/tokens";
import { discardWorkout } from "./actions";

export function SummaryScreen() {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const s = useWorkout((x) => x.lastSummary);
  const [busy, setBusy] = useState(false);
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (!s || announced.current === s.sessionId) return;
    announced.current = s.sessionId;
    const recs = s.exercises.filter((e) => e.isRecord);
    if (recs.length) toast(`Récord en ${recs.map((e) => e.name.toLowerCase()).join(", ")}`, "record");
  }, [s, toast]);

  if (!s) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
        <T v="h2">No hay resumen para mostrar</T>
        <Button variant="primary" title="Ir a Progreso" onPress={() => router.replace("/progreso")} />
      </View>
    );
  }

  const save = () => {
    useWorkout.getState().setSummary(null);
    router.dismissTo("/progreso");
  };
  const discard = async () => {
    setBusy(true);
    try {
      await discardWorkout(s.sessionId);
      toast("Sesión descartada", "info");
      router.dismissTo("/entrenar");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const kpi = (label: string, value: string, unit?: string, accent?: boolean) => (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <T v="eyebrow">{label}</T>
      <T v="kpi" style={{ marginTop: 6, color: accent ? c.accentInk : c.fg }}>
        {value}
        {unit ? <T style={{ fontFamily: F.bold, fontSize: 18, color: c.muted }}> {unit}</T> : null}
      </T>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 22, paddingBottom: insets.bottom + 40 }}>
      <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 16, gap: 16 }}>
        <ViewHead eyebrow={`Sesión terminada · ${s.routineName}`} title="Buen trabajo" />
        <Grid cols={isDesktop ? 4 : 2}>
          {kpi("Duración", String(s.durationMin), "min")}
          {kpi("Series", String(s.setsCount))}
          {kpi("Volumen", thousands(s.volumeKg), "kg")}
          {kpi("Récords", String(s.recordsCount), undefined, true)}
        </Grid>
        <Card>
          <CardHead title="Qué sigue en cada ejercicio" right="doble progresión" />
          {s.exercises.map((e, i) => (
            <View key={e.exerciseId + i} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <T style={{ fontFamily: F.bold, flexShrink: 1 }}>{e.name}</T>
                {e.skipped ? (
                  <T v="small" muted>
                    saltado
                  </T>
                ) : (
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <T num style={{ fontFamily: F.semibold }}>
                      {e.scheme === "cardio" ? `${e.best?.reps ?? 0} min` : `${e.best && e.best.weightKg > 0 ? `${fk(e.best.weightKg)} kg` : "PC"} × ${e.best?.reps ?? 0}`}
                    </T>
                    {e.isRecord ? <Pill tone="solid">Récord</Pill> : null}
                    {e.calibration ? <Pill tone="bronze">Base</Pill> : null}
                  </View>
                )}
              </View>
              {!e.skipped ? (
                <>
                  {e.calibration ? (
                    <T v="small" muted num>
                      Prueba {fk(e.calibration.weightKg)} × {e.calibration.reps} (+{e.calibration.rir} en reserva) → 1RM estimado {fk(Math.round(e.calibration.e1rmKg * 2) / 2)} kg
                    </T>
                  ) : null}
                  <T v="small" muted num>
                    {e.sets.map((x) => (e.scheme === "cardio" ? `${x.reps} min` : `${x.weightKg > 0 ? fk(x.weightKg) : "PC"}×${x.reps}`)).join("  ·  ")}
                  </T>
                  {e.nextText ? (
                    <T v="small" style={{ color: e.reachedTop ? c.good : c.muted, fontFamily: e.reachedTop ? F.semibold : F.regular }}>
                      {e.reachedTop ? "Llegaste al tope. " : ""}
                      {e.nextText}
                    </T>
                  ) : null}
                </>
              ) : null}
            </View>
          ))}
        </Card>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button title="Descartar" onPress={discard} loading={busy} style={{ flex: 1 }} />
          <Button variant="primary" title="Guardar" onPress={save} style={{ flex: 2 }} />
        </View>
      </View>
    </ScrollView>
  );
}
