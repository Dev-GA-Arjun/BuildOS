import hashlib
import hmac
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import Project, ProjectStatus, Task, TaskStatus, User
from app.routes.auth import get_current_user
from app.services import github as gh
from app.services.ai import match_commit_to_task

router = APIRouter(prefix="/github", tags=["github"])
settings = get_settings()
logger = logging.getLogger(__name__)


# ── GitHub OAuth — get repo access token ──────────────────────────────────────

@router.get("/connect")
def github_connect(current_user: User = Depends(get_current_user)):
    """Redirect URL for GitHub OAuth with repo scope."""
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.frontend_url.rstrip('/')}/github/callback",
        "scope": "repo",
        "state": str(current_user.id),
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": f"https://github.com/login/oauth/authorize?{query}"}


@router.post("/connect/callback")
def github_connect_callback(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange OAuth code for access token and store it."""
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    res = httpx.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": f"{settings.frontend_url.rstrip('/')}/github/callback",
        },
    )
    token_data = res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to get GitHub access token")

    current_user.github_access_token = access_token
    db.add(current_user)
    db.commit()
    return {"connected": True}


# ── Repos list ────────────────────────────────────────────────────────────────

@router.get("/repos")
def list_repos(current_user: User = Depends(get_current_user)):
    """List repos available to link."""
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Connect in Settings.")
    repos = gh.get_user_repos(current_user.github_access_token)
    return {"repos": repos}


# ── Link repo to project ──────────────────────────────────────────────────────

@router.post("/projects/{project_id}/link")
def link_repo(
    project_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a GitHub repo to a project and set up webhook."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub not connected")

    repo = payload.get("repo")
    branch = payload.get("branch", "main")
    if not repo:
        raise HTTPException(status_code=400, detail="repo is required")

    # Delete old webhook if re-linking
    if project.github_webhook_id and project.github_repo:
        try:
            gh.delete_webhook(
                current_user.github_access_token,
                project.github_repo,
                project.github_webhook_id,
            )
        except Exception:
            pass

    webhook_url = f"{settings.backend_url.rstrip('/')}/api/v1/github/webhook"
    webhook_id = gh.create_webhook(
        current_user.github_access_token,
        repo,
        webhook_url,
        settings.github_webhook_secret,
    )

    project.github_repo = repo
    project.github_branch = branch
    project.github_webhook_id = webhook_id
    db.add(project)
    db.commit()

    return {
        "repo": repo,
        "branch": branch,
        "webhook_active": webhook_id is not None,
    }


@router.delete("/projects/{project_id}/link")
def unlink_repo(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlink a repo from a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.github_webhook_id and project.github_repo and current_user.github_access_token:
        try:
            gh.delete_webhook(
                current_user.github_access_token,
                project.github_repo,
                project.github_webhook_id,
            )
        except Exception:
            pass

    project.github_repo = None
    project.github_webhook_id = None
    project.github_branch = "main"
    db.add(project)
    db.commit()
    return {"unlinked": True}


# ── Commits feed ──────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/commits")
def get_commits(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.github_repo:
        return {"commits": [], "repo": None}

    if not current_user.github_access_token:
        return {"commits": [], "repo": project.github_repo}

    commits = gh.get_recent_commits(
        current_user.github_access_token,
        project.github_repo,
        project.github_branch or "main",
    )
    return {"commits": commits, "repo": project.github_repo}


# ── Webhook receiver ──────────────────────────────────────────────────────────

@router.post("/webhook")
async def receive_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
):
    payload_bytes = await request.body()

    # Verify signature
    if not x_hub_signature_256:
        raise HTTPException(status_code=400, detail="Missing signature")

    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if x_github_event != "push":
        return {"ignored": True}

    import json
    payload = json.loads(payload_bytes)

    repo_name = payload.get("repository", {}).get("full_name")
    commits = payload.get("commits", [])
    if not repo_name or not commits:
        return {"ignored": True}

    # Find the project linked to this repo
    project = db.query(Project).filter(
        Project.github_repo == repo_name,
        Project.status == ProjectStatus.ACTIVE,
    ).first()
    if not project:
        return {"ignored": True}

    # Get all open tasks for this project
    open_tasks = []
    for phase in project.phases:
        for task in phase.tasks:
            if task.status != TaskStatus.DONE:
                open_tasks.append(task)

    if not open_tasks:
        return {"no_open_tasks": True}

    matched_count = 0
    for commit in commits:
        commit_msg = commit.get("message", "")
        commit_sha = commit.get("id", "")

        if not commit_msg.strip():
            continue

        try:
            matched_task_id = match_commit_to_task(
                commit_message=commit_msg,
                open_tasks=[{"id": t.id, "title": t.title} for t in open_tasks],
            )
        except Exception as e:
            logger.error(f"AI task match failed: {e}")
            continue

        if matched_task_id:
            task = next((t for t in open_tasks if t.id == matched_task_id), None)
            if task and task.status != TaskStatus.DONE:
                task.status = TaskStatus.DONE
                task.completed_at = datetime.now(timezone.utc)
                task.completed_via = "github"
                task.github_commit_sha = commit_sha[:7]
                db.add(task)
                open_tasks = [t for t in open_tasks if t.id != matched_task_id]
                matched_count += 1

    db.commit()
    return {"matched": matched_count}