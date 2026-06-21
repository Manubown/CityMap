# syntax=docker/dockerfile:1

# --- build stage: compile the Vite/React app to static files ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps against the lockfile first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build (runs `tsc --noEmit && vite build` -> /app/dist)
COPY . .
RUN npm run build

# --- serve stage: tiny nginx serving the static bundle ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
