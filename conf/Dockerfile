# Build:  docker build -f conf/Dockerfile -t fpm .
# Run:    see comments at the bottom

# ---- Stage 1: Build frontend ----
FROM node:22-slim AS build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Production ----
FROM node:22-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY --from=build /app/frontend/dist ./frontend/dist/

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/server.ts"]

# ============================================================
# Runtime volume mounts (required):
#
#   /app/site.db.json       site configuration file
#   /app/temp               upload temp directory
#   <assets_dir>            paths referenced in site.db.json
#                           (e.g. /data/sitea, /data/siteb)
#
# The paths in site.db.json must match the container filesystem.
# Example site.db.json for Docker:
#   { "sitea": "/data/sitea", "siteb": "/data/siteb" }
# ============================================================
#
# -- Run backend container --
#
# docker run -d \
#   --name fpm \
#   -e PORT=3000 \
#   -e NODE_ENV=production \
#   -p 3000:3000 \
#   -v ./site.db.json:/app/site.db.json \
#   -v ./temp:/app/temp \
#   -v /path/on/host/frontendassets:/data \
#   fpm
#
# -- Run nginx container --
#
# docker run -d \
#   --name fpm-nginx \
#   -p 80:80 \
#   -p 81:81 \
#   -v ./conf/nginx.conf:/etc/nginx/nginx.conf:ro \
#   -v /path/on/host/frontendassets:/data:ro \
#   nginx:1.28.1-alpine
#
# NOTE: nginx.conf "root" paths must also use /data/xxx to match
#       e.g.  root /data/sitea/$asset_env_version;
