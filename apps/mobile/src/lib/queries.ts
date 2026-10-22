import type {
  ActivityResponse,
  CheckinDTO,
  CheckinPostResponse,
  HistoryResponse,
  LiftsResponse,
  MeasurementDTO,
  MeResponse,
  OverviewResponse,
  ProfilePatch,
  RoutinesResponse,
  SessionSummary,
  TodayResponse,
  WorkoutSessionDTO,
} from "@lifemaxxing/core";
import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (n, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 2,
    },
  },
});

export const qk = {
  me: ["me"] as const,
  today: (date?: string) => ["today", date ?? "now"] as const,
  routines: (phase?: number) => ["routines", phase ?? "current"] as const,
  history: ["history"] as const,
  checkins: ["checkins"] as const,
  measurements: ["measurements"] as const,
  overview: ["overview"] as const,
  lifts: ["lifts"] as const,
  activity: (weeks: number) => ["activity", weeks] as const,
  session: (id: string) => ["session", id] as const,
};

export const useMe = (enabled = true) => useQuery({ queryKey: qk.me, queryFn: () => api<MeResponse>("/api/auth/me"), enabled });
export const useToday = (date?: string) =>
  useQuery({ queryKey: qk.today(date), queryFn: () => api<TodayResponse>(`/api/program/today${date ? `?date=${date}` : ""}`) });
export const useRoutines = (phase?: number) =>
  useQuery({ queryKey: qk.routines(phase), queryFn: () => api<RoutinesResponse>(`/api/program/routines${phase ? `?phase=${phase}` : ""}`), staleTime: Infinity });
export const useOverview = () => useQuery({ queryKey: qk.overview, queryFn: () => api<OverviewResponse>("/api/stats/overview") });
export const useLifts = () => useQuery({ queryKey: qk.lifts, queryFn: () => api<LiftsResponse>("/api/stats/lifts") });
export const useActivity = (weeks = 26) =>
  useQuery({ queryKey: qk.activity(weeks), queryFn: () => api<ActivityResponse>(`/api/stats/activity?weeks=${weeks}`) });
export const useCheckins = () =>
  useQuery({ queryKey: qk.checkins, queryFn: async () => (await api<{ checkins: CheckinDTO[] }>("/api/checkins")).checkins });
export const useMeasurements = () =>
  useQuery({ queryKey: qk.measurements, queryFn: async () => (await api<{ measurements: MeasurementDTO[] }>("/api/measurements")).measurements });
export const useSessionDetail = (id: string | null) =>
  useQuery({
    queryKey: qk.session(id ?? ""),
    enabled: !!id,
    queryFn: () => api<{ session: WorkoutSessionDTO; summary: SessionSummary | null }>(`/api/sessions/${id}`),
  });

export const useHistory = () =>
  useInfiniteQuery({
    queryKey: qk.history,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<HistoryResponse>(`/api/sessions?limit=20${pageParam ? `&before=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (last) => last.nextBefore,
  });

/** Invalida todo lo que depende de entrenos (tras terminar o descartar). */
export function invalidateTraining(qc: QueryClient = queryClient) {
  for (const k of [["today"], qk.history, qk.overview, qk.lifts, ["activity"]]) qc.invalidateQueries({ queryKey: k });
}

export function useSaveCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { measuredOn: string; weightKg: number; bodyFatPct?: number | null }) =>
      api<CheckinPostResponse>("/api/checkins", { method: "POST", body: b }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.checkins });
      qc.invalidateQueries({ queryKey: qk.overview });
      qc.invalidateQueries({ queryKey: qk.lifts });
    },
  });
}

export function useDeleteCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/checkins/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.checkins });
      qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}

export function useSaveMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { measuredOn: string; chestCm?: number | null; armCm?: number | null; waistCm?: number | null }) =>
      api("/api/measurements", { method: "POST", body: b }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.measurements }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ProfilePatch) => api<MeResponse>("/api/profile", { method: "PATCH", body: b }),
    onSuccess: (me) => {
      qc.setQueryData(qk.me, me);
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}
