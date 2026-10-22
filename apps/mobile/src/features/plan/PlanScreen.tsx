import {
  calibrate,
  DAY_LETTERS,
  DEFAULT_WARMUP,
  EXERCISE_BY_ID,
  fk,
  macros,
  NUTRITION,
  PHASES,
  programPosition,
  rangeText,
  resolveExercise,
  restText,
  round,
  ROUTINES,
  SCHEME_NAME,
  setsText,
  stepOf,
  thousands,
  type ResolvedExercise,
  type RoutineDTO,
  type RoutineKey,
} from "@lifemaxxing/core";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { PanesScreen } from "../../components/panes";
import { platesText } from "../../components/plates";
import { Card, CardHead, Grid, Pill, Seg, Stepper, T, useLayout, ViewHead } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useRoutines } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";
import { shortName } from "../workout/Focus";

type PaneKey = "ruta" | "rutinas" | "cargas" | "nutricion" | "reglas";
const TABS: { key: PaneKey; label: string }[] = [
  { key: "ruta", label: "Ruta" },
  { key: "rutinas", label: "Rutinas" },
  { key: "cargas", label: "Cargas" },
  { key: "nutricion", label: "Nutrición" },
  { key: "reglas", label: "Reglas" },
];

export function PlanScreen() {
  const { me } = useAuth();
  const p = me?.profile;
  const eyebrow = [
    p?.heightCm ? `${fk(p.heightCm / 100)} m` : null,
    p?.startWeightKg ? `${fk(p.startWeightKg)} kg` : null,
    "intermedio",
    "fase de definición",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <PanesScreen
      head={<ViewHead eyebrow={eyebrow} title="Tu plan" />}
      tabs={TABS}
      label="Secciones del plan"
      render={(k) => {
        switch (k) {
          case "ruta":
            return <Ruta />;
          case "rutinas":
            return <Rutinas />;
          case "cargas":
            return <Cargas />;
          case "nutricion":
            return <Nutricion />;
          default:
            return <Reglas />;
        }
      }}
    />
  );
}

// ── Ruta ────────────────────────────────────────────────
function Ruta() {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const { me } = useAuth();
  const pos = programPosition(new Date(), me?.profile.programStartDate, me?.profile.timezone);
  const blurbs = [
    "Press inclinado, press militar de pie y jalón supino rumbo a dominadas.",
    "Inclinado con mancuernas, fondos (o banca si aún no puedes), jalón prono, box squat.",
    "Vuelves a los básicos con fuerza fresca para romper récords.",
  ];
  const titles = ["Énfasis hombros", "Énfasis pecho", "Repite la fase 1"];
  return (
    <>
      <View>
        <CardHead h="h2" title="Ruta de 24 semanas" right="Strength & Density" />
        <View style={{ flexDirection: isDesktop ? "row" : "column", gap: 10 }}>
          {PHASES.map((ph, i) => {
            const now = !pos.beforeStart && !pos.finished && pos.phase.id === ph.id;
            return (
              <View
                key={ph.id}
                style={{
                  flex: isDesktop ? 1 : undefined,
                  borderWidth: now ? 2 : 1,
                  borderColor: now ? c.accent : c.line,
                  borderRadius: R,
                  padding: 14,
                  backgroundColor: c.surface,
                  gap: 4,
                }}
              >
                <T style={{ fontFamily: F.extrabold, fontSize: 30, lineHeight: 32, color: now ? c.accentInk : c.muted }}>{ph.id}</T>
                <T style={{ fontFamily: F.bold }}>
                  Semanas {ph.weekFrom}–{ph.weekTo} · {titles[i]}
                </T>
                <T v="small" muted>
                  {blurbs[i]}
                  {now ? ` Aquí estás: semana ${pos.week}.` : ""}
                </T>
              </View>
            );
          })}
        </View>
      </View>
      <Card>
        <CardHead title="Semana tipo" right="A y B se alternan cada semana" />
        <WeekGrid />
        <T v="small" muted style={{ marginTop: 12, maxWidth: 640 }}>
          Pesas en días no consecutivos. Martes, jueves y domingo: 40–60 min de caminata o actividad ligera (unos 8–10 mil pasos). El sábado
          es tu cuarto día: cardio moderado y abdominales.
        </T>
      </Card>
    </>
  );
}

function WeekGrid() {
  const { c } = useTheme();
  const rows: [string, string[]][] = [
    ["Sem. impar", ["A", "walk", "B", "walk", "A", "C", "rest"]],
    ["Sem. par", ["B", "walk", "A", "walk", "B", "C", "rest"]],
  ];
  const cell = (k: string, i: number) => {
    const lift = k === "A" || k === "B";
    const bg = lift ? c.accent : k === "C" ? c.bronzeSoft : c.surface2;
    const fg = lift ? c.onAccent : k === "C" ? c.bronze : c.muted;
    const top = lift ? k : k === "C" ? "C" : k === "walk" ? "◦" : "–";
    const sub = lift ? "pesas" : k === "C" ? "cardio" : k === "walk" ? "caminar" : "libre";
    return (
      <View key={i} style={{ flex: 1, minWidth: 0, borderRadius: 6, paddingVertical: 8, alignItems: "center", backgroundColor: bg }}>
        <T style={{ fontFamily: F.bold, fontSize: 13, color: fg }}>{top}</T>
        <T style={{ fontFamily: F.medium, fontSize: 9, lineHeight: 11, color: fg, opacity: 0.85 }} numberOfLines={1}>
          {sub}
        </T>
      </View>
    );
  };
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", gap: 5 }}>
        <View style={{ width: 72 }} />
        {DAY_LETTERS.map((d) => (
          <T key={d} v="tiny" muted center style={{ flex: 1, fontSize: 10 }}>
            {d}
          </T>
        ))}
      </View>
      {rows.map(([label, days]) => (
        <View key={label} style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <T v="tiny" muted style={{ width: 72 }}>
            {label}
          </T>
          {days.map(cell)}
        </View>
      ))}
    </View>
  );
}

// ── Rutinas ─────────────────────────────────────────────
/** Rutinas desde la API; sin conexión, las de packages/core. */
function useRoutineData(templatePhase: number): RoutineDTO[] {
  const phaseId = templatePhase === 2 ? 2 : 1;
  const q = useRoutines(phaseId);
  return useMemo(() => {
    if (q.data?.routines?.length) return q.data.routines;
    return ROUTINES.filter((r) => r.templatePhase === templatePhase).map((r) => ({
      id: `${r.templatePhase}${r.key}`,
      templatePhase: r.templatePhase,
      key: r.key,
      name: r.name,
      focus: r.focus,
      exercises: r.exercises.map((e) => ({
        ...resolveExercise(e),
        id: `${r.templatePhase}${r.key}${e.position}`,
        alt: e.altExerciseId ? EXERCISE_BY_ID[e.altExerciseId] : null,
      })),
    }));
  }, [q.data, templatePhase]);
}

function Rutinas() {
  const { c } = useTheme();
  const { width } = useLayout();
  const { me } = useAuth();
  const pos = programPosition(new Date(), me?.profile.programStartDate, me?.profile.timezone);
  const [tpl, setTpl] = useState<"1" | "2">(pos.templatePhase === 2 ? "2" : "1");
  const [key, setKey] = useState<RoutineKey>("A");
  const routines = useRoutineData(Number(tpl));
  const r = routines.find((x) => x.key === key);
  const table = width >= 640;
  const sub = { A: tpl === "1" ? "Pecho · hombros" : "Pecho · tríceps", B: "Espalda · piernas", C: "Sábado" };
  return (
    <View style={{ gap: 16 }}>
      <Seg
        label="Plantilla"
        value={tpl}
        onChange={setTpl}
        options={[
          { key: "1", label: "Fases 1 y 3", sub: "Sem. 1–8 y 17–24" },
          { key: "2", label: "Fase 2", sub: "Sem. 9–16" },
        ]}
      />
      <Seg
        label="Rutinas"
        value={key}
        onChange={setKey}
        options={(["A", "B", "C"] as const).map((k) => ({ key: k, label: k === "C" ? "Cardio + abs" : `Workout ${k}`, sub: sub[k] }))}
      />
      {r ? (
        <Card>
          <CardHead title={r.name} right={r.focus} />
          {table ? (
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 8 }}>
              {["Ejercicio", "Series × reps", "Método", "Descanso"].map((h, i) => (
                <T key={h} v="eyebrow" style={{ flex: i === 0 ? 2.2 : 1 }}>
                  {h}
                </T>
              ))}
            </View>
          ) : null}
          {r.exercises.map((ex, i) => (
            <View
              key={ex.id}
              style={{
                flexDirection: table ? "row" : "column",
                gap: table ? 0 : 6,
                paddingVertical: 12,
                borderTopWidth: i === 0 && !table ? 0 : 1,
                borderTopColor: c.line,
              }}
            >
              <View style={{ flex: table ? 2.2 : undefined, paddingRight: 8, gap: 2 }}>
                <T style={{ fontFamily: F.bold }}>
                  {ex.exercise.name}
                  {ex.isAddition ? <T style={{ fontFamily: F.bold, fontSize: 10, color: c.bronze }}> AÑADIDO</T> : null}
                </T>
                <T v="small" muted>
                  {ex.note ?? ex.exercise.cue}
                  {ex.alt ? ` Alternativa: ${ex.alt.name.toLowerCase()}.` : ""}
                </T>
              </View>
              {table ? (
                <>
                  <T v="small" num style={{ flex: 1, fontFamily: F.medium }}>
                    {setsText(ex)}
                  </T>
                  <T v="small" style={{ flex: 1 }}>
                    {SCHEME_NAME[ex.scheme]}
                  </T>
                  <T v="small" num style={{ flex: 1, fontFamily: F.medium }}>
                    {restText(ex)}
                  </T>
                </>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <T style={{ fontFamily: F.bold }} num>
                    {setsText(ex)}
                  </T>
                  <T v="small" muted>
                    Descanso {restText(ex)}
                  </T>
                  <Pill>{SCHEME_NAME[ex.scheme]}</Pill>
                </View>
              )}
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

// ── Cargas (calculadora sin conexión) ───────────────────
type CalcOption = { phase: 1 | 2; key: RoutineKey; ex: ResolvedExercise };

/** Los ejercicios calibrables de cada fase, en el orden del Workout A y luego el B. */
function calcOptions(): CalcOption[] {
  const out: CalcOption[] = [];
  for (const phase of [1, 2] as const)
    for (const key of ["A", "B"] as const) {
      const r = ROUTINES.find((x) => x.templatePhase === phase && x.key === key);
      for (const t of r?.exercises ?? []) if (t.calibratable) out.push({ phase, key, ex: resolveExercise(t) });
    }
  return out;
}

export function RirPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <T v="label">¿Cuántas reps más podías hacer?</T>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
        {[0, 1, 2, 3].map((v) => {
          const on = v === value;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${v === 3 ? "3 o más" : v} reps en reserva`}
              style={{
                flex: 1,
                minHeight: 48,
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
    </View>
  );
}

function ExerciseChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={{
        borderWidth: 1,
        borderColor: on ? c.accent : c.line,
        backgroundColor: on ? c.accent : c.surface,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <T style={{ fontFamily: F.semibold, fontSize: 14, color: on ? c.onAccent : c.fg }}>{label}</T>
    </Pressable>
  );
}

function Cargas() {
  const { c } = useTheme();
  const { wide, width } = useLayout();
  const { me } = useAuth();
  const options = useMemo(calcOptions, []);
  // Arranca en la fase que toca (la 3 repite la plantilla de la 1).
  const [phase, setPhase] = useState<1 | 2>(() => {
    const pos = programPosition(new Date(), me?.profile.programStartDate, me?.profile.timezone);
    return !pos.beforeStart && !pos.finished && pos.phase.templatePhase === 2 ? 2 : 1;
  });
  const [id, setId] = useState(() => options.find((o) => o.phase === phase)!.ex.exerciseId);
  const [w, setW] = useState("60");
  const [r, setR] = useState("6");
  const [rir, setRir] = useState(1);
  const sel = options.find((o) => o.ex.exerciseId === id) ?? options[0];
  const ex = sel.ex;
  const weight = parseFloat(w.replace(",", ".")) || 0;
  const reps = parseInt(r, 10) || 0;
  const res = calibrate(ex, { weightKg: weight, reps, rir });
  const e = res.e1rmKg;
  const kino = ex.scheme === "kino";
  const warm = kino ? [] : (ex.warmup ?? DEFAULT_WARMUP);
  const perHand = ex.exercise.equipment === "mancuernas";
  const barra = ex.exercise.equipment === "barra";
  const step = stepOf(ex.exercise);
  const bump = (s: string, by: number) => fk(Math.max(0, Math.round(((parseFloat(s.replace(",", ".")) || 0) + by) * 100) / 100));
  // Pantallas angostas: peso y reps apilados y la tabla como lista de dos columnas.
  const narrow = width < 560;
  const pct = (x: number) => (e > 0 ? `${Math.round((x / e) * 100)} %` : "—");
  const rows = [
    ...warm.map(([p, rr], i) => {
      const x = round(res.loads[0] * p, stepOf(ex.exercise));
      return { label: `Calentamiento ${i + 1}`, sub: null as string | null, reps: String(rr), pct: pct(x), load: x, strong: false };
    }),
    ...ex.sets.map((s, k) => ({
      label: `Serie ${k + 1}`,
      sub: s.label ?? (kino ? (k === ex.sets.length - 1 ? "la más pesada" : "sube peso") : null),
      reps: rangeText(s),
      pct: pct(res.loads[k]),
      load: res.loads[k],
      strong: true,
    })),
  ];
  const pickPhase = (p: 1 | 2) => {
    setPhase(p);
    setId(options.find((o) => o.phase === p)!.ex.exerciseId);
  };

  return (
    <Card>
      <CardHead title="Calculadora de cargas" right="1RM estimado · fórmula de Epley" />
      <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? 28 : 20 }}>
        {/* Entrada: ejercicio y serie de prueba. flex solo en dos columnas (apiladas dejaría huecos). */}
        <View style={{ flex: wide ? 1 : undefined, gap: 16, minWidth: 0 }}>
          <View style={{ gap: 10 }}>
            <Seg
              label="Fase"
              value={String(phase) as "1" | "2"}
              onChange={(k) => pickPhase(k === "2" ? 2 : 1)}
              options={[
                { key: "1", label: "Fase 1", sub: "semanas 1–8 y 17–24" },
                { key: "2", label: "Fase 2", sub: "semanas 9–16" },
              ]}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Ejercicio">
              {options
                .filter((o) => o.phase === phase)
                .map((o) => (
                  <ExerciseChip key={o.ex.exerciseId} label={shortName(o.ex.exercise.name)} on={o.ex.exerciseId === id} onPress={() => setId(o.ex.exerciseId)} />
                ))}
            </View>
            <View style={{ gap: 2 }}>
              <T style={{ fontFamily: F.bold, fontSize: 16 }}>{ex.exercise.name}</T>
              <T v="small" muted>
                Workout {sel.key} · {SCHEME_NAME[ex.scheme]} · {setsText(ex)}
              </T>
            </View>
          </View>
          <View style={{ flexDirection: narrow ? "column" : "row", gap: 12 }}>
            <Stepper
              label={perHand ? "Peso de la prueba (kg por mano)" : "Peso de la prueba (kg)"}
              value={w}
              onChangeText={setW}
              onStep={(d) => setW(bump(w, d * step))}
            />
            <Stepper label="Reps hechas" value={r} keyboardType="number-pad" onChangeText={setR} onStep={(d) => setR(bump(r, d))} />
          </View>
          <RirPicker value={rir} onChange={setRir} />
          <T v="small" muted>
            Usa una serie de 5–8 reps limpias, sin llegar al fallo. Entre 3 y 10 reps la estimación es más fiable. No hace falta probar un
            máximo real.
          </T>
        </View>

        {/* Resultado */}
        <View style={{ flex: wide ? 1.2 : undefined, gap: 12, minWidth: 0 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: res.reliable ? c.accent : c.bad,
              borderRadius: R,
              backgroundColor: c.accentSoft,
            }}
          >
            <View>
              <T v="eyebrow" color={c.accentInk}>
                1RM estimado
              </T>
              <T num style={{ fontFamily: F.extrabold, fontSize: 36, lineHeight: 40, letterSpacing: -0.8, color: res.reliable ? c.accentInk : c.bad }}>
                {e > 0 ? fk(Math.round(e * 2) / 2) : "—"}
                <T style={{ fontFamily: F.bold, fontSize: 17, color: res.reliable ? c.accentInk : c.bad }}> kg</T>
              </T>
            </View>
            <T v="small" muted num style={{ paddingBottom: 4 }}>
              {reps + rir <= 1 ? "1 rep al fallo = tu 1RM real" : `${fk(weight)} × (1 + ${reps + rir} ÷ 30)`}
            </T>
          </View>
          {narrow ? (
            <View>
              {rows.map((x, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                    borderBottomColor: c.line,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={{ fontFamily: x.strong ? F.bold : F.medium, fontSize: 15, color: x.strong ? c.fg : c.muted }}>{x.label}</T>
                    <T v="small" muted num>
                      {x.reps} reps · {x.pct}
                      {x.sub ? ` · ${x.sub}` : ""}
                    </T>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <T num style={{ fontFamily: x.strong ? F.extrabold : F.semibold, fontSize: x.strong ? 18 : 15 }}>
                      {fk(x.load)} kg
                    </T>
                    {barra ? (
                      <T v="small" muted num>
                        {platesText(x.load)}
                      </T>
                    ) : perHand ? (
                      <T v="small" muted>
                        por mano
                      </T>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View>
              <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
                {["Serie", "Reps", "% 1RM", `Carga${perHand ? " por mano" : ""}`].map((h, i) => (
                  <T key={h} v="eyebrow" style={{ flex: i === 0 ? 1.4 : i === 3 ? 1.5 : 0.8 }}>
                    {h}
                  </T>
                ))}
              </View>
              {rows.map((x, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    paddingVertical: 10,
                    borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                    borderBottomColor: c.line,
                  }}
                >
                  <View style={{ flex: 1.4 }}>
                    <T style={{ fontFamily: x.strong ? F.bold : F.regular, fontSize: 14 }}>{x.label}</T>
                    {x.sub ? (
                      <T v="small" muted>
                        {x.sub}
                      </T>
                    ) : null}
                  </View>
                  <T v="small" num style={{ flex: 0.8, fontFamily: F.medium }}>
                    {x.reps}
                  </T>
                  <T v="small" num style={{ flex: 0.8, fontFamily: F.medium }}>
                    {x.pct}
                  </T>
                  <View style={{ flex: 1.5 }}>
                    <T num style={{ fontFamily: x.strong ? F.bold : F.medium, fontSize: 14 }}>
                      {fk(x.load)} kg
                    </T>
                    {barra ? (
                      <T v="small" muted>
                        {platesText(x.load)}
                      </T>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
          <T v="small" muted>
            {reps + rir} = {reps} reps hechas + {rir} en reserva.{" "}
            {kino
              ? "En Kino rep subes de peso en cada serie: la última apunta al tope del rango con 1 rep en reserva y las anteriores son la rampa. No necesita calentamiento aparte."
              : `La serie pesada apunta al tope de su rango dejando 1 rep en reserva; las demás bajan ${ex.dropKg ? `${fk(ex.dropKg)} kg por mano` : "10 %"}, como indica el curso.`}
            {!res.reliable ? (
              <T v="small" color={c.bad}>
                {" "}
                Con menos de 3 o más de 10 reps la estimación pierde precisión.
              </T>
            ) : null}
          </T>
          {e > 0 && reps > 0 ? null : (
            <T v="small" color={c.bad}>
              Escribe un peso y las reps que hiciste.
            </T>
          )}
        </View>
      </View>
    </Card>
  );
}

// ── Nutrición ───────────────────────────────────────────
function MacroCard({ title, kcal, days, grow }: { title: string; kcal: number; days: string; grow: boolean }) {
  const { c } = useTheme();
  const m = macros(kcal, NUTRITION.proteinG, NUTRITION.fatPct);
  const items: [string, number, string][] = [
    ["Proteína", m.proteinG, c.accent],
    ["Grasa", m.fatG, c.bronze],
    ["Carbos", m.carbsG, c.plates["20"]],
  ];
  return (
    <Card style={{ gap: 10, flex: grow ? 1 : undefined }}>
      <CardHead title={title} right={days} />
      <T style={{ fontFamily: F.extrabold, fontSize: 44, lineHeight: 46 }} num>
        {thousands(kcal)}
        <T style={{ fontSize: 18, color: c.muted, fontFamily: F.bold }}> kcal</T>
      </T>
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }} aria-hidden>
        <View style={{ width: `${m.pct.protein}%`, backgroundColor: c.accent }} />
        <View style={{ width: `${m.pct.fat}%`, backgroundColor: c.bronze }} />
        <View style={{ width: `${m.pct.carbs}%`, backgroundColor: c.plates["20"] }} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map(([name, g, col]) => (
          <View key={name} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: col }} />
              <T v="small" muted>
                {name}
              </T>
            </View>
            <T style={{ fontFamily: F.bold, fontSize: 22, lineHeight: 26 }} num>
              {g} g
            </T>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Rule({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
      <T style={{ fontFamily: F.bold }}>{title}</T>
      <T v="small" muted style={{ maxWidth: 560 }}>
        {text}
      </T>
    </View>
  );
}

function Nutricion() {
  const { isDesktop, wide } = useLayout();
  const rules: [string, string][] = [
    [
      "De dónde salen los números",
      "El curso estima el mantenimiento en 15 kcal por libra de peso: 232 lb × 15 ≈ 3,490 kcal. El Greek God no trae un protocolo de corte, así que se aplica su idea de ciclar calorías (más en días de pesas) con déficit: unas 5,000 kcal menos por semana, alrededor de −0.6 kg semanales.",
    ],
    [
      "Calibración",
      "Mira el promedio de 2 semanas. Si bajas menos de 0.4 kg por semana, quita 10 % a ambos días. Si bajas más de 1 kg por semana o la fuerza cae, súmale 10 %.",
    ],
    [
      "Proteína primero",
      "195 g diarios (1 g por libra de un peso meta de ~88 kg). Te ayuda a conservar músculo y a llegar con menos hambre. Tu proteína isolada cubre lo que falte.",
    ],
    [
      "Horario",
      "Opcional: ayuno de 16 h con café y agua, comidas grandes después de entrenar y en la noche. Si entrenas en ayunas, 10 g de BCAA antes. Fin de semana fuera: elige platos con proteína a la plancha y controla la porción de carbos.",
    ],
  ];
  return (
    <View style={{ gap: 16 }}>
      <CardHead h="h2" title="Nutrición para bajar grasa" right="estimado inicial · calibrar en 2 semanas" />
      <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
        <MacroCard title="Día de pesas" kcal={NUTRITION.liftDayKcal} days="lun · mié · vie" grow={wide} />
        <MacroCard title="Día sin pesas" kcal={NUTRITION.restDayKcal} days="mar · jue · sáb · dom" grow={wide} />
      </View>
      <Card>
        <Grid cols={isDesktop ? 2 : 1} gap={14}>
          {rules.map(([t, x]) => (
            <Rule key={t} title={t} text={x} />
          ))}
        </Grid>
      </Card>
    </View>
  );
}

function Reglas() {
  const { isDesktop } = useLayout();
  const rules: [string, string][] = [
    [
      "Doble progresión",
      "Trabajas dentro de un rango. Cuando llegas al tope en una serie, la próxima sesión subes 2.5 kg en barra y polea (2 kg en mancuernas, que van de 2 en 2) y vuelves a la parte baja del rango. Si pasas el tope por 3 reps o más, subes el doble; si no llegas al mínimo, bajas un salto. Meta: +4 a +7 kg al mes en los básicos.",
    ],
    [
      "Ajuste en la misma sesión",
      "Si en una serie pasas el tope del rango, la app sube el peso de las series que siguen de ese ejercicio; si no llegas al mínimo, lo baja. Siempre te dice cuánto y por qué.",
    ],
    [
      "La serie pesada primero",
      "En pirámide inversa la serie 1 va a una rep del fallo. Luego bajas ~10 % y buscas 1–2 reps más. Ninguna otra serie se lleva al fallo.",
    ],
    [
      "Descansos justos",
      "2 min en los básicos pesados (press, jalón, sentadilla), 1:30 en accesorios y peso muerto rumano, 1 min en abdominales y 10–15 s entre mini-series de rest-pause. La app te los cuenta.",
    ],
    [
      "Del jalón a las dominadas",
      "Hoy no haces dominadas, así que el curso indica jalón supino hasta poder. Las negativas son un añadido para llegar antes. Con 5 dominadas limpias haces 3 series a peso corporal; con 8, empiezas a lastrar (4, 6 y 8 reps, +1.25 kg por sesión).",
    ],
    [
      "Mesetas",
      "Si un básico no sube en 2–3 sesiones seguidas, no cambies todo: rota a una variante del mismo patrón (inclinado con barra → con mancuernas) y vuelve a subir.",
    ],
    [
      "Registra todo",
      "Cada serie que no anotas es progreso que no puedes medir. La fuerza que sube mientras el peso baja es la señal de que conservas el músculo.",
    ],
  ];
  return (
    <Card>
      <CardHead title="Reglas que mueven la aguja" />
      <Grid cols={isDesktop ? 2 : 1} gap={14}>
        {rules.map(([t, x]) => (
          <Rule key={t} title={t} text={x} />
        ))}
      </Grid>
    </Card>
  );
}
