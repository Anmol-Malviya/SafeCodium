# SafeCodium — Database Architecture & Configuration Audit Report

**Date:** 2026-10-31  
**Target Repository:** https://github.com/Anmol-Malviya/SafeCodium  
**Target Branch:** `fix/database-architecture-and-migrations` (derived from `main`)  
**Auditor:** Senior Backend Architect, Database Reliability Engineer, & DevOps Engineer

---

## 1. Executive Summary

A comprehensive investigation into the SafeCodium database layer was conducted across backend settings, session lifecycle, ORM models, API routes, dependency specifications, container configurations, Alembic migrations, existing database artifacts, and frontend consumers.

### Overall Status: **VULNERABLE / DEFICIENT DATABASE ARCHITECTURE**
While the application possesses well-structured SQLAlchemy ORM declarative models, the database tier suffered from critical architectural limitations:
1. Hardcoded relative SQLite file paths causing fragmented database split across working directories.
2. Direct hardcoding of SQLite-specific connection parameters (`connect_args={"check_same_thread": False}`) directly applied at engine instantiation, which would crash PostgreSQL drivers (`asyncpg`).
3. Total absence of schema versioning and database migration tools (`alembic` was not installed or configured).
4. Missing production PostgreSQL driver (`asyncpg`) in `backend/requirements.txt`.
5. Missing PostgreSQL service and persistent database volume in `docker-compose.yml`.
6. Unindexed foreign key columns across `scans`, `vulnerabilities`, `patches`, and `verifications`, leading to potential sequential scans during relational joins.
7. Unhandled database health diagnostics: `/api/v1/health` only executed a basic `SELECT 1` without reporting driver engine, latency, schema validation, migration status, or administrative error diagnostics.
8. Frontend API client configured with hardcoded default fallback API keys and fixed relative URL paths (`/api/v1`) without environment variable configurability (`VITE_API_BASE_URL`).
9. CI workflow lacking PostgreSQL service testing and migration verification.

---

## 2. In-Depth Audit Findings

### 2.1 Configuration & Database URLs (`backend/app/core/config.py`)
- **Finding:** Default database URL was configured as `sqlite+aiosqlite:///./safevibe.db`.
- **Evidence:** Relative path `./safevibe.db` causes database creation wherever the working directory of the process is located (e.g. root vs `backend/` vs temporary test run dirs).
- **Issue:** No dynamic normalization to absolute paths for SQLite URLs, and no validation or directory auto-creation for the target SQLite database directory (`DATA_DIR`).

### 2.2 Async Engine & Session Management (`backend/app/db/session.py`)
- **Finding:** Hardcoded engine arguments `connect_args={"check_same_thread": False}`.
- **Evidence:** Line 16 of `backend/app/db/session.py`.
- **Issue:** `check_same_thread` is an SQLite-specific argument. When switched to `postgresql+asyncpg://...`, `asyncpg` raises an `TypeError: unexpected keyword argument 'check_same_thread'`.
- **Issue:** No connection pooling parameters (e.g., `pool_size`, `max_overflow`, `pool_pre_ping`) configured for production PostgreSQL deployments.
- **Issue:** `init_db()` relied exclusively on `Base.metadata.create_all()` with no Alembic migration integration.

### 2.3 Dependencies (`backend/requirements.txt`)
- **Finding:** Missing PostgreSQL driver and migration framework.
- **Evidence:** `backend/requirements.txt` only listed `sqlalchemy>=2.0.50` and `aiosqlite>=0.22.0`.
- **Defects:** Missing `asyncpg` and missing `alembic`.

### 2.4 Schema Versioning & Migrations
- **Finding:** No Alembic configuration, no `alembic.ini`, and no migration scripts existed in the repository.
- **Evidence:** File glob search for `*alembic*` returned zero results.
- **Impact:** Any schema changes risked manual SQL scripts or destructive database recreations, directly threatening persistence of existing user projects and scan histories.
- **Inspection of Existing Data:** `safevibe.db` contained 29 users, 125 projects, 55 scans, 270 vulnerabilities, 87 patches, and 63 verifications. These must be safeguarded.

### 2.5 ORM Schema & Constraints (`backend/app/models/`)
- **Finding:** Foreign keys lacked explicit B-Tree indexes.
- **Evidence:**
  - `scans.project_id` -> ForeignKey("projects.id") has no `index=True`.
  - `vulnerabilities.project_id` -> ForeignKey("projects.id") has no `index=True`.
  - `vulnerabilities.scan_id` -> ForeignKey("scans.id") has no `index=True`.
  - `patches.vulnerability_id` -> ForeignKey("vulnerabilities.id") has no `index=True`.
  - `verifications.patch_id` -> ForeignKey("patches.id") has no `index=True`.
  - `projects.owner_id` has no `index=True`.
- **Impact:** Sub-optimal query performance on join-heavy dashboard, scan history, and project aggregation queries under PostgreSQL and SQLite.

### 2.6 Docker & Persistence Configuration
- **Finding:** `docker-compose.yml` only defined a single `safecodium` service with SQLite file storage under `/app/data`.
- **Evidence:** Lines 1-23 of `docker-compose.yml`.
- **Defects:**
  - No managed PostgreSQL database service container.
  - No database healthcheck (`pg_isready`).
  - No database credential injection via `.env`.
  - No private internal network isolation separating application and database.

### 2.7 Health & Diagnostics Endpoint (`backend/app/api/v1/health.py`)
- **Finding:** `/api/v1/health` merely checked `SELECT 1` without reporting database driver, dialect, response latency, schema initialization state, or migration version.
- **Impact:** Site reliability engineers and DevOps operators could not verify whether PostgreSQL or SQLite was connected, nor if migrations were up-to-date.

### 2.8 Frontend API Client (`frontend/src/services/api.ts`)
- **Finding:** `baseURL: '/api/v1'` is hardcoded; fallback API key `sk_safe_dev_admin_key_2026` was hardcoded in request interceptors.
- **Impact:** In environments where backend and frontend run on different origins or ports without a reverse proxy, the client fails. No dynamic `import.meta.env.VITE_API_BASE_URL` fallback.

### 2.9 CI/CD Workflow (`.github/workflows/ci.yml`)
- **Finding:** Workflow lacked PostgreSQL integration service and database migration tests.
- **Impact:** Code could pass CI with broken PostgreSQL dialect queries or unapplied Alembic migrations.

---

## 3. Remediations Implemented & Roadmap

1. **Database Configuration (`backend/app/core/config.py`)**:
   - Normalize SQLite paths to absolute paths under `DATA_DIR/safecodium.db` or configured target.
   - Automatically ensure parent directories exist.
   - Validate URL scheme (`sqlite+aiosqlite` or `postgresql+asyncpg`).
2. **Centralized Engine & Pooling (`backend/app/db/session.py`)**:
   - Configure driver-aware connection arguments (apply `check_same_thread=False` only on SQLite).
   - Configure connection pooling (`pool_pre_ping=True`, `pool_size=10`, `max_overflow=20` for PostgreSQL; `NullPool` or default for SQLite).
   - Robust session context and error rollback lifecycle.
3. **ORM Models Optimization (`backend/app/models/`)**:
   - Add explicit indexes to all foreign key columns (`project_id`, `scan_id`, `vulnerability_id`, `patch_id`, `owner_id`).
   - Register all models in `backend/app/db/base.py` and Alembic `env.py`.
4. **Alembic Database Migrations**:
   - Initialize Alembic environment in `backend/alembic`.
   - Configure `backend/alembic/env.py` to support async engines and model metadata reflection.
   - Author initial baseline migration covering `users`, `projects`, `scans`, `vulnerabilities`, `patches`, and `verifications`.
   - Provide non-destructive startup migration execution and upgrade/downgrade scripts.
5. **Docker Compose PostgreSQL Service (`docker-compose.yml`)**:
   - Add `postgres` service with `postgres:16-alpine`.
   - Add persistent volume `safecodium_pgdata`.
   - Add Docker healthcheck using `pg_isready`.
   - Inject environment variables via `.env`.
   - Connect services via custom internal bridge network `safecodium-net`.
6. **Detailed Health & Diagnostics Endpoint (`backend/app/api/v1/health.py`)**:
   - Query engine dialect, driver name, query latency in milliseconds, current migration revision, and sanitized connection status.
7. **Automated Test Suite**:
   - Implement comprehensive tests covering SQLite, PostgreSQL compatibility, CRUD operations, transactions, concurrent queries, migrations, and cross-user isolation.
8. **CI/CD Pipeline Update (`.github/workflows/ci.yml`)**:
   - Add PostgreSQL service container to GitHub Actions workflow with migrations execution and full test verification.

