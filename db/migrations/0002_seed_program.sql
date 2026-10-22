-- 0002_seed_program: ejercicios, fases y rutinas del programa.
-- GENERADO por apps/api/scripts/gen-seed.ts desde packages/core/src/program.ts. No editar a mano.
-- Idempotente: insert ... on conflict do nothing.

insert into exercises (id, name, equipment, muscle_groups, cue, increment_kg) values
  ('inc', 'Press inclinado con barra', 'barra', array['pecho', 'hombros', 'tríceps']::text[], 'La serie 1 a una rep del fallo, con técnica limpia. En la 2 y la 3 deja una rep en reserva.', 2.5),
  ('ohp', 'Press militar de pie', 'barra', array['hombros', 'tríceps']::text[], 'Glúteos y abdomen firmes. La barra sube pegada a la cara y termina encima de la cabeza.', 2.5),
  ('tri', 'Extensión de tríceps con cuerda', 'polea', array['tríceps']::text[], 'Codos pegados al torso. Abre la cuerda al final del recorrido.', 2.5),
  ('lat', 'Elevaciones laterales', 'mancuernas', array['hombros']::text[], 'Mismo peso en las cuatro. Solo 10–15 s entre mini-series. Subes cuando logras 15 + 6 + 6 + 6.', 2),
  ('knee', 'Elevación de rodillas colgado', 'peso_corporal', array['abdomen']::text[], 'Rodillas al pecho sin balanceo. Con 3 × 12 sostén una mancuerna entre los pies.', 2.5),
  ('neg', 'Negativas de dominada supina', 'peso_corporal', array['espalda', 'bíceps']::text[], 'Sube con un salto o un banco y baja en 5 segundos. Es el puente hacia tu primera dominada.', 0),
  ('jal', 'Jalón al pecho supino', 'polea', array['espalda', 'bíceps']::text[], 'Agarre supino al ancho de hombros. Pecho arriba y lleva la barra a la clavícula.', 2.5),
  ('ham', 'Curl martillo inclinado', 'mancuernas', array['bíceps', 'antebrazo']::text[], 'Espalda pegada al banco inclinado y brazos colgando detrás del torso. Sin balanceo.', 2),
  ('bul', 'Sentadilla búlgara', 'mancuernas', array['cuádriceps', 'glúteos']::text[], 'Peso por mano y sube carga en cada serie. Si la serie 3 ya es tu tope, repite ese peso en la 4.', 2),
  ('rdl', 'Peso muerto rumano con mancuernas', 'mancuernas', array['isquios', 'glúteos']::text[], 'Cadera atrás, rodillas apenas flexionadas, espalda neutra. Siente el estiramiento en isquios.', 2),
  ('fp', 'Face pulls', 'polea', array['hombro posterior', 'espalda alta']::text[], 'Tira hacia la frente separando las manos. Pausa de 1 s atrás.', 2.5),
  ('car', 'Cardio moderado', 'cardio', array['cardio']::text[], 'Ritmo al que puedas conversar. Referencia opcional del curso: ~400 kcal.', 0),
  ('hlr', 'Elevación de piernas colgado', 'peso_corporal', array['abdomen']::text[], 'Piernas casi rectas y sube controlado.', 0),
  ('s2s', 'Rodillas lado a lado', 'peso_corporal', array['oblicuos']::text[], 'Alterna lados para trabajar oblicuos.', 0),
  ('whl', 'Rueda abdominal', 'rueda', array['abdomen']::text[], 'Desde rodillas, sin hundir la zona lumbar.', 0),
  ('brg', 'Puente de cadera isométrico', 'peso_corporal', array['glúteos']::text[], 'Aprieta glúteos arriba y mantén.', 0),
  ('inc_db', 'Press inclinado con mancuernas', 'mancuernas', array['pecho', 'hombros', 'tríceps']::text[], 'Banco a 30°. Baja las mancuernas a los lados del pecho y empuja juntándolas arriba. Peso por mano.', 2),
  ('dip_w', 'Fondos lastrados', 'peso_corporal', array['pecho', 'tríceps']::text[], 'Torso un poco inclinado hacia delante. Baja hasta que el hombro quede a la altura del codo.', 2.5),
  ('tri_oh', 'Extensión de tríceps sobre la cabeza a un brazo', 'mancuernas', array['tríceps']::text[], 'Codo apuntando al techo y fijo. Baja la mancuerna detrás de la cabeza y extiende por completo.', 2),
  ('uprow', 'Remo al mentón con mancuernas', 'mancuernas', array['hombros', 'trapecio']::text[], 'Sube con los codos por delante de las manos y para a la altura del pecho.', 2),
  ('jal_pr', 'Jalón al pecho prono', 'polea', array['espalda', 'bíceps']::text[], 'Agarre prono algo más ancho que los hombros. Pecho arriba y codos hacia las costillas.', 2.5),
  ('curl_inc', 'Curl inclinado con mancuernas', 'mancuernas', array['bíceps']::text[], 'Banco a 45°, brazos colgando. Sube sin adelantar los codos.', 2),
  ('box', 'Box squat con barra', 'barra', array['cuádriceps', 'glúteos']::text[], 'Siéntate atrás en el cajón sin rebotar, pausa breve y sube empujando el suelo.', 2.5),
  ('sl_rdl', 'Peso muerto rumano a una pierna', 'mancuernas', array['isquios', 'glúteos']::text[], 'Cadera cuadrada al suelo, pierna de apoyo apenas flexionada. Baja lento y controla el equilibrio.', 2),
  ('rdf', 'Pájaros sentado', 'mancuernas', array['hombro posterior']::text[], 'Sentado e inclinado sobre las piernas. Abre los brazos con los codos algo flexionados.', 2),
  ('chin_w', 'Dominada supina lastrada', 'peso_corporal', array['espalda', 'bíceps']::text[], 'Con 8 dominadas limpias empiezas a lastrar: 4, 6 y 8 reps, +1.25 kg por sesión.', 1.25),
  ('bench', 'Press de banca con barra', 'barra', array['pecho', 'tríceps']::text[], 'Escápulas juntas y pies firmes. Baja la barra a la parte baja del pecho.', 2.5),
  ('pull_w', 'Dominada prona lastrada', 'peso_corporal', array['espalda', 'bíceps']::text[], 'Agarre prono, sube hasta pasar la barbilla y baja controlado.', 1.25),
  ('hip_thrust', 'Hip thrust con barra', 'barra', array['glúteos', 'isquios']::text[], 'Espalda alta en el banco, barbilla al pecho. Empuja con los talones y aprieta glúteos arriba.', 2.5),
  ('sq', 'Sentadilla con barra', 'barra', array['cuádriceps', 'glúteos']::text[], 'Barra sobre los trapecios y pies al ancho de los hombros. Baja con el pecho arriba hasta que la cadera llegue a la altura de las rodillas, rodillas en la línea de los pies, y sube empujando el suelo.', 2.5),
  ('sapd', 'Jalón con brazos rectos en polea', 'polea', array['dorsales', 'espalda alta']::text[], 'De pie frente a la polea alta, brazos casi rectos. Baja la barra o la cuerda hasta los muslos llevando la fuerza a los dorsales, aprieta 1 s y sube lento.', 2.5)
on conflict (id) do nothing;

insert into program_phases (id, name, week_from, week_to, template_phase) values
  (1, 'Fase 1 · Énfasis hombros', 1, 8, 1),
  (2, 'Fase 2 · Énfasis pecho', 9, 16, 2),
  (3, 'Fase 3 · Repite fase 1', 17, 24, 1)
on conflict (id) do nothing;

insert into routines (template_phase, key, name, focus) values
  (1, 'A', 'Workout A', 'Pecho · hombros · tríceps · abs'),
  (1, 'B', 'Workout B', 'Espalda · bíceps · piernas'),
  (1, 'C', 'Cardio + abs', 'Sábado · día sin pesas'),
  (2, 'A', 'Workout A', 'Pecho · tríceps · hombros'),
  (2, 'B', 'Workout B', 'Espalda · bíceps · piernas'),
  (2, 'C', 'Cardio + abs', 'Sábado · día sin pesas')
on conflict (template_phase, key) do nothing;

-- Plantilla 1 · A · Workout A
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'inc', null, 'rpt', null, '[[0.5,6],[0.7,5],[0.8,3]]'::jsonb, true, false, null
from routines r where r.template_phase = 1 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 4, 5, 'reps', 120, 'la pesada'),
  (2, 6, 7, 'reps', 120, '−10 %, más reps'),
  (3, 8, 10, 'reps', 120, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'ohp', null, 'rpt', null, null, true, false, null
from routines r where r.template_phase = 1 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, 'la pesada'),
  (2, 8, 10, 'reps', 120, '−10 %, más reps'),
  (3, 8, 10, 'reps', 120, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 'tri', null, 'rpt', null, null, true, false, null
from routines r where r.template_phase = 1 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 90, 'la pesada'),
  (2, 8, 10, 'reps', 90, '−10 %, más reps'),
  (3, 10, 12, 'reps', 90, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'lat', null, 'rest_pause', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 12, 15, 'reps', 12, 'activación a tope'),
  (2, 4, 6, 'reps', 12, 'mini-serie 1'),
  (3, 4, 6, 'reps', 12, 'mini-serie 2'),
  (4, 4, 6, 'reps', 90, 'mini-serie 3')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 'knee', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 12, 'reps', 60, null),
  (2, 8, 12, 'reps', 60, null),
  (3, 8, 12, 'reps', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;

-- Plantilla 1 · B · Workout B
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'neg', null, 'straight', null, null, false, true, 'Añadido, no es del curso: bajar en 5 s.'
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 3, 5, 'reps', 90, null),
  (2, 3, 5, 'reps', 90, null),
  (3, 3, 5, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'jal', 'chin_w', 'rpt', null, '[[0.5,6],[0.75,3]]'::jsonb, true, false, 'Sustituye a las chinups lastradas'
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, 'la pesada'),
  (2, 8, 10, 'reps', 120, '−10 %, más reps'),
  (3, 10, 12, 'reps', 120, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 'ham', null, 'rpt', 2, null, true, false, null
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 90, 'la pesada'),
  (2, 6, 8, 'reps', 90, '−2 kg por mano'),
  (3, 8, 10, 'reps', 90, '−2 kg por mano')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'sq', 'bul', 'kino', null, null, true, false, 'Reemplaza a la sentadilla búlgara (la tienes como alternativa).'
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, null),
  (2, 6, 8, 'reps', 120, null),
  (3, 6, 8, 'reps', 120, null),
  (4, 6, 8, 'reps', 120, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 'rdl', null, 'kino', null, null, true, false, null
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 12, 'reps', 90, null),
  (2, 10, 12, 'reps', 90, null),
  (3, 10, 12, 'reps', 90, null),
  (4, 10, 12, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 6, 'sapd', 'fp', 'kino', null, null, false, false, 'Reemplaza a los face pulls (los tienes como alternativa).'
from routines r where r.template_phase = 1 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 12, 15, 'reps', 90, null),
  (2, 12, 15, 'reps', 90, null),
  (3, 12, 15, 'reps', 90, null),
  (4, 12, 15, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 6
on conflict (routine_exercise_id, set_index) do nothing;

-- Plantilla 1 · C · Cardio + abs
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'car', null, 'cardio', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 40, 60, 'min', 120, 'bloque continuo')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'hlr', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 12, 'reps', 60, null),
  (2, 8, 12, 'reps', 60, null),
  (3, 8, 12, 'reps', 60, null),
  (4, 8, 12, 'reps', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 's2s', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 15, 'reps_per_side', 60, null),
  (2, 10, 15, 'reps_per_side', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'whl', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 10, 'reps', 60, null),
  (2, 10, 10, 'reps', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 'brg', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 1 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 30, 30, 'sec', 45, null),
  (2, 30, 30, 'sec', 45, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 1 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;

-- Plantilla 2 · A · Workout A
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'inc_db', null, 'rpt', 4, null, true, false, null
from routines r where r.template_phase = 2 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, 'la pesada'),
  (2, 8, 10, 'reps', 120, '−4 kg por mano'),
  (3, 10, 12, 'reps', 120, '−4 kg por mano')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'dip_w', 'bench', 'rpt', null, null, true, false, 'Si aún no haces fondos con lastre, usa press de banca.'
from routines r where r.template_phase = 2 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, 'la pesada'),
  (2, 8, 10, 'reps', 120, '−10 %, más reps'),
  (3, 10, 12, 'reps', 120, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 'tri_oh', null, 'rpt', 2, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 10, 'reps', 90, 'la pesada'),
  (2, 10, 12, 'reps', 90, '−2 kg por mano'),
  (3, 12, 15, 'reps', 90, '−2 kg por mano')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'uprow', null, 'kino', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 15, 'reps', 90, null),
  (2, 10, 15, 'reps', 90, null),
  (3, 10, 15, 'reps', 90, null),
  (4, 10, 15, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 's2s', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'A'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 12, 'reps_per_side', 60, null),
  (2, 8, 12, 'reps_per_side', 60, null),
  (3, 8, 12, 'reps_per_side', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'A'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;

-- Plantilla 2 · B · Workout B
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'neg', null, 'straight', null, null, false, true, 'Añadido, no es del curso: bajar en 5 s.'
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 3, 5, 'reps', 90, null),
  (2, 3, 5, 'reps', 90, null),
  (3, 3, 5, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'jal_pr', 'pull_w', 'rpt', null, null, true, false, null
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 120, 'la pesada'),
  (2, 8, 10, 'reps', 120, '−10 %, más reps'),
  (3, 8, 10, 'reps', 120, '−10 %, más reps')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 'curl_inc', null, 'rpt', 2, null, true, false, null
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 8, 'reps', 90, 'la pesada'),
  (2, 6, 8, 'reps', 90, '−2 kg por mano'),
  (3, 6, 8, 'reps', 90, '−2 kg por mano')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'box', null, 'kino', null, null, true, false, null
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 6, 6, 'reps', 120, null),
  (2, 6, 6, 'reps', 120, null),
  (3, 6, 6, 'reps', 120, null),
  (4, 6, 6, 'reps', 120, null),
  (5, 6, 6, 'reps', 120, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 'sl_rdl', 'hip_thrust', 'kino', null, null, true, false, null
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 12, 'reps', 90, null),
  (2, 8, 12, 'reps', 90, null),
  (3, 8, 12, 'reps', 90, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 6, 'rdf', null, 'rest_pause', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'B'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 12, 15, 'reps', 12, 'activación a tope'),
  (2, 4, 6, 'reps', 12, 'mini-serie 1'),
  (3, 4, 6, 'reps', 12, 'mini-serie 2'),
  (4, 4, 6, 'reps', 90, 'mini-serie 3')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'B'
join routine_exercises re on re.routine_id = r.id and re.position = 6
on conflict (routine_exercise_id, set_index) do nothing;

-- Plantilla 2 · C · Cardio + abs
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 1, 'car', null, 'cardio', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 40, 60, 'min', 120, 'bloque continuo')
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 1
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 2, 'hlr', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 8, 12, 'reps', 60, null),
  (2, 8, 12, 'reps', 60, null),
  (3, 8, 12, 'reps', 60, null),
  (4, 8, 12, 'reps', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 2
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 3, 's2s', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 15, 'reps_per_side', 60, null),
  (2, 10, 15, 'reps_per_side', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 3
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 4, 'whl', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 10, 10, 'reps', 60, null),
  (2, 10, 10, 'reps', 60, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 4
on conflict (routine_exercise_id, set_index) do nothing;
insert into routine_exercises (routine_id, position, exercise_id, alt_exercise_id, scheme, drop_kg, warmup, calibratable, is_addition, note)
select r.id, 5, 'brg', null, 'straight', null, null, false, false, null
from routines r where r.template_phase = 2 and r.key = 'C'
on conflict (routine_id, position) do nothing;
insert into routine_sets (routine_exercise_id, set_index, reps_min, reps_max, unit, rest_sec, label)
select re.id, v.set_index, v.reps_min, v.reps_max, v.unit, v.rest_sec, v.label from (values
  (1, 30, 30, 'sec', 45, null),
  (2, 30, 30, 'sec', 45, null)
) as v(set_index, reps_min, reps_max, unit, rest_sec, label)
join routines r on r.template_phase = 2 and r.key = 'C'
join routine_exercises re on re.routine_id = r.id and re.position = 5
on conflict (routine_exercise_id, set_index) do nothing;
