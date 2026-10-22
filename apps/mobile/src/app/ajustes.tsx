import { fk } from "@lifemaxxing/core";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, TextInput, View, type TextInputProps, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconClose } from "../components/icons";
import { useToast } from "../components/toast";
import { Button, Seg, T, useLayout, ViewHead } from "../components/ui";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { isDemo } from "../lib/demo";
import { tap } from "../lib/haptics";
import { useUpdateProfile } from "../lib/queries";
import { useTheme, type ThemePref } from "../theme/theme";
import { F } from "../theme/tokens";

const num = (s: string) => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Grupo de filas (estilo lista de ajustes). */
function Group({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>{children}</View>;
}

function SectionLabel({ children, first }: { children: string; first?: boolean }) {
  return (
    <T v="eyebrow" style={{ marginTop: first ? 0 : 26, marginBottom: 8, marginLeft: 4 }}>
      {children}
    </T>
  );
}

/** Fila con etiqueta a la izquierda y campo editable a la derecha. */
function InputRow({ label, suffix, first, ...rest }: TextInputProps & { label: string; suffix?: string; first?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 54, paddingHorizontal: 16, gap: 12, borderTopWidth: first ? 0 : 1, borderTopColor: c.line }}>
      <T style={{ fontFamily: F.semibold, fontSize: 15 }}>{label}</T>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <TextInput
          {...rest}
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          style={[
            { flex: 1, textAlign: "right", fontSize: 16, fontFamily: F.medium, color: c.fg, paddingVertical: 14, fontVariant: ["tabular-nums"] },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null,
          ]}
        />
        {suffix ? <T muted style={{ fontSize: 15 }}>{suffix}</T> : null}
      </View>
    </View>
  );
}

export default function Ajustes() {
  const { c, pref, setPref } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useLayout();
  const { me, logout } = useAuth();
  const toast = useToast();
  const update = useUpdateProfile();
  const p = me?.profile;

  const initial = useMemo(
    () => ({
      name: me?.user.name ?? "",
      height: p?.heightCm != null ? fk(p.heightCm) : "",
      goal: p?.goalWeightKg != null ? fk(p.goalWeightKg) : "",
      date: p?.programStartDate ?? "2026-10-19",
    }),
    [me?.user.name, p?.heightCm, p?.goalWeightKg, p?.programStartDate],
  );
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const dirty = form.name !== initial.name || form.height !== initial.height || form.goal !== initial.goal || form.date !== initial.date;

  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const save = async () => {
    const h = num(form.height);
    const g = num(form.goal);
    if ([h, g].some((x) => Number.isNaN(x))) return setError("Revisa los números");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return setError("La fecha de inicio debe tener el formato AAAA-MM-DD");
    setError(null);
    try {
      await update.mutateAsync({ name: form.name.trim() || undefined, heightCm: h, goalWeightKg: g, programStartDate: form.date });
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
  // En iOS Ajustes se abre como hoja (ya deja su propio margen arriba); en el resto ocupa la pantalla.
  const top = isDesktop ? 30 : Platform.OS === "ios" ? 18 : insets.top + 14;
  const initialLetter = (me?.user.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  // Escritorio: Esc cierra Ajustes.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (Platform.OS !== "web" || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isDesktop]);

  const closeButton = (
    <Pressable
      onPress={() => {
        tap();
        close();
      }}
      accessibilityRole="button"
      accessibilityLabel="Cerrar ajustes"
      hitSlop={10}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
    >
      <IconClose color={c.fg} size={18} />
    </Pressable>
  );

  // Tarjeta del usuario: nombre y correo bien separados
  const userCard = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <T style={{ fontFamily: F.extrabold, fontSize: 22, color: c.accentInk }}>{initialLetter}</T>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T style={{ fontFamily: F.bold, fontSize: 18, lineHeight: 22 }} numberOfLines={1}>
          {me?.user.name}
        </T>
        <T v="small" muted numberOfLines={1}>
          {me?.user.email}
        </T>
      </View>
    </View>
  );

  // Enter guarda (útil con teclado físico).
  const submit = dirty ? save : undefined;
  const profile = (
    <>
      <SectionLabel first={isDesktop}>Perfil</SectionLabel>
      <Group>
        <InputRow first label="Nombre" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" onSubmitEditing={submit} />
        <InputRow label="Altura" suffix="cm" value={form.height} onChangeText={(height) => setForm({ ...form, height })} keyboardType="decimal-pad" placeholder="186" onSubmitEditing={submit} />
        <InputRow label="Peso meta" suffix="kg" value={form.goal} onChangeText={(goal) => setForm({ ...form, goal })} keyboardType="decimal-pad" placeholder="88" onSubmitEditing={submit} />
        <InputRow
          label="Inicio del programa"
          value={form.date}
          onChangeText={(date) => setForm({ ...form, date })}
          placeholder="AAAA-MM-DD"
          autoCapitalize="none"
          onSubmitEditing={submit}
        />
      </Group>
      <T v="small" muted style={{ marginTop: 8, marginHorizontal: 4 }}>
        El lunes de tu semana 1: con él se calcula la semana, la fase y si hoy toca A, B o C.
      </T>
      {error ? (
        <T v="small" color={c.bad} accessibilityRole="alert" style={{ marginTop: 8, marginHorizontal: 4 }}>
          {error}
        </T>
      ) : null}
      {dirty ? (
        <Button
          variant="primary"
          title="Guardar cambios"
          loading={update.isPending}
          onPress={save}
          style={[{ marginTop: 14, borderRadius: 12 }, isDesktop ? { alignSelf: "flex-end", paddingHorizontal: 28 } : null]}
        />
      ) : null}
    </>
  );

  const appearance = (
    <>
      <SectionLabel>Apariencia</SectionLabel>
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
    </>
  );

  const logoutRow = (
    <Pressable
      onPress={async () => {
        tap();
        setLeaving(true);
        await logout();
      }}
      disabled={leaving}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 54,
        paddingHorizontal: 16,
        justifyContent: "center",
        backgroundColor: pressed ? c.surface2 : "transparent",
        ...(isDesktop ? { borderTopWidth: 1, borderTopColor: c.line } : null),
      })}
    >
      <T style={{ fontFamily: F.semibold, fontSize: 15, color: c.bad }}>{leaving ? "Cerrando sesión…" : "Cerrar sesión"}</T>
    </Pressable>
  );

  const footer = (
    <T v="tiny" muted center style={{ marginTop: 28 }}>
      Life Maxxing · {p?.timezone ?? "America/Lima"}
    </T>
  );

  // Escritorio: encabezado como Progreso y Plan; cuenta y apariencia a la izquierda, perfil a la derecha.
  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: top, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 16 }}>
          <ViewHead eyebrow="Perfil y cuenta" title="Ajustes" right={closeButton} />
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 28, marginTop: 28 }}>
            <View style={{ width: 320 }}>
              <SectionLabel first>Cuenta</SectionLabel>
              <Group>
                <View style={{ padding: 16 }}>{userCard}</View>
                {logoutRow}
              </Group>
              {appearance}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>{profile}</View>
          </View>
          {footer}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: top, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T style={{ fontFamily: F.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 }} accessibilityRole="header">
            Ajustes
          </T>
          {closeButton}
        </View>

        <View style={{ marginTop: 22 }}>{userCard}</View>

        {profile}
        {appearance}

        <SectionLabel>Cuenta</SectionLabel>
        <Group>{logoutRow}</Group>

        {footer}
      </View>
    </ScrollView>
  );
}
