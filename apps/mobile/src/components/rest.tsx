import { secondsText } from "@lifemaxxing/core";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { tick } from "../lib/haptics";
import { adjustRest, beep, restDone, skipRest } from "../lib/rest";
import { useWorkout } from "../store/workout";
import { useTheme } from "../theme/theme";
import { F, R } from "../theme/tokens";
import { OneRmCard } from "./onerm";
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
      tick();
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

/** Barra flotante de descanso fuera de la sesión (pestañas). Al tocarla vuelve a la sesión. */
export function RestBar({ bottom = 0 }: { bottom?: number }) {
  const { c } = useTheme();
  const v = useRestView();
  if (!v) return null;
  const { rest, left, done, frac } = v;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom, alignItems: "center", paddingHorizontal: 12, zIndex: 30 }}>
      <View
        style={{
          width: "100%",
          maxWidth: 560,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: done ? c.good : c.line,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View style={{ height: 4, backgroundColor: c.surface2 }}>
          <View style={{ height: 4, width: `${Math.min(100, frac * 100)}%`, backgroundColor: done ? c.good : c.accent }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, paddingLeft: 14 }}>
          {/* La zona de la cuenta vuelve a la sesión; los botones son hermanos (no anidados). */}
          <Pressable
            onPress={() => router.push("/entrenar/sesion")}
            accessibilityRole="button"
            accessibilityLabel={`Descanso: ${done ? "terminado" : secondsText(left / 1000) + " restantes"}. Toca para volver a la sesión`}
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
    </View>
  );
}

/** Foco de luz radial de fondo (da profundidad sin recargar). */
export function Spotlight({ id = "spot", cy = "42%" }: { id?: string; cy?: string }) {
  const { c, scheme } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy={cy} r="65%">
          <Stop offset="0" stopColor={scheme === "dark" ? "#3A4446" : "#FFFFFF"} stopOpacity={1} />
          <Stop offset="1" stopColor={c.bg} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Entra deslizándose desde la derecha (se remonta con cada `key` nueva: serie → descanso → serie…). */
export function SlideIn({ children }: { children: ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }] }}>{children}</Animated.View>
  );
}

// Anillo plano del descanso (como el prototipo): pista y arco del mismo grosor, sin degradados.
const RING_R = 96;
const RING_C = 2 * Math.PI * RING_R;
const STROKE = 10;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Web: avance del arco por requestAnimationFrame (Animated sobre <circle> deja props inválidas en el DOM). */
function WebArc({ endAt, total, stroke }: { endAt: number; total: number; stroke: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let id = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 33) {
        last = t;
        setNow(Date.now());
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const frac = total > 0 ? Math.min(1, 1 - Math.max(0, endAt - now) / total) : 1;
  return (
    <Circle cx={110} cy={110} r={RING_R} stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" fill="none" strokeDasharray={`${RING_C}`} strokeDashoffset={RING_C * frac} />
  );
}

/**
 * Descanso dentro de la sesión, en el mismo lugar que la serie (un paso más de la secuencia).
 * Anillo plano que se vacía de forma continua, cuenta grande, −15 s / +30 s y la siguiente serie.
 */
export function RestInline() {
  const { c } = useTheme();
  const { width, height } = useWindowDimensions();
  const v = useRestView();
  const progress = useRef(new Animated.Value(0)).current;
  const endAt = v?.rest.endAt;
  const total = v?.rest.total;

  useEffect(() => {
    if (!endAt || !total || Platform.OS === "web") return;
    const left = Math.max(0, endAt - Date.now());
    progress.setValue(Math.min(1, 1 - left / total));
    const anim = Animated.timing(progress, { toValue: 1, duration: left, easing: Easing.linear, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [endAt, total, progress]);

  if (!v) return null;
  const { rest, left, done } = v;
  // Con la tarjeta del 1RM debajo, el anillo se achica para que todo quepa sin scroll.
  const ring = Math.max(200, Math.min(width - 72, height * (v?.rest.cal ? 0.29 : 0.36), 320));
  const digits = Math.round(ring * (done ? 0.2 : 0.28));
  const color = done ? c.good : c.accent;
  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [0, RING_C] });

  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <T v="eyebrow" center numberOfLines={1}>
        {done ? "¡Vamos! Terminó el descanso" : rest.title}
      </T>
      <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center" }}>
        <Svg viewBox="0 0 220 220" width={ring} height={ring} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={110} cy={110} r={RING_R} stroke={c.surface2} strokeWidth={STROKE} fill="none" />
          {Platform.OS === "web" ? (
            <WebArc endAt={rest.endAt} total={rest.total} stroke={color} />
          ) : (
            <AnimatedCircle
              cx={110}
              cy={110}
              r={RING_R}
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_C}`}
              strokeDashoffset={done ? RING_C : (dashoffset as unknown as number)}
            />
          )}
        </Svg>
        <T
          num
          accessibilityLiveRegion="none"
          accessibilityLabel={done ? "Terminó el descanso" : `${secondsText(left / 1000)} de descanso`}
          style={{ fontFamily: F.extrabold, fontSize: digits, lineHeight: Math.round(digits * 1.1), color: done ? c.good : c.fg }}
        >
          {done ? "¡Vamos!" : secondsText(left / 1000)}
        </T>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="−15 s" onPress={() => adjustRest(-15)} style={{ minWidth: 96 }} />
        <Button title="+30 s" onPress={() => adjustRest(30)} style={{ minWidth: 96 }} />
      </View>
      {rest.cal ? (
        <OneRmCard e1rmKg={rest.cal.e1rmKg} loads={rest.cal.loads} perHand={rest.cal.perHand} />
      ) : rest.info ? (
        <View style={{ alignSelf: "stretch", backgroundColor: c.accentSoft, borderRadius: R, padding: 12 }}>
          <T v="small" style={{ fontFamily: F.semibold, fontSize: 14 }}>
            {rest.info}
          </T>
        </View>
      ) : null}
      {rest.next ? (
        <T v="small" muted center>
          Siguiente: <T v="small" style={{ fontFamily: F.semibold }}>{rest.next}</T>
        </T>
      ) : null}
    </View>
  );
}
