from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import ProjectStatus, SubtaskStatus, TaskStatus


# ── API Key schemas ───────────────────────────────────────

class APIKeySave(BaseModel):
    api_key: str = Field(min_length=1)


class APIKeyStatus(BaseModel):
    has_key: bool
    masked_key: str | None = None


# ── Auth schemas ──────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    has_github: bool = False


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Subtask schemas ───────────────────────────────────────

class SubtaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class SubtaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: SubtaskStatus | None = None


class SubtaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    title: str
    status: SubtaskStatus
    completed_at: datetime | None
    created_at: datetime


# ── Task schemas ──────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    due_date: date | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    phase_id: int
    title: str
    description: str | None
    status: TaskStatus
    due_date: date | None
    completed_at: datetime | None
    created_at: datetime
    subtasks: list[SubtaskRead] = []


# ── Phase schemas ─────────────────────────────────────────

class PhaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    week_number: int = Field(ge=1)
    description: str | None = None


class PhaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class PhaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    title: str
    week_number: int
    description: str | None
    created_at: datetime
    tasks: list[TaskRead] = []


# ── Project schemas ───────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=10)
    skills_input: str = Field(min_length=5)
    deadline_weeks: int = Field(ge=1, le=52)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    skills_input: str | None = None
    deadline_weeks: int | None = Field(default=None, ge=1, le=52)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    title: str
    description: str
    skills_input: str
    deadline_weeks: int
    ai_feasible: bool | None
    ai_evaluation: str | None
    ai_suggested_weeks: int | None
    missing_skills: str | None
    status: ProjectStatus
    started_at: date | None
    completed_at: date | None
    ai_validation_passed: bool | None
    ai_validation_report: str | None
    created_at: datetime
    phases: list[PhaseRead] = []


# ── AI schemas ────────────────────────────────────────────

class AIEvaluationRequest(BaseModel):
    project_id: int


class AIEvaluationResponse(BaseModel):
    feasible: bool
    evaluation: str
    suggested_weeks: int | None
    missing_skills: str | None


class AIPlanGenerateRequest(BaseModel):
    project_id: int


# ── Activity / Heatmap schemas ────────────────────────────

class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_date: date
    subtasks_completed: int
    tasks_completed: int


class HeatmapRead(BaseModel):
    logs: list[ActivityLogRead]


# ── Dashboard schema ──────────────────────────────────────

class DashboardRead(BaseModel):
    active_project: ProjectRead | None
    past_projects: list[ProjectRead]
    heatmap: list[ActivityLogRead]
    current_streak: int
    total_completed_tasks: int