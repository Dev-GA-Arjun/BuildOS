from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ActivityLog, User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/")
def get_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Last 180 days
    today = date.today()
    start = today - timedelta(days=180)

    logs = db.query(ActivityLog).filter(
        ActivityLog.user_id == current_user.id,
        ActivityLog.log_date >= start,
    ).all()

    # Build a dict keyed by date string
    result = {}
    for log in logs:
        result[str(log.log_date)] = {
            "subtasks_completed": log.subtasks_completed,
            "tasks_completed": log.tasks_completed,
        }

    return result