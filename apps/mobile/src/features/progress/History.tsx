// Pestaña Historial: sesiones terminadas (paginadas); al tocar una se despliega su resumen.
import { fk, localDate, ROUTINES, thousands, type DoneSet, type HistoryItem, type RoutineKey, type SetUnit, type SummaryExercise } from "@lifemaxxing/core";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { IconChevron } from "../../components/icons";
import { Button, Card, CardHead, Empty, ErrorBox, Loading, Pill, T, useLayout } from "../../components/ui";
import { useHistory, useSessionDetail } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { longDate, useProfileDates } from "./util";

export function HistoryPane() {
  const q = useHistory();
  const [open, setOpen] = useState<string | null>(null);
  const head = <CardHead title="Historial reciente" right="sesiones" />;
  if (q.isPending) {
    return (
      <Card>
        {head}
        <Loading />
      </Card>
    );
  }
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data.pages.flatMap((p) => p.items);
  return (
    <Card>
      {head}
      {!items.length ? (
        <Empty title="Sin historial" text="Aún no hay sesiones guardadas. Tu primer entreno aparecerá aquí." />
      ) : (
        items.map((it, i) => <HistoryRow key={it.id} it={it} first={i === 0} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)} />)
      )}
      {q.hasNextPage ? (
        <Button title="Cargar más" small loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} style={{ alignSelf: "flex-start", marginTop: 12 }} />
      ) : null}
    </Card>
  );
}

export function RoutineTag({ k, size = 30 }: { k: RoutineKey; size?: number }) {
  const { c } = useTheme();
  const isC = k === "C";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: isC ? c.bronzeSoft : c.accentSoft }}
    >
      <T style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 15, color: isC ? c.bronze : c.accentInk }}>{k}</T>
    </View>
  );
}

function HistoryRow({ it, first, open, onToggle }: { it: HistoryItem; first: boolean; open: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const { tz } = useProfileDates();
  const date = localDate(new Date(it.startedAt), tz);
  const title = `Semana ${it.programWeek} · ${longDate(date)}`;
  const sub = it.highlights || `${it.durationMin} min · ${it.setsCount} series`;
  const record = it.recordsCount > 0;
  // En pantallas angostas la etiqueta "Récord" va junto al subtítulo para no partir el título en dos líneas.
  const compact = useLayout().width < 520;
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${it.routineName}, ${title}. ${sub}${it.recordsCount > 0 ? ". Récord" : ""}`}
        accessibilityHint={open ? "Oculta el detalle" : "Muestra el detalle de la sesión"}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: first ? 0 : 12, paddingBottom: 12, opacity: pressed ? 0.7 : 1 })}
      >
        <RoutineTag k={it.routineKey} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontFamily: F.bold, fontSize: 15 }}>{title}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {record && compact ? <Pill tone="solid" style={{ paddingVertical: 2, paddingHorizontal: 7 }}>Récord</Pill> : null}
            <T v="small" muted numberOfLines={open ? undefined : 1} style={{ flex: 1, minWidth: 0 }}>
              {sub}
            </T>
          </View>
        </View>
        {record && !compact ? <Pill tone="solid">Récord</Pill> : null}
        <IconChevron dir={open ? "up" : "down"} color={c.muted} size={16} />
      </Pressable>
      {open ? <SessionDetail id={it.id} /> : null}
    </View>
  );
}

/** Unidad de cada ejercicio según el programa (para mostrar min, s o por lado). */
const UNIT_BY_EXERCISE: Record<string, SetUnit> = (() => {
  const out: Record<string, SetUnit> = {};
  for (const r of ROUTINES) {
    for (const e of r.exercises) {
      const u = e.sets[0]?.unit ?? "reps";
      out[e.exerciseId] = u;
      if (e.altExerciseId) out[e.altExerciseId] = out[e.altExerciseId] ?? u;
    }
  }
  return out;
})();

function setText(ex: SummaryExercise, s: DoneSet): string {
  const unit = ex.scheme === "cardio" ? "min" : (UNIT_BY_EXERCISE[ex.exerciseId] ?? "reps");
  if (unit === "min") return `${s.reps} min`;
  if (unit === "sec") return s.weightKg > 0 ? `${fk(s.weightKg)}×${s.reps} s` : `${s.reps} s`;
  const reps = unit === "reps_per_side" ? `${s.reps}/lado` : String(s.reps);
  return s.weightKg > 0 ? `${fk(s.weightKg)}×${reps}` : `PC×${reps}`;
}

function SessionDetail({ id }: { id: string }) {
  const { c } = useTheme();
  const q = useSessionDetail(id);
  if (q.isPending) return <Loading label="Cargando sesión…" />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data.summary;
  if (!s) {
    return (
      <T v="small" muted style={{ paddingLeft: 42, paddingBottom: 12 }}>
        Esta sesión no tiene resumen.
      </T>
    );
  }
  const done = s.exercises.filter((e) => !e.skipped);
  return (
    <View style={{ paddingLeft: 42, paddingBottom: 14, gap: 12 }}>
      <T v="small" muted num>
        {s.durationMin} min · {s.setsCount} series{s.volumeKg > 0 ? ` · ${thousands(s.volumeKg)} kg de volumen` : ""}
      </T>
      {done.map((e) => (
        <View key={e.exerciseId} style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <T style={{ fontFamily: F.semibold, fontSize: 14, flexShrink: 1 }}>{e.name}</T>
            {e.isRecord ? <Pill tone="solid">Récord</Pill> : null}
          </View>
          <T v="small" num style={{ fontFamily: F.medium }}>
            {e.sets.map((x) => setText(e, x)).join(" · ")}
          </T>
          {e.nextText ? (
            <T v="small" style={{ color: e.reachedTop ? c.accentInk : c.muted }}>
              {e.nextText}
            </T>
          ) : null}
        </View>
      ))}
    </View>
  );
}
