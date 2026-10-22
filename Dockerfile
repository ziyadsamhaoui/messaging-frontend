# syntax=docker/dockerfile:1
#
# BadrLink — messaging-frontend (Next.js App Router; talks only to the API gateway)
#
# Build:  docker build -t ghcr.io/ziyadsamhaoui/messaging-frontend:local .
# Run:    docker run --rm -p 3000:3000 <image>
#
# NEXT_PUBLIC_* values are inlined into the client bundle by `next build`, so they
# are build arguments, not runtime environment: build a separate image per target
# gateway URL instead of expecting to change it with `docker run -e`.

# ---------- deps: full install (the build needs TypeScript, Tailwind, ESLint) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- production dependencies: what `next start` needs at runtime ----------
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- build: static + server bundle ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
ARG NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=
ENV NEXT_PUBLIC_API_GATEWAY_URL=$NEXT_PUBLIC_API_GATEWAY_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime: production dependencies + build output, non-root ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S app && adduser -S -G app app

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/next.config.ts ./next.config.ts
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000
CMD ["npm", "run", "start"]
