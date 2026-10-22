import { Platform } from "react-native";

/**
 * URL base de la API. En la web servida por Railway es "" (mismo origen, cookie).
 * En nativo y en Expo local viene de EXPO_PUBLIC_API_URL (.env.development / .env.production).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const IS_WEB = Platform.OS === "web";
export const IS_NATIVE = !IS_WEB;
