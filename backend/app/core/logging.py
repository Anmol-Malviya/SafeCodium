"""Safe Vibe AI — Secure Logging Configuration."""

import logging
import re
import sys


class SecretMaskingFilter(logging.Filter):
    """Filters log records to redact potential API keys and secrets."""

    PATTERNS = [
        re.compile(r"(AIza[0-9A-Za-z-_]{35})", re.IGNORECASE),  # Google API Keys
        re.compile(r"(sk-[A-Za-z0-9-_]{20,})", re.IGNORECASE),   # OpenAI API Keys
        re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
        re.compile(r"(key=)[A-Za-z0-9-_]+", re.IGNORECASE),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern in self.PATTERNS:
                record.msg = pattern.sub(r"[REDACTED_SECRET]", record.msg)
        return True


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configures root logger with secret masking and formatted output."""
    logger = logging.getLogger("safevibe")
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        handler.addFilter(SecretMaskingFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()



