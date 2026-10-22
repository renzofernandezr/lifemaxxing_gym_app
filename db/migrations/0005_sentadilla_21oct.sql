-- 0005_sentadilla_21oct: registra las 3 series de sentadilla con barra (40 kg × 8) que Renzo hizo en el
-- Workout B del 21-oct-2026 en lugar de la búlgara (las anotó fuera de la app), y las suma al resumen guardado
-- de esa sesión. Es un dato de un usuario concreto: en otra base (tests, otra cuenta) no encuentra la sesión
-- y no hace nada. Los client_id fijos evitan duplicados si alguna vez se corriera de nuevo.
with target as (
  select s.id, s.finished_at
    from workout_sessions s
    join users u on u.id = s.user_id
    join routines r on r.id = s.routine_id
   where u.email = 'renzofernandezg.rf@gmail.com'
     and s.status = 'finished'
     and r.key = 'B'
     and (s.started_at at time zone 'America/Lima')::date = date '2026-10-21'
   order by s.started_at desc
   limit 1
), ins as (
  insert into workout_sets (client_id, session_id, exercise_id, kind, set_index, weight_kg, reps, target_min, target_max, rest_sec, completed_at)
  select v.client_id, t.id, 'sq', 'work', v.set_index, 40, 8, 6, 8, 120, t.finished_at - v.ago
    from target t
   cross join (values
     ('5b1f3c2e-9a41-4c7e-8d21-21a0c0000001'::uuid, 1, interval '9 minutes'),
     ('5b1f3c2e-9a41-4c7e-8d21-21a0c0000002'::uuid, 2, interval '6 minutes'),
     ('5b1f3c2e-9a41-4c7e-8d21-21a0c0000003'::uuid, 3, interval '3 minutes')
   ) as v(client_id, set_index, ago)
  on conflict (client_id) do nothing
  returning session_id
)
update workout_sessions s
   set summary = s.summary || jsonb_build_object(
         'setsCount', (s.summary->>'setsCount')::int + 3,
         'volumeKg', round((s.summary->>'volumeKg')::numeric + 960, 1),
         -- La sentadilla va justo después de la búlgara (que conserva su serie de prueba); si no estuviera, al final.
         'exercises', (
           select jsonb_agg(y.e order by y.o nulls last, y.sub)
             from (
               select x.e, x.o, 0 as sub
                 from jsonb_array_elements(s.summary->'exercises') with ordinality as x(e, o)
               union all
               select jsonb_build_object(
                        'exerciseId', 'sq',
                        'name', 'Sentadilla con barra',
                        'scheme', 'kino',
                        'sets', jsonb_build_array(
                          jsonb_build_object('weightKg', 40, 'reps', 8),
                          jsonb_build_object('weightKg', 40, 'reps', 8),
                          jsonb_build_object('weightKg', 40, 'reps', 8)),
                        'best', jsonb_build_object('weightKg', 40, 'reps', 8),
                        'isRecord', false,
                        'calibration', null,
                        'next', jsonb_build_array(40, 40, 40, 40),
                        'reachedTop', false,
                        'nextText', 'Próxima: 40 kg',
                        'skipped', false),
                      (select z.o from jsonb_array_elements(s.summary->'exercises') with ordinality as z(e, o)
                        where z.e->>'exerciseId' = 'bul' limit 1),
                      1
             ) as y
         ))
 where s.id in (select session_id from ins)
   and s.summary is not null;
