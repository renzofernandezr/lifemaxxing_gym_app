// Cabecera (marca + pestañas en escritorio + tema + ajustes) y barra inferior con botón central.
import { programPosition } from "@lifemaxxing/core";
import { router } from "expo-router";
import { TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { press, tap } from "../lib/haptics";
import { useWorkout, useWorkoutHydrated } from "../store/workout";
import { useTheme } from "../theme/theme";
import { F, MAX_WIDTH } from "../theme/tokens";
import { Brand } from "./brand";
import { IconBarbell, IconPlan, IconProgress, IconUser } from "./icons";
import { IconButton, T, useLayout } from "./ui";

export const TABS = [
  { name: "progreso", label: "Progreso", href: "/progreso" },
  { name: "entrenar", label: "Entrenar", href: "/entrenar" },
  { name: "plan", label: "Plan", href: "/plan" },
] as const;

function HeaderTab({ isFocused, label, ref, ...props }: TabTriggerSlotProps & { label: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      ref={ref as never}
      {...props}
      onPress={(e) => {
        tap();
        props.onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: isFocused ? c.accent : "transparent" }}
    >
      <T style={{ fontFamily: F.semibold, color: isFocused ? c.onAccent : c.hdrMuted }}>{label}</T>
    </Pressable>
  );
}

export function AppHeader() {
  const { c } = useTheme();
  const { isDesktop } = useLayout();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const pos = me ? programPosition(new Date(), me.profile.programStartDate, me.profile.timezone) : null;
  const sub =
    me && pos
      ? `${me.user.name.split(" ")[0]} · ${pos.beforeStart ? "empieza pronto" : pos.finished ? "programa completo" : `${pos.phase.name.split(" · ")[0]} · semana ${pos.week}`}`
      : undefined;
  return (
    <View style={{ backgroundColor: c.hdr, borderBottomWidth: 1, borderBottomColor: c.line, paddingTop: insets.top, zIndex: 20 }}>
      <View
        style={{
          width: "100%",
          maxWidth: MAX_WIDTH,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Brand subtitle={sub} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {isDesktop ? (
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Secciones"
              style={{ flexDirection: "row", gap: 4, backgroundColor: c.surface2, padding: 4, borderRadius: 999 }}
            >
              {TABS.map((t) => (
                <TabTrigger key={t.name} name={t.name} asChild>
                  <HeaderTab label={t.label} />
                </TabTrigger>
              ))}
            </View>
          ) : null}
          <IconButton label="Ajustes y perfil" onPress={() => router.push("/ajustes")}>
            <IconUser color={c.onHdr} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}

function BarTab({ isFocused, label, icon, ref, ...props }: TabTriggerSlotProps & { label: string; icon: (color: string) => ReactNode }) {
  const { c } = useTheme();
  const color = isFocused ? c.accentInk : c.muted;
  return (
    <Pressable
      ref={ref as never}
      {...props}
      onPress={(e) => {
        tap();
        props.onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: isFocused ? c.accentSoft : "transparent",
      }}
    >
      {icon(color)}
      <T style={{ fontFamily: F.semibold, fontSize: 13, lineHeight: 16, color }}>{label}</T>
    </Pressable>
  );
}

export const BOTTOM_BAR_HEIGHT = 66;

export function BottomBar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const hydrated = useWorkoutHydrated();
  const active = useWorkout((s) => s.active);
  const resume = hydrated && !!active;
  return (
    <View style={{ backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: insets.bottom }}>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 6,
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 6,
          height: BOTTOM_BAR_HEIGHT,
        }}
      >
        <TabTrigger name="progreso" asChild>
          <BarTab label="Progreso" icon={(col) => <IconProgress color={col} />} />
        </TabTrigger>
        <View style={{ flex: 1, alignItems: "center" }}>
          {resume ? (
            <CenterButton label="Reanudar" onPress={() => router.push("/entrenar/sesion")} pulse />
          ) : (
            <TabTrigger name="entrenar" asChild>
              <CenterSlot />
            </TabTrigger>
          )}
        </View>
        <TabTrigger name="plan" asChild>
          <BarTab label="Plan" icon={(col) => <IconPlan color={col} />} />
        </TabTrigger>
      </View>
    </View>
  );
}

function CenterSlot({ isFocused, onPress, ref, href }: TabTriggerSlotProps) {
  return <CenterButton innerRef={ref} href={href} label="Entrenar" onPress={onPress ?? undefined} focused={!!isFocused} />;
}

function CenterButton({
  label,
  onPress,
  focused,
  pulse,
  innerRef,
  href,
}: {
  label: string;
  onPress?: TabTriggerSlotProps["onPress"];
  focused?: boolean;
  pulse?: boolean;
  innerRef?: unknown;
  href?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      ref={innerRef as never}
      {...(Platform.OS === "web" && href ? { href } : {})}
      onPress={(e) => {
        press();
        onPress?.(e);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!focused }}
      style={({ pressed }) => ({ alignItems: "center", marginTop: -26, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: c.accent,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: c.surface,
          shadowColor: c.accent,
          shadowOpacity: pulse ? 0.55 : 0.3,
          shadowRadius: pulse ? 14 : 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
          ...(Platform.OS === "web" ? { boxShadow: `0 4px ${pulse ? 18 : 10}px ${c.accent}66` } : {}),
        }}
      >
        <IconBarbell color={c.onAccent} size={26} strokeWidth={2.4} />
      </View>
      <T style={{ fontFamily: F.bold, fontSize: 13, lineHeight: 16, color: focused || pulse ? c.accentInk : c.muted }}>{label}</T>
    </Pressable>
  );
}
