// Modo demo: responde con datos simulados. Se activa:
// - en web, con ?demo=1 (?demo=0 lo apaga);
// - en desarrollo (Expo Go), con EXPO_PUBLIC_DEMO=1 al arrancar Metro. Nunca en una build de producción (__DEV__ es false).
import { IS_WEB } from "./config";

let demo: boolean | null = null;
export function isDemo(): boolean {
  if (demo !== null) return demo;
  demo = false;
  if (__DEV__ && process.env.EXPO_PUBLIC_DEMO === "1") {
    demo = true;
    return demo;
  }
  if (IS_WEB && typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search).get("demo");
      if (q === "1") sessionStorage.setItem("lmx-demo", "1");
      if (q === "0") sessionStorage.removeItem("lmx-demo");
      demo = sessionStorage.getItem("lmx-demo") === "1";
    } catch {
      demo = false;
    }
  }
  return demo;
}

export async function demoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { handleDemo } = await import("./demo-data");
  return handleDemo(method, path, body) as T;
}
