// Hoja inferior para registrar el check-in semanal (peso y % de grasa), con la validación del prototipo.
import { fk, type CheckinFeedback } from "@lifemaxxing/core";
import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "../../components/sheet";
import { useToast } from "../../components/toast";
import { Button, Field, T } from "../../components/ui";
import { useCheckins, useSaveCheckin } from "../../lib/queries";
import { useTheme } from "../../theme/theme";
import { F, R } from "../../theme/tokens";
import { longDate, parseNum, useOpenRound, useProfileDates } from "./util";

export const CHECKIN_HINT =
  "Mismo día cada semana, al despertar, después del baño y antes de tomar agua. La balanza de bioimpedancia cambia con la hidratación: mira la tendencia, no un día suelto.";

/** El formulario se vuelve a montar (estado limpio) cada vez que se abre la hoja. */
export function CheckinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const round = useOpenRound(open);
  return (
    <Sheet open={open} onClose={onClose} title="Check-in semanal">
      <CheckinForm key={round} onClose={onClose} />
    </Sheet>
  );
}

function CheckinForm({ onClose }: { onClose: () => void }) {
  const { c } = useTheme();
  const toast = useToast();
  const { today } = useProfileDates();
  const checkins = useCheckins();
  const save = useSaveCheckin();
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [errors, setErrors] = useState<{ w?: string; f?: string }>({});
  const [feedback, setFeedback] = useState<CheckinFeedback | null>(null);

  const list = checkins.data ?? [];
  const last = list[list.length - 1] ?? null;
  const replacesToday = list.some((x) => x.measuredOn === today);

  const submit = () => {
    const w = parseNum(weight);
    const f = parseNum(fat);
    const next: { w?: string; f?: string } = {};
    if (!(w > 40 && w < 200)) next.w = "El peso debe estar entre 40 y 200 kg.";
    if (fat.trim() !== "" && !(f >= 3 && f <= 60)) next.f = "La grasa debe estar entre 3 y 60 %.";
    setErrors(next);
    if (next.w || next.f) return;
    save.mutate(
      { measuredOn: today, weightKg: Math.round(w * 10) / 10, bodyFatPct: fat.trim() === "" ? null : Math.round(f * 10) / 10 },
      {
        onSuccess: (res) => {
          toast("Check-in guardado");
          setFeedback(res.feedback);
        },
        onError: (err) => toast(err instanceof Error ? err.message : "No se pudo guardar", "error"),
      },
    );
  };

  if (feedback) {
    const toneColor = feedback.tone === "good" ? c.good : feedback.tone === "warn" ? c.accentInk : c.fg;
    return (
      <View style={{ gap: 14 }} accessibilityLiveRegion="polite">
        <View style={{ backgroundColor: c.surface2, borderRadius: R, padding: 14, gap: 6 }}>
          <T v="eyebrow">Check-in guardado</T>
          <T style={{ fontFamily: F.semibold, color: toneColor }}>{feedback.message}</T>
        </View>
        <Button title="Listo" variant="primary" onPress={onClose} />
      </View>
    );
  }

  return (
    <>
      <T v="small" muted>
        Fecha: <T v="small" style={{ fontFamily: F.semibold }}>hoy, {longDate(today)}</T>
        {replacesToday ? " · ya registraste hoy, se reemplazará." : ""}
      </T>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Field
          label="Peso (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder={last ? fk(last.weightKg) : "100.0"}
          error={errors.w}
          returnKeyType="next"
        />
        <Field
          label="Grasa corporal (%)"
          value={fat}
          onChangeText={setFat}
          keyboardType="decimal-pad"
          placeholder={last?.bodyFatPct != null ? fk(last.bodyFatPct) : "Opcional"}
          error={errors.f}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      <T v="small" muted>
        {CHECKIN_HINT}
      </T>
      <Button title="Guardar check-in" variant="primary" loading={save.isPending} onPress={submit} />
    </>
  );
}
