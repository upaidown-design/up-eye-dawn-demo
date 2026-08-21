FROM node:24.18.0-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build
FROM node:24.18.0-alpine
RUN corepack enable && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app /app
USER app
EXPOSE 4010
CMD ["node","--import","tsx","apps/api/src/server.ts"]
