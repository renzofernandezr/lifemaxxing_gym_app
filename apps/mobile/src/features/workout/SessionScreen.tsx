import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconCheck, IconChevron } from "../../components/icons";
import { RestInline, SlideIn, Spotlight } from "../../components/rest";
import { Sheet } from "../../components/sheet";
import { useToast } from "../../components/toast";
import { Button, Loading, T } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { skipRest } from "../../lib/rest";
import { tap } from "../../lib/haptics";
import { useWorkout, useWorkoutHydrated, type ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { discardWorkout, editDoneSet, finishWorkout, logSet, SessionGone, SyncPending, unskipAll } from "./actions";
import { draftFor, parseNum, type Draft } from "./draft";
import { nextPending, progress } from "./logic";
import { ExercisesSheet, ExerciseProgress, Pill as FocusPill, SetDots, SetFocus, TechniqueSheet } from "./Focus";

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
  const insets = useSafeAreaInsets();
  const toast = useToast();
  // -1 = no queda nada pendiente: se muestra "Completaste todas las series".
  const idx = a.items[a.i] && !a.items[a.i].done && !a.items[a.i].skip ? a.i : nextPending(a.items, a.i);
  const cur = idx >= 0 ? a.items[idx] : undefined;
  // Serie ya registrada que se está corrigiendo (se elige tocándola en la tabla).
  const [sel, setSel] = useState<number | null>(null);
  const editing = sel !== null && !!a.items[sel]?.done && a.items[sel].ei === cur?.ei ? sel : null;
  const it = editing !== null ? a.items[editing] : cur;
  const [draft, setDraft] = useState<Draft>(() => (it ? draftFor(it) : { key: "", w: "0", r: "0" }));
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const queue = useWorkout((s) => s.queue.length);
  // El descanso ocupa el lugar de la serie: es un paso más de la secuencia (serie → descanso → serie).
  const rest = useWorkout((s) => s.rest);
  const [restOver, setRestOver] = useState(false);
  useEffect(() => {
    setRestOver(false);
    if (!rest) return;
    const t = setTimeout(() => setRestOver(true), Math.max(0, rest.endAt - Date.now()));
    return () => clearTimeout(t);
  }, [rest]);
  const [sheet, setSheet] = useState<"exercises" | "technique" | null>(null);

  // Al cambiar de serie (o al elegir una para corregir), el panel toma sus valores.
  useEffect(() => {
    if (it && draft.key !== it.key) setDraft(draftFor(it));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it?.key]);
  // Si se replanifica el peso de la serie actual (cambio en una serie previa), reflejarlo.
  useEffect(() => {
    if (it && draft.key === it.key && !it.done) setDraft((d) => ({ ...d, w: draftFor(it).w }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it?.w]);
  // Al pasar a otro ejercicio se cancela la corrección.
  useEffect(() => setSel(null), [cur?.ei]);

  const finish = async () => {
    setBusy(true);
    setFinishError(null);
    try {
      await finishWorkout();
    } catch (err) {
      if (err instanceof SessionGone) {
        toast(err.message, "info");
        return;
      }
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

  const readDraft = () => ({ w: parseNum(draft.w), r: parseInt(draft.r, 10) || 0 });

  const discard = async () => {
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
  };

  const onLog = async () => {
    if (!cur || busy) return;
    const { w, r } = readDraft();
    if (r <= 0) {
      toast("Escribe cuántas reps hiciste", "error");
      return;
    }
    const res = await logSet(idx, w, r);
    if (res?.finished) await finish();
  };

  const onSaveEdit = () => {
    if (editing === null) return;
    const { w, r } = readDraft();
    editDoneSet(editing, w, r);
    setSel(null);
    toast("Serie corregida", "info");
  };

  if (!cur || !it) {
    // No queda nada pendiente: porque se hizo todo o porque se saltaron ejercicios.
    const doneWork = a.items.some((x) => x.done && x.kind === "work");
    const skipped = a.items.some((x) => x.skip && !x.done);
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          justifyContent: "center",
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 12 }}>
          <T v="h2">
            {skipped && !doneWork
              ? "Saltaste todos los ejercicios"
              : skipped
                ? "No quedan series pendientes"
                : "Completaste todas las series"}
          </T>
          <T v="small" muted>
            {skipped
              ? "Puedes retomar los ejercicios que saltaste, terminar con lo que registraste o descartar la sesión."
              : "Termina para ver tu resumen y el próximo peso de cada ejercicio."}
          </T>
          {finishError ? (
            <T v="small" color={c.bad} accessibilityRole="alert">
              {finishError}
            </T>
          ) : null}
          {skipped ? (
            <Button variant={doneWork ? "secondary" : "primary"} title="Retomar ejercicios saltados" onPress={() => unskipAll()} />
          ) : null}
          {doneWork ? <Button variant="primary" title="Terminar y ver resumen" loading={busy} onPress={finish} /> : null}
          <Button variant="danger" title="Descartar sesión" disabled={busy} onPress={discard} />
          <Button variant="ghost" title="Volver a Entrenar" onPress={close} />
        </View>
      </View>
    );
  }

  const p = progress(a.items);
  const view = { ...a, i: idx };
  const resting = !!rest && editing === null;
  const cta =
    editing !== null ? "Guardar" : resting ? (restOver ? "Empezar siguiente serie" : "Saltar descanso") : it.kind === "test" ? "Calcular mis cargas" : "Hecho";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Spotlight />
      <View style={{ paddingTop: insets.top }}>
        <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 16, paddingTop: 6, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => {
                tap();
                close();
              }}
              accessibilityRole="button"
              accessibilityLabel="Minimizar la sesión"
              hitSlop={10}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.surface2 }}
            >
              <IconChevron dir="down" color={c.fg} size={20} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0, alignItems: "center" }}>
              <T style={{ fontFamily: F.bold, fontSize: 16 }} numberOfLines={1}>
                {a.routine.name}
              </T>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Clock startedAt={a.startedAt} />
                {queue ? <T v="small" color={c.accentInk}>· {queue} sin sincronizar</T> : null}
              </View>
            </View>
            <Pressable
              onPress={() => {
                tap();
                setConfirmEnd(true);
              }}
              accessibilityRole="button"
              hitSlop={10}
              style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.surface2 }}
            >
              <T style={{ fontFamily: F.semibold, fontSize: 14 }}>Terminar</T>
            </Pressable>
          </View>
          <ExerciseProgress a={view} curEi={cur.ei} onOpen={() => setSheet("exercises")} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
          {resting ? (
            <SlideIn key="rest">
              <RestInline />
            </SlideIn>
          ) : (
            <SlideIn key={editing !== null ? `edit-${it.key}` : it.key}>
              <SetFocus a={view} it={it} editing={editing !== null} draft={draft} setDraft={setDraft} />
            </SlideIn>
          )}
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 4 }}>
        <View style={{ width: "100%", maxWidth: 520, alignSelf: "center", gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {editing !== null ? <Button title="Cancelar" onPress={() => setSel(null)} style={{ flex: 1, minHeight: 64, borderRadius: 20 }} /> : null}
            <Button
              variant="primary"
              title={cta}
              loading={busy}
              onPress={editing !== null ? onSaveEdit : resting ? () => skipRest() : onLog}
              icon={editing === null && !resting && it.kind !== "test" ? <IconCheck color={c.onAccent} size={24} /> : undefined}
              style={{
                flex: 2,
                minHeight: 64,
                borderRadius: 20,
                shadowColor: c.accent,
                shadowOpacity: 0.35,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            />
          </View>
          <SetDots a={view} curIdx={idx} selIdx={editing} onSelectDone={setSel} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <FocusPill title="Ejercicios" onPress={() => setSheet("exercises")} />
            <FocusPill title="Técnica" onPress={() => setSheet("technique")} />
          </View>
        </View>
      </View>

      <ExercisesSheet a={view} curEi={cur.ei} open={sheet === "exercises"} onClose={() => setSheet(null)} />
      <TechniqueSheet a={view} it={cur} open={sheet === "technique"} onClose={() => setSheet(null)} />

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
        <Button variant="danger" title="Descartar sesión" disabled={busy} onPress={discard} />
        <T v="tiny" muted style={{ fontFamily: F.medium }}>
          Descartar borra la sesión del historial y de tus estadísticas.
        </T>
      </Sheet>
    </View>
  );
}
