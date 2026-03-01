from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import TaskStatus


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class DailyCheckinRequest(BaseModel):
    execution_date: date | None = None
    completed: bool = True


class DailyCheckinRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    execution_date: date
    completed: bool
    created_at: datetime
    updated_at: datetime


class StreakRead(BaseModel):
    current_streak: int
    best_streak: int


class AnalyticsRead(BaseModel):
    completion_rate: float
    executed_days_last_7: int
    executed_days_last_30: int
    total_checkins: int
