// Datos del programa Greek God 2.0 adaptado (fuente: index.html y docs/rutina-fase1.md).
// Es la fuente única: de aquí se genera db/migrations/0002_seed_program.sql y la app los usa sin conexión.
import type { Exercise, Phase, ResolvedExercise, RoutineExerciseTemplate, RoutineKey, RoutineTemplate, SetTemplate, SetUnit } from "./types";

export const PHASES: Phase[] = [
  { id: 1, name: "Fase 1 · Énfasis hombros", weekFrom: 1, weekTo: 8, templatePhase: 1 },
  { id: 2, name: "Fase 2 · Énfasis pecho", weekFrom: 9, weekTo: 16, templatePhase: 2 },
  { id: 3, name: "Fase 3 · Repite fase 1", weekFrom: 17, weekTo: 24, templatePhase: 1 },
];

export const PROGRAM_WEEKS = 24;
export const DEFAULT_PROGRAM_START = "2026-10-19";
export const DEFAULT_TIMEZONE = "America/Lima";

const ex = (
  id: string,
  name: string,
  equipment: Exercise["equipment"],
  incrementKg: number,
  muscleGroups: string[],
  cue: string,
): Exercise => ({ id, name, equipment, incrementKg, muscleGroups, cue });

export const EXERCISES: Exercise[] = [
  ex("inc", "Press inclinado con barra", "barra", 2.5, ["pecho", "hombros", "tríceps"],
    "La serie 1 a una rep del fallo, con técnica limpia. En la 2 y la 3 deja una rep en reserva."),
  ex("ohp", "Press militar de pie", "barra", 2.5, ["hombros", "tríceps"],
    "Glúteos y abdomen firmes. La barra sube pegada a la cara y termina encima de la cabeza."),
  ex("tri", "Extensión de tríceps con cuerda", "polea", 2.5, ["tríceps"],
    "Codos pegados al torso. Abre la cuerda al final del recorrido."),
  ex("lat", "Elevaciones laterales", "mancuernas", 2, ["hombros"],
    "Mismo peso en las cuatro. Solo 10–15 s entre mini-series. Subes cuando logras 15 + 6 + 6 + 6."),
  ex("knee", "Elevación de rodillas colgado", "peso_corporal", 2.5, ["abdomen"],
    "Rodillas al pecho sin balanceo. Con 3 × 12 sostén una mancuerna entre los pies."),
  ex("neg", "Negativas de dominada supina", "peso_corporal", 0, ["espalda", "bíceps"],
    "Sube con un salto o un banco y baja en 5 segundos. Es el puente hacia tu primera dominada."),
  ex("jal", "Jalón al pecho supino", "polea", 2.5, ["espalda", "bíceps"],
    "Agarre supino al ancho de hombros. Pecho arriba y lleva la barra a la clavícula."),
  ex("ham", "Curl martillo inclinado", "mancuernas", 2, ["bíceps", "antebrazo"],
    "Espalda pegada al banco inclinado y brazos colgando detrás del torso. Sin balanceo."),
  ex("bul", "Sentadilla búlgara", "mancuernas", 2, ["cuádriceps", "glúteos"],
    "Peso por mano y sube carga en cada serie. Si la serie 3 ya es tu tope, repite ese peso en la 4."),
  ex("rdl", "Peso muerto rumano con mancuernas", "mancuernas", 2, ["isquios", "glúteos"],
    "Cadera atrás, rodillas apenas flexionadas, espalda neutra. Siente el estiramiento en isquios."),
  ex("fp", "Face pulls", "polea", 2.5, ["hombro posterior", "espalda alta"],
    "Tira hacia la frente separando las manos. Pausa de 1 s atrás."),
  ex("car", "Cardio moderado", "cardio", 0, ["cardio"],
    "Ritmo al que puedas conversar. Referencia opcional del curso: ~400 kcal."),
  ex("hlr", "Elevación de piernas colgado", "peso_corporal", 0, ["abdomen"],
    "Piernas casi rectas y sube controlado."),
  ex("s2s", "Rodillas lado a lado", "peso_corporal", 0, ["oblicuos"],
    "Alterna lados para trabajar oblicuos."),
  ex("whl", "Rueda abdominal", "rueda", 0, ["abdomen"],
    "Desde rodillas, sin hundir la zona lumbar."),
  ex("brg", "Puente de cadera isométrico", "peso_corporal", 0, ["glúteos"],
    "Aprieta glúteos arriba y mantén."),
  // Fase 2
  ex("inc_db", "Press inclinado con mancuernas", "mancuernas", 2, ["pecho", "hombros", "tríceps"],
    "Banco a 30°. Baja las mancuernas a los lados del pecho y empuja juntándolas arriba. Peso por mano."),
  ex("dip_w", "Fondos lastrados", "peso_corporal", 2.5, ["pecho", "tríceps"],
    "Torso un poco inclinado hacia delante. Baja hasta que el hombro quede a la altura del codo."),
  ex("tri_oh", "Extensión de tríceps sobre la cabeza a un brazo", "mancuernas", 2, ["tríceps"],
    "Codo apuntando al techo y fijo. Baja la mancuerna detrás de la cabeza y extiende por completo."),
  ex("uprow", "Remo al mentón con mancuernas", "mancuernas", 2, ["hombros", "trapecio"],
    "Sube con los codos por delante de las manos y para a la altura del pecho."),
  ex("jal_pr", "Jalón al pecho prono", "polea", 2.5, ["espalda", "bíceps"],
    "Agarre prono algo más ancho que los hombros. Pecho arriba y codos hacia las costillas."),
  ex("curl_inc", "Curl inclinado con mancuernas", "mancuernas", 2, ["bíceps"],
    "Banco a 45°, brazos colgando. Sube sin adelantar los codos."),
  ex("box", "Box squat con barra", "barra", 2.5, ["cuádriceps", "glúteos"],
    "Siéntate atrás en el cajón sin rebotar, pausa breve y sube empujando el suelo."),
  ex("sl_rdl", "Peso muerto rumano a una pierna", "mancuernas", 2, ["isquios", "glúteos"],
    "Cadera cuadrada al suelo, pierna de apoyo apenas flexionada. Baja lento y controla el equilibrio."),
  ex("rdf", "Pájaros sentado", "mancuernas", 2, ["hombro posterior"],
    "Sentado e inclinado sobre las piernas. Abre los brazos con los codos algo flexionados."),
  // Alternativas
  ex("chin_w", "Dominada supina lastrada", "peso_corporal", 1.25, ["espalda", "bíceps"],
    "Con 8 dominadas limpias empiezas a lastrar: 4, 6 y 8 reps, +1.25 kg por sesión."),
  ex("bench", "Press de banca con barra", "barra", 2.5, ["pecho", "tríceps"],
    "Escápulas juntas y pies firmes. Baja la barra a la parte baja del pecho."),
  ex("pull_w", "Dominada prona lastrada", "peso_corporal", 1.25, ["espalda", "bíceps"],
    "Agarre prono, sube hasta pasar la barbilla y baja controlado."),
  ex("hip_thrust", "Hip thrust con barra", "barra", 2.5, ["glúteos", "isquios"],
    "Espalda alta en el banco, barbilla al pecho. Empuja con los talones y aprieta glúteos arriba."),
  // Cambios de Renzo (22-oct): sentadilla con barra en lugar de la búlgara y jalón con brazos rectos en lugar de face pulls.
  ex("sq", "Sentadilla con barra", "barra", 2.5, ["cuádriceps", "glúteos"],
    "Barra sobre los trapecios y pies al ancho de los hombros. Baja con el pecho arriba hasta que la cadera llegue a la altura de las rodillas, rodillas en la línea de los pies, y sube empujando el suelo."),
  ex("sapd", "Jalón con brazos rectos en polea", "polea", 2.5, ["dorsales", "espalda alta"],
    "De pie frente a la polea alta, brazos casi rectos. Baja la barra o la cuerda hasta los muslos llevando la fuerza a los dorsales, aprieta 1 s y sube lento."),
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

const s = (repsMin: number, repsMax: number, restSec: number, label: string | null = null, unit: SetUnit = "reps") => ({
  repsMin, repsMax, restSec, label, unit,
});
const times = (n: number, set: ReturnType<typeof s>) => Array.from({ length: n }, () => ({ ...set }));
const withIndex = (sets: ReturnType<typeof s>[]): SetTemplate[] => sets.map((x, i) => ({ ...x, setIndex: i + 1 }));

type ReInput = Omit<RoutineExerciseTemplate, "position" | "sets" | "calibratable" | "isAddition"> & {
  sets: ReturnType<typeof s>[];
  calibratable?: boolean;
  isAddition?: boolean;
};
const re = (list: ReInput[]): RoutineExerciseTemplate[] =>
  list.map((x, i) => ({
    ...x,
    position: i + 1,
    calibratable: x.calibratable ?? false,
    isAddition: x.isAddition ?? false,
    sets: withIndex(x.sets),
  }));

const DROP = "−10 %, más reps";
/** Descansos (pedido de Renzo): 2 min en los básicos pesados y 1:30 en el resto. */
const HEAVY = 120;
const LIGHT = 90;
const C_EXERCISES = re([
  { exerciseId: "car", scheme: "cardio", sets: [s(40, 60, 120, "bloque continuo", "min")] },
  { exerciseId: "hlr", scheme: "straight", sets: times(4, s(8, 12, 60)) },
  { exerciseId: "s2s", scheme: "straight", sets: times(2, s(10, 15, 60, null, "reps_per_side")) },
  { exerciseId: "whl", scheme: "straight", sets: times(2, s(10, 10, 60)) },
  { exerciseId: "brg", scheme: "straight", sets: times(2, s(30, 30, 45, null, "sec")) },
]);

export const ROUTINES: RoutineTemplate[] = [
  {
    templatePhase: 1, key: "A", name: "Workout A", focus: "Pecho · hombros · tríceps · abs",
    exercises: re([
      { exerciseId: "inc", scheme: "rpt", warmup: [[0.5, 6], [0.7, 5], [0.8, 3]], calibratable: true,
        sets: [s(4, 5, HEAVY, "la pesada"), s(6, 7, HEAVY, DROP), s(8, 10, HEAVY, DROP)] },
      { exerciseId: "ohp", scheme: "rpt", calibratable: true,
        sets: [s(6, 8, HEAVY, "la pesada"), s(8, 10, HEAVY, DROP), s(8, 10, HEAVY, DROP)] },
      { exerciseId: "tri", scheme: "rpt", calibratable: true,
        sets: [s(6, 8, LIGHT, "la pesada"), s(8, 10, LIGHT, DROP), s(10, 12, LIGHT, DROP)] },
      { exerciseId: "lat", scheme: "rest_pause",
        sets: [s(12, 15, 12, "activación a tope"), s(4, 6, 12, "mini-serie 1"), s(4, 6, 12, "mini-serie 2"), s(4, 6, LIGHT, "mini-serie 3")] },
      { exerciseId: "knee", scheme: "straight", sets: times(3, s(8, 12, 60)) },
    ]),
  },
  {
    templatePhase: 1, key: "B", name: "Workout B", focus: "Espalda · bíceps · piernas",
    exercises: re([
      { exerciseId: "neg", scheme: "straight", isAddition: true, note: "Añadido, no es del curso: bajar en 5 s.",
        sets: times(3, s(3, 5, LIGHT)) },
      { exerciseId: "jal", scheme: "rpt", altExerciseId: "chin_w", warmup: [[0.5, 6], [0.75, 3]], calibratable: true,
        note: "Sustituye a las chinups lastradas",
        sets: [s(6, 8, HEAVY, "la pesada"), s(8, 10, HEAVY, DROP), s(10, 12, HEAVY, DROP)] },
      { exerciseId: "ham", scheme: "rpt", dropKg: 2, calibratable: true,
        sets: [s(6, 8, LIGHT, "la pesada"), s(6, 8, LIGHT, "−2 kg por mano"), s(8, 10, LIGHT, "−2 kg por mano")] },
      { exerciseId: "sq", scheme: "kino", altExerciseId: "bul", calibratable: true,
        note: "Reemplaza a la sentadilla búlgara (la tienes como alternativa).",
        sets: times(4, s(6, 8, HEAVY)) },
      { exerciseId: "rdl", scheme: "kino", calibratable: true, sets: times(4, s(10, 12, LIGHT)) },
      { exerciseId: "sapd", scheme: "kino", altExerciseId: "fp", note: "Reemplaza a los face pulls (los tienes como alternativa).",
        sets: times(4, s(12, 15, LIGHT)) },
    ]),
  },
  { templatePhase: 1, key: "C", name: "Cardio + abs", focus: "Sábado · día sin pesas", exercises: C_EXERCISES },
  {
    templatePhase: 2, key: "A", name: "Workout A", focus: "Pecho · tríceps · hombros",
    exercises: re([
      { exerciseId: "inc_db", scheme: "rpt", dropKg: 4, calibratable: true,
        sets: [s(6, 8, HEAVY, "la pesada"), s(8, 10, HEAVY, "−4 kg por mano"), s(10, 12, HEAVY, "−4 kg por mano")] },
      { exerciseId: "dip_w", scheme: "rpt", altExerciseId: "bench", calibratable: true,
        note: "Si aún no haces fondos con lastre, usa press de banca.",
        sets: [s(6, 8, HEAVY, "la pesada"), s(8, 10, HEAVY, DROP), s(10, 12, HEAVY, DROP)] },
      { exerciseId: "tri_oh", scheme: "rpt", dropKg: 2,
        sets: [s(8, 10, LIGHT, "la pesada"), s(10, 12, LIGHT, "−2 kg por mano"), s(12, 15, LIGHT, "−2 kg por mano")] },
      { exerciseId: "uprow", scheme: "kino", sets: times(4, s(10, 15, LIGHT)) },
      { exerciseId: "s2s", scheme: "straight", sets: times(3, s(8, 12, 60, null, "reps_per_side")) },
    ]),
  },
  {
    templatePhase: 2, key: "B", name: "Workout B", focus: "Espalda · bíceps · piernas",
    exercises: re([
      { exerciseId: "neg", scheme: "straight", isAddition: true, note: "Añadido, no es del curso: bajar en 5 s.",
        sets: times(3, s(3, 5, LIGHT)) },
      { exerciseId: "jal_pr", scheme: "rpt", altExerciseId: "pull_w", calibratable: true,
        sets: [s(6, 8, HEAVY, "la pesada"), s(8, 10, HEAVY, DROP), s(8, 10, HEAVY, DROP)] },
      { exerciseId: "curl_inc", scheme: "rpt", dropKg: 2, calibratable: true,
        sets: [s(6, 8, LIGHT, "la pesada"), s(6, 8, LIGHT, "−2 kg por mano"), s(6, 8, LIGHT, "−2 kg por mano")] },
      { exerciseId: "box", scheme: "kino", calibratable: true, sets: times(5, s(6, 6, HEAVY)) },
      { exerciseId: "sl_rdl", scheme: "kino", altExerciseId: "hip_thrust", calibratable: true, sets: times(3, s(8, 12, LIGHT)) },
      { exerciseId: "rdf", scheme: "rest_pause",
        sets: [s(12, 15, 12, "activación a tope"), s(4, 6, 12, "mini-serie 1"), s(4, 6, 12, "mini-serie 2"), s(4, 6, LIGHT, "mini-serie 3")] },
    ]),
  },
  { templatePhase: 2, key: "C", name: "Cardio + abs", focus: "Sábado · día sin pesas", exercises: C_EXERCISES },
];

export function routineTemplate(templatePhase: number, key: RoutineKey): RoutineTemplate {
  const r = ROUTINES.find((x) => x.templatePhase === templatePhase && x.key === key);
  if (!r) throw new Error(`Rutina inexistente: plantilla ${templatePhase} ${key}`);
  return r;
}

export function resolveExercise(t: RoutineExerciseTemplate): ResolvedExercise {
  const exercise = EXERCISE_BY_ID[t.exerciseId];
  if (!exercise) throw new Error(`Ejercicio inexistente: ${t.exerciseId}`);
  return { ...t, exercise };
}

export function resolveRoutine(r: RoutineTemplate): ResolvedExercise[] {
  return r.exercises.map(resolveExercise);
}

/** Grupos de la pestaña Fuerza (todos los ejercicios con carga o reps; los de tiempo —cardio, puente— no). */
export const STRENGTH_GROUPS: { key: string; name: string; ids: string[] }[] = [
  { key: "basicos", name: "Básicos", ids: ["inc", "ohp", "jal", "inc_db", "dip_w", "bench", "jal_pr", "chin_w", "pull_w"] },
  { key: "piernas", name: "Piernas", ids: ["sq", "bul", "rdl", "box", "sl_rdl", "hip_thrust"] },
  { key: "accesorios", name: "Accesorios", ids: ["tri", "tri_oh", "ham", "curl_inc", "lat", "uprow", "rdf", "sapd", "fp"] },
  { key: "core", name: "Peso corporal y core", ids: ["neg", "knee", "hlr", "s2s", "whl"] },
];
export const STRENGTH_IDS: string[] = STRENGTH_GROUPS.flatMap((g) => g.ids);
/** Los tres levantamientos clave (tarjetas grandes y estándares). */
export const KEY_LIFTS = ["inc", "ohp", "jal"];
