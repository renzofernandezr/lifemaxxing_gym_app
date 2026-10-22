import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Button, T } from "../../components/ui";
import { AuthInput, AuthShell } from "../../features/auth/AuthShell";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";

export default function Login() {
  const { c } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Si tarda, casi siempre es el servidor gratis despertando (~1 min).
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 5_000);
    return () => clearTimeout(t);
  }, [busy]);

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
    <AuthShell
      subtitle="Entrena, registra y progresa"
      footer={
        <T v="small" muted center>
          ¿Primera vez?{" "}
          <Link href="/register" style={{ color: c.accentInk, fontFamily: F.semibold }}>
            Crea tu cuenta
          </Link>
        </T>
      }
    >
      <AuthInput
        label="Correo"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="tu@correo.com"
        returnKeyType="next"
        error={!!error}
      />
      <AuthInput
        label="Contraseña"
        secure
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={!!error}
      />
      {error ? (
        <T v="small" color={c.bad} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </T>
      ) : null}
      <Button variant="primary" title="Entrar" loading={busy} onPress={submit} style={{ marginTop: 6, borderRadius: 12 }} />
      {slow ? (
        <T v="small" muted center accessibilityLiveRegion="polite">
          Despertando el servidor, puede tardar hasta un minuto…
        </T>
      ) : null}
    </AuthShell>
  );
}
