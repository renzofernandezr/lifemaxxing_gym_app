import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { F } from "../theme/tokens";
import { IconCheck } from "./icons";
import { T } from "./ui";

type Tone = "good" | "info" | "error" | "record";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const show = useCallback((text: string, tone: Tone = "good") => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <ToastHost items={items} />
    </Ctx.Provider>
  );
}

function ToastHost({ items }: { items: Toast[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: insets.top + 12, left: 0, right: 0, alignItems: "center", gap: 8, zIndex: 100 }}>
      {items.map((t) => (
        <ToastView key={t.id} t={t} />
      ))}
    </View>
  );
}

function ToastView({ t }: { t: Toast }) {
  const { c } = useTheme();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [a]);
  const bg = t.tone === "record" ? c.accent : t.tone === "error" ? c.bad : c.fg;
  const fg = t.tone === "record" ? c.onAccent : c.bg;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        maxWidth: 420,
        marginHorizontal: 16,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {t.tone !== "error" ? <IconCheck color={fg} size={16} /> : null}
      <T style={{ color: fg, fontFamily: F.semibold, fontSize: 14 }}>{t.text}</T>
    </Animated.View>
  );
}

export const useToast = () => useContext(Ctx);
