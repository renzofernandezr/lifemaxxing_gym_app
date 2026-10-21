import { fk, routineName, SCHEME_NAME, EQUIPMENT_NAME, setsText, type RoutineDTO, type RoutineKey, type TodayResponse } from "@lifemaxxing/core";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useToast } from "../../components/toast";
import { Button, Card, CardHead, Empty, ErrorBox, Loading, Pill, Screen, T, useLayout, ViewHead } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToday } from "../../lib/queries";
import { useWorkout, useWorkoutHydrated } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";
import { discardWorkout, resumeFromServer, StartConflict, startWorkout } from "./actions";
import { needsCalibration } from "./logic";

export function TrainScreen() {
  const today = useToday();
  const hydrated = useWorkoutHydrated();
  const active = useWorkout((s) => s.active);
  if (!hydrated || today.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (today.error || !today.data) {
    return (
      <Screen>
        <ViewHead title="Entrenar" />
        <ErrorBox error={today.error} onRetry={() => today.refetch()} />
      </Screen>
    );
  }
  return <Preview t={today.data} activeLocal={active?.sessionId ?? null} />;
}

function Preview({ t, activeLocal }: { t: TodayResponse; activeLocal: string | null }) {
  const { c } = useTheme();
  const { me } = useAuth();
  const toast = useToast();
  const { width } = useLayout();
  const [key, setKey] = useState<RoutineKey>(t.suggestedKey);
  const [calibrate, setCalibrate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  useEffect(() => setKey(t.suggestedKey), [t.suggestedKey]);

  const routine = t.routines.find((r) => r.key === key) as RoutineDTO;
  const pos = t.position;
  const nx = t.next;
  const needsCal = useMemo(() => routine?.exercises.some((re) => needsCalibration(re, t.suggestions[re.id], true)) ?? false, [routine, t.suggestions]);
  const serverActive = t.activeSession && t.activeSession.id !== activeLocal ? t.activeSession : null;
  const pendingId = activeLocal ?? serverActive?.id ?? conflict;

  const start = async () => {
    setBusy(true);
    try {
      await startWorkout(routine, t.suggestions, calibrate && needsCal, me?.profile.timezone ?? "America/Lima");
    } catch (err) {
      if (err instanceof StartConflict) setConflict(err.activeSessionId);
      else toast(err instanceof ApiError && err.isNetwork ? "Necesitas conexión para empezar el entrenamiento" : (err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const resume = async (id: string) => {
    if (activeLocal === id) return router.push("/entrenar/sesion");
    setBusy(true);
    try {
      await resumeFromServer(id);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const discard = async (id: string) => {
    setBusy(true);
    try {
      const r = await discardWorkout(id, { onlyInProgress: true });
      setConflict(null);
      toast(r === "finished" ? "Ese entreno ya estaba terminado: quedó en tu historial" : "Sesión descartada", "info");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const dayLabel = pos.beforeStart ? `Empieza el ${me?.profile.programStartDate ?? ""}` : `Semana ${Math.max(1, pos.week)} · ${pos.dayName}`;
  const cols = width < 480;
  const totalSets = routine ? routine.exercises.reduce((n, re) => n + re.sets.length + (calibrate && needsCalibration(re, t.suggestions[re.id], true) ? 1 : 0), 0) : 0;
  const todayLine = pos.routineKey
    ? null
    : `Hoy: descanso activo, camina 40–60 min. Próximo: ${nx.dayName}, ${routineName(nx.routineKey ?? "A")}.`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomPad={24}>
        <ViewHead eyebrow={dayLabel} title="Entrenar" />

        {pendingId ? (
          <Card style={{ gap: 12, borderColor: c.accent, borderWidth: 2 }}>
            <Pill tone="solid">En curso</Pill>
            <T v="h3">{activeLocal ? "Tienes un entrenamiento sin terminar" : "Hay un entrenamiento en curso"}</T>
            <T v="small" muted>
              {activeLocal ? "Tus series están guardadas en este dispositivo. Retómalo donde lo dejaste." : "Se empezó en otro dispositivo o se cerró la app. Puedes retomarlo aquí o descartarlo."}
            </T>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button variant="primary" small title="Reanudar" loading={busy} onPress={() => resume(pendingId)} style={{ flexGrow: 1 }} />
              <Button small title="Descartar" disabled={busy} onPress={() => discard(pendingId)} />
            </View>
          </Card>
        ) : null}

        <View style={{ gap: 8 }}>
          {todayLine ? (
            <T v="small" muted>
              {todayLine}
            </T>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Elige la sesión">
            {t.routines.map((r) => {
              const on = r.key === key;
              const isNext = r.key === (pos.routineKey ?? nx.routineKey);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setKey(r.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flex: 1, minWidth: 0, borderWidth: 1.5, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.surface, borderRadius: R, paddingVertical: 10, paddingHorizontal: cols ? 10 : 14, gap: 2 }}
                >
                  <T style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: c.accentInk, opacity: isNext ? 1 : 0 }}>
                    {pos.routineKey ? "Hoy" : "Próxima"}
                  </T>
                  <T style={{ fontFamily: F.bold, fontSize: cols ? 15 : 18, lineHeight: cols ? 18 : 22 }} numberOfLines={1}>
                    {cols && r.key === "C" ? "Cardio" : r.name}
                  </T>
                  <T style={{ fontSize: 12, lineHeight: 15, color: c.muted }} numberOfLines={1}>
                    {r.focus}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>

        {needsCal ? (
          <Pressable
            onPress={() => setCalibrate((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: calibrate }}
            style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: R, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <T style={{ fontFamily: F.bold, fontSize: 14 }}>Primera sesión: calibrar cargas</T>
              <T v="small" muted>
                Una serie de prueba en cada básico calcula el peso de todas tus series.
              </T>
            </View>
            <Switch value={calibrate} onValueChange={setCalibrate} trackColor={{ true: c.accent, false: c.line }} thumbColor="#fff" accessibilityElementsHidden />
          </Pressable>
        ) : null}

        {routine ? (
          <Card pad={14}>
            <CardHead title={routine.name} right={routine.focus} />
            {routine.exercises.map((re, i) => {
              const sug = t.suggestions[re.id];
              const cal = calibrate && needsCalibration(re, sug, true);
              const loads = sug?.weights && sug.weights.some((w) => w > 0) && re.scheme !== "cardio" ? sug.weights : null;
              return (
                <View key={re.id} style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <T v="tiny" muted style={{ width: 20 }} num>
                    {String(i + 1).padStart(2, "0")}
                  </T>
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <T style={{ fontFamily: F.bold, fontSize: 14 }} numberOfLines={1}>
                      {re.exercise.name}
                    </T>
                    <T v="small" num numberOfLines={1} style={{ color: cal ? c.bronze : loads && sug?.reachedTop ? c.good : c.muted, fontFamily: cal || loads ? F.medium : F.regular }}>
                      {cal
                        ? "+ serie de prueba"
                        : loads
                          ? `${sug?.reachedTop ? "↑ " : ""}${loads.map(fk).join(" · ")} kg${re.exercise.equipment === "mancuernas" ? " por mano" : ""}`
                          : `${SCHEME_NAME[re.scheme]} · ${EQUIPMENT_NAME[re.exercise.equipment]}${re.isAddition ? " · añadido" : ""}`}
                    </T>
                  </View>
                  <T v="small" num style={{ fontFamily: F.medium, color: c.muted, textAlign: "right" }}>
                    {setsText(re)}
                  </T>
                </View>
              );
            })}
          </Card>
        ) : (
          <Empty title="Sin rutina" text="No encontré la rutina de hoy." />
        )}
      </Screen>

      <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 6 }}>
          {routine ? (
            <T v="small" muted center num>
              {routine.name} · {routine.exercises.length} ejercicios · {totalSets} series
            </T>
          ) : null}
          <Button variant="primary" title="Empezar entrenamiento" loading={busy} disabled={!!pendingId || !routine} onPress={start} />
        </View>
      </View>
    </View>
  );
}
