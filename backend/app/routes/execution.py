from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import DailyExecution
from app.schemas import AnalyticsRead, DailyCheckinRead, DailyCheckinRequest, StreakRead

router = APIRouter(prefix="/execution", tags=["execution"])


@router.post("/daily-checkin", response_model=DailyCheckinRead)
def upsert_daily_checkin(payload: DailyCheckinRequest, db: Session = Depends(get_db)) -> DailyExecution:
    execution_date = payload.execution_date or date.today()
    checkin = db.query(DailyExecution).filter(DailyExecution.execution_date == execution_date).first()

    if checkin is None:
        checkin = DailyExecution(execution_date=execution_date, completed=payload.completed)
        db.add(checkin)
    else:
        checkin.completed = payload.completed

    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/streak", response_model=StreakRead)
def get_streak(db: Session = Depends(get_db)) -> StreakRead:
    records = (
        db.query(DailyExecution)
        .filter(DailyExecution.completed.is_(True))
        .order_by(DailyExecution.execution_date.asc())
        .all()
    )
    dates = [record.execution_date for record in records]
    if not dates:
        return StreakRead(current_streak=0, best_streak=0)

    best_streak = 0
    running = 0
    previous_date: date | None = None
    for execution_date in dates:
        if previous_date is None or execution_date == previous_date + timedelta(days=1):
            running += 1
        else:
            running = 1
        best_streak = max(best_streak, running)
        previous_date = execution_date

    date_set = set(dates)
    current_streak = 0
    cursor = date.today()
    while cursor in date_set:
        current_streak += 1
        cursor -= timedelta(days=1)

    return StreakRead(current_streak=current_streak, best_streak=best_streak)


@router.get("/analytics", response_model=AnalyticsRead)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsRead:
    today = date.today()
    start_7 = today - timedelta(days=6)
    start_30 = today - timedelta(days=29)

    total_checkins = db.query(func.count(DailyExecution.id)).scalar() or 0
    completed_count = (
        db.query(func.count(DailyExecution.id)).filter(DailyExecution.completed.is_(True)).scalar() or 0
    )
    executed_days_last_7 = (
        db.query(func.count(DailyExecution.id))
        .filter(DailyExecution.completed.is_(True), DailyExecution.execution_date >= start_7)
        .scalar()
        or 0
    )
    executed_days_last_30 = (
        db.query(func.count(DailyExecution.id))
        .filter(DailyExecution.completed.is_(True), DailyExecution.execution_date >= start_30)
        .scalar()
        or 0
    )

    completion_rate = (completed_count / total_checkins) if total_checkins else 0.0

    return AnalyticsRead(
        completion_rate=round(completion_rate, 2),
        executed_days_last_7=executed_days_last_7,
        executed_days_last_30=executed_days_last_30,
        total_checkins=total_checkins,
    )
