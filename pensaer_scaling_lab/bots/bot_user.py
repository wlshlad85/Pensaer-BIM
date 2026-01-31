"""Bot user client for collaboration testing."""

import asyncio
import json
from uuid import uuid4
import websockets


class BotUser:
    """Simulates a user editing via WebSocket."""

    def __init__(self, user_id: str, server_url: str):
        self.user_id = user_id
        self.ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://") + "/mcp/ws"
        self.ws = None

    async def connect(self):
        """Connect to WebSocket."""
        self.ws = await websockets.connect(self.ws_url)

    async def disconnect(self):
        """Disconnect from WebSocket."""
        if self.ws:
            await self.ws.close()

    async def edit_element(self, element_id: str, updates: dict):
        """Send edit operation."""
        if not self.ws:
            raise RuntimeError("Not connected")

        await self.ws.send(json.dumps({
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": "update_element",
                "arguments": {
                    "element_id": element_id,
                    "updates": updates,
                    "actor_id": self.user_id,
                    "actor_type": "bot"
                }
            },
            "id": str(uuid4())
        }))

        # Wait for response
        response = await self.ws.recv()
        return json.loads(response)

    async def run_edit_loop(self, elements: list, edit_rate: int, duration_sec: int):
        """Run continuous editing loop.

        Args:
            elements: List of elements to edit
            edit_rate: Edits per minute
            duration_sec: Duration to run
        """
        import random
        interval = 60.0 / edit_rate  # seconds between edits

        end_time = asyncio.get_event_loop().time() + duration_sec

        edit_count = 0
        while asyncio.get_event_loop().time() < end_time:
            element = random.choice(elements)
            try:
                await self.edit_element(element["id"], {"modified": True, "edit_count": edit_count})
                edit_count += 1
            except Exception as e:
                print(f"Bot {self.user_id} edit failed: {e}")

            await asyncio.sleep(interval)

        return edit_count
