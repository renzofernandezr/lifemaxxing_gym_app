import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import { dark, light, type Palette } from "./tokens";

export type ThemePref = "system" | "light" | "dark";
const KEY = "lmx-theme";

interface ThemeValue {
  c: Palette;
  scheme: "light" | "dark";
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setPrefState(v);
      })
      .catch(() => {});
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const scheme: "light" | "dark" = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  const c = scheme === "dark" ? dark : light;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = c.bg;
    const meta = document.querySelector('meta[name="theme-color"]') ?? document.head.appendChild(document.createElement("meta"));
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", c.hdr);
  }, [scheme, c]);

  const value = useMemo(() => ({ c, scheme, pref, setPref }), [c, scheme, pref, setPref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme fuera de ThemeProvider");
  return v;
}
