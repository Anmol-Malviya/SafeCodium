"""Safe Vibe AI — Database ORM Models."""

import uuid
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.user import User


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Project(Base, TimestampMixin):
    """Represents an ingested C/C++ or IoT firmware project."""
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    framework_type: Mapped[str] = mapped_column(String(64), default="generic_c")  # esp_idf, arduino, generic_c
    source_type: Mapped[str] = mapped_column(String(32), default="zip")  # zip, single_file, snippet
    original_path: Mapped[str] = mapped_column(String(512), nullable=False)
    shadow_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Foreign keys
    owner_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    # Relationships
    owner: Mapped[Optional["User"]] = relationship("User", foreign_keys=[owner_id])
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="project", cascade="all, delete-orphan")
    vulnerabilities: Mapped[List["Vulnerability"]] = relationship("Vulnerability", back_populates="project", cascade="all, delete-orphan")


class Scan(Base, TimestampMixin):
    """Represents a static analysis scan session."""
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True, nullable=False)
    scanner_type: Mapped[str] = mapped_column(String(64), default="composite")  # semgrep, clang, custom, composite
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, completed, failed
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    raw_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="scans")
    vulnerabilities: Mapped[List["Vulnerability"]] = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")


class Vulnerability(Base, TimestampMixin):
    """Represents a normalized security finding."""
    __tablename__ = "vulnerabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), index=True, nullable=False)
    scan_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("scans.id"), index=True, nullable=True)
    cwe_id: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g., CWE-120
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    line_start: Mapped[int] = mapped_column(Integer, default=1)
    line_end: Mapped[int] = mapped_column(Integer, default=1)
    function_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vulnerable_code: Mapped[str] = mapped_column(Text, nullable=False)
    scanner_source: Mapped[str] = mapped_column(String(64), default="semgrep")
    status: Mapped[str] = mapped_column(String(32), default="detected")  # detected, repairing, repaired, verified, false_positive

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="vulnerabilities")
    scan: Mapped[Optional["Scan"]] = relationship("Scan", back_populates="vulnerabilities")
    patches: Mapped[List["Patch"]] = relationship("Patch", back_populates="vulnerability", cascade="all, delete-orphan")


class Patch(Base, TimestampMixin):
    """Represents an AI-synthesized repair patch."""
    __tablename__ = "patches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vulnerability_id: Mapped[str] = mapped_column(String(36), ForeignKey("vulnerabilities.id"), index=True, nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(64), default="gemini")  # gemini, openai, ollama
    model_name: Mapped[str] = mapped_column(String(64), default="gemini-2.5-flash")
    unified_diff: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    repair_strategy: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="proposed")  # proposed, reviewed, applied, rejected

    # Relationships
    vulnerability: Mapped["Vulnerability"] = relationship("Vulnerability", back_populates="patches")
    verification: Mapped[Optional["Verification"]] = relationship("Verification", back_populates="patch", uselist=False, cascade="all, delete-orphan")


class Verification(Base, TimestampMixin):
    """Represents ground-truth verification evidence."""
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patch_id: Mapped[str] = mapped_column(String(36), ForeignKey("patches.id"), index=True, nullable=False)
    pre_patch_compiler_exit: Mapped[int] = mapped_column(Integer, default=0)
    post_patch_compiler_exit: Mapped[int] = mapped_column(Integer, default=0)
    asan_exit_code: Mapped[int] = mapped_column(Integer, default=0)
    asan_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ubsan_exit_code: Mapped[int] = mapped_column(Integer, default=0)
    ubsan_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_suite_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    test_results_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    binary_size_delta_bytes: Mapped[int] = mapped_column(Integer, default=0)
    final_status: Mapped[str] = mapped_column(String(32), default="INCONCLUSIVE")  # VERIFIED, FAILED, PARTIAL, SIMULATED, NOT_AVAILABLE, INCONCLUSIVE

    # Relationships
    patch: Mapped["Patch"] = relationship("Patch", back_populates="verification")
