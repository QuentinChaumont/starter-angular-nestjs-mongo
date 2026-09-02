# syntax=docker/dockerfile:1

# ---- build: Angular production bundle ----
FROM node:22-alpine AS build
WORKDIR /repo

COPY . .
RUN npm ci --no-audit --no-fund
RUN npx nx build frontend

# ---- runtime: static files behind nginx ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/dist/apps/frontend/browser /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
