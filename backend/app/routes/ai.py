from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import Phase, Project, ProjectStatus, Subtask, Task, TaskStatus, User
from app.routes.auth import get_current_user
from app.routes.user import get_decrypted_user_key
from app.schemas import AIEvaluationResponse, ProjectRead
from app.services.ai import (
    evaluate_project,
    generate_clarifying_questions,
    generate_project_plan,
    validate_completed_project,
)

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()

FREE_PLAN_DAILY_AI_CALLS = 10


# ── Limit enforcement ─────────────────────────────────────────────────────────

def check_and_increment_ai_limit(user: User, db: Session) -> None:
    """
    Enforce 5 AI calls/day for free users.
    Resets at midnight UTC. Raises 429 if limit hit.
    """
    today = datetime.now(timezone.utc).date()

    # Reset counter if it's a new day
    if user.ai_calls_reset_at is None or user.ai_calls_reset_at < today:
        user.ai_calls_today = 0
        user.ai_calls_reset_at = today

    if user.ai_calls_today >= FREE_PLAN_DAILY_AI_CALLS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily AI limit reached ({FREE_PLAN_DAILY_AI_CALLS} calls/day on free plan). "
                   f"Add your own OpenRouter API key in Settings to remove this limit.",
        )

    user.ai_calls_today += 1
    db.add(user)
    db.commit()


def should_enforce_limit(user: User) -> bool:
    """Users with their own API key bypass the daily limit."""
    return not bool(user.openrouter_api_key)


# ── Clarification ─────────────────────────────────────────────────────────────

@router.post("/clarify/{project_id}")
def clarify(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if should_enforce_limit(current_user):
        check_and_increment_ai_limit(current_user, db)

    user_key = get_decrypted_user_key(current_user)

    try:
        result = generate_clarifying_questions(
            project_title=project.title,
            project_description=project.description,
            tech_stack=project.skills_input,
            experience_level="beginner",
            user_key=user_key,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {str(e)}"
        )

    return result


# ── Evaluate ──────────────────────────────────────────────────────────────────

@router.post("/evaluate/{project_id}", response_model=AIEvaluationResponse)
def evaluate(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIEvaluationResponse:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.status != ProjectStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project already evaluated")

    if should_enforce_limit(current_user):
        check_and_increment_ai_limit(current_user, db)

    user_key = get_decrypted_user_key(current_user)

    try:
        result = evaluate_project(
            project_title=project.title,
            project_description=project.description,
            tech_stack=project.skills_input,
            skills_input=project.skills_input,
            experience_level="beginner",
            deadline_weeks=project.deadline_weeks,
            user_key=user_key,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {str(e)}"
        )

    project.ai_feasible = result["feasible"]
    project.ai_evaluation = result["evaluation"]
    project.ai_suggested_weeks = result.get("suggested_weeks")
    project.missing_skills = result.get("missing_skills")
    project.status = ProjectStatus.PLANNING

    db.add(project)
    db.commit()
    db.refresh(project)

    return AIEvaluationResponse(
        feasible=result["feasible"],
        evaluation=result["evaluation"],
        suggested_weeks=result.get("suggested_weeks"),
        missing_skills=result.get("missing_skills"),
    )


# ── Generate plan ─────────────────────────────────────────────────────────────

@router.post("/generate-plan/{project_id}", response_model=ProjectRead)
def generate_plan(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.status != ProjectStatus.PLANNING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project must be evaluated first before generating a plan",
        )

    if not project.ai_feasible:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project was deemed not feasible. Update your skills or simplify the project first.",
        )

    if should_enforce_limit(current_user):
        check_and_increment_ai_limit(current_user, db)

    user_key = get_decrypted_user_key(current_user)

    try:
        plan = generate_project_plan(
            project_title=project.title,
            project_description=project.description,
            tech_stack=project.skills_input,
            skills_input=project.skills_input,
            experience_level="beginner",
            deadline_weeks=project.deadline_weeks,
            user_key=user_key,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {str(e)}"
        )

    for phase_data in plan["phases"]:
        phase = Phase(
            project_id=project.id,
            title=phase_data["title"],
            week_number=phase_data["week_number"],
            description=phase_data.get("description"),
        )
        db.add(phase)
        db.flush()

        for task_data in phase_data["tasks"]:
            task = Task(
                phase_id=phase.id,
                user_id=current_user.id,
                title=task_data["title"],
                description=task_data.get("description"),
                status=TaskStatus.TODO,
            )
            db.add(task)
            db.flush()

            for subtask_data in task_data["subtasks"]:
                subtask = Subtask(
                    task_id=task.id,
                    title=subtask_data["title"],
                )
                db.add(subtask)

    project.status = ProjectStatus.ACTIVE
    project.started_at = date.today()

    db.add(project)
    db.commit()
    db.refresh(project)
    return project


# ── Validate ──────────────────────────────────────────────────────────────────

@router.post("/validate/{project_id}", response_model=ProjectRead)
def validate_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.status != ProjectStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project must be active to validate"
        )

    if should_enforce_limit(current_user):
        check_and_increment_ai_limit(current_user, db)

    user_key = get_decrypted_user_key(current_user)

    completed_tasks = []
    for phase in project.phases:
        for task in phase.tasks:
            if task.status == TaskStatus.DONE:
                completed_tasks.append(task.title)

    if not completed_tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No completed tasks found"
        )

    try:
        result = validate_completed_project(
            project_title=project.title,
            project_description=project.description,
            completed_tasks=completed_tasks,
            user_key=user_key,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI error: {str(e)}"
        )

    project.ai_validation_passed = result["passed"]
    project.ai_validation_report = result["report"]

    if result["passed"]:
        project.status = ProjectStatus.COMPLETED
        project.completed_at = date.today()

    db.add(project)
    db.commit()
    db.refresh(project)
    return project