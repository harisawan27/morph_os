# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Build Next.js (standalone output)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
# Build args become env vars at build time (baked into the JS bundle)
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
# API URL is empty in prod — requests go to the same origin through nginx
ENV NEXT_PUBLIC_API_URL=""

RUN npm run build


# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Final runtime image
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Install system deps: Node.js, nginx, supervisor, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python backend ──
COPY backend/ ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# ── Next.js standalone build ──
COPY --from=frontend-builder /build/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /build/frontend/.next/static     ./frontend/.next/static/
COPY --from=frontend-builder /build/frontend/public           ./frontend/public/

# ── nginx + supervisord config ──
COPY nginx.conf       /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Remove default nginx site
RUN rm -f /etc/nginx/sites-enabled/default

# Cloud Run expects port 8080
EXPOSE 8080

# Runtime env vars — set these in Cloud Run service config, not here
# ENV DATABASE_URL=...
# ENV NEXTAUTH_SECRET=...
# ENV NEXTAUTH_URL=...
# ENV GOOGLE_CLIENT_ID=...
# ENV GOOGLE_CLIENT_SECRET=...
# ENV GEMINI_API_KEY=...
# ENV ALLOWED_ORIGINS=...

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
