# Build context is the repo root: the web app compiles packages/shared from source.
# docker build -f apps/web/Dockerfile .

# ---- build: install, type-check and bundle the app into static files ----
FROM node:22-slim AS build
RUN npm install -g pnpm@10.34.5
WORKDIR /repo

# Manifests first, so the slow install layer is reused until a dependency changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @finance/web...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @finance/web build

# ---- runtime: nginx serving static files, running as a non-root user ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
