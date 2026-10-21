// Descanso: cuenta regresiva por timestamps (sigue funcionando en segundo plano), notificación local
// programada al empezar (nativo), pitidos en los últimos 3 s y vibración al terminar.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { longBuzz } from "./haptics";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useWorkout, type RestState } from "../store/workout";

const IS_NATIVE = Platform.OS !== "web";
let players: { short: AudioPlayer; long: AudioPlayer } | null = null;

if (IS_NATIVE) {
  // Con la app abierta, el aviso lo dan los pitidos y la vibración: no mostrar el banner encima.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Prepara audio (y permisos de notificación) al empezar una sesión: debe llamarse tras un toque del usuario. */
export async function primeRestFeedback() {
  try {
    if (!players) {
      if (IS_NATIVE) await setAudioModeAsync({ playsInSilentMode: true });
      players = {
        short: createAudioPlayer(require("../../assets/sounds/beep-short.wav")),
        long: createAudioPlayer(require("../../assets/sounds/beep-long.wav")),
      };
    }
  } catch {
    players = null;
  }
  if (IS_NATIVE) {
    try {
      const p = await Notifications.getPermissionsAsync();
      if (!p.granted && p.canAskAgain) await Notifications.requestPermissionsAsync();
    } catch {
      // sin permisos: el descanso funciona igual con la app abierta
    }
  }
}

export function beep(kind: "short" | "long") {
  const p = players?.[kind];
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // ignorar
  }
}

export function restDone() {
  beep("long");
  longBuzz();
}

async function schedule(endAt: number, next: string | null): Promise<string | null> {
  if (!IS_NATIVE) return null;
  const seconds = Math.round((endAt - Date.now()) / 1000);
  if (seconds < 2) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: "¡Vamos! Terminó el descanso", body: next ?? "Siguiente serie", sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  } catch {
    return null;
  }
}

async function cancel(id: string | null | undefined) {
  if (IS_NATIVE && id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

async function doStartRest(seconds: number, title: string, next: string | null, info: string | null = null) {
  const prev = useWorkout.getState().rest;
  await cancel(prev?.notificationId);
  const endAt = Date.now() + seconds * 1000;
  const rest: RestState = { endAt, total: seconds * 1000, title, next, info, notificationId: null };
  useWorkout.getState().setRest(rest);
  const id = await schedule(endAt, next);
  const cur = useWorkout.getState().rest;
  if (cur && cur.endAt === endAt) useWorkout.getState().setRest({ ...cur, notificationId: id });
  else await cancel(id);
}

async function doAdjustRest(deltaSec: number) {
  const r = useWorkout.getState().rest;
  if (!r) return;
  const now = Date.now();
  const base = Math.max(r.endAt, now);
  const endAt = Math.max(now + 1000, (r.endAt < now ? now : base) + deltaSec * 1000);
  const total = Math.max(1000, r.total + (endAt - base));
  await cancel(r.notificationId);
  useWorkout.getState().setRest({ ...r, endAt, total, notificationId: null });
  const id = await schedule(endAt, r.next);
  const cur = useWorkout.getState().rest;
  if (cur && cur.endAt === endAt) useWorkout.getState().setRest({ ...cur, notificationId: id });
  else await cancel(id);
}

async function doSkipRest() {
  const r = useWorkout.getState().rest;
  useWorkout.getState().setRest(null);
  await cancel(r?.notificationId);
}


// Las operaciones del descanso se ejecutan de una en una: dos toques rápidos en "+30 s" suman 60 s
// y nunca queda una notificación programada huérfana.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
}

export const startRest = (seconds: number, title: string, next: string | null, info: string | null = null) =>
  serial(() => doStartRest(seconds, title, next, info));
export const adjustRest = (deltaSec: number) => serial(() => doAdjustRest(deltaSec));
export const skipRest = () => serial(() => doSkipRest());
