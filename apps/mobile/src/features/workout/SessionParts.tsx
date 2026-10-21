// Piezas de la sesión en curso, pensadas para no hacer scroll:
// tira de ejercicios (uno a la vez, como Fitbod) · tabla de series con "Anterior" y ✓ (como Hevy/Strong) ·
// panel inferior fijo con los steppers grandes y el botón de registrar.
import { calibrate, EQUIPMENT_NAME, fk, SCHEME_NAME, unitLabel, weightText, type LoadSuggestion } from "@lifemaxxing/core";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { IconCheck, IconChevron } from "../../components/icons";
import { platesText } from "../../components/plates";
import { Button, Stepper, T } from "../../components/ui";
import type { ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";
import { goToExercise, setCurrent, setRir, skipCurrentExercise, switchAlternative } from "./actions";
import { parseNum, repsStep, stepValue, weightStep, type Draft } from "./draft";
import { resolveRe, suggestionKey, type PlannedItem } from "./logic";

const shortName = (name: string) => {
  const words = name.split(" ");
  const links = new Set(["de", "del", "al", "a", "con", "en"]);
  const out: string[] = [];
  let n = 0;
  for (const w of words) {
    out.push(w);
    if (!links.has(w.toLowerCase())) n++;
    if (n >= 2) break;
  }
  return out.join(" ");
};

export const rowLabel = (it: PlannedItem) => (it.kind === "warmup" ? `C${it.k + 1}` : it.kind === "test" ? "P" : String(it.k + 1));

function itemLine(a: ActiveWorkout, it: PlannedItem): string {
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const target = `${it.lo === it.hi ? it.lo : `${it.lo}–${it.hi}`} ${it.unit === "reps" ? "reps" : unitLabel(it.unit)}`;
  if (it.kind === "warmup") return `Calentamiento ${it.k + 1} de ${it.n} · ${Math.round((it.pct ?? 0) * 100)} % · ${target}`;
  if (it.kind === "test") return `Serie de prueba · ${it.lo}–${it.hi} reps limpias, sin llegar al fallo`;
  if (ex.scheme === "rest_pause") return `${it.k === 0 ? "Activación" : `Mini-serie ${it.k} de ${it.n - 1}`} · ${target}`;
  return `Serie ${it.k + 1} de ${it.n} · ${target}${it.label && it.k === 0 ? ` · ${it.label}` : ""}`;
}

// ── Tira de ejercicios ──────────────────────────────────
export function ExerciseStrip({ a, curEi }: { a: ActiveWorkout; curEi: number }) {
  const { c } = useTheme();
  const ref = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}
      accessibilityRole="tablist"
      accessibilityLabel="Ejercicios de la sesión"
    >
      {a.routine.exercises.map((re, ei) => {
        const its = a.items.filter((x) => x.ei === ei);
        const done = its.length > 0 && its.every((x) => x.done || x.skip);
        const skipped = its.length > 0 && its.every((x) => x.skip && !x.done);
        const on = ei === curEi;
        const ex = resolveRe(re, !!a.useAlt[re.id]);
        const count = its.filter((x) => x.done && x.kind === "work").length;
        const total = its.filter((x) => x.kind === "work").length;
        return (
          <Pressable
            key={re.id}
            onPress={() => goToExercise(ei)}
            disabled={done || on}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${ex.exercise.name}, ${count} de ${total} series${done ? ", terminado" : ""}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 7,
              paddingHorizontal: 11,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? c.accent : c.line,
              backgroundColor: on ? c.accent : done ? c.surface2 : c.surface,
            }}
          >
            {done && !skipped ? (
              <IconCheck color={c.accent} size={14} />
            ) : (
              <T style={{ fontFamily: F.bold, fontSize: 12, color: on ? c.onAccent : c.muted }} num>
                {ei + 1}
              </T>
            )}
            <T
              style={{
                fontFamily: F.semibold,
                fontSize: 13,
                color: on ? c.onAccent : done ? c.muted : c.fg,
                textDecorationLine: skipped ? "line-through" : "none",
              }}
              numberOfLines={1}
            >
              {shortName(ex.exercise.name)}
            </T>
            {total ? (
              <T style={{ fontSize: 11, color: on ? c.onAccent : c.muted, opacity: 0.85 }} num>
                {count}/{total}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Encabezado del ejercicio ────────────────────────────
export function ExerciseHeader({ a, it }: { a: ActiveWorkout; it: PlannedItem }) {
  const { c } = useTheme();
  const [showCue, setShowCue] = useState(false);
  // "Saltar" pide un segundo toque (antes se saltaba el ejercicio entero sin querer).
  const [confirmSkip, setConfirmSkip] = useState(false);
  useEffect(() => {
    if (!confirmSkip) return;
    const t = setTimeout(() => setConfirmSkip(false), 3000);
    return () => clearTimeout(t);
  }, [confirmSkip]);
  useEffect(() => setConfirmSkip(false), [it.ei]);
  const re = a.routine.exercises[it.ei];
  const alt = !!a.useAlt[re.id];
  const ex = resolveRe(re, alt);
  const sug: LoadSuggestion | undefined = a.suggestions[suggestionKey(re, alt)];
  const canSwitch = !!re.alt && !a.items.some((x) => x.ei === it.ei && x.done);
  const firstWork = a.items.find((x) => x.ei === it.ei && x.kind === "work");
  const prev = sug?.lastSets[0];

  let hint: { text: string; tone: "up" | "muted" | "info" } | null = null;
  if (it.kind === "test") hint = { text: "Con esta serie la app estima tu 1RM y calcula el peso de todas tus series.", tone: "info" };
  else if (firstWork?.cal)
    hint = { text: `Cargas calculadas con tu 1RM estimado de ${fk(Math.round(firstWork.cal * 2) / 2)} kg.`, tone: "info" };
  else if (sug?.status === "progress" && prev && ex.scheme !== "cardio") {
    const up = sug.reachedTop && firstWork && firstWork.w > prev.weightKg;
    hint = up
      ? { text: `Llegaste al tope la última vez: hoy subes a ${weightText(ex, firstWork!.w)}.`, tone: "up" }
      : prev.weightKg > 0
        ? { text: `Última vez ${weightText(ex, prev.weightKg)} × ${prev.reps}: mismo peso, busca una rep más.`, tone: "muted" }
        : { text: `Última vez ${prev.reps} reps: busca una más en cada serie.`, tone: "muted" };
  } else if (sug?.status === "none" && ex.scheme !== "cardio" && ex.exercise.incrementKg > 0) {
    hint = { text: "Primera vez: elige un peso con el que llegues al rango con técnica limpia.", tone: "muted" };
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <T v="eyebrow" numberOfLines={1} style={{ flex: 1 }}>
          {[
            it.kind === "warmup" ? "Calentamiento" : SCHEME_NAME[ex.scheme],
            EQUIPMENT_NAME[ex.exercise.equipment],
            re.isAddition ? "añadido" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </T>
        <Pressable
          onPress={() => {
            if (confirmSkip) {
              setConfirmSkip(false);
              skipCurrentExercise();
            } else setConfirmSkip(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={confirmSkip ? "Confirmar: saltar este ejercicio" : "Saltar este ejercicio"}
          hitSlop={8}
          style={confirmSkip ? { backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 } : undefined}
        >
          <T style={{ fontFamily: F.semibold, fontSize: 13, color: confirmSkip ? c.onAccent : c.accentInk }}>{confirmSkip ? "¿Saltar? Toca otra vez" : "Saltar"}</T>
        </Pressable>
      </View>
      <T
        style={{ fontFamily: F.extrabold, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 }}
        numberOfLines={2}
        accessibilityRole="header"
      >
        {ex.exercise.name}
      </T>
      {hint ? (
        <T
          v="small"
          style={{
            color: hint.tone === "up" ? c.good : hint.tone === "info" ? c.accentInk : c.muted,
            fontFamily: hint.tone === "muted" ? F.regular : F.semibold,
          }}
        >
          {hint.text}
        </T>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
        <Pressable
          onPress={() => setShowCue((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showCue }}
          hitSlop={6}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
        >
          <T style={{ fontFamily: F.semibold, fontSize: 13, color: c.accentInk }}>Técnica</T>
          <IconChevron dir={showCue ? "up" : "down"} color={c.accentInk} size={14} />
        </Pressable>
        {canSwitch ? (
          <Pressable onPress={() => switchAlternative(it.ei, !alt)} accessibilityRole="button" hitSlop={6}>
            <T style={{ fontFamily: F.semibold, fontSize: 13, color: c.accentInk }} numberOfLines={1}>
              {alt ? `Volver a ${shortName(re.exercise.name).toLowerCase()}` : `Alternativa: ${shortName(re.alt!.name).toLowerCase()}`}
            </T>
          </Pressable>
        ) : null}
      </View>
      {showCue ? (
        <View style={{ backgroundColor: c.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
          <T v="small" style={{ fontSize: 14 }}>
            {ex.exercise.cue}
            {re.note && !alt ? ` ${re.note}` : ""}
          </T>
        </View>
      ) : null}
    </View>
  );
}

// ── Tabla de series ─────────────────────────────────────
export function SetList({
  a,
  curIdx,
  selIdx,
  draft,
  onSelectDone,
  onLog,
}: {
  a: ActiveWorkout;
  curIdx: number;
  selIdx: number | null;
  draft: Draft;
  onSelectDone: (idx: number | null) => void;
  onLog: () => void;
}) {
  const { c } = useTheme();
  const ei = a.items[curIdx].ei;
  const re = a.routine.exercises[ei];
  const alt = !!a.useAlt[re.id];
  const ex = resolveRe(re, alt);
  const sug = a.suggestions[suggestionKey(re, alt)];
  const cardio = ex.scheme === "cardio";
  const unit = ex.sets[0]?.unit;
  const rows = a.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.ei === ei);
  const col = { label: 30, prev: 74, check: 40 };

  const prevText = (it: PlannedItem) => {
    if (it.kind === "warmup") return `${Math.round((it.pct ?? 0) * 100)} %`;
    if (it.kind === "test") return "prueba";
    const p = sug?.lastSets[it.k];
    if (!p || !p.reps) return "—";
    return cardio ? `${p.reps} min` : `${p.weightKg > 0 ? fk(p.weightKg) : "PC"} × ${p.reps}`;
  };

  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: R, backgroundColor: c.surface, overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        }}
      >
        <T v="eyebrow" style={{ width: col.label }}>
          #
        </T>
        <T v="eyebrow" style={{ width: col.prev }}>
          Anterior
        </T>
        {!cardio ? (
          <T v="eyebrow" style={{ flex: 1, textAlign: "center" }}>
            Kg
          </T>
        ) : null}
        <T v="eyebrow" style={{ flex: 1, textAlign: "center" }}>
          {unit === "min" ? "Min" : unit === "sec" ? "Seg" : unit === "reps_per_side" ? "Reps/lado" : "Reps"}
        </T>
        <View style={{ width: col.check }} />
      </View>
      {rows.map(({ it, idx }) => {
        const current = idx === curIdx && selIdx === null;
        const selected = idx === selIdx;
        const active = current || selected;
        const pending = it.pending && !it.done;
        const w = active ? draft.w : fk(it.done?.w ?? it.w);
        const r = active ? draft.r : String(it.done?.r ?? it.r);
        const fg = it.done && !active ? c.muted : c.fg;
        const onPress = () => {
          if (it.done) onSelectDone(selected ? null : idx);
          else {
            onSelectDone(null);
            setCurrent(idx);
          }
        };
        return (
          <View
            key={it.key}
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 46,
              paddingRight: 10,
              borderTopWidth: 1,
              borderTopColor: c.line,
              backgroundColor: active ? c.accentSoft : "transparent",
              borderLeftWidth: 3,
              borderLeftColor: active ? c.accent : "transparent",
              opacity: it.skip && !it.done ? 0.4 : 1,
            }}
          >
            <Pressable
              onPress={onPress}
              disabled={current || (!!it.skip && !it.done)}
              accessibilityRole="button"
              accessibilityLabel={`Serie ${rowLabel(it)}: ${pending ? "pendiente de la prueba" : `${w} kg, ${r}`}${it.done ? ", registrada. Toca para corregir" : ""}`}
              accessibilityState={{ selected: active }}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", alignSelf: "stretch", paddingLeft: 7 }}
            >
              <T style={{ width: col.label - 3, fontFamily: F.bold, color: it.kind === "work" ? c.fg : c.muted }}>{rowLabel(it)}</T>
              <T v="small" num muted style={{ width: col.prev }} numberOfLines={1}>
                {prevText(it)}
              </T>
              {pending ? (
                <T v="small" muted style={{ flex: cardio ? 1 : 2, textAlign: "center" }}>
                  tras la prueba
                </T>
              ) : (
                <>
                  {!cardio ? (
                    <T
                      num
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontFamily: active ? F.extrabold : F.semibold,
                        fontSize: active ? 18 : 16,
                        color: active ? c.accentInk : fg,
                      }}
                    >
                      {parseNum(w) > 0 ? w : ex.exercise.equipment === "peso_corporal" ? "PC" : w}
                    </T>
                  ) : null}
                  <T
                    num
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontFamily: active ? F.extrabold : F.semibold,
                      fontSize: active ? 18 : 16,
                      color: active ? c.accentInk : fg,
                    }}
                  >
                    {active || it.done ? r : it.lo === it.hi ? String(it.lo) : `${it.lo}–${it.hi}`}
                  </T>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={current ? onLog : onPress}
              disabled={!!it.skip && !it.done}
              accessibilityRole="button"
              accessibilityLabel={
                it.done ? `Serie ${rowLabel(it)} registrada` : current ? `Registrar serie ${rowLabel(it)}` : `Ir a la serie ${rowLabel(it)}`
              }
              hitSlop={6}
              style={{
                width: 34,
                height: 34,
                marginLeft: 6,
                borderRadius: 17,
                borderWidth: 2,
                borderColor: it.done || current ? c.accent : c.line,
                backgroundColor: it.done ? c.accent : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {it.done ? <IconCheck color={c.onAccent} size={16} /> : current ? <IconCheck color={c.accent} size={16} /> : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ── Panel inferior fijo ─────────────────────────────────
export function Dock({
  a,
  it,
  editing,
  draft,
  setDraft,
  onLog,
  onSaveEdit,
  onCancelEdit,
  busy,
  bottomInset,
}: {
  a: ActiveWorkout;
  it: PlannedItem;
  editing: boolean;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onLog: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  busy: boolean;
  bottomInset: number;
}) {
  const { c } = useTheme();
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const cardio = ex.scheme === "cardio";
  const eq = ex.exercise.equipment;
  const w = parseNum(draft.w);
  const test = it.kind === "test" && !editing;
  const est = test ? calibrate(ex, { weightKg: w, reps: parseInt(draft.r, 10) || 0, rir: a.rir }) : null;
  const wLabel = eq === "mancuernas" ? "Kg por mano" : eq === "peso_corporal" ? "Lastre (kg)" : "Kg";
  const rLabel = it.unit === "min" ? "Minutos" : it.unit === "sec" ? "Segundos" : it.unit === "reps_per_side" ? "Reps por lado" : "Reps";
  const title = editing ? `Corregir serie ${rowLabel(it)}` : itemLine(a, it);
  const cta = editing
    ? "Guardar corrección"
    : test
      ? "Calcular mis cargas"
      : it.kind === "warmup"
        ? "Registrar calentamiento"
        : "Registrar serie";

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: bottomInset + 12,
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
      }}
    >
      <View style={{ width: "100%", maxWidth: 720, alignSelf: "center", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <T style={{ fontFamily: F.semibold, fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
            {title}
          </T>
          {eq === "barra" && w >= 20 ? (
            <T v="tiny" muted num numberOfLines={1}>
              {platesText(w)}
            </T>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {!cardio ? (
            <Stepper
              dense
              flex={1.45}
              label={wLabel}
              value={draft.w}
              onChangeText={(s) => setDraft({ ...draft, w: s })}
              onStep={(d) => setDraft({ ...draft, w: stepValue(draft.w, weightStep(ex), d) })}
            />
          ) : null}
          <Stepper
            dense
            label={rLabel}
            value={draft.r}
            keyboardType="number-pad"
            onChangeText={(s) => setDraft({ ...draft, r: s.replace(/[^0-9]/g, "") })}
            onStep={(d) => setDraft({ ...draft, r: stepValue(draft.r, repsStep(it), d) })}
          />
        </View>
        {test && est ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <T v="label" style={{ marginRight: 2 }}>
                Reserva
              </T>
              {[0, 1, 2, 3].map((v) => {
                const on = v === a.rir;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setRir(v)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${v === 3 ? "3 o más" : v} reps en reserva`}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: on ? c.accent : c.line,
                      backgroundColor: on ? c.accent : c.surface2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <T style={{ fontFamily: F.bold, color: on ? c.onAccent : c.fg }}>{v === 3 ? "3+" : v}</T>
                  </Pressable>
                );
              })}
            </View>
            <T v="small" num style={{ color: est.reliable ? c.accentInk : c.bad, fontFamily: F.semibold }}>
              1RM ≈ {fk(Math.round(est.e1rmKg * 2) / 2)} kg → series {est.loads.map(fk).join(" / ")} kg
              {est.reliable ? "" : " · fuera de 3–10 reps es menos fiable"}
            </T>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {editing ? <Button title="Cancelar" onPress={onCancelEdit} style={{ flex: 1 }} /> : null}
          <Button
            variant="primary"
            title={cta}
            loading={busy}
            onPress={editing ? onSaveEdit : onLog}
            icon={!editing && !test ? <IconCheck color={c.onAccent} size={20} /> : undefined}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </View>
  );
}
