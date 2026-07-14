"""Central logging configuration.

Formats every record with a millisecond-precision timestamp so per-stage
durations (OMR is slow — minutes per sheet) can be analysed from the logs.
Log level is controlled by the OMR_LOG_LEVEL env var (default INFO; set DEBUG
for verbose stage tracing).
"""

from __future__ import annotations

import logging
import os
import time

# `%(asctime)s.%(msecs)03d` yields e.g. "2026-07-05 18:43:22.531".
_LOG_FORMAT = "%(asctime)s.%(msecs)03d | %(levelname)-7s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    """Install a millisecond-timestamped stream handler on the app's loggers.

    Idempotent: safe to call more than once (e.g. under uvicorn --reload) without
    stacking duplicate handlers.
    """
    level_name = os.getenv("OMR_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))

    app_logger = logging.getLogger("omr")
    app_logger.setLevel(level)
    app_logger.handlers = [handler]
    # Don't also propagate to the root logger, which would double-print.
    app_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """Return a child logger under the shared `omr` namespace."""
    return logging.getLogger(f"omr.{name}")


class Timer:
    """Context manager that logs a stage's start and its elapsed milliseconds.

    Usage::

        with Timer(logger, "rasterise PDF"):
            ...  # work

    Logs "started: <label>" at DEBUG on entry and "finished: <label> (123.4 ms)"
    at INFO on exit — or "failed: <label> (123.4 ms)" at ERROR if it raised.
    """

    def __init__(self, logger: logging.Logger, label: str) -> None:
        self._logger = logger
        self._label = label
        self._start = 0.0

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        self._logger.debug("started: %s", self._label)
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        elapsed_ms = (time.perf_counter() - self._start) * 1000
        if exc_type is None:
            self._logger.info("finished: %s (%.1f ms)", self._label, elapsed_ms)
        else:
            self._logger.error(
                "failed: %s (%.1f ms): %s", self._label, elapsed_ms, exc
            )
        return False  # never suppress exceptions
