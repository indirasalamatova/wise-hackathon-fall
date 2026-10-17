# Build the app, then serve it with nginx (which also proxies /api to the backend).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin API (nginx proxies /api), so no API URL is baked in.
ARG GOOGLE_CLIENT_ID
ENV VITE_API_URL="" \
    VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
