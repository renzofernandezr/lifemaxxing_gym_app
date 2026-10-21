import { secondsText } from "@lifemaxxing/core";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { adjustRest, beep, restDone, setRestExpanded, skipRest } from "../lib/rest";
import { useWorkout } from "../store/workout";
import { useTheme } from "../theme/theme";
import { F, R } from "../theme/tokens";
import { IconChevron } from "./icons";
import { Button, T } from "./ui";

function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [active, ms]);
  return now;
}

/** Único lugar que emite pitidos (últimos 3 s) y el aviso final. Se monta una vez en el layout raíz. */
export function RestController() {
  const rest = useWorkout((s) => s.rest);
  const now = useNow(!!rest, 200);
  const fired = useRef<{ endAt: number; set: Set<number> }>({ endAt: 0, set: new Set() });
  useEffect(() => {
    if (!rest) return;
    if (fired.current.endAt !== rest.endAt) fired.current = { endAt: rest.endAt, set: new Set() };
    const left = rest.endAt - now;
    const s = Math.ceil(left / 1000);
    const f = fired.current.set;
    // Si la app vuelve tras terminar el descanso hace rato, no pitar de golpe.
    if (left < -3000) {
      f.add(0);
      return;
    }
    if (s <= 3 && s > 0 && !f.has(s)) {
      f.add(s);
      beep("short");
    }
    if (left <= 0 && !f.has(0)) {
      f.add(0);
      restDone();
    }
  }, [rest, now]);
  return null;
}

function useRestView() {
  const rest = useWorkout((s) => s.rest);
  const now = useNow(!!rest);
  if (!rest) return null;
  const left = Math.max(0, rest.endAt - now);
  return { rest, left, done: left <= 0, frac: rest.total > 0 ? 1 - left / rest.total : 1 };
}

/** Barra de descanso (cuando se minimiza el contador): cuenta, progreso, −15 s, +30 s y Saltar. Al tocarla vuelve a pantalla completa. */
export function RestBar({ bottom = 0, inline = false }: { bottom?: number; inline?: boolean }) {
  const { c } = useTheme();
  const v = useRestView();
  if (!v || v.rest.expanded) return null;
  const { rest, left, done, frac } = v;
  const bar = (
    <View
      style={{
        width: "100%",
        maxWidth: 560,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: done ? c.good : c.line,
        borderRadius: 14,
        overflow: "hidden",
        ...(inline
          ? {}
          : { shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }),
      }}
    >
      <View style={{ height: 4, backgroundColor: c.surface2 }}>
        <View style={{ height: 4, width: `${Math.min(100, frac * 100)}%`, backgroundColor: done ? c.good : c.accent }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, paddingLeft: 14 }}>
        {/* La zona de la cuenta vuelve a pantalla completa; los botones son hermanos (no anidados). */}
        <Pressable
          onPress={() => setRestExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={`Descanso: ${done ? "terminado" : secondsText(left / 1000) + " restantes"}. Toca para ampliar`}
          style={{ flex: 1, minWidth: 0, gap: 2 }}
        >
          <T v="eyebrow" numberOfLines={1}>
            {done ? "¡Vamos!" : rest.title}
          </T>
          <T style={{ fontFamily: F.extrabold, fontSize: 30, lineHeight: 34, color: done ? c.good : c.fg }} num>
            {done ? "0:00" : secondsText(left / 1000)}
          </T>
        </Pressable>
        <Button small title="−15 s" onPress={() => adjustRest(-15)} />
        <Button small title="+30 s" onPress={() => adjustRest(30)} />
        <Button small variant="primary" title={done ? "Seguir" : "Saltar"} onPress={() => skipRest()} />
      </View>
    </View>
  );
  if (inline) return bar;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom, alignItems: "center", paddingHorizontal: 12, zIndex: 30 }}>
      {bar}
    </View>
  );
}

const RING_R = 100;
const RING_C = 2 * Math.PI * RING_R;

/** Descanso a pantalla completa (por defecto): anillo grande y cuenta legible a distancia. */
export function RestOverlay() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const v = useRestView();
  const open = !!v?.rest.expanded;
  // El anillo ocupa todo el ancho útil sin pasar de la mitad del alto.
  const ring = Math.max(200, Math.min(width - 40, height * 0.48, 520));
  const digits = Math.round(ring * (v?.done ? 0.2 : 0.3));
  return (
    <Modal visible={open} animationType="fade" onRequestClose={() => setRestExpanded(false)} statusBarTranslucent>
      {v ? (
        <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
          <View accessibilityViewIsModal style={{ flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
              <Pressable onPress={() => setRestExpanded(false)} accessibilityRole="button" accessibilityLabel="Minimizar el descanso" hitSlop={12} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}>
                <IconChevron dir="down" color={c.fg} size={22} />
                <T style={{ fontFamily: F.semibold }}>Minimizar</T>
              </Pressable>
              <T v="eyebrow" numberOfLines={1} style={{ flexShrink: 1, textAlign: "right" }}>
                {v.done ? "¡Vamos!" : v.rest.title}
              </T>
            </View>

            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center" }}>
                <Svg viewBox="0 0 220 220" width={ring} height={ring} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
                  <Circle cx={110} cy={110} r={RING_R} stroke={c.surface2} strokeWidth={10} fill="none" />
                  <Circle
                    cx={110}
                    cy={110}
                    r={RING_R}
                    stroke={v.done ? c.good : c.accent}
                    strokeWidth={10}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${RING_C}`}
                    strokeDashoffset={RING_C * Math.min(1, v.frac)}
                  />
                </Svg>
                <T
                  num
                  accessibilityLiveRegion="none"
                  accessibilityLabel={v.done ? "Terminó el descanso" : `${secondsText(v.left / 1000)} de descanso`}
                  style={{ fontFamily: F.extrabold, fontSize: digits, lineHeight: Math.round(digits * 1.1), letterSpacing: -digits * 0.03, color: v.done ? c.good : c.fg }}
                >
                  {v.done ? "¡Vamos!" : secondsText(v.left / 1000)}
                </T>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button title="−15 s" onPress={() => adjustRest(-15)} style={{ flex: 1, minHeight: 56 }} />
                <Button title="+30 s" onPress={() => adjustRest(30)} style={{ flex: 1, minHeight: 56 }} />
              </View>
              {v.rest.info ? (
                <View style={{ backgroundColor: c.accentSoft, borderRadius: R, padding: 14 }}>
                  <T style={{ fontFamily: F.semibold }}>{v.rest.info}</T>
                </View>
              ) : null}
              {v.rest.next ? (
                <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: R, padding: 14, gap: 4 }}>
                  <T v="eyebrow">Siguiente</T>
                  <T style={{ fontFamily: F.semibold, fontSize: 16 }}>{v.rest.next}</T>
                </View>
              ) : null}
              <Button variant="primary" title={v.done ? "Empezar siguiente serie" : "Saltar descanso"} onPress={() => skipRest()} />
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}
