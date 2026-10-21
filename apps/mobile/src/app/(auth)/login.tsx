import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "../../components/brand";
import { Button, Card, Field, T } from "../../components/ui";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/theme";

export default function Login() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
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
            <T v="eyebrow">Bienvenido de vuelta</T>
            <T v="h1" accessibilityRole="header">
              Inicia sesión
            </T>
          </View>
          <Card style={{ gap: 14 }}>
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tu@correo.com"
              returnKeyType="next"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error ? (
              <T v="small" color={c.bad} accessibilityLiveRegion="polite" accessibilityRole="alert">
                {error}
              </T>
            ) : null}
            <Button variant="primary" title="Entrar" loading={busy} onPress={submit} />
          </Card>
          <T v="small" muted center>
            ¿Primera vez?{" "}
            <Link href="/register" style={{ color: c.accentInk, fontWeight: "600" }}>
              Crea tu cuenta
            </Link>
          </T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
