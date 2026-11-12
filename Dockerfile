FROM node:24-bookworm-slim AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g pnpm@12.18.0

WORKDIR /app

FROM base AS dev

ENV NODE_ENV=development
EXPOSE 8084

CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm dev"]

FROM base AS build

ENV CI=true
COPY . .
RUN pnpm install --frozen-lockfile && \
    pnpm build && \
    pnpm install --prod --frozen-lockfile --offline

FROM base AS prod

ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 8084

CMD ["node", "apps/server/dist/main.js"]
