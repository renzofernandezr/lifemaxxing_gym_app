# Lifemaxxing Gym

Bitácora de gimnasio personal (Greek God 2.0 adaptado): app para iPhone y web con Expo, API en Node (Hono) y Postgres en Railway.

```
packages/core   lógica de entrenamiento, calendario, nutrición y esquemas (TypeScript puro + tests)
apps/api        API Hono: auth con sesiones en Postgres, endpoints, migraciones; sirve también la web
apps/mobile     app Expo (Expo Router) → iOS y web
db/migrations   SQL puro (0001 init, 0002 seed generado desde core, …)
index.html      prototipo original (referencia de diseño y lógica)
```

## Requisitos

- Node 22 (`.nvmrc`). Con fnm: `fnm use` (la Mac tiene Node 26 por defecto).
- pnpm vía corepack: `corepack enable`.
- `.env` en la raíz (ver `.env.example`) con `DEV_DATABASE_URL` = URL pública del Postgres del entorno `dev` de Railway.

## Comandos

```bash
pnpm install
pnpm dev               # API local (contra la DB dev de Railway) + Expo
pnpm test              # core + API (schema temporal en la DB dev) + lógica de la app
pnpm typecheck
pnpm db:migrate:dev    # migraciones en la DB dev
pnpm --filter mobile web   # solo la web de Expo
```

Más detalle: `docs/PLAN_APP_RN.md` (plan), `docs/PROGRESO.md`, `docs/DECISIONES.md`, `db/README.md`.

## Prototipo original (`index.html`)

Prototipo web de un solo archivo que sirvió de referencia de diseño y lógica para la app. No tiene base de datos: sus datos de progreso son simulados. Se conserva en el repo; no lo borres.

### Cómo abrirlo

Es un solo archivo sin dependencias de build. Abre `index.html` en el navegador, o sírvelo con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8000
```

### Qué incluye

**Progreso** (pestañas en móvil: Resumen · Peso y grasa · Fuerza · Constancia · Historial)
- Indicadores de peso, % de grasa, masa magra y constancia
- Check-in semanal de peso y % de grasa (balanza de bioimpedancia)
- Levantamientos clave con 1RM estimado y estándares de fuerza
- Mapa de constancia y historial de sesiones

**Entrenar**
- Sesión del día según el calendario alternado A/B
- Registro serie por serie con steppers de peso y reps, calculadora de discos y peso sugerido por doble progresión
- Temporizador de descanso según el tipo de serie (3 min, 2 min, 10–15 s) con aviso sonoro y vibración
- Primera sesión: serie de prueba → 1RM estimado (Epley) → cargas de cada serie, incluida la rampa de piernas en Kino rep
- Resumen final con récords y próximo peso de cada ejercicio

**Plan** (Ruta · Rutinas · Cargas · Nutrición · Reglas)
- Ruta de 24 semanas y semana tipo
- Rutinas A, B y cardio + abs en sub-pestañas
- Calculadora de cargas por 1RM
- Calorías y macros para fase de definición
- Reglas de progresión

### Diseño

- HTML, CSS y JavaScript sin frameworks; tipografía Montserrat (Google Fonts)
- Modo claro y oscuro (botón en la cabecera; por defecto sigue el sistema)
- Responsive: barra inferior y sub-pestañas en móvil, pestañas en la cabecera en escritorio

### Documentos

- [`docs/rutina-fase1.md`](docs/rutina-fase1.md): rutina, progresión, calibración, nutrición y seguimiento de la fase actual
