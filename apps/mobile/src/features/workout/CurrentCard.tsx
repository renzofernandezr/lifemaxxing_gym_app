import { calibrate, EQUIPMENT_NAME, fk, SCHEME_NAME, unitLabel, weightText, type LoadSuggestion } from "@lifemaxxing/core";
import { View } from "react-native";
import { Plates } from "../../components/plates";
import { Button, Card, Chip, Pill, Stepper, T, useLayout } from "../../components/ui";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { RirPicker } from "../plan/PlanScreen";
import type { ActiveWorkout } from "../../store/workout";
import { setRir, switchAlternative } from "./actions";
import { parseNum, repsStep, stepValue, weightStep, type Draft } from "./draft";
import { resolveRe, suggestionKey, type PlannedItem } from "./logic";

interface Props {
  a: ActiveWorkout;
  it: PlannedItem;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onLog: () => void;
  busy: boolean;
}

export function CurrentCard(props: Props) {
  return props.it.kind === "test" ? <TestCard {...props} /> : <SetCard {...props} />;
}

function Head({ a, it, pills }: { a: ActiveWorkout; it: PlannedItem; pills: React.ReactNode }) {
  const { isDesktop } = useLayout();
  const re = a.routine.exercises[it.ei];
  const alt = !!a.useAlt[re.id];
  const ex = resolveRe(re, alt);
  const canSwitch = !!re.alt && !a.items.some((x) => x.ei === it.ei && x.done);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{pills}</View>
      <T style={{ fontFamily: F.extrabold, fontSize: isDesktop ? 38 : 28, lineHeight: isDesktop ? 42 : 32, letterSpacing: -0.6 }} accessibilityRole="header">
        {ex.exercise.name}
      </T>
      {re.note && !alt ? <T v="small" muted>{re.note}</T> : null}
      {canSwitch ? (
        <Button
          variant="ghost"
          small
          style={{ alignSelf: "flex-start", minHeight: 30, paddingVertical: 2 }}
          title={alt ? `Volver a: ${re.exercise.name.toLowerCase()}` : `Usar alternativa: ${re.alt!.name.toLowerCase()}`}
          onPress={() => switchAlternative(it.ei, !alt)}
        />
      ) : null}
    </View>
  );
}

function SetCard({ a, it, draft, setDraft, onLog, busy }: Props) {
  const { c } = useTheme();
  const re = a.routine.exercises[it.ei];
  const alt = !!a.useAlt[re.id];
  const ex = resolveRe(re, alt);
  const sug: LoadSuggestion | undefined = a.suggestions[suggestionKey(re, alt)];
  const warm = it.kind === "warmup";
  const cardio = ex.scheme === "cardio";
  const eq = ex.exercise.equipment;
  const w = parseNum(draft.w);

  let line: string;
  if (warm) line = `Calentamiento ${it.k + 1} de ${it.n} · ${Math.round((it.pct ?? 0) * 100)} % de la serie pesada`;
  else if (ex.scheme === "rest_pause") line = it.k === 0 ? `Serie de activación${it.label ? ` · ${it.label}` : ""}` : `Mini-serie ${it.k} de ${it.n - 1}`;
  else line = `Serie ${it.k + 1} de ${it.n}${it.label ? ` · ${it.label}` : ""}`;

  let last: React.ReactNode = null;
  const prev = sug?.lastSets[it.k];
  if (it.cal) {
    const why =
      ex.scheme === "kino"
        ? it.k === it.n - 1
          ? "la más pesada: tope del rango con 1 rep en reserva"
          : "rampa hacia la serie más pesada"
        : it.k === 0
          ? "tope del rango con 1 rep en reserva"
          : `${ex.dropKg ? `−${fk(ex.dropKg)} kg por mano` : "−10 %"} respecto a la serie anterior`;
    last = (
      <>
        Calculado con tu 1RM estimado de <T style={{ fontFamily: F.semibold }}>{fk(Math.round(it.cal * 2) / 2)} kg</T> · {why}
      </>
    );
  } else if (warm) last = "Sin fatiga: solo prepara el patrón y las articulaciones.";
  else if (cardio && prev) last = <>Última vez: <T style={{ fontFamily: F.semibold }}>{prev.reps} min</T></>;
  else if (prev && prev.reps > 0) {
    const up = it.w > prev.weightKg;
    last = (
      <>
        Última vez: <T style={{ fontFamily: F.semibold, color: c.fg }}>{weightText(ex, prev.weightKg)} × {prev.reps}</T>
        {up ? ` · llegaste al tope, hoy subes ${fk(it.w - prev.weightKg)} kg` : ex.exercise.incrementKg ? ` · mismo peso, busca ${Math.min(prev.reps + 1, it.hi)} o más` : " · busca una rep más"}
      </>
    );
  } else if (!warm && !cardio && sug?.status === "none") last = "Primera vez: elige un peso con el que llegues al rango con técnica limpia.";

  const topChip = it.kind === "work" && sug?.reachedTop && prev && it.w > prev.weightKg;
  const best = sug?.bestSet;
  const wLabel = `Peso (kg)${eq === "mancuernas" ? " por mano" : eq === "peso_corporal" ? " · lastre" : ""}`;
  const rLabel = it.unit === "min" ? "Minutos" : it.unit === "sec" ? "Segundos" : it.unit === "reps_per_side" ? "Reps por lado" : "Reps hechas";

  return (
    <Card pad={20} style={{ gap: 16 }}>
      <Head
        a={a}
        it={it}
        pills={
          <>
            <Pill tone={warm ? "bronze" : "accent"}>{warm ? "Calentamiento" : SCHEME_NAME[ex.scheme]}</Pill>
            <Pill tone="neutral">{EQUIPMENT_NAME[eq]}</Pill>
            {re.isAddition ? <Pill tone="bronze">añadido</Pill> : null}
          </>
        }
      />
      <T style={{ fontFamily: F.semibold }}>{line}</T>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <T v="big">{it.lo === it.hi ? it.lo : `${it.lo}–${it.hi}`}</T>
        <T muted>{it.unit === "reps" ? "reps objetivo" : unitLabel(it.unit, true)}</T>
      </View>
      {last ? <T v="small" muted style={{ fontSize: 14 }}>{last}</T> : null}
      {!warm ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {ex.exercise.muscleGroups.slice(0, 3).map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
          {best && !cardio ? <Chip>Mejor: {weightText(ex, best.weightKg)} × {best.reps}</Chip> : null}
          {topChip ? <Pill tone="solid">Llegaste al tope: hoy {fk(it.w)} kg</Pill> : null}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {!cardio ? (
          <View style={{ flexBasis: 220, flexGrow: 1 }}>
            <Stepper label={wLabel} value={draft.w} onChangeText={(s) => setDraft({ ...draft, w: s })} onStep={(d) => setDraft({ ...draft, w: stepValue(draft.w, weightStep(ex), d) })} />
          </View>
        ) : null}
        <View style={{ flexBasis: 220, flexGrow: 1 }}>
          <Stepper label={rLabel} value={draft.r} keyboardType="number-pad" onChangeText={(s) => setDraft({ ...draft, r: s.replace(/[^0-9]/g, "") })} onStep={(d) => setDraft({ ...draft, r: stepValue(draft.r, repsStep(it), d) })} />
        </View>
      </View>
      {eq === "barra" ? <Plates total={w} /> : null}
      <View style={{ backgroundColor: c.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
        <T v="small" style={{ fontSize: 14 }}>
          {ex.exercise.cue}
        </T>
      </View>
      <Button variant="primary" title={warm ? "Registrar calentamiento" : "Registrar serie"} onPress={onLog} loading={busy} />
    </Card>
  );
}

function TestCard({ a, it, draft, setDraft, onLog, busy }: Props) {
  const { c } = useTheme();
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const kino = ex.scheme === "kino";
  const w = parseNum(draft.w);
  const r = parseInt(draft.r, 10) || 0;
  const res = calibrate(ex, { weightKg: w, reps: r, rir: a.rir });
  const perHand = ex.exercise.equipment === "mancuernas" ? " por mano" : "";
  return (
    <Card pad={20} style={{ gap: 16 }}>
      <Head
        a={a}
        it={it}
        pills={
          <>
            <Pill tone="bronze">Serie de prueba</Pill>
            <Pill tone="neutral">{EQUIPMENT_NAME[ex.exercise.equipment]}</Pill>
          </>
        }
      />
      <T style={{ fontFamily: F.semibold }}>
        {kino
          ? `Elige un peso con el que hagas ${it.lo}–${it.hi} reps limpias, sin llegar al fallo. Registra esa serie.`
          : "Sube de peso con series cortas de 3–5 reps hasta uno que puedas mover 5–8 veces con técnica limpia. Registra solo esa serie."}
      </T>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <T v="big">
          {it.lo}–{it.hi}
        </T>
        <T muted>reps, sin llegar al fallo</T>
      </View>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <View style={{ flexBasis: 220, flexGrow: 1 }}>
          <Stepper label={`Peso (kg)${perHand}`} value={draft.w} onChangeText={(s) => setDraft({ ...draft, w: s })} onStep={(d) => setDraft({ ...draft, w: stepValue(draft.w, weightStep(ex), d) })} />
        </View>
        <View style={{ flexBasis: 220, flexGrow: 1 }}>
          <Stepper label="Reps hechas" value={draft.r} keyboardType="number-pad" onChangeText={(s) => setDraft({ ...draft, r: s.replace(/[^0-9]/g, "") })} onStep={(d) => setDraft({ ...draft, r: stepValue(draft.r, 1, d) })} />
        </View>
      </View>
      <RirPicker value={a.rir} onChange={setRir} />
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.accent, borderRadius: 8, backgroundColor: c.accentSoft }}
      >
        <View>
          <T v="eyebrow">1RM estimado</T>
          <T style={{ fontFamily: F.extrabold, fontSize: 30, lineHeight: 34 }} num>
            {fk(Math.round(res.e1rmKg * 2) / 2)} kg
          </T>
        </View>
        <View style={{ flexShrink: 1 }}>
          <T v="small" num>
            Tus series: {res.loads.map(fk).join(" / ")} kg{perHand}
          </T>
          {!res.reliable ? <T v="small" color={c.bad}>Fuera de 3–10 reps la estimación es menos fiable</T> : null}
        </View>
      </View>
      {ex.exercise.equipment === "barra" ? <Plates total={w} /> : null}
      <View style={{ backgroundColor: c.surface2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
        <T v="small" style={{ fontSize: 14 }}>
          {kino
            ? `Con este dato la app arma tu rampa de ${ex.sets.length} series: empiezas liviano y la última es la más pesada.`
            : "Hoy la prueba reemplaza al calentamiento calculado. Después de registrarla descansas 3 min y haces tus series con las cargas que salgan."}
        </T>
      </View>
      <Button variant="primary" title="Calcular mis cargas" onPress={onLog} loading={busy} disabled={w <= 0 && ex.exercise.equipment !== "peso_corporal"} />
    </Card>
  );
}
