-- 0003_session_summary: resumen calculado al terminar la sesión (historial y récords sin recalcular)
alter table workout_sessions add column if not exists summary jsonb;
