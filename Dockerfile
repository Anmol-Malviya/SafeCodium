# Multi-stage Dockerfile for SafeCodium / Safe Vibe AI
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runner
WORKDIR /app

# Install security and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application files
COPY alembic.ini ./alembic.ini
COPY backend/ ./backend/
COPY fixtures/ ./fixtures/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Setup non-root execution user
RUN useradd -m -u 1001 safecodium && \
    mkdir -p data/uploads data/workspaces data/artifacts && \
    chown -R safecodium:safecodium /app

USER safecodium

EXPOSE 8000

ENV ENVIRONMENT=production \
    DEBUG=false \
    HOST=0.0.0.0 \
    PORT=8000

CMD ["python", "backend/run_server.py"]

