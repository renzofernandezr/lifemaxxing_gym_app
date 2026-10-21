# Lifemaxxing Gym · instrucciones para Claude Code

- Plan completo de construcción: `docs/PLAN_APP_RN.md`. Síguelo hito por hito.
- Antes de hacer nada en una sesión nueva, lee `docs/PROGRESO.md` y `docs/DECISIONES.md` (si existen) y continúa desde el último hito pendiente.
- Referencia de diseño y lógica: `index.html` (prototipo). No lo borres.
- Dominio (rutina, progresión, calibración, nutrición): `docs/rutina-fase1.md`.
- Rama de trabajo: `feat/app-rn`. Commits pequeños, conventional commits en español, push al cerrar cada hito. Nunca `git push --force`.
- Nunca commitees secretos. Solo `.env.example`. Las credenciales generadas van en `.secrets/` (ignorada por git).
- No toques proyectos de Railway distintos de `lifemaxxing-gym`.
- UI en español (Perú), código en inglés, unidades en kg, zona horaria `America/Lima`.
- Antes de cerrar un hito: `pnpm typecheck && pnpm test`.
