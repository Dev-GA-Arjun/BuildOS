import random
import secrets
import string
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas import TokenRead, UserLogin, UserRead, UserRegister
from app.services.email import send_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)
settings = get_settings()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    subject = decode_access_token(credentials.credentials)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.email == subject).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))


def get_or_create_oauth_user(db: Session, email: str, full_name: str, provider: str) -> User:
    """Get existing user or create new one for OAuth login."""
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        # Create new user — OAuth users are auto-verified
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),  # random password
            is_verified=True,  # OAuth users don't need email verification
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_verified:
        # If existing unverified user logs in with OAuth, verify them
        user.is_verified = True
        db.add(user)
        db.commit()

    return user


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    otp = generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        is_verified=False,
        otp_code=otp,
        otp_expires_at=otp_expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_verification_email(user.email, user.full_name, otp)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to send verification email: {e}")

    return user


# ── Verify Email ──────────────────────────────────────────────────────────────

@router.post("/verify-email")
def verify_email(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    otp = payload.get("otp", "").strip()

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    if user.otp_code != otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    if user.otp_expires_at and datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new one.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.add(user)
    db.commit()

    token = create_access_token(subject=user.email)
    return {"access_token": token, "message": "Email verified successfully"}


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-otp")
def resend_otp(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.add(user)
    db.commit()

    send_verification_email(user.email, user.full_name, otp)
    return {"message": "Verification code resent"}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenRead)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenRead:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED"
        )

    token = create_access_token(subject=user.email)
    return TokenRead(access_token=token)


# ── Forgot Password ───────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None:
        return {"message": "If this email exists, a reset link has been sent."}

    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.add(user)
    db.commit()

    try:
        send_reset_email(user.email, user.full_name, reset_token)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to send reset email: {e}")

    return {"message": "If this email exists, a reset link has been sent."}


# ── Reset Password ────────────────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    token = payload.get("token", "").strip()
    new_password = payload.get("new_password", "").strip()

    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")

    user = db.query(User).filter(User.reset_token == token).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    if user.reset_token_expires_at and datetime.now(timezone.utc) > user.reset_token_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link has expired. Please request a new one.")

    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.add(user)
    db.commit()

    return {"message": "Password reset successfully"}


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google")
def google_login():
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": f"{settings.frontend_url.rstrip('/')}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    try:
        token_res = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.frontend_url.rstrip('/')}/auth/google/callback",
                "grant_type": "authorization_code",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get token from Google")

        user_res = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info = user_res.json()
        email = user_info.get("email")
        full_name = user_info.get("name", email)
        if not email:
            raise HTTPException(status_code=400, detail="Could not get email from Google")

        user = get_or_create_oauth_user(db, email, full_name, "google")
        jwt_token = create_access_token(subject=user.email)
        return {"token": jwt_token}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Google OAuth failed")

# ── GitHub OAuth ──────────────────────────────────────────────────────────────

@router.get("/github")
def github_login():
    """Redirect user to GitHub OAuth consent screen."""
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": f"{settings.frontend_url.rstrip('/')}/auth/github/callback",
        "scope": "user:email",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{query}")


@router.get("/github/callback")
def github_callback(code: str, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback — exchange code for token."""
    try:
        # Exchange code for access token
        token_res = httpx.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": f"{settings.frontend_url.rstrip('/')}/auth/github/callback",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token from GitHub")

        # Get user info
        user_res = httpx.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info = user_res.json()

        # GitHub may not expose email — fetch separately
        email = user_info.get("email")
        if not email:
            emails_res = httpx.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            emails = emails_res.json()
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            email = primary["email"] if primary else None

        if not email:
            raise HTTPException(status_code=400, detail="Could not get email from GitHub")

        full_name = user_info.get("name") or user_info.get("login", email)
        user = get_or_create_oauth_user(db, email, full_name, "github")
        jwt_token = create_access_token(subject=user.email)

        return RedirectResponse(
            f"{settings.frontend_url.rstrip('/')}/oauth/callback?token={jwt_token}"
        )

    except HTTPException:
        raise
    except Exception as e:
        return RedirectResponse(
            f"{settings.frontend_url.rstrip('/')}/login?error=github_failed"
        )