// Modo demo: responde con datos simulados. Dos variantes:
// - "historial": 7 semanas de entrenos y check-ins (semana 8, Fase 1);
// - "nuevo": usuario recién creado en la semana 1, sin historial ni 1RM (se ven las series de prueba en A y B).
// Se activa en web con ?demo=1 o ?demo=nuevo (?demo=0 lo apaga), y en la app con EXPO_PUBLIC_DEMO=1 o
// EXPO_PUBLIC_DEMO=nuevo fijado al arrancar Metro o en el perfil "demo" de eas.json (build de TestFlight).
// Los demás builds no definen esa variable, así que nunca traen datos simulados por accidente.
import { IS_WEB } from "./config";

export type DemoMode = "historial" | "nuevo";

let mode: DemoMode | null | undefined;

function parse(v: string | null | undefined): DemoMode | null {
  if (v === "1" || v === "historial") return "historial";
  if (v === "nuevo") return "nuevo";
  return null;
}

export function demoMode(): DemoMode | null {
  if (mode !== undefined) return mode;
  mode = null;
  const env = parse(process.env.EXPO_PUBLIC_DEMO);
  if (env) return (mode = env);
  if (IS_WEB && typeof window !== "undefined") {
    try {
      const q = new URLSearchParams(window.location.search).get("demo");
      if (q === "0") sessionStorage.removeItem("lmx-demo");
      else if (parse(q)) sessionStorage.setItem("lmx-demo", parse(q)!);
      mode = parse(sessionStorage.getItem("lmx-demo"));
    } catch {
      mode = null;
    }
  }
  return mode;
}

export const isDemo = (): boolean => demoMode() !== null;

export async function demoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { handleDemo } = await import("./demo-data");
  return (await handleDemo(method, path, body)) as T;
}
