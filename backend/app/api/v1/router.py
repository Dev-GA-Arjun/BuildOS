from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.routes.activity import router as activity_router
from app.routes.ai import router as ai_router
from app.routes.auth import router as auth_router
from app.routes.github import router as github_router
from app.routes.project import router as project_router
from app.routes.task import router as task_router
from app.routes.user import router as user_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(project_router)
api_router.include_router(task_router)
api_router.include_router(ai_router)
api_router.include_router(activity_router)
api_router.include_router(user_router)
api_router.include_router(github_router)