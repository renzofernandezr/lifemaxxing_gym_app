// Sesión "una serie a la vez" (estilo Fitbod / Apple Fitness): solo la serie actual en grande,
// el resto (lista de ejercicios, técnica, alternativa) en hojas inferiores.
import { calibrate, EQUIPMENT_NAME, fk, SCHEME_NAME, setsText, weightText, type LoadSuggestion } from "@lifemaxxing/core";
import { Platform, Pressable, TextInput, View, type TextStyle } from "react-native";
import { IconCheck, IconMinus, IconPlus } from "../../components/icons";
import { platesText } from "../../components/plates";
import { Sheet } from "../../components/sheet";
import { Button, T } from "../../components/ui";
import { tap } from "../../lib/haptics";
import type { ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { goToExercise, setCurrent, setRir, switchAlternative, unskipAll } from "./actions";
import { parseNum, repsStep, stepValue, weightStep, type Draft } from "./draft";
import { resolveRe, suggestionKey, type PlannedItem } from "./logic";

export const shortName = (name: string) => {
  const links = new Set(["de", "del", "al", "a", "con", "en"]);
  const out: string[] = [];
  let n = 0;
  for (const w of name.split(" ")) {
    out.push(w);
    if (!links.has(w.toLowerCase())) n++;
    if (n >= 2) break;
  }
  return out.join(" ");
};

const exOf = (a: ActiveWorkout, it: PlannedItem) => {
  const re = a.routine.exercises[it.ei];
  const alt = !!a.useAlt[re.id];
  return { re, alt, ex: resolveRe(re, alt) };
};

// ── Puntos de progreso por ejercicio ───────────────────
export function ExerciseProgress({ a, curEi, onOpen }: { a: ActiveWorkout; curEi: number; onOpen: () => void }) {
  const { c } = useTheme();
  const n = a.routine.exercises.length;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Ejercicio ${curEi + 1} de ${n}. Ver todos`} style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {a.routine.exercises.map((re, ei) => {
          const its = a.items.filter((x) => x.ei === ei);
          const done = its.length > 0 && its.every((x) => x.done || x.skip);
          const on = ei === curEi;
          return <View key={re.id} style={{ flex: on ? 2 : 1, height: 5, borderRadius: 3, backgroundColor: done ? c.accent : on ? c.accentInk : c.line, opacity: done && !on ? 0.55 : 1 }} />;
        })}
      </View>
      <T v="tiny" muted>
        Ejercicio {curEi + 1} de {n}
      </T>
    </Pressable>
  );
}

// ── Número grande con − y + ────────────────────────────
function RoundBtn({ dir, onPress, label }: { dir: -1 | 1; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: pressed ? c.line : c.surface2,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {dir < 0 ? <IconMinus color={c.fg} size={22} /> : <IconPlus color={c.fg} size={22} />}
    </Pressable>
  );
}

export function BigValue({
  value,
  unit,
  onChangeText,
  onStep,
  label,
  decimal = true,
}: {
  value: string;
  unit: string;
  onChangeText: (s: string) => void;
  onStep: (d: -1 | 1) => void;
  label: string;
  decimal?: boolean;
}) {
  const { c, scheme } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: c.surface,
        borderRadius: 22,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: c.line,
        shadowColor: "#000",
        shadowOpacity: scheme === "dark" ? 0.3 : 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      }}
    >
      <RoundBtn dir={-1} onPress={() => onStep(-1)} label={`Menos ${label}`} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={decimal ? "decimal-pad" : "number-pad"}
          selectTextOnFocus
          accessibilityLabel={label}
          style={[
            { fontFamily: F.extrabold, fontSize: 52, color: c.fg, textAlign: "right", minWidth: 40, padding: 0, fontVariant: ["tabular-nums"] },
            Platform.OS === "web" ? ({ outlineStyle: "none", width: `${Math.max(1, value.length) + 0.3}ch` } as unknown as TextStyle) : null,
          ]}
        />
        <T style={{ fontFamily: F.bold, fontSize: 17, color: c.muted }}>{unit}</T>
      </View>
      <RoundBtn dir={1} onPress={() => onStep(1)} label={`Más ${label}`} />
    </View>
  );
}

// ── Contenido central de la serie ──────────────────────
export function SetFocus({ a, it, editing, draft, setDraft }: { a: ActiveWorkout; it: PlannedItem; editing: boolean; draft: Draft; setDraft: (d: Draft) => void }) {
  const { c } = useTheme();
  const { re, alt, ex } = exOf(a, it);
  const sug: LoadSuggestion | undefined = a.suggestions[suggestionKey(re, alt)];
  const cardio = ex.scheme === "cardio";
  const eq = ex.exercise.equipment;
  const test = it.kind === "test" && !editing;
  const w = parseNum(draft.w);

  const setLine = editing
    ? `Corrigiendo la serie ${it.kind === "warmup" ? `de calentamiento ${it.k + 1}` : it.k + 1}`
    : it.kind === "warmup"
      ? `Calentamiento ${it.k + 1} de ${it.n} · ${Math.round((it.pct ?? 0) * 100)} %`
      : it.kind === "test"
        ? "Serie de prueba"
        : ex.scheme === "rest_pause"
          ? it.k === 0
            ? "Serie de activación"
            : `Mini-serie ${it.k} de ${it.n - 1}`
          : `Serie ${it.k + 1} de ${it.n}`;
  const target = it.kind === "test" ? `${it.lo}–${it.hi} reps limpias` : `${it.lo === it.hi ? it.lo : `${it.lo}–${it.hi}`} ${it.unit === "min" ? "min" : it.unit === "sec" ? "s" : it.unit === "reps_per_side" ? "reps por lado" : "reps"}`;

  // Una sola pista, la más útil.
  const prev = sug?.lastSets[it.k];
  let hint: { text: string; good?: boolean } | null = null;
  if (test) hint = { text: "Sin llegar al fallo. Con esta serie se calculan todas tus cargas." };
  else if (it.cal && it.kind === "work") hint = { text: `Calculado con tu 1RM estimado de ${fk(Math.round(it.cal * 2) / 2)} kg` };
  else if (it.kind === "warmup") hint = { text: "Ligero: solo prepara el movimiento." };
  else if (prev && prev.reps > 0 && !cardio) {
    const up = it.w > prev.weightKg;
    hint = up
      ? { text: `Última vez ${weightText(ex, prev.weightKg)} × ${prev.reps} · hoy subes ${fk(it.w - prev.weightKg)} kg`, good: true }
      : { text: `Última vez ${prev.weightKg > 0 ? `${weightText(ex, prev.weightKg)} × ` : ""}${prev.reps}${prev.weightKg > 0 ? "" : " reps"} · busca una más` };
  }
  const est = test ? calibrate(ex, { weightKg: w, reps: parseInt(draft.r, 10) || 0, rir: a.rir }) : null;
  const wUnit = eq === "mancuernas" ? "kg c/u" : eq === "peso_corporal" ? "kg lastre" : "kg";
  const rUnit = it.unit === "min" ? "min" : it.unit === "sec" ? "s" : "reps";

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <T
          center
          numberOfLines={1}
          style={{ fontFamily: F.bold, fontSize: 14, lineHeight: 18, letterSpacing: 1.1, textTransform: "uppercase", color: it.kind === "warmup" ? c.bronze : c.accentInk }}
        >
          {[it.kind === "warmup" ? "Calentamiento" : it.kind === "test" ? "Serie de prueba" : SCHEME_NAME[ex.scheme], EQUIPMENT_NAME[eq]].join(" · ")}
        </T>
        <T center numberOfLines={2} accessibilityRole="header" style={{ fontFamily: F.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 }}>
          {ex.exercise.name}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <T style={{ fontFamily: F.semibold, fontSize: 15, color: editing ? c.accentInk : c.fg }}>{setLine}</T>
          <View style={{ backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <T style={{ fontFamily: F.bold, fontSize: 13, color: c.accentInk }} num>
              {target}
            </T>
          </View>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {!cardio ? (
          <BigValue
            label="peso"
            unit={wUnit}
            value={draft.w}
            onChangeText={(s) => setDraft({ ...draft, w: s })}
            onStep={(d) => setDraft({ ...draft, w: stepValue(draft.w, weightStep(ex), d) })}
          />
        ) : null}
        <BigValue
          label={rUnit === "reps" ? "repeticiones" : rUnit === "min" ? "minutos" : "segundos"}
          unit={rUnit}
          decimal={false}
          value={draft.r}
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
                  onPress={() => {
                    tap();
                    setRir(v);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${v === 3 ? "3 o más" : v} reps en reserva`}
                  style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: on ? c.accent : c.surface2, alignItems: "center", justifyContent: "center" }}
                >
                  <T style={{ fontFamily: F.bold, color: on ? c.onAccent : c.fg }}>{v === 3 ? "3+" : v}</T>
                </Pressable>
              );
            })}
          </View>
          <T v="small" center num style={{ color: est.reliable ? c.accentInk : c.bad, fontFamily: F.semibold }}>
            1RM ≈ {fk(Math.round(est.e1rmKg * 2) / 2)} kg → {est.loads.map(fk).join(" / ")} kg
          </T>
        </View>
      ) : hint ? (
        <T v="small" center style={{ color: hint.good ? c.good : c.muted, fontFamily: hint.good ? F.semibold : F.regular }}>
          {hint.text}
        </T>
      ) : null}
      {eq === "barra" && w >= 20 ? (
        <T v="tiny" muted center num>
          Barra 20 kg · {platesText(w)}
        </T>
      ) : null}
    </View>
  );
}

// ── Puntos de las series del ejercicio ─────────────────
export function SetDots({ a, curIdx, selIdx, onSelectDone }: { a: ActiveWorkout; curIdx: number; selIdx: number | null; onSelectDone: (i: number | null) => void }) {
  const { c } = useTheme();
  const ei = a.items[curIdx].ei;
  const rows = a.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.ei === ei);
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 }} accessibilityRole="tablist" accessibilityLabel="Series del ejercicio">
      {rows.map(({ it, idx }) => {
        const warm = it.kind !== "work";
        const size = warm ? 12 : 16;
        const active = selIdx === idx || (selIdx === null && idx === curIdx);
        const done = !!it.done;
        return (
          <Pressable
            key={it.key}
            onPress={() => {
              tap();
              if (done) onSelectDone(selIdx === idx ? null : idx);
              else if (!it.skip) {
                onSelectDone(null);
                setCurrent(idx);
              }
            }}
            hitSlop={8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${warm ? (it.kind === "test" ? "Serie de prueba" : `Calentamiento ${it.k + 1}`) : `Serie ${it.k + 1}`}${done ? `, ${fk(it.done!.w)} kg × ${it.done!.r}. Toca para corregir` : ""}`}
            style={{
              width: size + (active ? 8 : 0),
              height: size + (active ? 8 : 0),
              borderRadius: 99,
              borderWidth: active ? 3 : done ? 0 : 2,
              borderColor: active ? c.accent : c.line,
              backgroundColor: done ? c.accent : active ? c.surface : "transparent",
              opacity: it.skip && !done ? 0.35 : 1,
            }}
          />
        );
      })}
    </View>
  );
}

// ── Hojas: ejercicios y técnica ────────────────────────
export function ExercisesSheet({ a, curEi, open, onClose }: { a: ActiveWorkout; curEi: number; open: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const skipped = a.items.some((x) => x.skip && !x.done);
  return (
    <Sheet open={open} onClose={onClose} title="Ejercicios">
      {a.routine.exercises.map((re, ei) => {
        const its = a.items.filter((x) => x.ei === ei);
        const ex = resolveRe(re, !!a.useAlt[re.id]);
        const done = its.length > 0 && its.every((x) => x.done || x.skip);
        const sk = its.length > 0 && its.every((x) => x.skip && !x.done);
        const count = its.filter((x) => x.done && x.kind === "work").length;
        const total = its.filter((x) => x.kind === "work").length;
        const on = ei === curEi;
        return (
          <Pressable
            key={re.id}
            disabled={done || on}
            onPress={() => {
              tap();
              goToExercise(ei);
              onClose();
            }}
            accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: on ? c.accentSoft : c.bg }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: done && !sk ? c.accent : c.surface2 }}>
              {done && !sk ? <IconCheck color={c.onAccent} size={14} /> : <T style={{ fontFamily: F.bold, fontSize: 13, color: on ? c.accentInk : c.muted }}>{ei + 1}</T>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T style={{ fontFamily: F.semibold, textDecorationLine: sk ? "line-through" : "none", color: sk ? c.muted : c.fg }} numberOfLines={1}>
                {ex.exercise.name}
              </T>
              <T v="small" muted num>
                {setsText(ex)} · {count}/{total} hechas
              </T>
            </View>
          </Pressable>
        );
      })}
      {skipped ? (
        <Button
          title="Retomar ejercicios saltados"
          onPress={() => {
            unskipAll();
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}

export function TechniqueSheet({ a, it, open, onClose }: { a: ActiveWorkout; it: PlannedItem; open: boolean; onClose: () => void }) {
  const { re, alt, ex } = exOf(a, it);
  const canSwitch = !!re.alt && !a.items.some((x) => x.ei === it.ei && x.done);
  return (
    <Sheet open={open} onClose={onClose} title={ex.exercise.name}>
      <T style={{ fontSize: 16, lineHeight: 24 }}>{ex.exercise.cue}</T>
      {re.note && !alt ? <T v="small" muted>{re.note}</T> : null}
      <T v="small" muted>
        {SCHEME_NAME[ex.scheme]} · {setsText(ex)} · {ex.exercise.muscleGroups.join(", ")}
      </T>
      {canSwitch ? (
        <Button
          title={alt ? `Volver a ${re.exercise.name.toLowerCase()}` : `Usar alternativa: ${re.alt!.name.toLowerCase()}`}
          onPress={() => {
            switchAlternative(it.ei, !alt);
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}

export function Pill({ title, onPress }: { title: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.line : c.surface2 })}
    >
      <T style={{ fontFamily: F.semibold, fontSize: 14 }}>{title}</T>
    </Pressable>
  );
}
