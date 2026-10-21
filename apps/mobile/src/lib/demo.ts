// Modo demo: solo en web con ?demo=1. Responde con datos simulados (nunca se activa en nativo ni sin el parámetro).
import { IS_WEB } from "./config";

let demo: boolean | null = null;
export function isDemo(): boolean {
  if (demo !== null) return demo;
  demo = false;
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
