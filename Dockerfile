# build
FROM node:20-alpine AS builder

RUN apk update && apk add --no-cache git

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# add .env.example to .env
RUN [ ! -e ".env" ] && cp .env.example .env || true

RUN npm run build

# nginx
FROM nginx:1.27-alpine-slim AS app

COPY --from=builder /app/out/renderer /usr/share/nginx/html

COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache npm

RUN npm install -g NeteaseCloudMusicApi

CMD nginx && npx NeteaseCloudMusicApi
