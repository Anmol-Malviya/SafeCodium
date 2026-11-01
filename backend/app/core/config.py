"""SAFE-CODIUM — Core Application Settings."""

from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core
    PROJECT_NAME: str = "SAFE-CODIUM"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: Union[bool, str]) -> bool:
        """Safely parses DEBUG boolean and handles arbitrary strings like 'WARN' without crashing."""
        if isinstance(v, str):
            v_lower = v.strip().lower()
            if v_lower in ("true", "1", "yes", "on", "t", "y"):
                return True
            elif v_lower in ("false", "0", "no", "off", "f", "n"):
                return False
            return False
        return bool(v)

    # Security & Authentication
    SECRET_KEY: str = Field(default="safevibe-secure-auth-secret-key-production-change-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ADMIN_API_KEY: str = Field(default="")
    ALLOW_LOCAL_AI_ENDPOINTS: bool = True

    # Sandboxing & Execution Isolation
    ENABLE_SANDBOX: bool = True
    SANDBOX_TIMEOUT_SECONDS: int = 30
    SANDBOX_MAX_MEMORY_MB: int = 256

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    WORKSPACE_DIR: Path = DATA_DIR / "workspaces"
    ARTIFACT_DIR: Path = DATA_DIR / "artifacts"

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./safevibe.db",
        description="Async SQLAlchemy database connection string (SQLite or PostgreSQL)",
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_and_normalize_database_url(cls, v: Union[str, None]) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            # Default to absolute safevibe.db in project base directory
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            default_path = (base_dir / "safevibe.db").resolve().as_posix()
            return f"sqlite+aiosqlite:///{default_path}"

        url = v.strip()

        # Reject synchronous drivers
        if url.startswith("sqlite://"):
            url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        elif url.startswith("postgresql://") or url.startswith("postgres://"):
            prefix = "postgresql://" if url.startswith("postgresql://") else "postgres://"
            url = url.replace(prefix, "postgresql+asyncpg://", 1)

        # Validate supported async schemes
        if not (url.startswith("sqlite+aiosqlite:///") or url.startswith("postgresql+asyncpg://")):
            raise ValueError(
                f"Unsupported DATABASE_URL scheme in '{url}'. "
                "Must be 'sqlite+aiosqlite:///' or 'postgresql+asyncpg://'."
            )

        # Normalize SQLite relative paths to absolute paths
        if url.startswith("sqlite+aiosqlite:///"):
            raw_path = url[len("sqlite+aiosqlite:///"):]
            # Only normalize if not already absolute or memory
            if raw_path != ":memory:" and not raw_path.startswith("/"):
                # Handle Windows drive letters or relative ./ paths
                base_dir = Path(__file__).resolve().parent.parent.parent.parent
                if raw_path.startswith("./"):
                    target_file = (base_dir / raw_path[2:]).resolve()
                else:
                    target_path = Path(raw_path)
                    if not target_path.is_absolute():
                        target_file = (base_dir / target_path).resolve()
                    else:
                        target_file = target_path.resolve()

                # Ensure parent directory exists
                target_file.parent.mkdir(parents=True, exist_ok=True)
                url = f"sqlite+aiosqlite:///{target_file.as_posix()}"
            elif raw_path.startswith("/") and len(raw_path) > 3 and raw_path[2] == ":":
                # Windows absolute format like /C:/path
                clean_path = raw_path.lstrip("/")
                Path(clean_path).parent.mkdir(parents=True, exist_ok=True)

        return url

    # AI Engine
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = "gemini-2.5-flash"

    OPENAI_API_KEY: str = Field(default="")
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    DEFAULT_AI_PROVIDER: str = "gemini"


settings = Settings()

# Ensure directories exist
for path in [settings.DATA_DIR, settings.UPLOAD_DIR, settings.WORKSPACE_DIR, settings.ARTIFACT_DIR]:
    path.mkdir(parents=True, exist_ok=True)
