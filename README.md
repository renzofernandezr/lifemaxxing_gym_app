# Lifemaxxing · Bitácora de gimnasio

Prototipo web responsive para seguir una rutina de fuerza estilo Greek God (pirámide inversa, Kino rep y rest-pause): registrar cada serie con guía de descansos, calibrar cargas con un 1RM estimado y ver el progreso de peso, % de grasa y fuerza.

> **Estado:** prototipo visual. No tiene base de datos: los datos de progreso son simulados y nada se guarda al recargar (salvo la preferencia de tema claro/oscuro en el navegador).

## Cómo abrirlo

Es un solo archivo sin dependencias de build. Abre `index.html` en el navegador, o sírvelo con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server 8000
```

## Qué incluye

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

## Diseño

- HTML, CSS y JavaScript sin frameworks; tipografía Montserrat (Google Fonts)
- Modo claro y oscuro (botón en la cabecera; por defecto sigue el sistema)
- Responsive: barra inferior y sub-pestañas en móvil, pestañas en la cabecera en escritorio

## Documentos

- [`docs/rutina-fase1.md`](docs/rutina-fase1.md): rutina, progresión, calibración, nutrición y seguimiento de la fase actual

## Próximos pasos

- Persistencia real de sesiones y check-ins
- Fases 2 y 3 automáticas según la semana
- Chequeo mensual (pecho, brazo, cintura, fotos) y estándares completos
- Componentes visuales inspirados en openGym: botón central de entrenar, descanso flotante, tabla de series con check, mapa de actividad y mapa muscular
