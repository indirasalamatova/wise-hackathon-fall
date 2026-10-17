# Build the app, then serve it with nginx (which also proxies /api to the backend).
# The last stage is the production image; `target: dev` gives the hot-reload dev server.
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Dev server with hot reload (docker compose --profile frontend; source is bind-mounted).
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
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
