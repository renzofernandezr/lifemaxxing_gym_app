// Diseño compartido de login y registro: logo y nombre centrados, campos amplios sin tarjeta, un solo botón.
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type TextInputProps, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlateMark } from "../../components/brand";
import { T } from "../../components/ui";
import { useTheme } from "../../theme/theme";
import { F } from "../../theme/tokens";

export function AuthShell({ subtitle, children, footer }: { subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
      >
        <View style={{ flex: 1, width: "100%", maxWidth: 400, alignSelf: "center", justifyContent: "center", gap: 40 }}>
          <View style={{ alignItems: "center", gap: 14 }}>
            <PlateMark size={68} />
            <View style={{ alignItems: "center", gap: 6 }}>
              <T style={{ fontFamily: F.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 }} accessibilityRole="header">
                Life Maxxing
              </T>
              <T muted center style={{ fontSize: 15 }}>
                {subtitle}
              </T>
            </View>
          </View>
          <View style={{ gap: 14 }}>{children}</View>
        </View>
        <View style={{ alignItems: "center", paddingTop: 24 }}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Campo amplio con etiqueta; con `secure` muestra "Mostrar/Ocultar". */
export function AuthInput({ label, secure, error, ...rest }: TextInputProps & { label: string; secure?: boolean; error?: boolean }) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T style={{ fontFamily: F.semibold, fontSize: 13, color: c.muted }}>{label}</T>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: c.surface,
          borderWidth: 1.5,
          borderColor: error ? c.bad : focused ? c.accent : c.line,
          borderRadius: 12,
          minHeight: 54,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={secure && !visible}
          placeholderTextColor={c.muted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            { flex: 1, fontSize: 17, fontFamily: F.medium, color: c.fg, paddingVertical: 14 },
            Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null,
          ]}
        />
        {secure ? (
          <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"} hitSlop={10}>
            <T style={{ fontFamily: F.semibold, fontSize: 14, color: c.accentInk }}>{visible ? "Ocultar" : "Mostrar"}</T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
