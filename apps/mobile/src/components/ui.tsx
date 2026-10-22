// Kit de UI que replica el prototipo (index.html): tipografía Montserrat, tarjetas con borde fino,
// naranja reservado para lo activo.
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type PressableStateCallbackType,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { press, tap } from "../lib/haptics";
import { useRestBarSpace } from "../store/workout";
import { useTheme } from "../theme/theme";
import { DESKTOP, F, MAX_WIDTH, R } from "../theme/tokens";
import { IconMinus, IconPlus } from "./icons";

export function useLayout() {
  const { width } = useWindowDimensions();
  return { width, isDesktop: width >= DESKTOP, wide: width >= 900 };
}

// ── Texto ───────────────────────────────────────────────
type Variant = "eyebrow" | "h1" | "h2" | "h3" | "body" | "small" | "label" | "big" | "kpi" | "num" | "tiny";

export interface TProps extends TextProps {
  v?: Variant;
  color?: string;
  muted?: boolean;
  weight?: keyof typeof F;
  center?: boolean;
  num?: boolean;
  size?: number;
}

export function T({ v = "body", color, muted, weight, center, num, size, style, ...rest }: TProps) {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const base: TextStyle = (() => {
    switch (v) {
      case "eyebrow":
        return { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.05, textTransform: "uppercase", color: c.muted };
      case "h1":
        return { fontFamily: F.bold, fontSize: isDesktop ? 44 : 32, lineHeight: isDesktop ? 48 : 36, letterSpacing: -0.6 };
      case "h2":
        return { fontFamily: F.bold, fontSize: 23, lineHeight: 26, letterSpacing: -0.4 };
      case "h3":
        return { fontFamily: F.bold, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 };
      case "small":
        return { fontFamily: F.regular, fontSize: 13, lineHeight: 19 };
      case "tiny":
        return { fontFamily: F.medium, fontSize: 11, lineHeight: 15 };
      case "label":
        return { fontFamily: F.semibold, fontSize: 12, letterSpacing: 0.7, textTransform: "uppercase", color: c.muted };
      case "big":
        return { fontFamily: F.extrabold, fontSize: 72, lineHeight: 72, fontVariant: ["tabular-nums"] };
      case "kpi":
        return { fontFamily: F.extrabold, fontSize: isDesktop ? 44 : 36, lineHeight: isDesktop ? 46 : 38, fontVariant: ["tabular-nums"] };
      case "num":
        return { fontFamily: F.semibold, fontSize: 15, fontVariant: ["tabular-nums"] };
      default:
        return { fontFamily: F.regular, fontSize: 15, lineHeight: 23 };
    }
  })();
  return (
    <Text
      {...rest}
      style={[
        { color: c.fg },
        base,
        muted && { color: c.muted },
        color ? { color } : null,
        weight ? { fontFamily: F[weight] } : null,
        center && { textAlign: "center" },
        num && { fontVariant: ["tabular-nums"] },
        size ? { fontSize: size, lineHeight: Math.round(size * 1.3) } : null,
        style,
      ]}
    />
  );
}

// ── Layout ──────────────────────────────────────────────
export function Screen({
  children,
  scroll = true,
  bottomPad,
  refreshControl,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  bottomPad?: number;
  refreshControl?: ScrollViewProps["refreshControl"];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const restSpace = useRestBarSpace();
  const inner = (
    <View
      style={[
        {
          width: "100%",
          maxWidth: MAX_WIDTH,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: isDesktop ? 30 : 22,
          gap: isDesktop ? 22 : 18,
        },
        // Margen normal al final; solo se agranda si la barra de descanso minimizada tapa el contenido.
        { paddingBottom: (bottomPad ?? (isDesktop ? 60 : 24)) + restSpace },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  if (!scroll) return <View style={{ flex: 1, backgroundColor: c.bg }}>{inner}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  );
}

export function Card({ style, children, pad = 18, ...rest }: ViewProps & { pad?: number }) {
  const { c } = useTheme();
  return (
    <View
      {...rest}
      style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: R, padding: pad, minWidth: 0 }, style]}
    >
      {children}
    </View>
  );
}

export function CardHead({ title, right, h = "h3" }: { title: ReactNode; right?: ReactNode; h?: "h2" | "h3" }) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}
    >
      {typeof title === "string" ? <T v={h}>{title}</T> : title}
      {typeof right === "string" ? <T v="eyebrow">{right}</T> : right}
    </View>
  );
}

export function ViewHead({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flexShrink: 1 }}>
        {eyebrow ? (
          <T v="eyebrow" style={{ marginBottom: 6 }}>
            {eyebrow}
          </T>
        ) : null}
        <T v="h1" accessibilityRole="header">
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}

export const Row = ({ style, ...rest }: ViewProps) => <View {...rest} style={[{ flexDirection: "row", alignItems: "center" }, style]} />;

/** Grilla simple: `cols` columnas iguales con `gap`. */
export function Grid({
  cols,
  gap = 12,
  children,
  style,
}: {
  cols: number;
  gap?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter((x) => x !== null && x !== undefined && x !== false);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", gap }}>
          {r.map((x, j) => (
            <View key={j} style={{ flex: 1, minWidth: 0 }}>
              {x}
            </View>
          ))}
          {r.length < cols ? Array.from({ length: cols - r.length }, (_, k) => <View key={`f${k}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

export const Divider = () => {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line }} />;
};

// ── Botones ─────────────────────────────────────────────
interface BtnProps extends Omit<PressableProps, "children" | "style"> {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  icon?: ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = "secondary", loading, icon, small, disabled, style, onPress, ...rest }: BtnProps) {
  const { c } = useTheme();
  const primary = variant === "primary";
  const ghost = variant === "ghost";
  const bg = primary ? c.accent : ghost ? "transparent" : c.surface;
  const fg = primary ? c.onAccent : variant === "danger" ? c.bad : ghost ? c.accentInk : c.fg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      {...rest}
      onPress={(e) => {
        // Vibración al tocar: más firme en el botón principal.
        if (variant === "primary") press();
        else tap();
        onPress?.(e);
      }}
      style={(state: PressableStateCallbackType) => {
        const { pressed } = state;
        const hovered = (state as { hovered?: boolean }).hovered;
        return [
          {
            backgroundColor: bg,
            borderRadius: primary ? R : 8,
            borderWidth: primary || ghost ? 0 : 1,
            borderColor: hovered && !primary ? c.accent : c.line,
            minHeight: primary && !small ? 54 : small ? 38 : 44,
            paddingHorizontal: ghost ? 4 : primary ? 18 : 14,
            paddingVertical: primary && !small ? 12 : 8,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: disabled ? 0.5 : 1,
            transform: [{ translateY: pressed ? 1 : 0 }],
          },
          primary && hovered ? Platform.select({ web: { filter: "brightness(1.06)" } as ViewStyle }) : null,
          style,
        ];
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <T style={{ color: fg, fontFamily: primary ? F.bold : F.semibold, fontSize: primary && !small ? 19 : 15, textAlign: "center" }}>
        {title}
      </T>
    </Pressable>
  );
}

export function IconButton({
  onPress,
  label,
  children,
  size = 40,
  style,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(Platform.OS === "web" ? { title: label } : {})}
      style={(state: PressableStateCallbackType) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: (state as { hovered?: boolean }).hovered ? c.accent : c.line,
          backgroundColor: c.surface2,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ── Pills, chips ────────────────────────────────────────
export function Pill({
  children,
  tone = "accent",
  style,
}: {
  children: ReactNode;
  tone?: "accent" | "bronze" | "neutral" | "solid" | "good";
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const map = {
    accent: [c.accentSoft, c.accentInk],
    bronze: [c.bronzeSoft, c.bronze],
    neutral: [c.surface2, c.muted],
    solid: [c.accent, c.onAccent],
    good: [c.bronzeSoft, c.good],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start" }, style]}>
      <T style={{ color: fg, fontFamily: F.bold, fontSize: 11, letterSpacing: 0.77, textTransform: "uppercase" }}>{children}</T>
    </View>
  );
}

export function Chip({ children, dashed }: { children: ReactNode; dashed?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: c.line,
        backgroundColor: c.surface,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
      }}
    >
      <T v="tiny" num color={dashed ? c.muted : undefined} style={{ fontSize: 12 }}>
        {children}
      </T>
    </View>
  );
}

// ── Selectores ──────────────────────────────────────────
export function Seg<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string; sub?: string }[];
  value: K;
  onChange: (k: K) => void;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: "row", gap: 4, backgroundColor: c.surface2, padding: 4, borderRadius: 10 }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 7,
              paddingVertical: 9,
              paddingHorizontal: 6,
              alignItems: "center",
              backgroundColor: on ? c.accent : "transparent",
            }}
          >
            <T numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 14, color: on ? c.onAccent : c.fg }}>
              {o.label}
            </T>
            {o.sub ? (
              <T numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, color: on ? c.onAccent : c.muted }}>
                {o.sub}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SubTabs<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={{
              borderWidth: 1,
              borderColor: on ? c.accent : c.line,
              backgroundColor: on ? c.accent : c.surface,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <T style={{ fontFamily: F.semibold, fontSize: 14, color: on ? c.onAccent : c.muted }}>{o.label}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Entradas ────────────────────────────────────────────
export function Field({ label, error, style, ...rest }: TextInputProps & { label: string; error?: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6, flex: 1, minWidth: 0 }}>
      <T style={{ fontFamily: F.semibold, fontSize: 13 }}>{label}</T>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        {...rest}
        style={[
          {
            backgroundColor: c.bg,
            borderWidth: 1,
            borderColor: error ? c.bad : c.line,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            color: c.fg,
            fontFamily: F.regular,
            fontVariant: ["tabular-nums"],
          },
          Platform.OS === "web" ? ({ outlineColor: c.accent } as TextStyle) : null,
          style,
        ]}
      />
      {error ? (
        <T v="small" color={c.bad}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

/** Stepper − valor + (grande, como el prototipo). El valor es texto para permitir escribir. */
export function Stepper({
  label,
  value,
  onChangeText,
  onStep,
  compact,
  keyboardType = "decimal-pad",
  onBlur,
  dense,
  flex = 1,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  onStep: (dir: -1 | 1) => void;
  compact?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  onBlur?: () => void;
  /** Botones más angostos y número algo menor (panel inferior de la sesión). */
  dense?: boolean;
  flex?: number;
}) {
  const { c } = useTheme();
  const h = compact ? 40 : 56;
  const btnW = compact ? 36 : dense ? 44 : 52;
  const fontSize = compact ? 18 : dense ? 28 : 32;
  const btn = (dir: -1 | 1) => (
    <Pressable
      onPress={() => {
        tap();
        onStep(dir);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${dir < 0 ? "Menos" : "Más"} ${label.toLowerCase()}`}
      hitSlop={4}
      style={({ pressed }) => ({
        width: btnW,
        height: h,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: pressed ? c.line : c.surface2,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      {dir < 0 ? <IconMinus color={c.fg} size={compact ? 14 : 20} /> : <IconPlus color={c.fg} size={compact ? 14 : 20} />}
    </Pressable>
  );
  return (
    <View style={{ gap: 6, flex, minWidth: 0 }}>
      {!compact ? <T v="label">{label}</T> : null}
      <View style={{ flexDirection: "row", gap: compact ? 4 : 6, alignItems: "center" }}>
        {btn(-1)}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
          selectTextOnFocus
          accessibilityLabel={label}
          style={[
            {
              flex: 1,
              minWidth: 0,
              height: h,
              textAlign: "center",
              fontFamily: F.extrabold,
              fontSize,
              color: c.fg,
              backgroundColor: c.bg,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 8,
              fontVariant: ["tabular-nums"],
              paddingHorizontal: 2,
            },
            Platform.OS === "web" ? ({ outlineColor: c.accent } as TextStyle) : null,
          ]}
        />
        {btn(1)}
      </View>
    </View>
  );
}

// ── Estados ─────────────────────────────────────────────
export function Loading({ label = "Cargando…" }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: "center", gap: 10 }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.accent} />
      <T v="small" muted>
        {label}
      </T>
    </View>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { c } = useTheme();
  const msg = error instanceof Error ? error.message : "Algo salió mal";
  return (
    <Card style={{ gap: 10, borderColor: c.bad }}>
      <T v="h3">No se pudo cargar</T>
      <T v="small" muted>
        {msg}
      </T>
      {onRetry ? <Button title="Reintentar" small onPress={onRetry} style={{ alignSelf: "flex-start" }} /> : null}
    </Card>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.bronze,
        backgroundColor: c.bronzeSoft,
        borderRadius: R,
        padding: 16,
        gap: 8,
      }}
    >
      <T style={{ fontFamily: F.bold, color: c.bronze }}>{title}</T>
      {text ? (
        <T v="small" muted>
          {text}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
});
