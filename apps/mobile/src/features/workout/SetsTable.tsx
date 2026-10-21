import { fk, setsText } from "@lifemaxxing/core";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { IconCheck } from "../../components/icons";
import { Card, CardHead, Chip, Stepper, T } from "../../components/ui";
import type { ActiveWorkout } from "../../store/workout";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { editDoneSet, goToExercise, planSet, setCurrent } from "./actions";
import { parseNum, repsStep, stepValue, weightStep, type Draft } from "./draft";
import { resolveRe, type PlannedItem } from "./logic";

const rowLabel = (it: PlannedItem) => (it.kind === "warmup" ? `C${it.k + 1}` : it.kind === "test" ? "P" : String(it.k + 1));

/** Tabla de series del ejercicio actual: número, peso − +, reps − + y ✓. */
export function SetsTable({ a, draft, setDraft, onLog }: { a: ActiveWorkout; draft: Draft; setDraft: (d: Draft) => void; onLog: () => void }) {
  const cur = a.items[a.i];
  const re = a.routine.exercises[cur.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const rows = a.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.ei === cur.ei);
  const cardio = ex.scheme === "cardio";
  return (
    <Card style={{ gap: 4 }}>
      <CardHead title="Series" right={setsText(ex)} />
      <View style={{ flexDirection: "row", gap: 8, paddingBottom: 6 }}>
        <T v="eyebrow" style={{ width: 28 }}>#</T>
        {!cardio ? <T v="eyebrow" style={{ flex: 1 }}>Peso</T> : null}
        <T v="eyebrow" style={{ flex: 1 }}>{ex.sets[0]?.unit === "min" ? "Min" : ex.sets[0]?.unit === "sec" ? "Seg" : "Reps"}</T>
        <View style={{ width: 40 }} />
      </View>
      {rows.map(({ it, idx }) => (
        <Row key={it.key} a={a} it={it} idx={idx} current={idx === a.i} draft={draft} setDraft={setDraft} onLog={onLog} cardio={cardio} wStep={weightStep(ex)} />
      ))}
      {cur.kind === "test" ? (
        <T v="small" muted style={{ marginTop: 6 }}>
          Las cargas de las series aparecen al registrar la serie de prueba.
        </T>
      ) : null}
    </Card>
  );
}

function Row({
  a,
  it,
  idx,
  current,
  draft,
  setDraft,
  onLog,
  cardio,
  wStep,
}: {
  a: ActiveWorkout;
  it: PlannedItem;
  idx: number;
  current: boolean;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onLog: () => void;
  cardio: boolean;
  wStep: number;
}) {
  const { c } = useTheme();
  // Filas que no son la actual: edición local que se guarda al soltar (planificada o corrección de una hecha).
  const [w, setW] = useState(fk(it.done?.w ?? it.w));
  const [r, setR] = useState(String(it.done?.r ?? it.r));
  useEffect(() => {
    setW(fk(it.done?.w ?? it.w));
    setR(String(it.done?.r ?? it.r));
  }, [it.done?.w, it.done?.r, it.w, it.r]);

  const commit = (nw: string, nr: string) => {
    if (it.done) editDoneSet(idx, parseNum(nw), parseInt(nr, 10) || 0);
    else planSet(idx, parseNum(nw), parseInt(nr, 10) || 0);
  };
  const vW = current ? draft.w : w;
  const vR = current ? draft.r : r;
  const onW = (s: string) => (current ? setDraft({ ...draft, w: s }) : setW(s));
  const onR = (s: string) => (current ? setDraft({ ...draft, r: s }) : setR(s));
  const stepW = (d: -1 | 1) => {
    const n = stepValue(vW, wStep, d);
    if (current) setDraft({ ...draft, w: n });
    else {
      setW(n);
      commit(n, r);
    }
  };
  const stepR = (d: -1 | 1) => {
    const n = stepValue(vR, repsStep(it), d);
    if (current) setDraft({ ...draft, r: n });
    else {
      setR(n);
      commit(w, n);
    }
  };
  const blur = () => {
    if (!current && (w !== fk(it.done?.w ?? it.w) || r !== String(it.done?.r ?? it.r))) commit(w, r);
  };
  const pending = it.pending && !it.done;
  const bg = current ? c.accentSoft : "transparent";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 8, backgroundColor: bg, opacity: it.skip && !it.done ? 0.45 : 1 }}>
      <Pressable onPress={() => setCurrent(idx)} disabled={!!it.done || current} accessibilityLabel={`Ir a la serie ${rowLabel(it)}`} style={{ width: 28 }}>
        <T style={{ fontFamily: F.bold, color: it.kind === "work" ? c.fg : c.muted }}>{rowLabel(it)}</T>
      </Pressable>
      {pending ? (
        <T v="small" muted style={{ flex: cardio ? 1 : 2 }}>
          tras la prueba
        </T>
      ) : (
        <>
          {!cardio ? (
            <View style={{ flex: 1 }}>
              <Stepper compact label={`Peso serie ${rowLabel(it)}`} value={vW} onChangeText={onW} onStep={stepW} onBlur={blur} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Stepper compact label={`Reps serie ${rowLabel(it)}`} value={vR} onChangeText={(s) => onR(s.replace(/[^0-9]/g, ""))} onStep={stepR} keyboardType="number-pad" onBlur={blur} />
          </View>
        </>
      )}
      <Pressable
        onPress={current ? onLog : undefined}
        disabled={!current}
        accessibilityRole="button"
        accessibilityLabel={it.done ? `Serie ${rowLabel(it)} registrada` : current ? `Registrar serie ${rowLabel(it)}` : `Serie ${rowLabel(it)} pendiente`}
        accessibilityState={{ disabled: !current, checked: !!it.done }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: it.done || current ? c.accent : c.line,
          backgroundColor: it.done ? c.accent : current ? c.surface : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {it.done ? <IconCheck color={c.onAccent} /> : current ? <IconCheck color={c.accent} /> : null}
      </Pressable>
    </View>
  );
}

/** Lista de ejercicios de la sesión con las series hechas. Tocar uno salta a él. */
export function ExerciseList({ a }: { a: ActiveWorkout }) {
  const { c } = useTheme();
  const curEi = a.items[a.i]?.ei;
  const done = a.items.filter((x) => x.done).length;
  const total = a.items.filter((x) => !x.skip || x.done).length;
  return (
    <Card>
      <CardHead title="Sesión" right={`${done} de ${total} series`} />
      <View style={{ gap: 2 }}>
        {a.routine.exercises.map((re, ei) => {
          const its = a.items.filter((x) => x.ei === ei);
          const allDone = its.length > 0 && its.every((x) => x.done || x.skip);
          const on = ei === curEi;
          const ex = resolveRe(re, !!a.useAlt[re.id]);
          const chips = its.filter((x) => x.done);
          return (
            <Pressable
              key={re.id}
              onPress={() => goToExercise(ei)}
              disabled={allDone || on}
              accessibilityRole="button"
              accessibilityLabel={`${ex.exercise.name}${allDone ? ", terminado" : on ? ", actual" : ""}`}
              style={{ flexDirection: "row", gap: 10, padding: 10, borderRadius: 8, backgroundColor: on ? c.accentSoft : "transparent" }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginTop: 2, borderColor: allDone || on ? c.accent : c.line, backgroundColor: allDone ? c.accent : "transparent" }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontFamily: F.semibold, fontSize: 14 }}>
                  {ex.exercise.name}
                  <T v="small" muted>
                    {" "}
                    · {setsText(ex)}
                  </T>
                </T>
                {chips.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {chips.map((x) => (
                      <Chip key={x.key} dashed={x.kind !== "work"}>
                        {ex.scheme === "cardio" ? `${x.done!.r} min` : `${x.done!.w > 0 ? fk(x.done!.w) : "PC"}×${x.done!.r}`}
                      </Chip>
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
