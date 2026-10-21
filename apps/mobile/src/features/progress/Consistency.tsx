// Pestaña Constancia: mapa de actividad (filas = semanas, columnas L–D), sombreado por volumen con 5 niveles.
import { addDays, DAY_LETTERS, mondayOf, programPosition, thousands, type ActivityResponse, type RoutineKey } from "@lifemaxxing/core";
import { type ReactNode } from "react";
import { View } from "react-native";
import { IconFlame } from "../../components/icons";
import { Card, CardHead, Empty, ErrorBox, Loading, T } from "../../components/ui";
import { useActivity, useOverview } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F, heatLevels } from "../../theme/tokens";
import { shortDate, useProfileDates } from "./util";

const WEEKS = 26;
const CELL_H = 30;
const LABEL_W = 34;

type CellKind = "lift" | "c" | "missed" | "planned" | "rest";
interface Cell {
  date: string;
  kind: CellKind;
  key: RoutineKey | null;
  level: number;
  isToday: boolean;
}

export function ConsistencyPane() {
  const q = useActivity(WEEKS);
  const { start, today } = useProfileDates();
  const head = (n: number | null) => <CardHead title="Constancia" right={n ? `últimas ${n} ${n === 1 ? "semana" : "semanas"}` : `hasta ${WEEKS} semanas`} />;
  if (q.isPending) {
    return (
      <Card>
        {head(null)}
        <Loading />
      </Card>
    );
  }
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;
  if (!a.days.length) {
    return (
      <Card>
        {head(null)}
        <Empty title="Aún no hay entrenos" text="Cuando termines tu primer entreno, aquí verás tu constancia semana a semana." />
      </Card>
    );
  }
  const grid = buildGrid(a, start || a.programStartDate, today);
  return (
    <Card>
      {head(grid.length)}
      <Heatmap weeks={grid} start={start || a.programStartDate} totalSessions={a.days.reduce((n, d) => n + d.sessions, 0)} />
      <HeatLegend />
      <Totals a={a} />
    </Card>
  );
}

function buildGrid(a: ActivityResponse, start: string, today: string): Cell[][] {
  const byDate = new Map<string, { lift: number; liftKey: RoutineKey | null; c: boolean }>();
  for (const d of a.days) {
    const cur = byDate.get(d.date) ?? { lift: 0, liftKey: null, c: false };
    if (d.routineKey === "C") cur.c = true;
    else {
      cur.lift += Number(d.volumeKg) || 0;
      cur.liftKey = cur.liftKey ?? d.routineKey;
    }
    byDate.set(d.date, cur);
  }
  const liftVols = [...byDate.values()].filter((x) => x.liftKey).map((x) => x.lift);
  const maxV = Math.max(1, ...liftVols);
  const level = (v: number) => {
    const r = v / maxV;
    return r <= 0.25 ? 1 : r <= 0.5 ? 2 : r <= 0.75 ? 3 : 4;
  };

  // Desde la semana del inicio del programa (o del primer entreno, si es anterior), sin pasar de las 26 semanas.
  const earliest = [start, a.days[0]?.date ?? start, today].sort()[0];
  const first = mondayOf(earliest > a.from ? earliest : a.from);
  const last = mondayOf(today);
  const weeks: Cell[][] = [];
  for (let m = first; m <= last; m = addDays(m, 7)) {
    const row: Cell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(m, i);
      const got = byDate.get(date);
      const p = programPosition(date, start);
      const planned = p.beforeStart || p.finished ? null : p.routineKey;
      let kind: CellKind = "rest";
      let key: RoutineKey | null = null;
      if (got?.liftKey) {
        kind = "lift";
        key = got.liftKey;
      } else if (got?.c) {
        kind = "c";
        key = "C";
      } else if (planned && date < today && p.isLiftDay) {
        kind = "missed";
        key = planned;
      } else if (planned && date >= today) {
        kind = "planned";
        key = planned;
      }
      row.push({ date, kind, key, level: kind === "lift" ? level(got!.lift) : 0, isToday: date === today });
    }
    weeks.push(row);
  }
  return weeks;
}

function Heatmap({ weeks, start, totalSessions }: { weeks: Cell[][]; start: string; totalSessions: number }) {
  const { c } = useTheme();
  const levels = heatLevels(c);
  const missed = weeks.flat().filter((x) => x.kind === "missed").length;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Mapa de constancia: ${totalSessions} sesiones en ${weeks.length} semanas${missed ? `, ${missed} ${missed === 1 ? "día de pesas faltado" : "días de pesas faltados"}` : ""}.`}
      style={{ gap: 5 }}
    >
      <View style={{ flexDirection: "row", gap: 5 }}>
        <View style={{ width: LABEL_W }} />
        {DAY_LETTERS.map((d) => (
          <T key={d} v="tiny" muted center style={{ flex: 1, fontSize: 10 }}>
            {d}
          </T>
        ))}
      </View>
      {weeks.map((row) => {
        const w = programPosition(row[0].date, start).week;
        return (
          <View key={row[0].date} style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <T v="tiny" muted num style={{ width: LABEL_W, fontSize: 10 }} numberOfLines={1}>
              {w >= 1 && w <= 24 ? `S${w}` : shortDate(row[0].date)}
            </T>
            {row.map((cell) => {
              const bg =
                cell.kind === "lift" ? levels[cell.level] : cell.kind === "c" ? c.bronzeSoft : cell.kind === "missed" ? "transparent" : levels[0];
              const fg =
                cell.kind === "lift" ? (cell.level >= 3 ? c.onAccent : c.fg) : cell.kind === "c" ? c.bronze : cell.kind === "missed" ? c.bad : c.muted;
              return (
                <View
                  key={cell.date}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: CELL_H,
                    borderRadius: 5,
                    backgroundColor: bg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: cell.isToday ? 2 : cell.kind === "missed" ? 1.5 : 0,
                    borderStyle: cell.kind === "missed" && !cell.isToday ? "dashed" : "solid",
                    borderColor: cell.isToday ? c.fg : c.bad,
                  }}
                >
                  {cell.key ? (
                    <T style={{ fontFamily: F.bold, fontSize: 11, lineHeight: 13, color: fg, opacity: cell.kind === "planned" ? 0.6 : 1 }}>{cell.key}</T>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function Swatch({ bg, border, dashed }: { bg: string; border?: string; dashed?: boolean }) {
  return (
    <View
      style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: bg, borderWidth: border ? 1.5 : 0, borderColor: border, borderStyle: dashed ? "dashed" : "solid" }}
    />
  );
}

function HeatLegend() {
  const { c } = useTheme();
  const levels = heatLevels(c);
  const item = (sw: ReactNode, label: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {sw}
      <T v="small" muted style={{ fontSize: 12, lineHeight: 16 }}>
        {label}
      </T>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 8, marginTop: 12 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <T v="small" muted style={{ fontSize: 12, lineHeight: 16, marginRight: 2 }}>
          Pesas: menos
        </T>
        {levels.slice(1).map((l) => (
          <Swatch key={l} bg={l} />
        ))}
        <T v="small" muted style={{ fontSize: 12, lineHeight: 16, marginLeft: 2 }}>
          más volumen
        </T>
      </View>
      {item(<Swatch bg={c.bronzeSoft} />, "Cardio + abs")}
      {item(<Swatch bg="transparent" border={c.bad} dashed />, "Faltó")}
      {item(<Swatch bg={levels[0]} />, "Descanso / caminata")}
    </View>
  );
}

function Totals({ a }: { a: ActivityResponse }) {
  const { c } = useTheme();
  const ov = useOverview();
  const vol = a.days.filter((d) => d.routineKey !== "C").reduce((s, d) => s + (Number(d.volumeKg) || 0), 0);
  const o = ov.data;
  return (
    <View style={{ marginTop: 14, gap: 6 }}>
      {o ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ paddingTop: 1 }}>
            <IconFlame color={o.streak.weeks > 0 ? c.accent : c.muted} />
          </View>
          <T v="small" num style={{ fontFamily: F.semibold, flex: 1, minWidth: 0 }}>
            {o.streak.weeks} {o.streak.weeks === 1 ? "semana seguida" : "semanas seguidas"} con 3 entrenos de pesas
            <T v="small" muted num>
              {" "}· {o.streak.thisWeekDone}/{o.streak.thisWeekPlanned} esta semana
            </T>
          </T>
        </View>
      ) : null}
      <T v="small" muted num>
        {o ? `${o.sessions.done} de ${o.sessions.planned} sesiones planificadas (${o.sessions.pct} %) · ` : ""}
        {thousands(vol)} kg levantados en este periodo
      </T>
    </View>
  );
}
