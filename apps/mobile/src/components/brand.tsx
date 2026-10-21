import { View } from "react-native";
import { useTheme } from "../theme/theme";
import { F } from "../theme/tokens";
import { T } from "./ui";

/** Disco naranja del prototipo (.plate-mark). */
export function PlateMark({ size = 40 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <View aria-hidden style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", top: size / 8, left: size / 8, right: size / 8, bottom: size / 8, borderRadius: size, borderWidth: 1.5, borderColor: c.hdr, opacity: 0.45 }} />
      <View style={{ width: size / 4, height: size / 4, borderRadius: size / 8, backgroundColor: c.hdr }} />
    </View>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0, flexShrink: 1 }}>
      <PlateMark />
      <View style={{ minWidth: 0, flexShrink: 1 }}>
        <T style={{ fontFamily: F.bold, fontSize: 19, lineHeight: 21, letterSpacing: -0.2, color: c.onHdr }} numberOfLines={1}>
          Life Maxxing
        </T>
        {subtitle ? (
          <T style={{ fontSize: 12, lineHeight: 15, marginTop: 3, color: c.hdrMuted }} numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
    </View>
  );
}
