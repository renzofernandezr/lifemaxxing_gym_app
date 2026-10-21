import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconChevron } from "../../components/icons";
import { RestBar } from "../../components/rest";
import { Sheet } from "../../components/sheet";
import { useToast } from "../../components/toast";
import { Button, Loading, T, useLayout } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { setRestExpanded } from "../../lib/rest";
import { useWorkout, useWorkoutHydrated, type ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F, MAX_WIDTH } from "../../theme/tokens";
import { discardWorkout, finishWorkout, logSet, skipCurrentExercise, SyncPending } from "./actions";
import { CurrentCard } from "./CurrentCard";
import { draftFor, parseNum, type Draft } from "./draft";
import { nextPending, progress } from "./logic";
import { ExerciseList, SetsTable } from "./SetsTable";

const close = () => (router.canGoBack() ? router.back() : router.replace("/entrenar"));

export function SessionScreen() {
  const hydrated = useWorkoutHydrated();
  const active = useWorkout((s) => s.active);
  const { c } = useTheme();
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>
        <Loading />
      </View>
    );
  }
  if (!active) return <NoSession />;
  return <Live a={active} />;
}

function NoSession() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 }}>
      <T v="h2">No hay un entrenamiento en curso</T>
      <Button variant="primary" title="Ir a Entrenar" onPress={() => router.replace("/entrenar")} />
    </View>
  );
}

function Clock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <T v="small" muted num>
      {h ? `${h}:` : ""}
      {mm}:{ss} en sesión
    </T>
  );
}

function Live({ a }: { a: ActiveWorkout }) {
  useKeepAwake("lmx-session");
  const { c } = useTheme();
  const { width } = useLayout();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  // -1 = no queda nada pendiente: se muestra "Completaste todas las series".
  const idx = a.items[a.i] && !a.items[a.i].done && !a.items[a.i].skip ? a.i : nextPending(a.items, a.i);
  const it = idx >= 0 ? a.items[idx] : undefined;
  const [draft, setDraft] = useState<Draft>(() => (it ? draftFor(it) : { key: "", w: "0", r: "0" }));
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const queue = useWorkout((s) => s.queue.length);

  // Al cambiar de serie, la tarjeta toma los valores planificados de la nueva.
  useEffect(() => {
    if (it && draft.key !== it.key) setDraft(draftFor(it));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it?.key]);
  // Si se replanifica el peso de la serie actual (cambio en una serie previa), reflejarlo.
  useEffect(() => {
    if (it && draft.key === it.key && !it.done) setDraft((d) => ({ ...d, w: draftFor(it).w }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it?.w]);

  const finish = async () => {
    setBusy(true);
    setFinishError(null);
    try {
      await finishWorkout();
    } catch (err) {
      const msg =
        err instanceof SyncPending
          ? err.message
          : err instanceof ApiError && err.code === "empty_session"
            ? "No registraste ninguna serie. Descarta la sesión si no entrenaste."
            : err instanceof ApiError && err.isNetwork
              ? "Sin conexión. Tus series están guardadas: termina cuando vuelva la red."
              : (err as Error).message;
      setFinishError(msg);
      setConfirmEnd(true);
    } finally {
      setBusy(false);
    }
  };

  const onLog = async () => {
    if (!it || busy) return;
    const w = parseNum(draft.w);
    const r = parseInt(draft.r, 10) || 0;
    if (r <= 0) {
      toast("Escribe cuántas reps hiciste", "error");
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const res = await logSet(idx, w, r);
    if (res?.calibration) setRestExpanded(true);
    if (res?.finished) await finish();
  };

  if (!it) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 }}>
        <T v="h2">Completaste todas las series</T>
        <Button variant="primary" title="Ver resumen" loading={busy} onPress={finish} />
        {finishError ? <T v="small" color={c.bad}>{finishError}</T> : null}
      </View>
    );
  }

  const p = progress(a.items);
  const twoCols = width >= 920;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.hdr, borderBottomWidth: 1, borderBottomColor: c.line, paddingTop: insets.top }}>
        <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Minimizar la sesión" hitSlop={10} style={{ padding: 4 }}>
              <IconChevron dir="down" color={c.fg} size={22} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="eyebrow" numberOfLines={1}>
                {a.routine.focus}
              </T>
              <T v="h2" numberOfLines={1}>
                {a.routine.name}
              </T>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Clock startedAt={a.startedAt} />
              {queue ? <T v="tiny" color={c.accentInk}>{queue} por sincronizar</T> : null}
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: c.surface2, borderRadius: 3, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: p.total, now: p.done }}>
            <View style={{ height: 6, width: `${p.pct * 100}%`, backgroundColor: c.accent }} />
          </View>
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        <View style={{ width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", padding: 16, gap: 16, flexDirection: twoCols ? "row" : "column", alignItems: twoCols ? "flex-start" : "stretch" }}>
          <View style={{ flex: twoCols ? 1.35 : undefined, gap: 16, minWidth: 0 }}>
            <CurrentCard a={a} it={it} draft={draft} setDraft={setDraft} onLog={onLog} busy={busy} />
            <SetsTable a={{ ...a, i: idx }} draft={draft} setDraft={setDraft} onLog={onLog} />
          </View>
          <View style={{ flex: twoCols ? 1 : undefined, gap: 12, minWidth: 0 }}>
            <ExerciseList a={{ ...a, i: idx }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <Button
                title="Saltar ejercicio"
                onPress={() => {
                  if (skipCurrentExercise()) setConfirmEnd(true);
                }}
              />
              <Button title="Terminar ya" onPress={() => setConfirmEnd(true)} />
            </View>
          </View>
        </View>
      </ScrollView>
      <RestBar bottom={insets.bottom + 12} />
      <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="¿Terminar el entrenamiento?">
        <T v="small" muted>
          Llevas {p.done} de {p.total} series. Las que faltan quedan sin hacer y verás el resumen con lo que registraste.
        </T>
        {finishError ? (
          <T v="small" color={c.bad} accessibilityRole="alert">
            {finishError}
          </T>
        ) : null}
        <Button variant="primary" title="Terminar y ver resumen" loading={busy} onPress={finish} />
        <Button title="Seguir entrenando" onPress={() => setConfirmEnd(false)} />
        <Button
          variant="danger"
          title="Descartar sesión"
          disabled={busy}
          onPress={async () => {
            try {
              const r = await discardWorkout(a.sessionId, { onlyInProgress: true });
              setConfirmEnd(false);
              if (r === "finished") toast("Ese entreno ya estaba terminado: quedó en tu historial", "info");
              else {
                toast("Sesión descartada", "info");
                router.dismissTo("/entrenar");
              }
            } catch (err) {
              setFinishError((err as Error).message);
            }
          }}
        />
        <T v="tiny" muted style={{ fontFamily: F.medium }}>
          Descartar borra la sesión del historial y de tus estadísticas.
        </T>
      </Sheet>
    </View>
  );
}
