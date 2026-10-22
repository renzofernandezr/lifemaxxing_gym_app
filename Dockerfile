# syntax=docker/dockerfile:1
# Imagen de producción del servicio `app`: API (Hono) + web estática de Expo en el mismo origen.
# La construye Render en sus servidores (antes Railway); no hace falta Docker en la Mac.

FROM node:22-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile
COPY . .
# API empaquetada con esbuild (incluye packages/core)
RUN pnpm --filter api build
# Web de Expo con la API en el mismo origen (URL vacía → rutas relativas /api/*)
RUN cd apps/mobile && EXPO_PUBLIC_API_URL="" npx expo export -p web --output-dir dist

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
# Única dependencia nativa que queda fuera del bundle (binario precompilado, sin compilar).
RUN npm init -y >/dev/null && npm pkg set type=module && npm install --omit=dev --no-audit --no-fund @node-rs/argon2@2.2.2 && npm cache clean --force
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/mobile/dist ./web
COPY db/migrations ./db/migrations
EXPOSE 3000
# Las migraciones corren antes de arrancar (advisory lock: dos deploys no migran a la vez).
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
