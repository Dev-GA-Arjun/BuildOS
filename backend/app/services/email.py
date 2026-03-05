import resend
from app.core.config import get_settings

settings = get_settings()
resend.api_key = settings.resend_api_key

FROM_EMAIL = "BuildOS <onboarding@resend.dev>"  # use this for testing; replace with your domain after deployment


def send_verification_email(to_email: str, full_name: str, otp: str):
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Verify your BuildOS account",
        "html": f"""
        <div style="font-family: monospace; background: #0F172A; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #33C228; margin-bottom: 8px;">⚡ BuildOS</h2>
            <p style="color: #94a3b8; margin-bottom: 24px;">Hey {full_name}, verify your email to start building.</p>
            <div style="background: #1E293B; border: 1px solid #334155; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">Your verification code</p>
                <p style="color: #33C228; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">{otp}</p>
            </div>
            <p style="color: #64748b; font-size: 12px;">This code expires in 15 minutes. If you didn't create a BuildOS account, ignore this email.</p>
        </div>
        """
    })


def send_reset_email(to_email: str, full_name: str, reset_token: str):
    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": to_email,
        "subject": "Reset your BuildOS password",
        "html": f"""
        <div style="font-family: monospace; background: #0F172A; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #33C228; margin-bottom: 8px;">⚡ BuildOS</h2>
            <p style="color: #94a3b8; margin-bottom: 24px;">Hey {full_name}, here's your password reset link.</p>
            <a href="{reset_url}" style="display: block; background: #33C228; color: #0F172A; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
                Reset Password →
            </a>
            <p style="color: #64748b; font-size: 12px;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
        </div>
        """
    })