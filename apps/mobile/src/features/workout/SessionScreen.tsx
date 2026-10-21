import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconChevron } from "../../components/icons";
import { RestBar, RestScreen } from "../../components/rest";
import { Sheet } from "../../components/sheet";
import { useToast } from "../../components/toast";
import { Button, Loading, T } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useWorkout, useWorkoutHydrated, type ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { discardWorkout, editDoneSet, finishWorkout, logSet, SessionGone, SyncPending, unskipAll } from "./actions";
import { draftFor, parseNum, type Draft } from "./draft";
import { nextPending, progress } from "./logic";
import { Dock, ExerciseHeader, ExerciseStrip, SetList } from "./SessionParts";

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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center", padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 12 }}>
          <T v="h2">{skipped && !doneWork ? "Saltaste todos los ejercicios" : skipped ? "No quedan series pendientes" : "Completaste todas las series"}</T>
          <T v="small" muted>
            {skipped ? "Puedes retomar los ejercicios que saltaste, terminar con lo que registraste o descartar la sesión." : "Termina para ver tu resumen y el próximo peso de cada ejercicio."}
          </T>
          {finishError ? (
            <T v="small" color={c.bad} accessibilityRole="alert">
              {finishError}
            </T>
          ) : null}
          {skipped ? <Button variant={doneWork ? "secondary" : "primary"} title="Retomar ejercicios saltados" onPress={() => unskipAll()} /> : null}
          {doneWork ? <Button variant="primary" title="Terminar y ver resumen" loading={busy} onPress={finish} /> : null}
          <Button variant="danger" title="Descartar sesión" disabled={busy} onPress={discard} />
          <Button variant="ghost" title="Volver a Entrenar" onPress={close} />
        </View>
      </View>
    );
  }

  const p = progress(a.items);
  const view = { ...a, i: idx };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ backgroundColor: c.hdr, borderBottomWidth: 1, borderBottomColor: c.line, paddingTop: insets.top }}>
        <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Minimizar la sesión" hitSlop={10} style={{ padding: 4 }}>
              <IconChevron dir="down" color={c.fg} size={22} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 21 }} numberOfLines={1}>
                {a.routine.name}
              </T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Clock startedAt={a.startedAt} />
                <T v="small" muted num>
                  · {p.done}/{p.total} series
                </T>
                {queue ? <T v="small" color={c.accentInk}>· {queue} por sincronizar</T> : null}
              </View>
            </View>
            <Button small title="Terminar" onPress={() => setConfirmEnd(true)} />
          </View>
          <View style={{ height: 4, backgroundColor: c.surface2, borderRadius: 2, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: p.total, now: p.done }}>
            <View style={{ height: 4, width: `${p.pct * 100}%`, backgroundColor: c.accent }} />
          </View>
        </View>
      </View>

      <View style={{ width: "100%", maxWidth: 720, alignSelf: "center" }}>
        <ExerciseStrip a={view} curEi={cur.ei} />
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 12 }}>
          <ExerciseHeader a={view} it={cur} />
          <SetList a={view} curIdx={idx} selIdx={editing} draft={draft} onSelectDone={setSel} onLog={onLog} />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 12, paddingBottom: 8, alignItems: "center" }}>
        <RestBar inline />
      </View>
      <Dock
        a={view}
        it={it}
        editing={editing !== null}
        draft={draft}
        setDraft={setDraft}
        onLog={onLog}
        onSaveEdit={onSaveEdit}
        onCancelEdit={() => setSel(null)}
        busy={busy}
        bottomInset={insets.bottom}
      />

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
      {/* Al registrar una serie el descanso tapa toda la sesión. */}
      <RestScreen />
    </View>
  );
}
