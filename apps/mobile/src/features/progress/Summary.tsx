// Pestaña Resumen: tira semanal L–D + "Hoy", racha, KPIs y check-in semanal.
import {
  addDays,
  dayNumber,
  DAY_LETTERS,
  fk,
  mondayOf,
  nextSession,
  programPosition,
  routineName,
  type OverviewResponse,
  type TodayResponse,
} from "@lifemaxxing/core";
import { router } from "expo-router";
import { type ReactNode } from "react";
import { View } from "react-native";
import { IconFlame, IconPlus } from "../../components/icons";
import { Button, Card, CardHead, Divider, Empty, ErrorBox, Grid, Loading, Pill, T, useLayout } from "../../components/ui";
import { isDemo } from "../../lib/demo";
import { useOverview, useToday } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";
import { CHECKIN_HINT } from "./CheckinSheet";
import { longDate, shortDate, signed, useProfileDates } from "./util";

export function SummaryPane({ onRegister }: { onRegister: () => void }) {
  return (
    <>
      {isDemo() ? <DemoNotice /> : null}
      <WeekCard />
      <Kpis />
      <CheckinCard onRegister={onRegister} />
    </>
  );
}

function DemoNotice() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: c.bronzeSoft, borderWidth: 1, borderStyle: "dashed", borderColor: c.bronze, borderRadius: R, paddingHorizontal: 14, paddingVertical: 12 }}>
      <T style={{ color: c.bronze }} aria-hidden>
        ◐
      </T>
      <T v="small" style={{ flex: 1, fontSize: 14, lineHeight: 21 }}>
        <T v="small" style={{ fontSize: 14, fontFamily: F.bold, color: c.bronze }}>Modo demo. </T>
        Así se ve tu bitácora tras 8 semanas siguiendo el plan. Los números son simulados a partir de tu punto de partida (105.6 kg) y nada se guarda al recargar.
      </T>
    </View>
  );
}

// ── Semana ──────────────────────────────────────────────
function WeekCard() {
  const today = useToday();
  const overview = useOverview();
  if (today.isPending) {
    return (
      <Card>
        <Loading />
      </Card>
    );
  }
  if (today.isError) return <ErrorBox error={today.error} onRetry={() => today.refetch()} />;
  const t = today.data;
  const pos = t.position;
  const head = pos.beforeStart ? "Antes del inicio" : pos.finished ? "Programa completo" : `Semana ${pos.week} · ${pos.phase.name.split(" · ")[0]}`;
  return (
    <Card>
      <CardHead title="Esta semana" right={head} />
      <WeekStrip t={t} />
      {overview.data ? <StreakLine streak={overview.data.streak} /> : null}
      <View style={{ marginVertical: 14 }}>
        <Divider />
      </View>
      <TodayRow t={t} />
    </Card>
  );
}

function WeekStrip({ t }: { t: TodayResponse }) {
  const { c } = useTheme();
  const { start } = useProfileDates();
  const todayIso = t.position.date;
  const monday = mondayOf(todayIso);
  const done = new Map(t.weekDone.map((d) => [d.date, d.routineKey]));
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {DAY_LETTERS.map((letter, i) => {
        const date = addDays(monday, i);
        const p = programPosition(date, start);
        const planned = p.beforeStart || p.finished ? null : p.routineKey;
        const doneKey = done.get(date) ?? null;
        const isToday = date === todayIso;
        const status = doneKey ? `${routineName(doneKey)}, hecho` : planned ? `${routineName(planned)}${date < todayIso ? ", no registrado" : ", pendiente"}` : "descanso";
        const dot = doneKey ? (doneKey === "C" ? c.bronze : c.accent) : null;
        return (
          <View
            key={date}
            accessible
            accessibilityLabel={`${longDate(date)}${isToday ? ", hoy" : ""}, ${status}`}
            style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 6 }}
          >
            <T v="eyebrow" style={{ fontSize: 10, letterSpacing: 0.6, color: isToday ? c.accentInk : c.muted }}>
              {letter}
            </T>
            <View
              style={{
                width: "100%",
                maxWidth: 38,
                aspectRatio: 1,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: isToday ? 2 : 1,
                borderColor: isToday ? c.accent : doneKey ? c.line : "transparent",
                backgroundColor: isToday ? c.accentSoft : doneKey ? c.surface : c.surface2,
              }}
            >
              <T num style={{ fontFamily: isToday || doneKey ? F.bold : F.medium, fontSize: 14, color: isToday ? c.accentInk : doneKey ? c.fg : c.muted }}>
                {Number(date.slice(8, 10))}
              </T>
            </View>
            <View style={{ height: 14, alignItems: "center", justifyContent: "center" }}>
              {dot ? (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} />
              ) : planned ? (
                <T style={{ fontFamily: F.bold, fontSize: 10, lineHeight: 12, color: date < todayIso ? c.bad : c.muted }}>{planned}</T>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StreakLine({ streak }: { streak: OverviewResponse["streak"] }) {
  const { c } = useTheme();
  const on = streak.weeks > 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10 }}>
      <View style={{ paddingTop: 1 }}>
        <IconFlame color={on ? c.accent : c.muted} />
      </View>
      <T v="small" num style={{ fontFamily: F.semibold, flex: 1, minWidth: 0 }}>
        {streak.weeks} {streak.weeks === 1 ? "semana seguida" : "semanas seguidas"}
        <T v="small" muted num>
          {" "}· {streak.thisWeekDone}/{streak.thisWeekPlanned} esta semana
        </T>
      </T>
    </View>
  );
}

function TodayRow({ t }: { t: TodayResponse }) {
  const { start } = useProfileDates();
  const pos = t.position;
  const doneToday = t.weekDone.some((d) => d.date === pos.date);
  const nextAfterToday = nextSession(addDays(pos.date, 1), start);
  const when = (p: { daysAhead: number; dayName: string }, offset: number) => (p.daysAhead + offset === 1 ? "mañana" : p.dayName);
  const nextText = (p: typeof nextAfterToday, offset: number) => (p.routineKey ? `Próximo: ${when(p, offset)}, ${routineName(p.routineKey)}` : "");

  let title: string;
  let sub: string;
  let primary = false;
  let cta = "Ir a entrenar";
  if (t.activeSession) {
    title = `Entreno en curso · ${routineName(t.activeSession.routineKey)}`;
    sub = "Tu sesión sigue abierta. Retómala donde la dejaste.";
    cta = "Reanudar entreno";
    primary = true;
  } else if (pos.beforeStart) {
    title = `Empiezas el ${longDate(start)}`;
    sub = "Mientras tanto, registra tu peso de partida.";
  } else if (pos.finished) {
    title = "Programa completo";
    sub = "Terminaste las 24 semanas. Revisa tu progreso y define la siguiente meta.";
  } else if (pos.routineKey) {
    const routine = t.routines.find((r) => r.key === pos.routineKey);
    title = `Hoy · ${routineName(pos.routineKey)}`;
    sub = doneToday ? `Hecho. ${nextText(nextAfterToday, 1)}` : (routine?.focus ?? "");
    primary = !doneToday;
  } else {
    title = "Hoy · Descanso activo";
    sub = [nextText(t.next, 0), "40–60 min de caminata o actividad ligera."].filter(Boolean).join(" · ");
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 220, gap: 2 }}>
        <T v="h3">{title}</T>
        {sub ? (
          <T v="small" muted>
            {sub}
          </T>
        ) : null}
      </View>
      <Button title={cta} small variant={primary ? "primary" : "secondary"} onPress={() => router.push("/entrenar")} accessibilityHint="Abre la pestaña Entrenar" />
    </View>
  );
}

// ── KPIs ────────────────────────────────────────────────
function Kpi({ label, value, unit, children, hint }: { label: string; value: string | null; unit?: string; children?: ReactNode; hint: string }) {
  const { c } = useTheme();
  return (
    <Card pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16, flex: 1 }}>
      <T v="eyebrow">{label}</T>
      <T v="kpi" numberOfLines={1} style={{ marginTop: 6 }} accessibilityLabel={value ? `${label}: ${value} ${unit ?? ""}` : `${label}: sin datos`}>
        {value ?? "—"}
        {value && unit ? <T style={{ fontSize: 17, lineHeight: 20, fontFamily: F.bold, color: c.muted }}> {unit}</T> : null}
      </T>
      <T v="small" muted style={{ marginTop: 6 }}>
        {value ? children : hint}
      </T>
    </Card>
  );
}

function Good({ children, good }: { children: ReactNode; good: boolean }) {
  const { c } = useTheme();
  return <T v="small" num style={{ fontFamily: F.semibold, color: good ? c.good : c.fg }}>{children}</T>;
}

function Kpis() {
  const q = useOverview();
  const { isDesktop } = useLayout();
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const { weight, bodyFat, lean, sessions } = q.data;
  return (
    <Grid cols={isDesktop ? 4 : 2} gap={12}>
      <Kpi label="Peso" value={weight ? fk(weight.currentKg) : null} unit="kg" hint="Registra tu primer check-in para verlo.">
        {weight ? (
          <>
            <Good good={weight.deltaKg <= 0}>{signed(weight.deltaKg)} kg</Good> desde el inicio
            {weight.ratePerWeekKg != null ? ` · ${signed(weight.ratePerWeekKg, 2)} kg/sem` : ""}
          </>
        ) : null}
      </Kpi>
      <Kpi label="Grasa corporal" value={bodyFat ? fk(Number(bodyFat.currentPct.toFixed(1))) : null} unit="%" hint="Añade tu % de grasa en el check-in.">
        {bodyFat ? (
          <>
            {bodyFat.deltaPts != null ? (
              <>
                <Good good={bodyFat.deltaPts <= 0}>{signed(bodyFat.deltaPts)} pts</Good> ·{" "}
              </>
            ) : null}
            {fk(bodyFat.fatKg)} kg de grasa
          </>
        ) : null}
      </Kpi>
      <Kpi label="Masa magra" value={lean ? fk(lean.currentKg) : null} unit="kg" hint="Se calcula con tu peso y tu % de grasa.">
        {lean
          ? lean.deltaKg == null
            ? "Necesitas 2 check-ins con % de grasa."
            : `${signed(lean.deltaKg)} kg · ${lean.shareOfLossPct != null ? `${lean.shareOfLossPct} % de lo bajado` : "sin bajar de peso"}`
          : null}
      </Kpi>
      <Kpi label="Entrenos" value={sessions.planned > 0 ? String(sessions.done) : null} unit={`/ ${sessions.planned}`} hint="Cuentan desde el inicio del programa.">
        {sessions.pct} % de constancia
      </Kpi>
    </Grid>
  );
}

// ── Check-in ────────────────────────────────────────────
function CheckinCard({ onRegister }: { onRegister: () => void }) {
  const { c } = useTheme();
  const q = useOverview();
  const { today } = useProfileDates();
  const button = <Button title="Registrar" variant="primary" icon={<IconPlus color={c.onAccent} />} onPress={onRegister} accessibilityLabel="Registrar check-in" />;
  if (q.isPending) return null;
  if (q.isError) return null; // el error ya se muestra en los KPIs
  const o = q.data;
  const last = o.lastCheckin;
  const days = last ? dayNumber(today) - dayNumber(last.measuredOn) : null;
  return (
    <Card>
      <CardHead title="Check-in semanal" right={`Semana ${Math.max(1, o.position.week)}`} />
      <View style={{ maxWidth: 560, gap: 12 }}>
        {o.checkinsCount === 0 || !last ? (
          <Empty title="Aún no tienes check-ins" text="Registra tu peso de hoy para empezar a ver tu tendencia." action={<View style={{ marginTop: 4 }}>{button}</View>} />
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <T num style={{ fontFamily: F.semibold }}>
                Último: {fk(last.weightKg)} kg{last.bodyFatPct != null ? ` · ${fk(last.bodyFatPct)} %` : ""}
                <T muted> · {days === 0 ? "hoy" : shortDate(last.measuredOn)}</T>
              </T>
              {days != null && days >= 7 ? <Pill>Te toca</Pill> : null}
            </View>
            <T v="small" muted>
              {CHECKIN_HINT}
            </T>
            {button}
          </>
        )}
      </View>
    </Card>
  );
}
