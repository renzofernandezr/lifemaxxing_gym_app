// Vibraciones de la app. En web no se usan al tocar botones (Safari no las soporta y en escritorio molestan).
import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

const NATIVE = Platform.OS !== "web";
const ignore = () => {};

/** Toque suave al presionar un botón o elegir una opción. */
export function tap() {
  if (NATIVE) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
}

/** Toque más firme para acciones principales (registrar serie, empezar…). */
export function press() {
  if (NATIVE) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
}

/** Cuenta regresiva 3, 2, 1. */
export function tick() {
  if (NATIVE) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(ignore);
}

/** Fin del descanso: vibración larga (en iOS cada vibración dura ~0.4 s y el patrón son las pausas entre ellas). */
export function longBuzz() {
  if (Platform.OS === "ios") {
    // 6 vibraciones de ~0.4 s con pausas cortas: ~3 s en total.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
    Vibration.vibrate([0, 100, 100, 100, 100, 100]);
  } else if (Platform.OS === "android") {
    Vibration.vibrate([0, 800, 150, 800, 150, 800, 150, 1200]);
  } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([700, 150, 700, 150, 700, 150, 1000]);
    } catch {
      // sin soporte
    }
  }
}
