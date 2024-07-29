# build
FROM node:18-alpine as builder

RUN apk update && apk add --no-cache git

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN [ ! -e ".env" ] && cp .env.example .env || true

RUN npm run build

# nginx
FROM nginx:1.25.3-alpine-slim as app

COPY --from=builder /app/out/renderer /usr/share/nginx/html

COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache npm

RUN npm install -g NeteaseCloudMusicApi

CMD nginx && npx NeteaseCloudMusicApi
