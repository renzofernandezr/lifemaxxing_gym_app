import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LoginResponse, MeResponse } from "@lifemaxxing/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "../theme/theme";
import { api, ApiError, setUnauthorizedHandler } from "./api";
import { IS_NATIVE } from "./config";
import { isDemo } from "./demo";
import { qk, queryClient } from "./queries";
import { getToken, setToken } from "./token";

type Status = "loading" | "signedIn" | "signedOut";

// Copia local del usuario: permite abrir la app sin red (o con la API caída) y seguir un entreno.
const ME_KEY = "lmx-me";
const saveMe = (m: MeResponse | null) => (m ? AsyncStorage.setItem(ME_KEY, JSON.stringify(m)) : AsyncStorage.removeItem(ME_KEY)).catch(() => {});
async function loadMe(): Promise<MeResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as MeResponse) : null;
  } catch {
    return null;
  }
}

interface AuthValue {
  status: Status;
  me: MeResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const { setPref } = useTheme();

  const accept = useCallback(
    (m: MeResponse) => {
      queryClient.setQueryData(qk.me, m);
      if (!isDemo()) saveMe(m);
      setMe(m);
      setPref(m.profile.theme);
      setStatus("signedIn");
    },
    [setPref],
  );

  const signOutLocal = useCallback(async () => {
    await setToken(null);
    await saveMe(null);
    queryClient.clear();
    setMe(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOutLocal();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOutLocal]);

  // Arranque: en nativo sin token no hay sesión; si no, se pregunta a /me.
  useEffect(() => {
    (async () => {
      if (IS_NATIVE && !(await getToken()) && !isDemo()) {
        setStatus("signedOut");
        return;
      }
      try {
        accept(await api<MeResponse>("/api/auth/me"));
      } catch (err) {
        // Solo un 401 cierra la sesión. Sin red o con la API caída se sigue con la copia local.
        if (!(err instanceof ApiError && err.status === 401)) {
          const cached = queryClient.getQueryData<MeResponse>(qk.me) ?? (await loadMe());
          if (cached) {
            queryClient.setQueryData(qk.me, cached);
            setMe(cached);
            setPref(cached.profile.theme);
            setStatus("signedIn");
            return;
          }
        }
        setStatus("signedOut");
      }
    })();
  }, [accept]);

  // El caché de "me" puede cambiar (PATCH /profile): mantenerlo sincronizado.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((e) => {
        if (e.query.queryKey[0] === "me" && e.type === "updated" && e.query.state.data) {
          setMe(e.query.state.data as MeResponse);
          if (!isDemo()) saveMe(e.query.state.data as MeResponse);
        }
      }),
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<LoginResponse>("/api/auth/login", { method: "POST", body: { email, password } });
      if (r.token) await setToken(r.token);
      accept(r);
    },
    [accept],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const r = await api<LoginResponse>("/api/auth/register", { method: "POST", body: { email, password, name } });
      if (r.token) await setToken(r.token);
      accept(r);
    },
    [accept],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // aunque falle la red, cerramos localmente
    }
    await signOutLocal();
  }, [signOutLocal]);

  const value = useMemo(() => ({ status, me, login, register, logout }), [status, me, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
}
