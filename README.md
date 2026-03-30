# BuildOS

BuildOS is an AI-powered project completion platform designed for entry-level developers. It helps transform project ideas into structured execution plans, tracks progress, and validates completion using AI.

Users can input a project idea, specify their skills and timeline, and receive an AI-generated week-by-week execution plan. The platform allows users to manage tasks, track progress through phases and subtasks, and request AI validation once the project is completed.

---

## Overview

Many beginner developers struggle to convert project ideas into finished work. BuildOS addresses this problem by combining structured planning with AI assistance.

The platform evaluates whether a project is feasible given the user's skills and timeframe, generates a phased development plan, and helps users track execution until completion.

---

## Core Features

### AI Project Evaluation

Users submit a project idea, skills, and expected timeline. AI evaluates feasibility and highlights missing skills or unrealistic timelines.

### AI Generated Execution Plan

Once approved, the platform generates a structured week-by-week plan divided into phases and tasks.

### Task and Subtask Tracking

Each phase contains tasks and subtasks that users can manage with status updates.

### Progress Tracking

User activity is logged to track progress over time and visualize productivity.

### AI Completion Validation

When a project is completed, the AI validates the work based on submitted project details and progress.

### One Active Project Constraint

Each user can have only one active project at a time to encourage completion.

---

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL (Neon)
- Alembic migrations
- JWT authentication
- Google Gemini API

### Frontend

- React
- Vite
- React Router
- TanStack Query
- Axios
- CSS Modules

---

## System Architecture

Frontend communicates with the FastAPI backend through REST APIs.
Authentication is handled using JWT tokens stored in local storage.

Database persistence is handled through PostgreSQL hosted on Neon.

AI capabilities are provided by Google Gemini through a backend service layer.

```
Client (React)
      |
      | REST API
      |
FastAPI Backend
      |
      | ORM (SQLAlchemy)
      |
PostgreSQL (Neon)

AI Layer
OpenRouter 
```

---

## Project Structure

### Backend

```
backend/
├── alembic/
│   ├── versions/
│   ├── env.py
│   ├── script.py.mako
│   └── __pycache__/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── health.py
│   │   │   ├── router.py
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── __init__.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── __init__.py
│   ├── routes/
│   │   ├── activity.py
│   │   ├── ai.py
│   │   ├── auth.py
│   │   ├── project.py
│   │   ├── task.py
│   │   └── __init__.py
│   ├── services/
│   │   ├── ai.py
│   │   ├── email.py
│   │   └── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── __init__.py
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_execution.py
│   ├── test_health.py
│   └── test_tasks.py
├── .env
├── .env.example
├── .gitkeep
├── alembic.ini
├── requirements.txt
├── runtime.txt
└── venv/
```

### Frontend

```

frontend/
   ├── public/
   │   └── favicon.png
   ├── src/
   │   ├── api/
   │   │   ├── ai.js
   │   │   ├── auth.js
   │   │   ├── client.js
   │   │   ├── projects.js
   │   │   └── tasks.js
   │   ├── assets/
   │   │   └── react.svg
   │   ├── components/
   │   │   └── layout/
   │   │       ├── AppLayout.jsx
   │   │       ├── AppLayout.module.css
   │   │       ├── Sidebar.jsx
   │   │       ├── Sidebar.module.css
   │   │       ├── Topbar.jsx
   │   │       └── Topbar.module.css
   │   ├── context/
   │   │   └── AuthContext.jsx
   │   ├── hooks/
   │   │   ├── useProjects.js
   │   │   └── useTask.js
   │   ├── pages/
   │   │   ├── DashboardPage.jsx
   │   │   ├── DashboardPage.module.css
   │   │   ├── ForgotPasswordPage.jsx
   │   │   ├── LandingPage.jsx
   │   │   ├── LandingPage.module.css
   │   │   ├── LoginPage.jsx
   │   │   ├── LoginPage.module.css
   │   │   ├── NewProjectPage.jsx
   │   │   ├── NewProjectPage.module.css
   │   │   ├── ProjectPage.jsx
   │   │   ├── ProjectPage.module.css
   │   │   ├── RegisterPage.jsx
   │   │   ├── ResetPasswordPage.jsx
   │   │   └── VerifyEmailPage.jsx
   │   ├── App.jsx
   │   ├── index.css
   │   └── main.jsx
   ├── .gitignore
   ├── eslint.config.js
   ├── index.html
   ├── package-lock.json
   ├── package.json
   ├── README.md
   ├── vite.config.js
   └── node_modules/
```

---

## Database Schema

### User

- id
- email
- full_name
- hashed_password
- is_active

### Project

- id
- title
- description
- skills_input
- deadline_weeks
- ai_feasible
- ai_evaluation
- ai_suggested_weeks
- missing_skills
- status
- ai_validation_passed
- ai_validation_report

### Phase

- id
- project_id
- title
- week_number

### Task

- id
- phase_id
- user_id
- title
- description
- status
- due_date

### Subtask

- id
- task_id
- title
- status

### ActivityLog

- id
- user_id
- log_date
- subtasks_completed
- tasks_completed

---

## Environment Variables

Create a `.env` file in the backend directory.

```
DATABASE_URL=your_neon_postgres_connection
SECRET_KEY=your_jwt_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60


```

---

## Installation

### 1. Clone Repository

```
git clone https://github.com/yourusername/buildos.git
cd buildos
```

---

### 2. Backend Setup

```
cd backend

python -m venv venv
source venv/bin/activate   # mac/linux
venv\Scripts\activate      # windows

pip install -r requirements.txt
```

Run database migrations:

```
alembic upgrade head
```

Start backend server:

```
uvicorn app.main:app --reload
```

Backend will run on:

```
http://127.0.0.1:8000
```

---

### 3. Frontend Setup

```
cd frontend
npm install
npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

---

## API Documentation

FastAPI automatically generates interactive documentation.

```
http://127.0.0.1:8000/docs
```

Main endpoints include:

Auth

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me

Projects

- GET /api/v1/projects
- POST /api/v1/projects
- GET /api/v1/projects/active
- PATCH /api/v1/projects/{id}
- DELETE /api/v1/projects/{id}

Tasks

- GET /api/v1/tasks/{id}
- PATCH /api/v1/tasks/{id}

AI

- POST /api/v1/ai/evaluate/{project_id}
- POST /api/v1/ai/generate-plan/{project_id}
- POST /api/v1/ai/validate/{project_id}

---

## Deployment

Typical deployment architecture:

Frontend

- Vercel / Netlify

Backend

- Render / Railway / Fly.io

Database

- Neon PostgreSQL

Steps:

1. Deploy backend API
2. Configure environment variables
3. Run Alembic migrations on production
4. Deploy frontend with backend API URL
5. Test authentication and project creation flow

---

## Security

- Password hashing using bcrypt
- JWT authentication
- Protected routes for authenticated users
- Database access through SQLAlchemy ORM
- Environment variables for secrets

---

## Future Improvements

- GitHub repository integration
- AI code review for project validation
- Team collaboration support
- Improved analytics and progress visualization
- Creator portfolio export

---

## License

This project is licensed under the MIT License.

---

## Author

BuildOS was created as a developer productivity platform to help beginner developers ship projects consistently and improve their execution skills.
