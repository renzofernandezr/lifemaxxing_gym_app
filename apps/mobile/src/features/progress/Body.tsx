// Pestaña Peso y grasa: tarjeta de peso (rango, meta, ritmo objetivo), % de grasa, medidas y lista de check-ins.
import { addDays, bodyComp, dayNumber, fk, NUTRITION, type CheckinDTO, type MeasurementDTO } from "@lifemaxxing/core";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Legend, LineChart } from "../../components/charts";
import { IconArrow, IconClose, IconPlus } from "../../components/icons";
import { Sheet } from "../../components/sheet";
import { useToast } from "../../components/toast";
import { Button, Card, CardHead, Empty, ErrorBox, Field, Loading, Seg, T } from "../../components/ui";
import { useCheckins, useDeleteCheckin, useMeasurements, useSaveMeasurement } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";
import { Pair } from "./layout";
import { longDate, parseNum, shortDate, signed, useOpenRound, useProfileDates } from "./util";

export function BodyPane({ onRegister }: { onRegister: () => void }) {
  return (
    <>
      <Pair stretch>
        <WeightCard onRegister={onRegister} />
        <FatCard />
      </Pair>
      <Pair>
        <MeasurementsCard />
        <CheckinsCard />
      </Pair>
    </>
  );
}

// ── Peso ────────────────────────────────────────────────
type Range = "1m" | "3m" | "all";
const RANGES: { key: Range; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "all", label: "Todo" },
];
const RANGE_TEXT: Record<Range, string> = { "1m": "en 1 mes", "3m": "en 3 meses", all: "desde el primer registro" };

function WeightCard({ onRegister }: { onRegister: () => void }) {
  const { c } = useTheme();
  const q = useCheckins();
  const { me, today } = useProfileDates();
  const [range, setRange] = useState<Range>("3m");
  const goal = me?.profile.goalWeightKg ?? null;
  const register = (
    <Button title="Registrar" small icon={<IconPlus color={c.fg} size={16} />} onPress={onRegister} accessibilityLabel="Registrar check-in" />
  );
  const head = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
      <View style={{ flexShrink: 1, gap: 4 }}>
        <T v="h3">Peso corporal</T>
        <T v="eyebrow">kg · semanal, en ayunas</T>
      </View>
      {register}
    </View>
  );
  if (q.isPending) {
    return (
      <Card style={{ flexGrow: 1 }}>
        {head}
        <Loading />
      </Card>
    );
  }
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const list = q.data;
  if (!list.length) {
    return (
      <Card style={{ flexGrow: 1 }}>
        {head}
        <Empty title="Aún no tienes check-ins" text="Registra tu peso de hoy para empezar a ver tu tendencia." />
      </Card>
    );
  }

  const from = range === "1m" ? addDays(today, -30) : range === "3m" ? addDays(today, -91) : null;
  const pts = from ? list.filter((x) => x.measuredOn >= from) : list;
  const current = list[list.length - 1];
  const delta = pts.length >= 2 ? pts[pts.length - 1].weightKg - pts[0].weightKg : null;
  const down = delta != null && delta < 0;
  const ys = pts.map((p) => p.weightKg);
  const xs = pts.map((p) => dayNumber(p.measuredOn));
  const refLine = pts.length >= 2 ? xs.map((d) => Math.round((pts[0].weightKg + (NUTRITION.targetRateKgPerWeek * (d - xs[0])) / 7) * 100) / 100) : undefined;
  const lo = Math.min(...ys, ...(refLine ?? []));
  const hi = Math.max(...ys, ...(refLine ?? []));
  const showGoal = goal != null && pts.length > 0 && (range === "all" || goal >= lo - Math.max(1, hi - lo));
  const toGo = goal != null ? current.weightKg - goal : null;

  return (
    <Card style={{ flexGrow: 1 }}>
      {head}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 14, rowGap: 4 }}>
        <T v="kpi" accessibilityLabel={`Peso actual ${fk(current.weightKg)} kilos`}>
          {fk(current.weightKg)}
          <T style={{ fontSize: 17, lineHeight: 20, fontFamily: F.bold, color: c.muted }}> kg</T>
        </T>
        {delta != null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessible accessibilityLabel={`${signed(delta)} kilos ${RANGE_TEXT[range]}`}>
            {Math.abs(delta) >= 0.05 ? <IconArrow up={!down} color={down ? c.good : c.fg} /> : null}
            <T v="small" num style={{ fontFamily: F.semibold, color: down ? c.good : c.fg }}>
              {signed(delta)} kg
            </T>
            <T v="small" muted>
              {RANGE_TEXT[range]}
            </T>
          </View>
        ) : null}
      </View>
      {goal != null && toGo != null ? (
        <T v="small" muted num style={{ marginTop: 2 }}>
          Meta {fk(goal)} kg · {toGo > 0 ? `faltan ${fk(Number(toGo.toFixed(1)))} kg` : "¡meta alcanzada!"}
        </T>
      ) : null}
      <View style={{ marginVertical: 12 }}>
        <Seg label="Rango del gráfico" options={RANGES} value={range} onChange={setRange} />
      </View>
      {pts.length ? (
        <>
          <LineChart
            ys={ys}
            xs={xs}
            labels={pts.map((p) => shortDate(p.measuredOn))}
            refLine={refLine}
            goal={showGoal ? goal : null}
            aria={`Peso en kg: ${pts.length} registros, de ${fk(ys[0])} a ${fk(ys[ys.length - 1])} kg`}
          />
          <Legend
            items={[
              { kind: "line", label: "Tu peso" },
              ...(refLine ? [{ kind: "ref" as const, label: `Ritmo objetivo ${signed(NUTRITION.targetRateKgPerWeek)} kg/sem` }] : []),
              ...(showGoal ? [{ kind: "goal" as const, label: `Meta ${fk(goal)} kg` }] : []),
            ]}
          />
        </>
      ) : (
        <T v="small" muted>
          Sin check-ins en este rango. Prueba con "Todo".
        </T>
      )}
    </Card>
  );
}

// ── Grasa ───────────────────────────────────────────────
function FatCard() {
  const q = useCheckins();
  const head = <CardHead title="Grasa corporal" right="% · balanza, en ayunas" />;
  if (q.isPending) {
    return (
      <Card style={{ flexGrow: 1 }}>
        {head}
        <Loading />
      </Card>
    );
  }
  if (q.isError) return null; // el error ya se muestra en la tarjeta de peso
  const pts = q.data.filter((x): x is CheckinDTO & { bodyFatPct: number } => x.bodyFatPct != null);
  if (!pts.length) {
    return (
      <Card style={{ flexGrow: 1 }}>
        {head}
        <Empty title="Sin datos de grasa corporal" text="Añade tu % de grasa en el próximo check-in (balanza de bioimpedancia, en ayunas)." />
      </Card>
    );
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  const c0 = bodyComp(first.weightKg, first.bodyFatPct);
  const c1 = bodyComp(last.weightKg, last.bodyFatPct);
  const note =
    pts.length >= 2 ? `Masa magra ${signed(c1.leanKg - c0.leanKg)} kg · grasa ${signed(c1.fatKg - c0.fatKg)} kg desde el inicio` : "Con un segundo registro verás tu composición.";
  return (
    <Card style={{ flexGrow: 1 }}>
      {head}
      <LineChart
        ys={pts.map((p) => p.bodyFatPct)}
        xs={pts.map((p) => dayNumber(p.measuredOn))}
        labels={pts.map((p) => shortDate(p.measuredOn))}
        aria={`Grasa corporal en %: de ${fk(first.bodyFatPct)} a ${fk(last.bodyFatPct)} %`}
      />
      <Legend items={[{ kind: "line", label: "Tu % de grasa" }, { kind: "none", label: note }]} />
    </Card>
  );
}

// ── Medidas ─────────────────────────────────────────────
const MEASURES: { key: "chestCm" | "armCm" | "waistCm"; label: string; better: -1 | 0 | 1 }[] = [
  { key: "chestCm", label: "Pecho", better: 0 },
  { key: "armCm", label: "Brazo", better: 1 },
  { key: "waistCm", label: "Cintura", better: -1 },
];

function MeasurementsCard() {
  const { c } = useTheme();
  const q = useMeasurements();
  const [open, setOpen] = useState(false);
  const list = q.data ?? [];
  const last = list[list.length - 1];
  const head = (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
      <View style={{ flexShrink: 1, gap: 4 }}>
        <T v="h3">Medidas</T>
        <T v="eyebrow">{last ? `cm · próxima: ${shortDate(addDays(last.measuredOn, 30))}` : "cm · una vez al mes"}</T>
      </View>
      <Button title="Añadir" small icon={<IconPlus color={c.fg} size={16} />} onPress={() => setOpen(true)} accessibilityLabel="Añadir medidas" />
    </View>
  );
  return (
    <Card>
      {head}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !list.length ? (
        <Empty title="Aún no tienes medidas" text="Mide pecho, brazo y cintura una vez al mes para ver cómo cambia tu cuerpo, aunque la balanza se estanque." />
      ) : (
        <MeasurementsTable list={list} />
      )}
      <T v="small" muted style={{ marginTop: 12 }}>
        En ayunas y relajado. Pecho a la altura de los pezones, brazo en su punto más ancho y cintura a la altura del ombligo.
      </T>
      <MeasurementSheet open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function MeasurementsTable({ list }: { list: MeasurementDTO[] }) {
  const { c } = useTheme();
  const rows = [...list].reverse();
  return (
    <View>
      <View style={{ flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <T v="eyebrow" style={{ flex: 1.2 }}>
          Fecha
        </T>
        {MEASURES.map((m) => (
          <T key={m.key} v="eyebrow" style={{ flex: 1, textAlign: "right" }}>
            {m.label}
          </T>
        ))}
      </View>
      {rows.map((r, i) => {
        const prev = rows[i + 1];
        return (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <T v="small" style={{ flex: 1.2, fontFamily: F.medium }}>
              {shortDate(r.measuredOn)}
            </T>
            {MEASURES.map((m) => {
              const v = r[m.key];
              const p = prev?.[m.key];
              const d = v != null && p != null ? v - p : null;
              const good = d != null && m.better !== 0 && Math.sign(d) === m.better;
              return (
                <View key={m.key} style={{ flex: 1, alignItems: "flex-end" }}>
                  <T num style={{ fontFamily: F.semibold, fontSize: 14 }}>
                    {v != null ? fk(v) : "—"}
                  </T>
                  {d != null && Math.abs(d) >= 0.05 ? (
                    <T v="tiny" num style={{ color: good ? c.good : c.muted }}>
                      {signed(d)}
                    </T>
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

function MeasurementSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const round = useOpenRound(open);
  return (
    <Sheet open={open} onClose={onClose} title="Medidas del mes">
      <MeasurementForm key={round} onClose={onClose} />
    </Sheet>
  );
}

const LIMITS = { chestCm: [30, 250], armCm: [10, 100], waistCm: [30, 250] } as const;

function MeasurementForm({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { today } = useProfileDates();
  const save = useSaveMeasurement();
  const [vals, setVals] = useState({ chestCm: "", armCm: "", waistCm: "" });
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const out: { chestCm: number | null; armCm: number | null; waistCm: number | null } = { chestCm: null, armCm: null, waistCm: null };
    for (const m of MEASURES) {
      const raw = vals[m.key];
      if (raw.trim() === "") continue;
      const v = parseNum(raw);
      const [min, max] = LIMITS[m.key];
      if (!(v >= min && v <= max)) {
        setErr(`${m.label}: escribe un valor entre ${min} y ${max} cm.`);
        return;
      }
      out[m.key] = Math.round(v * 10) / 10;
    }
    if (out.chestCm == null && out.armCm == null && out.waistCm == null) {
      setErr("Escribe al menos una medida.");
      return;
    }
    setErr(null);
    save.mutate(
      { measuredOn: today, ...out },
      {
        onSuccess: () => {
          toast("Medidas guardadas");
          onClose();
        },
        onError: (e) => toast(e instanceof Error ? e.message : "No se pudo guardar", "error"),
      },
    );
  };
  return (
    <>
      <T v="small" muted>
        Fecha: hoy, {longDate(today)}. Deja vacío lo que no midas.
      </T>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {MEASURES.map((m) => (
          <Field
            key={m.key}
            label={`${m.label} (cm)`}
            value={vals[m.key]}
            onChangeText={(s) => setVals((v) => ({ ...v, [m.key]: s }))}
            keyboardType="decimal-pad"
          />
        ))}
      </View>
      {err ? (
        <T v="small" style={{ color: c.bad }}>
          {err}
        </T>
      ) : null}
      <Button title="Guardar medidas" variant="primary" loading={save.isPending} onPress={submit} />
    </>
  );
}

// ── Lista de check-ins ──────────────────────────────────
function CheckinsCard() {
  const q = useCheckins();
  const [all, setAll] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  if (q.isPending || q.isError || !q.data.length) return null;
  const rows = [...q.data].reverse();
  const shown = all ? rows : rows.slice(0, 6);
  return (
    <Card>
      <CardHead title="Check-ins" right={`${rows.length} ${rows.length === 1 ? "registro" : "registros"}`} />
      {shown.map((r, i) => (
        <CheckinRow key={r.id} r={r} prev={rows[i + 1] ?? null} first={i === 0} confirming={confirm === r.id} onConfirm={setConfirm} />
      ))}
      {rows.length > 6 ? (
        <Button variant="ghost" title={all ? "Ver menos" : `Ver todos (${rows.length})`} onPress={() => setAll((x) => !x)} style={{ alignSelf: "flex-start", marginTop: 4 }} />
      ) : null}
    </Card>
  );
}

function CheckinRow({
  r,
  prev,
  first,
  confirming,
  onConfirm,
}: {
  r: CheckinDTO;
  prev: CheckinDTO | null;
  first: boolean;
  confirming: boolean;
  onConfirm: (id: string | null) => void;
}) {
  const { c } = useTheme();
  const toast = useToast();
  const del = useDeleteCheckin();
  const d = prev ? r.weightKg - prev.weightKg : null;
  const remove = () =>
    del.mutate(r.id, {
      onSuccess: () => {
        toast("Check-in eliminado");
        onConfirm(null);
      },
      onError: (e) => toast(e instanceof Error ? e.message : "No se pudo eliminar", "error"),
    });
  return (
    <View style={{ paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: c.line, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={{ fontFamily: F.semibold, fontSize: 14 }}>{longDate(r.measuredOn)}</T>
          {d != null ? (
            <T v="tiny" num style={{ color: d < 0 ? c.good : c.muted }}>
              {signed(d)} kg vs. el anterior
            </T>
          ) : null}
        </View>
        <T num style={{ fontFamily: F.bold, fontSize: 15 }}>
          {fk(r.weightKg)} kg
        </T>
        <T num muted style={{ width: 56, textAlign: "right", fontSize: 14 }}>
          {r.bodyFatPct != null ? `${fk(r.bodyFatPct)} %` : "—"}
        </T>
        <Pressable
          onPress={() => onConfirm(confirming ? null : r.id)}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar check-in del ${longDate(r.measuredOn)}`}
          hitSlop={6}
          style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: pressed || confirming ? c.surface2 : "transparent" })}
        >
          <IconClose color={confirming ? c.bad : c.muted} size={16} />
        </Pressable>
      </View>
      {confirming ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 }} accessibilityLiveRegion="polite">
          <T v="small" muted style={{ flexGrow: 1 }}>
            ¿Eliminar este check-in?
          </T>
          <Button title="Cancelar" small onPress={() => onConfirm(null)} />
          <Button title="Eliminar" small variant="danger" loading={del.isPending} onPress={remove} />
        </View>
      ) : null}
    </View>
  );
}
