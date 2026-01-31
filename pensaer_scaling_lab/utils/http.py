"""HTTP helpers for scaling lab."""

from __future__ import annotations

import httpx


def get_json(url: str, timeout: float = 10.0) -> dict:
    resp = httpx.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def post_json(url: str, payload: dict, timeout: float = 120.0) -> dict:
    resp = httpx.post(url, json=payload, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def get_text(url: str, timeout: float = 30.0) -> str:
    resp = httpx.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.text
