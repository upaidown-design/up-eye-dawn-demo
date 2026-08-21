FROM node:24.18.0-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM nginx:1.29.1-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/web/dist /srv/demo
