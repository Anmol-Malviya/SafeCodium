"""Safe Vibe AI — User & Authentication Models."""

import uuid
from typing import Optional
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base, TimestampMixin


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base, TimestampMixin):
    """Represents an authenticated system user or API client."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(256), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="analyst")  # admin, analyst
    api_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

