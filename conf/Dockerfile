# Build:  docker build -f conf/Dockerfile -t fpm .
# Run:    see comments at the bottom

FROM node:24.13.0-slim

WORKDIR /src
COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

CMD ["node", "backend/server.ts"]

# ============================================================
# -- Run backend container --
#
# docker run -d \
#   --name fpm \
#   -e DIR=/data \
#   -e PORT=3000 \
#   -e NODE_ENV=production \
#   -p 3000:3000 \
#   -v /path/on/host/frontendmanagement:/data \
#   fpm
#
# -- Run nginx container --
#
# docker run -d \
#   --name fpm-nginx \
#   -p 80:80 \
#   -p 81:81 \
#   -v /path/on/host/frontendmanagement/conf/nginx.conf:/etc/nginx/nginx.conf:ro \
#   -v /path/on/host/frontendmanagement/site_dist:/data/site_dist:ro \
#   nginx:1.28.1-alpine
#
# NOTE: nginx.conf "root" paths must use /data/site_dist/<key>/...
#       e.g.  root /data/site_dist/sitea/$asset_env_version;
