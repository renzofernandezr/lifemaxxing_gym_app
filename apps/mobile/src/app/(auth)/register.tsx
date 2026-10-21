import { Link } from "expo-router";
import { useState } from "react";
import { Button, T } from "../../components/ui";
import { AuthInput, AuthShell } from "../../features/auth/AuthShell";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";

export default function Register() {
  const { c } = useTheme();
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
    <AuthShell
      subtitle="Crea tu cuenta para empezar"
      footer={
        <T v="small" muted center>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" style={{ color: c.accentInk, fontFamily: F.semibold }}>
            Inicia sesión
          </Link>
        </T>
      }
    >
      <AuthInput label="Nombre" value={name} onChangeText={setName} autoComplete="name" placeholder="Renzo" />
      <AuthInput
        label="Correo"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="tu@correo.com"
      />
      <AuthInput
        label="Contraseña"
        secure
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="10 caracteres o más"
        onSubmitEditing={submit}
        error={!!error}
      />
      {error ? (
        <T v="small" color={c.bad} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </T>
      ) : null}
      <Button variant="primary" title="Crear cuenta" loading={busy} onPress={submit} style={{ marginTop: 6, borderRadius: 12 }} />
    </AuthShell>
  );
}
