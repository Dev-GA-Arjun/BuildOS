from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Phase, Project, ProjectStatus, Subtask, Task, TaskStatus, User
from app.routes.auth import get_current_user
from app.schemas import AIEvaluationResponse, ProjectRead
from app.services.ai import evaluate_project, generate_project_plan, validate_completed_project

router = APIRouter(prefix="/ai", tags=["ai"])


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

    try:
        result = evaluate_project(  # ✅ correct
            project_title=project.title,
            project_description=project.description,
            skills_input=project.skills_input,
            deadline_weeks=project.deadline_weeks,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI error: {str(e)}")

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

    try:
        plan = generate_project_plan(  # ✅ fixed: was calling evaluate_project by mistake
            project_title=project.title,
            project_description=project.description,
            skills_input=project.skills_input,
            deadline_weeks=project.deadline_weeks,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI error: {str(e)}")

    # Save phases, tasks, subtasks to DB
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project must be active to validate")

    # Collect completed tasks
    completed_tasks = []
    for phase in project.phases:
        for task in phase.tasks:
            if task.status == TaskStatus.DONE:
                completed_tasks.append(task.title)

    if not completed_tasks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No completed tasks found")

    try:
        result = validate_completed_project(  # ✅ fixed: was calling evaluate_project by mistake
            project_title=project.title,
            project_description=project.description,
            completed_tasks=completed_tasks,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"AI error: {str(e)}")

    project.ai_validation_passed = result["passed"]
    project.ai_validation_report = result["report"]

    if result["passed"]:
        from datetime import date
        project.status = ProjectStatus.COMPLETED
        project.completed_at = date.today()

    db.add(project)
    db.commit()
    db.refresh(project)
    return project