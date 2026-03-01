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

## Step 2 (Backend Foundation)
The backend includes:
- FastAPI application bootstrap (`backend/app/main.py`)
- environment-based configuration (`backend/app/core/config.py`)
- SQLAlchemy engine/session wiring (`backend/app/db/session.py`)
- versioned API router + health endpoint (`backend/app/api/v1/`)

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
