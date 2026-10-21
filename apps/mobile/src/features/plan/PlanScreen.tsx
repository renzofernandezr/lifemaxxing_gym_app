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
import { Panes } from "../../components/panes";
import { platesText } from "../../components/plates";
import { Card, CardHead, Field, Grid, Pill, Seg, Screen, T, useLayout, ViewHead } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useRoutines } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";

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
  const eyebrow = [p?.heightCm ? `${fk(p.heightCm / 100)} m` : null, p?.startWeightKg ? `${fk(p.startWeightKg)} kg` : null, "intermedio", "fase de definición"]
    .filter(Boolean)
    .join(" · ");
  return (
    <Screen>
      <ViewHead eyebrow={eyebrow} title="Tu plan" />
      <Panes
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
    </Screen>
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
                style={{ flex: isDesktop ? 1 : undefined, borderWidth: now ? 2 : 1, borderColor: now ? c.accent : c.line, borderRadius: R, padding: 14, backgroundColor: c.surface, gap: 4 }}
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
          Pesas en días no consecutivos. Martes, jueves y domingo: 40–60 min de caminata o actividad ligera (unos 8–10 mil pasos). El sábado es tu cuarto día: cardio moderado y abdominales.
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
                  <T v="small" num style={{ flex: 1, fontFamily: F.medium }}>{setsText(ex)}</T>
                  <T v="small" style={{ flex: 1 }}>{SCHEME_NAME[ex.scheme]}</T>
                  <T v="small" num style={{ flex: 1, fontFamily: F.medium }}>{restText(ex)}</T>
                </>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <T style={{ fontFamily: F.bold }} num>{setsText(ex)}</T>
                  <T v="small" muted>Descanso {restText(ex)}</T>
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
const CALC_GROUPS: [string, string, RoutineKey, string[]][] = [
  ["Básicos · pirámide inversa", "1", "A", ["inc", "ohp"]],
  ["Básicos · pirámide inversa", "1", "B", ["jal"]],
  ["Piernas · Kino rep", "1", "B", ["bul", "rdl"]],
  ["Accesorios · pirámide inversa", "1", "A", ["tri"]],
  ["Accesorios · pirámide inversa", "1", "B", ["ham"]],
  ["Fase 2", "2", "A", ["inc_db", "dip_w"]],
  ["Fase 2", "2", "B", ["jal_pr", "curl_inc", "box", "sl_rdl"]],
];

function calcOptions(): { group: string; ex: ResolvedExercise }[] {
  const out: { group: string; ex: ResolvedExercise }[] = [];
  for (const [group, tpl, key, ids] of CALC_GROUPS) {
    const r = ROUTINES.find((x) => String(x.templatePhase) === tpl && x.key === key)!;
    for (const id of ids) {
      const t = r.exercises.find((e) => e.exerciseId === id);
      if (t) out.push({ group, ex: resolveExercise(t) });
    }
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
              style={{ flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface2, alignItems: "center", justifyContent: "center" }}
            >
              <T style={{ fontFamily: F.bold, color: on ? c.onAccent : c.fg }}>{v === 3 ? "3+" : v}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Cargas() {
  const { c } = useTheme();
  const { wide } = useLayout();
  const options = useMemo(calcOptions, []);
  const [id, setId] = useState("inc");
  const [w, setW] = useState("60");
  const [r, setR] = useState("6");
  const [rir, setRir] = useState(1);
  const ex = options.find((o) => o.ex.exerciseId === id)?.ex ?? options[0].ex;
  const weight = parseFloat(w.replace(",", ".")) || 0;
  const reps = parseInt(r, 10) || 0;
  const res = calibrate(ex, { weightKg: weight, reps, rir });
  const e = res.e1rmKg;
  const kino = ex.scheme === "kino";
  const warm = kino ? [] : (ex.warmup ?? DEFAULT_WARMUP);
  const unit = ex.exercise.equipment === "mancuernas" ? " por mano" : "";
  const barra = ex.exercise.equipment === "barra";
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
  let lastGroup = "";
  return (
    <Card>
      <CardHead title="Calculadora de cargas" right="1RM estimado · fórmula de Epley" />
      <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
        <View style={{ flex: 1, gap: 12, minWidth: 0 }}>
          <T style={{ fontFamily: F.semibold, fontSize: 13 }}>Ejercicio</T>
          <View style={{ gap: 8 }}>
            {options.map((o) => {
              const head = o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              const on = o.ex.exerciseId === id;
              return (
                <View key={o.ex.exerciseId} style={{ gap: 6 }}>
                  {head ? <T v="eyebrow" style={{ marginTop: 4 }}>{head}</T> : null}
                  <Pressable
                    onPress={() => setId(o.ex.exerciseId)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={{ borderWidth: 1.5, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accentSoft : c.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }}
                  >
                    <T style={{ fontFamily: on ? F.semibold : F.regular, fontSize: 14 }}>{o.ex.exercise.name}</T>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="Peso de la prueba (kg)" value={w} onChangeText={setW} keyboardType="decimal-pad" />
            <Field label="Reps hechas" value={r} onChangeText={setR} keyboardType="number-pad" />
          </View>
          <RirPicker value={rir} onChange={setRir} />
          <T v="small" muted>
            Usa una serie de 5–8 reps limpias, sin llegar al fallo. Entre 3 y 10 reps la estimación es más fiable. No hace falta probar un máximo real.
          </T>
        </View>
        <View style={{ flex: 1.3, gap: 12, minWidth: 0 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.accent, borderRadius: 8, backgroundColor: c.accentSoft }}>
            <View>
              <T v="eyebrow">1RM estimado</T>
              <T style={{ fontFamily: F.extrabold, fontSize: 30, lineHeight: 34 }} num>
                {fk(Math.round(e * 2) / 2)} kg
              </T>
            </View>
            <T v="small" muted num>
              {reps + rir <= 1 ? "1 rep al fallo = tu 1RM real" : `${fk(weight)} × (1 + ${reps + rir} ÷ 30)`}
            </T>
          </View>
          <View>
            <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {["Serie", "Reps", "% 1RM", `Carga${unit}`].map((h, i) => (
                <T key={h} v="eyebrow" style={{ flex: i === 0 ? 1.4 : i === 3 ? 1.5 : 0.8 }}>
                  {h}
                </T>
              ))}
            </View>
            {rows.map((x, i) => (
              <View key={i} style={{ flexDirection: "row", paddingVertical: 10, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
                <View style={{ flex: 1.4 }}>
                  <T style={{ fontFamily: x.strong ? F.bold : F.regular, fontSize: 14 }}>{x.label}</T>
                  {x.sub ? <T v="small" muted>{x.sub}</T> : null}
                </View>
                <T v="small" num style={{ flex: 0.8, fontFamily: F.medium }}>{x.reps}</T>
                <T v="small" num style={{ flex: 0.8, fontFamily: F.medium }}>{x.pct}</T>
                <View style={{ flex: 1.5 }}>
                  <T num style={{ fontFamily: x.strong ? F.bold : F.medium, fontSize: 14 }}>{fk(x.load)} kg</T>
                  {barra ? <T v="small" muted>{platesText(x.load)}</T> : null}
                </View>
              </View>
            ))}
          </View>
          <T v="small" muted>
            {reps + rir} = {reps} reps hechas + {rir} en reserva.{" "}
            {kino
              ? "En Kino rep subes de peso en cada serie: la última apunta al tope del rango con 1 rep en reserva y las anteriores son la rampa. No necesita calentamiento aparte."
              : `La serie pesada apunta al tope de su rango dejando 1 rep en reserva; las demás bajan ${ex.dropKg ? `${fk(ex.dropKg)} kg por mano` : "10 %"}, como indica el curso.`}
            {!res.reliable ? <T v="small" color={c.bad}> Con menos de 3 o más de 10 reps la estimación pierde precisión.</T> : null}
          </T>
          {e > 0 && reps > 0 ? null : <T v="small" color={c.bad}>Escribe un peso y las reps que hiciste.</T>}
        </View>
      </View>
    </Card>
  );
}

// ── Nutrición ───────────────────────────────────────────
function MacroCard({ title, kcal, days }: { title: string; kcal: number; days: string }) {
  const { c } = useTheme();
  const m = macros(kcal, NUTRITION.proteinG, NUTRITION.fatPct);
  const items: [string, number, string][] = [
    ["Proteína", m.proteinG, c.accent],
    ["Grasa", m.fatG, c.bronze],
    ["Carbos", m.carbsG, c.plates["20"]],
  ];
  return (
    <Card style={{ gap: 10, flex: 1 }}>
      <CardHead title={title} right={days} />
      <T style={{ fontFamily: F.extrabold, fontSize: 44, lineHeight: 46 }} num>
        {thousands(kcal)}
        <T style={{ fontSize: 18, color: c.muted, fontFamily: F.bold }}> kcal</T>
      </T>
      <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" }} accessibilityElementsHidden>
        <View style={{ width: `${m.pct.protein}%`, backgroundColor: c.accent }} />
        <View style={{ width: `${m.pct.fat}%`, backgroundColor: c.bronze }} />
        <View style={{ width: `${m.pct.carbs}%`, backgroundColor: c.plates["20"] }} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {items.map(([name, g, col]) => (
          <View key={name} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: col }} />
              <T v="small" muted>{name}</T>
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
    ["De dónde salen los números", "El curso estima el mantenimiento en 15 kcal por libra de peso: 232 lb × 15 ≈ 3,490 kcal. El Greek God no trae un protocolo de corte, así que se aplica su idea de ciclar calorías (más en días de pesas) con déficit: unas 5,000 kcal menos por semana, alrededor de −0.6 kg semanales."],
    ["Calibración", "Mira el promedio de 2 semanas. Si bajas menos de 0.4 kg por semana, quita 10 % a ambos días. Si bajas más de 1 kg por semana o la fuerza cae, súmale 10 %."],
    ["Proteína primero", "195 g diarios (1 g por libra de un peso meta de ~88 kg). Te ayuda a conservar músculo y a llegar con menos hambre. Tu proteína isolada cubre lo que falte."],
    ["Horario", "Opcional: ayuno de 16 h con café y agua, comidas grandes después de entrenar y en la noche. Si entrenas en ayunas, 10 g de BCAA antes. Fin de semana fuera: elige platos con proteína a la plancha y controla la porción de carbos."],
  ];
  return (
    <View style={{ gap: 16 }}>
      <CardHead h="h2" title="Nutrición para bajar grasa" right="estimado inicial · calibrar en 2 semanas" />
      <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
        <MacroCard title="Día de pesas" kcal={NUTRITION.liftDayKcal} days="lun · mié · vie" />
        <MacroCard title="Día sin pesas" kcal={NUTRITION.restDayKcal} days="mar · jue · sáb · dom" />
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
    ["Doble progresión", "Trabajas dentro de un rango. Cuando llegas al tope en una serie, la próxima sesión subes 2.5 kg en barra (2 kg en mancuernas) y vuelves a la parte baja del rango. Meta: +4 a +7 kg al mes en los básicos."],
    ["La serie pesada primero", "En pirámide inversa la serie 1 va a una rep del fallo. Luego bajas ~10 % y buscas 1–2 reps más. Ninguna otra serie se lleva al fallo."],
    ["Descansos completos", "3 min entre series de básicos, 4–5 min después del press inclinado, 2 min en accesorios y piernas, 10–15 s entre mini-series de rest-pause. La app te los cuenta."],
    ["Del jalón a las dominadas", "Hoy no haces dominadas, así que el curso indica jalón supino hasta poder. Las negativas son un añadido para llegar antes. Con 5 dominadas limpias haces 3 series a peso corporal; con 8, empiezas a lastrar (4, 6 y 8 reps, +1.25 kg por sesión)."],
    ["Mesetas", "Si un básico no sube en 2–3 sesiones seguidas, no cambies todo: rota a una variante del mismo patrón (inclinado con barra → con mancuernas) y vuelve a subir."],
    ["Registra todo", "Cada serie que no anotas es progreso que no puedes medir. La fuerza que sube mientras el peso baja es la señal de que conservas el músculo."],
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
