import { Montserrat_400Regular } from "@expo-google-fonts/montserrat/400Regular";
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { Montserrat_700Bold } from "@expo-google-fonts/montserrat/700Bold";
import { Montserrat_800ExtraBold } from "@expo-google-fonts/montserrat/800ExtraBold";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RestController, RestOverlay } from "../components/rest";
import { ToastProvider, useToast } from "../components/toast";
import { Loading } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { queryClient } from "../lib/queries";
import { setSyncErrorListener, useSyncTriggers } from "../lib/sync";
import { ThemeProvider, useTheme } from "../theme/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <Gate />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { status } = useAuth();
  const { c, scheme } = useTheme();
  const toast = useToast();
  useSyncTriggers();
  useEffect(() => {
    setSyncErrorListener((m) => toast(`No se guardó una serie: ${m}`, "error"));
    return () => setSyncErrorListener(null);
  }, [toast]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: "center" }}>
        <Loading label="Abriendo tu bitácora…" />
      </View>
    );
  }
  const signedIn = status === "signedIn";
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entrenar/sesion" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          <Stack.Screen name="entrenar/resumen" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          <Stack.Screen name="ajustes" options={{ presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {signedIn ? (
        <>
          <RestController />
          <RestOverlay />
        </>
      ) : null}
    </>
  );
}
