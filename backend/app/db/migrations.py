"""Safe Vibe AI / SafeCodium — Database Migration Manager."""

import os
from alembic.config import Config
from alembic import command
from backend.app.core.config import settings
from backend.app.core.logging import logger


def run_migrations(target_revision: str = "head") -> None:
    """
    Applies Alembic database migrations up to target_revision.
    Preserves existing data and ensures schema is up to date.
    """
    base_dir = settings.BASE_DIR
    alembic_ini_path = (base_dir / "alembic.ini").resolve().as_posix()

    if not os.path.exists(alembic_ini_path):
        logger.warning(f"alembic.ini not found at {alembic_ini_path}. Skipping automatic migrations.")
        return

    logger.info(f"Running database migrations against target: {settings.DATABASE_URL}")
    try:
        cfg = Config(alembic_ini_path)
        cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        command.upgrade(cfg, target_revision)
        logger.info(f"Database migrations applied successfully (target: {target_revision}).")
    except Exception as e:
        logger.error(f"Database migration failure: {e}")
        raise e

