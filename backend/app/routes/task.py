from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ActivityLog, Subtask, SubtaskStatus, Task, TaskStatus, User
from app.routes.auth import get_current_user
from app.schemas import SubtaskCreate, SubtaskRead, SubtaskUpdate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_for_user(task_id: int, user: User, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def log_activity(user_id: int, db: Session, subtasks_delta: int = 0, tasks_delta: int = 0):
    """Write or update today's ActivityLog entry."""
    today = date.today()
    log = db.query(ActivityLog).filter(
        ActivityLog.user_id == user_id,
        ActivityLog.log_date == today,
    ).first()

    if log is None:
        log = ActivityLog(
            user_id=user_id,
            log_date=today,
            subtasks_completed=subtasks_delta,
            tasks_completed=tasks_delta,
        )
    else:
        log.subtasks_completed += subtasks_delta
        log.tasks_completed += tasks_delta

    db.add(log)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    return get_task_for_user(task_id, current_user, db)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Task:
    task = get_task_for_user(task_id, current_user, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    if payload.status == TaskStatus.DONE and task.completed_at is None:
        task.completed_at = datetime.now(timezone.utc)
        log_activity(current_user.id, db, tasks_delta=1)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    task = get_task_for_user(task_id, current_user, db)
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Subtask routes ────────────────────────────────────────

@router.post("/{task_id}/subtasks", response_model=SubtaskRead, status_code=status.HTTP_201_CREATED)
def create_subtask(
    task_id: int,
    payload: SubtaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subtask:
    get_task_for_user(task_id, current_user, db)
    subtask = Subtask(task_id=task_id, title=payload.title)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskRead)
def update_subtask(
    task_id: int,
    subtask_id: int,
    payload: SubtaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Subtask:
    task = get_task_for_user(task_id, current_user, db)
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    was_done = subtask.status == SubtaskStatus.DONE

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subtask, field, value)

    if payload.status == SubtaskStatus.DONE and not was_done:
        subtask.completed_at = datetime.now(timezone.utc)
        log_activity(current_user.id, db, subtasks_delta=1)  # ✅ log subtask completion

    db.add(subtask)
    db.flush()

    # ✅ Auto-mark task as done when all subtasks are completed
    all_subtasks = db.query(Subtask).filter(Subtask.task_id == task_id).all()
    all_done = all(s.status == SubtaskStatus.DONE for s in all_subtasks)

    if all_done and task.status != TaskStatus.DONE:
        task.status = TaskStatus.DONE
        task.completed_at = datetime.now(timezone.utc)
        log_activity(current_user.id, db, tasks_delta=1)  # ✅ log task completion
        db.add(task)

    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(
    task_id: int,
    subtask_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    get_task_for_user(task_id, current_user, db)
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if subtask is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    db.delete(subtask)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)