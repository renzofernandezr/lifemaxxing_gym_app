import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "../../components/brand";
import { Button, Card, Field, T } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/theme";

export default function Register() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email.trim(), password, name.trim() || "Yo");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 22 }}>
          <Brand subtitle="Tu bitácora de entrenamiento" />
          <View style={{ gap: 6 }}>
            <T v="eyebrow">App personal · acceso restringido</T>
            <T v="h1" accessibilityRole="header">
              Crea tu cuenta
            </T>
          </View>
          <Card style={{ gap: 14 }}>
            <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" placeholder="Renzo" />
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Field
              label="Contraseña (10 caracteres o más)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={submit}
            />
            {error ? (
              <T v="small" color={c.bad} accessibilityLiveRegion="polite" accessibilityRole="alert">
                {error}
              </T>
            ) : null}
            <Button variant="primary" title="Crear cuenta" loading={busy} onPress={submit} />
          </Card>
          <T v="small" muted center>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: c.accentInk, fontWeight: "600" }}>
              Inicia sesión
            </Link>
          </T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
