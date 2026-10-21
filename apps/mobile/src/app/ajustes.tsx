import { fk } from "@lifemaxxing/core";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconClose } from "../components/icons";
import { useToast } from "../components/toast";
import { Button, Card, CardHead, Field, Seg, T } from "../components/ui";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { API_URL } from "../lib/config";
import { isDemo } from "../lib/demo";
import { useUpdateProfile } from "../lib/queries";
import { useTheme, type ThemePref } from "../theme/theme";

const num = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
};

export default function Ajustes() {
  const { c, pref, setPref } = useTheme();
  const insets = useSafeAreaInsets();
  const { me, logout } = useAuth();
  const toast = useToast();
  const update = useUpdateProfile();
  const p = me?.profile;
  const [name, setName] = useState(me?.user.name ?? "");
  const [height, setHeight] = useState(p?.heightCm != null ? fk(p.heightCm) : "");
  const [start, setStart] = useState(p?.startWeightKg != null ? fk(p.startWeightKg) : "");
  const [goal, setGoal] = useState(p?.goalWeightKg != null ? fk(p.goalWeightKg) : "");
  const [date, setDate] = useState(p?.programStartDate ?? "2026-10-19");
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.user.name);
  }, [me]);

  const save = async () => {
    const h = num(height);
    const s = num(start);
    const g = num(goal);
    if ([h, s, g].some((x) => Number.isNaN(x))) return setError("Revisa los números");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("La fecha de inicio debe tener el formato AAAA-MM-DD (un lunes)");
    setError(null);
    try {
      await update.mutateAsync({ name: name.trim() || undefined, heightCm: h, startWeightKg: s, goalWeightKg: g, programStartDate: date });
      toast("Perfil guardado");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar");
    }
  };

  const changeTheme = (t: ThemePref) => {
    setPref(t);
    if (!isDemo()) update.mutate({ theme: t });
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/progreso"));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <T v="eyebrow">{me?.user.email}</T>
            <T v="h1" accessibilityRole="header">
              Ajustes
            </T>
          </View>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar ajustes" hitSlop={10} style={{ padding: 6 }}>
            <IconClose color={c.fg} size={24} />
          </Pressable>
        </View>

        <Card style={{ gap: 12 }}>
          <CardHead title="Tema" right="se guarda en tu perfil" />
          <Seg
            label="Tema"
            value={pref}
            onChange={changeTheme}
            options={[
              { key: "system", label: "Sistema" },
              { key: "light", label: "Claro" },
              { key: "dark", label: "Oscuro" },
            ]}
          />
        </Card>

        <Card style={{ gap: 12 }}>
          <CardHead title="Perfil" />
          <Field label="Nombre" value={name} onChangeText={setName} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
            <Field label="Peso inicial (kg)" value={start} onChangeText={setStart} keyboardType="decimal-pad" />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="Peso meta (kg)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" />
            <Field label="Inicio del programa" value={date} onChangeText={setDate} placeholder="2026-10-19" autoCapitalize="none" />
          </View>
          <T v="small" muted>
            La fecha de inicio es el lunes de tu semana 1. Con ella se calcula la semana, la fase y si hoy toca A, B o C.
          </T>
          {error ? (
            <T v="small" color={c.bad} accessibilityRole="alert">
              {error}
            </T>
          ) : null}
          <Button variant="primary" title="Guardar perfil" loading={update.isPending} onPress={save} disabled={isDemo()} />
        </Card>

        <Card style={{ gap: 12 }}>
          <CardHead title="Sesión" />
          <Button
            variant="danger"
            title="Cerrar sesión"
            loading={leaving}
            onPress={async () => {
              setLeaving(true);
              await logout();
            }}
          />
          <T v="tiny" muted>
            {isDemo() ? "Modo demo (datos simulados). " : ""}API: {API_URL || "mismo dominio"} · Zona horaria {p?.timezone ?? "America/Lima"}
          </T>
        </Card>
      </View>
    </ScrollView>
  );
}

