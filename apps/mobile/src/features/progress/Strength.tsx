// Pestaña Fuerza: levantamientos clave (serie pesada) y estándares Kinobody relativos al peso.
import { dayNumber, fk, round, ROUTINES, STANDARDS, type LiftSeries } from "@lifemaxxing/core";
import { useState } from "react";
import { View } from "react-native";
import { LineChart } from "../../components/charts";
import { Card, CardHead, Empty, ErrorBox, Grid, Loading, T, useLayout } from "../../components/ui";
import { useLifts } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { signed } from "./util";

export function StrengthPane() {
  const q = useLifts();
  const { isDesktop } = useLayout();
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const { lifts, bodyWeightKg, pullups } = q.data;
  return (
    <>
      <View>
        <CardHead h="h2" title="Levantamientos clave" right="serie pesada · kg" />
        <Grid cols={isDesktop ? 3 : 1} gap={16}>
          {lifts.map((s) => (
            <LiftCard key={s.exerciseId} s={s} pullups={s.exerciseId === "jal" ? pullups : null} />
          ))}
        </Grid>
      </View>
      <StandardsCard lifts={lifts} bw={bodyWeightKg} pullups={pullups} />
    </>
  );
}

/** Rutina (A/B) donde aparece el ejercicio, para el estado vacío. */
function routineOf(exerciseId: string): string {
  const r = ROUTINES.find((x) => x.exercises.some((e) => e.exerciseId === exerciseId || e.altExerciseId === exerciseId));
  return r ? `Workout ${r.key}` : "Workout A/B";
}

function LiftCard({ s, pullups }: { s: LiftSeries; pullups: number | null }) {
  const { c } = useTheme();
  const pts = s.points;
  const last = pts[pts.length - 1];
  if (!last) {
    return (
      <Card style={{ gap: 8, flexGrow: 1 }}>
        <T style={{ fontFamily: F.bold }}>{s.name}</T>
        <T style={{ fontFamily: F.extrabold, fontSize: 36, lineHeight: 40, color: c.muted }}>—</T>
        <T v="small" muted>
          Sin registros todavía: aparece tras tu primer {routineOf(s.exerciseId)}.
        </T>
      </Card>
    );
  }
  const first = pts[0];
  const gain = pts.length >= 2 ? last.weightKg - first.weightKg : null;
  const days = dayNumber(last.date) - dayNumber(first.date);
  const perMonth = gain != null && days >= 14 ? (gain / days) * 30.4 : null;
  const notes = [
    `1RM estimado ${fk(Math.round(last.e1rmKg))} kg`,
    perMonth != null ? `ritmo ${signed(perMonth)} kg/mes` : null,
    pullups != null ? `dominadas: ${pullups} reps` : null,
  ].filter(Boolean);
  return (
    <Card style={{ flexGrow: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <T style={{ fontFamily: F.bold, flexShrink: 1 }}>{s.name}</T>
        {gain != null ? (
          <T v="small" num style={{ fontFamily: F.semibold, color: gain > 0 ? c.good : c.muted }}>
            {signed(gain)} kg
          </T>
        ) : null}
      </View>
      <T num style={{ fontFamily: F.extrabold, fontSize: 36, lineHeight: 40 }}>
        {last.weightKg > 0 ? fk(last.weightKg) : "PC"}
        <T style={{ fontSize: 18, lineHeight: 22, fontFamily: F.bold, color: c.muted }}>
          {last.weightKg > 0 ? " kg" : ""} × {last.reps}
        </T>
      </T>
      <View style={{ marginVertical: 6 }}>
        <LineChart
          ys={pts.map((p) => p.weightKg)}
          spark
          height={84}
          endPad={46}
          aria={`${s.name}: serie pesada de ${fk(first.weightKg)} a ${fk(last.weightKg)} kg en ${pts.length} sesiones`}
        />
      </View>
      <T v="small" muted num>
        {notes.join(" · ")}
      </T>
    </Card>
  );
}

// ── Estándares ──────────────────────────────────────────
function lastHeavy(lifts: LiftSeries[], id: string): number | null {
  const pts = lifts.find((l) => l.exerciseId === id)?.points ?? [];
  return pts.length ? pts[pts.length - 1].weightKg : null;
}

function StandardsCard({ lifts, bw, pullups }: { lifts: LiftSeries[]; bw: number | null; pullups: number | null }) {
  const { wide } = useLayout();
  const head = <CardHead title="Estándares Kinobody" right="relativos a tu peso" />;
  if (bw == null || bw <= 0) {
    return (
      <Card>
        {head}
        <Empty title="Falta tu peso" text="Registra un check-in para comparar tus levantamientos con los estándares." />
      </Card>
    );
  }
  const inc = lastHeavy(lifts, "inc");
  const ohp = lastHeavy(lifts, "ohp");
  const good = Math.round(bw);
  const goodOhp = fk(round(bw * 0.7, 2.5));
  return (
    <Card>
      {head}
      <Grid cols={wide ? 2 : 1} gap={18}>
        <StdRow
          name={STANDARDS.inc.name}
          ratio={(inc ?? 0) / bw}
          marks={STANDARDS.inc.marks}
          max={STANDARDS.inc.max}
          txt={inc != null ? `${fk(inc)} kg = ${(inc / bw).toFixed(2)} × tu peso · Good: ${good} kg` : `Sin registro · Good: ${good} kg`}
        />
        <StdRow
          name={STANDARDS.ohp.name}
          ratio={(ohp ?? 0) / bw}
          marks={STANDARDS.ohp.marks}
          max={STANDARDS.ohp.max}
          txt={ohp != null ? `${fk(ohp)} kg = ${(ohp / bw).toFixed(2)} × · Good: ${goodOhp} kg` : `Sin registro · Good: ${goodOhp} kg`}
        />
        <StdRow
          name="Dominadas a peso corporal"
          ratio={pullups ?? 0}
          marks={[
            [5, "5 · sin lastre"],
            [8, "8 · lastrar"],
          ]}
          max={8}
          txt={pullups != null ? `${pullups} reps · luego Good: +30 % de tu peso` : "Sin registro"}
        />
      </Grid>
    </Card>
  );
}

const LABEL_CHAR_W = 6; // ancho aproximado de un carácter a 10 px

/** Fila de estándar: barra de progreso con marcas (como `row()` del prototipo). */
function StdRow({ name, ratio, marks, max, txt }: { name: string; ratio: number; marks: readonly (readonly [number, string])[]; max: number; txt: string }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const pct = Math.max(0, Math.min(100, (ratio / max) * 100));
  // Posición de las etiquetas en px: centradas en su marca, la última alineada a la derecha y sin solaparse.
  const widths = marks.map(([, l]) => l.length * LABEL_CHAR_W + 2);
  const lefts = marks.map(([m], i) => (i === marks.length - 1 ? w - widths[i] : Math.max(0, (m / max) * w - widths[i] / 2)));
  for (let i = marks.length - 2; i >= 0; i--) lefts[i] = Math.max(0, Math.min(lefts[i], lefts[i + 1] - widths[i] - 6));
  return (
    <View accessible accessibilityLabel={`${name}: ${txt}`} style={{ minWidth: 0 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: 10 }}>
        <T style={{ fontFamily: F.semibold }}>{name}</T>
        <T v="small" muted num>
          {txt}
        </T>
      </View>
      <View
        onLayout={(e) => {
          const nw = Math.round(e.nativeEvent.layout.width);
          if (nw !== w) setW(nw);
        }}
        style={{ height: 10, backgroundColor: c.surface2, borderRadius: 5, marginTop: 8 }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: c.accent, borderRadius: 5 }} />
        {marks.map(([m]) => (
          <View key={m} style={{ position: "absolute", top: -4, bottom: -4, width: 2, left: `${(m / max) * 100}%`, marginLeft: -1, backgroundColor: c.fg, opacity: 0.6 }} />
        ))}
      </View>
      <View style={{ height: 16, marginTop: 4 }}>
        {w > 0
          ? marks.map(([m, l], i) => (
              <T key={m} numberOfLines={1} style={{ position: "absolute", left: lefts[i], top: 0, fontFamily: F.medium, fontSize: 10, lineHeight: 14, color: c.muted }}>
                {l}
              </T>
            ))
          : null}
      </View>
    </View>
  );
}
