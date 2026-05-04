# =====================================================================
# Stage 1 — Build React
# =====================================================================
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY . .

# L'URL de l'API est injectée à la build (relative à nginx en prod)
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN npm run build

# =====================================================================
# Stage 2 — Serve via nginx
# =====================================================================
FROM nginx:1.27-alpine

# Config nginx pour servir le SPA React (fallback index.html)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O - http://localhost/ || exit 1
