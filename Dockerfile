# Torre de control (prototipo) — imagen estática para Easypanel
# Build:  docker build -t torre-control .            (marca por omisión)
#         docker build --build-arg VITE_BRAND=atraque -t torre-control .
# Run:    docker run -p 8080:80 torre-control

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_BRAND
ENV VITE_BRAND=$VITE_BRAND
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
