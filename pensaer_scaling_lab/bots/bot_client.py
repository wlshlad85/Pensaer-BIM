"""WebSocket bot client for collaboration experiments."""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import websockets


@dataclass
class ToolCallResult:
    latency_ms: float
    success: bool
    error: str | None = None
    result: dict[str, Any] | None = None


class BotWebSocketClient:
    def __init__(self, ws_url: str, timeout: float = 10.0):
        self.ws_url = ws_url
        self.timeout = timeout
        self._ws: websockets.WebSocketClientProtocol | None = None

    async def connect(self) -> None:
        self._ws = await websockets.connect(self.ws_url)

    async def close(self) -> None:
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def call_tool(self, tool_name: str, arguments: dict[str, Any] | None = None) -> ToolCallResult:
        if not self._ws:
            raise RuntimeError("WebSocket not connected")

        call_id = str(uuid4())
        payload = {
            "jsonrpc": "2.0",
            "id": call_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {},
            },
        }

        start = time.perf_counter()
        await self._ws.send(json.dumps(payload))
        try:
            while True:
                raw = await asyncio.wait_for(self._ws.recv(), timeout=self.timeout)
                data = json.loads(raw)
                if data.get("id") == call_id:
                    latency_ms = (time.perf_counter() - start) * 1000.0
                    if data.get("error"):
                        return ToolCallResult(
                            latency_ms=latency_ms,
                            success=False,
                            error=data["error"].get("message"),
                        )
                    return ToolCallResult(
                        latency_ms=latency_ms,
                        success=True,
                        result=data.get("result"),
                    )
        except asyncio.TimeoutError:
            latency_ms = (time.perf_counter() - start) * 1000.0
            return ToolCallResult(latency_ms=latency_ms, success=False, error="timeout")


async def run_bot_calls(
    ws_url: str,
    tool_name: str,
    call_count: int,
    delay_s: float,
    arguments: dict[str, Any] | None = None,
) -> list[ToolCallResult]:
    client = BotWebSocketClient(ws_url)
    await client.connect()
    results: list[ToolCallResult] = []
    try:
        for _ in range(call_count):
            result = await client.call_tool(tool_name, arguments=arguments)
            results.append(result)
            if delay_s > 0:
                await asyncio.sleep(delay_s)
    finally:
        await client.close()
    return results
