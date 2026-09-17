# Build context is the repo root: the API needs packages/shared too.
# docker build -f apps/api/Dockerfile .

# ---- build: install, compile shared + api, assemble a production folder ----
FROM node:22-slim AS build
RUN npm install -g pnpm@10.34.5
# The test-only MongoDB binary is ~600 MB; never download it inside an image.
ENV MONGOMS_DISABLE_POSTINSTALL=1
WORKDIR /repo

# Manifests first, so the slow install layer is reused until a dependency changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @finance/api...

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @finance/shared build && pnpm --filter @finance/api build

# Copies the api's dist plus production dependencies only (shared included) into /out.
RUN pnpm --filter @finance/api deploy --prod --legacy /out

# ---- runtime: no compilers, no dev dependencies, not running as root ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
