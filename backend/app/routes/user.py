import logging
from datetime import date, datetime, timezone

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models import User
from app.routes.auth import get_current_user
from app.schemas import APIKeySave, APIKeyStatus

router = APIRouter(prefix="/user", tags=["user"])
settings = get_settings()
logger = logging.getLogger(__name__)


def _fernet() -> Fernet:
    if not settings.byok_encryption_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Encryption not configured on server"
        )
    return Fernet(settings.byok_encryption_key.encode())


def encrypt_key(raw_key: str) -> str:
    return _fernet().encrypt(raw_key.encode()).decode()


def decrypt_key(encrypted_key: str) -> str:
    try:
        return _fernet().decrypt(encrypted_key.encode()).decode()
    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt API key"
        )


def get_decrypted_user_key(user: User) -> str | None:
    if not user.openrouter_api_key:
        return None
    return decrypt_key(user.openrouter_api_key)


def _mask_key(raw_key: str) -> str:
    if len(raw_key) <= 18:
        return raw_key[:4] + "..."
    return raw_key[:12] + "..." + raw_key[-6:]


# ── BYOK endpoints ─────────────────────────────────────────────────────────────

@router.post("/api-key", response_model=APIKeyStatus)
def save_api_key(
    payload: APIKeySave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> APIKeyStatus:
    encrypted = encrypt_key(payload.api_key)
    current_user.openrouter_api_key = encrypted
    db.add(current_user)
    db.commit()
    return APIKeyStatus(has_key=True, masked_key=_mask_key(payload.api_key))


@router.delete("/api-key")
def delete_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.openrouter_api_key = None
    db.add(current_user)
    db.commit()
    return {"message": "API key removed"}


@router.get("/api-key/status", response_model=APIKeyStatus)
def get_api_key_status(
    current_user: User = Depends(get_current_user),
) -> APIKeyStatus:
    if not current_user.openrouter_api_key:
        return APIKeyStatus(has_key=False, masked_key=None)
    raw = decrypt_key(current_user.openrouter_api_key)
    return APIKeyStatus(has_key=True, masked_key=_mask_key(raw))


# ── Profile endpoints ──────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user),
) -> dict:
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "bio": current_user.bio,
        "skills": current_user.skills,
        "github_url": current_user.github_url,
        "linkedin_url": current_user.linkedin_url,
        "avatar_url": current_user.avatar_url,
        "resume_url": current_user.resume_url,
    }


@router.patch("/profile")
def update_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    allowed = {"full_name", "bio", "skills", "github_url", "linkedin_url"}
    for field, value in payload.items():
        if field in allowed:
            setattr(current_user, field, value)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "bio": current_user.bio,
        "skills": current_user.skills,
        "github_url": current_user.github_url,
        "linkedin_url": current_user.linkedin_url,
        "avatar_url": current_user.avatar_url,
        "resume_url": current_user.resume_url,
    }


@router.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, or WebP images are allowed"
        )

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be under 2MB"
        )

    import base64
    b64 = base64.b64encode(contents).decode()
    data_url = f"data:{file.content_type};base64,{b64}"

    current_user.avatar_url = data_url
    db.add(current_user)
    db.commit()
    return {"avatar_url": data_url}


@router.post("/profile/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be under 5MB"
        )

    import base64
    b64 = base64.b64encode(contents).decode()
    data_url = f"data:application/pdf;base64,{b64}"

    current_user.resume_url = data_url
    db.add(current_user)
    db.commit()
    return {"resume_url": data_url}


# ── AI limit status ────────────────────────────────────────────────────────────

@router.get("/limits")
def get_limits(
    current_user: User = Depends(get_current_user),
) -> dict:
    today = datetime.now(timezone.utc).date()
    reset = current_user.ai_calls_reset_at
    calls_today = current_user.ai_calls_today if reset and reset >= today else 0
    has_own_key = bool(current_user.openrouter_api_key)
    return {
        "has_own_key": has_own_key,
        "calls_today": calls_today,
        "daily_limit": 5,
        "remaining": None if has_own_key else max(0, 5 - calls_today),
    }