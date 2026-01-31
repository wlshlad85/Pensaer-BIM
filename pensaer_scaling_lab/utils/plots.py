"""Plot utilities for scaling lab."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt


def plot_loglog(
    x: Iterable[float],
    y: Iterable[float],
    title: str,
    xlabel: str,
    ylabel: str,
    path: Path,
    label: str | None = None,
) -> None:
    plt.figure(figsize=(6, 4))
    plt.loglog(list(x), list(y), marker="o", label=label)
    if label:
        plt.legend()
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.grid(True, which="both", linestyle="--", linewidth=0.5)
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path)
    plt.close()


def plot_series(
    x: Iterable[float],
    series: dict[str, Iterable[float]],
    title: str,
    xlabel: str,
    ylabel: str,
    path: Path,
) -> None:
    plt.figure(figsize=(6, 4))
    for label, y in series.items():
        plt.plot(list(x), list(y), marker="o", label=label)
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.legend()
    plt.grid(True, linestyle="--", linewidth=0.5)
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path)
    plt.close()
