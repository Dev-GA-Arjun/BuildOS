from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: add any startup logic here (no DB create_all)
    yield
    # Shutdown: clean up resources if needed


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for BuildOS.",
    lifespan=lifespan,
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Welcome to BuildOS API",
        "docs": "/docs",
    }