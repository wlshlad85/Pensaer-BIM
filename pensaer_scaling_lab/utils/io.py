"""IO utilities for scaling lab outputs."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


def timestamped_dir(base: Path, exp_id: str) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_dir = base / timestamp / exp_id
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, default=str) + "\n")


def write_csv(path: Path, rows: Iterable[dict]) -> None:
    rows = list(rows)
    with path.open("w", encoding="utf-8", newline="") as handle:
        if not rows:
            return
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
