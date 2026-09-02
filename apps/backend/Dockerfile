# syntax=docker/dockerfile:1

# ---- build: full install, Nx build, prune deploy artifacts ----
FROM node:22-alpine AS build
WORKDIR /repo

COPY . .
RUN npm ci --no-audit --no-fund

RUN npx nx run @org/backend:prune

# `copy-workspace-modules` brings each @org/* lib's package.json along,
# `devDependencies` and all — including dev-only workspace deps such as
# @org/backend-testing that are never deployed. Strip them (and the stale
# lockfile) so the runtime install resolves cleanly against the registry.
RUN find apps/backend/dist/workspace_modules -name package.json \
      -exec node -e "const fs=require('fs'),f=process.argv[1],p=JSON.parse(fs.readFileSync(f));delete p.devDependencies;fs.writeFileSync(f,JSON.stringify(p))" {} \; \
 && node -e "const fs=require('fs'),f='apps/backend/dist/package.json',p=JSON.parse(fs.readFileSync(f));delete p.devDependencies;fs.writeFileSync(f,JSON.stringify(p))" \
 && rm -f apps/backend/dist/package-lock.json

# ---- runtime: production dependencies only ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /repo/apps/backend/dist ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "main.js"]
