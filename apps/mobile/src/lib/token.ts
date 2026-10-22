import * as SecureStore from "expo-secure-store";
import { IS_NATIVE } from "./config";

// En nativo el token va en el llavero (expo-secure-store). En web se usa la cookie httpOnly: no se guarda nada.
const KEY = "lmx-session-token";
let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (!IS_NATIVE) return null;
  if (cached !== undefined) return cached;
  cached = await SecureStore.getItemAsync(KEY).catch(() => null);
  return cached;
}

export async function setToken(token: string | null): Promise<void> {
  if (!IS_NATIVE) return;
  cached = token;
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
