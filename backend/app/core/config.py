from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BuildOS API"
    app_env: str = "development"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    database_url: str

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    openrouter_api_key: str = ""
    resend_api_key: str = ""
    brevo_api_key: str = ""
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "https://buildos-gb8n.onrender.com"

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()