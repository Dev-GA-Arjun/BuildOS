# BuildOS

BuildOS is a goal-to-execution SaaS platform that helps students, early-stage builders, and micro-creators turn long-term goals into consistent daily action.

## Repository Layout
- `docs/` - product and technical planning docs.
- `backend/` - FastAPI backend foundation.
- `frontend/` - frontend app (planned).

## Step 1 (Context and Specifications)
The following project docs define product context and MVP scope:
- `docs/product-brief.md`
- `docs/mvp-scope.md`
- `docs/api-spec.md`
- `docs/implementation-steps.md`

## Step 2 (Backend Foundation)
The backend includes:
- FastAPI application bootstrap (`backend/app/main.py`)
- environment-based configuration (`backend/app/core/config.py`)
- SQLAlchemy engine/session wiring (`backend/app/db/session.py`)
- versioned API router + health endpoint (`backend/app/api/v1/`)

## Step 3 (First Persistent Resource: Task)
The backend now includes:
- `Task` SQLAlchemy model and status enum (`backend/app/models.py`)
- Pydantic schemas for task create/read/update (`backend/app/schemas.py`)
- CRUD endpoints for tasks (`backend/app/routes/task.py`)
- Alembic configuration + initial `tasks` migration (`backend/alembic/`, `backend/alembic.ini`)
- API tests for task CRUD flows (`backend/tests/test_tasks.py`)

## Step 4 (Execution and Streak Logic)
The backend now includes:
- Persistent daily execution check-ins (`DailyExecution` model)
- Upsert endpoint for daily check-ins (`POST /api/v1/execution/daily-checkin`)
- Streak endpoint (`GET /api/v1/execution/streak`)
- Analytics endpoint (`GET /api/v1/execution/analytics`)
- Alembic migration for `daily_executions` table
- API tests for execution flows (`backend/tests/test_execution.py`)

## Step 5 (Auth Hardening and API Polish)
The backend now includes:
- Persistent `User` model and migration (`backend/alembic/versions/0003_create_users_table.py`)
- Password hashing + JWT token utilities (`backend/app/core/security.py`)
- Auth endpoints (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`)
- Bearer-token protected user profile endpoint (`/api/v1/auth/me`)
- API tests for auth success and failure flows (`backend/tests/test_auth.py`)

## Local Setup (Backend)
1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Copy env file and update database URL:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Run API:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
5. Visit docs: `http://127.0.0.1:8000/docs`
