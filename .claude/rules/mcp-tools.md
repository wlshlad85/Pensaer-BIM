---
paths:
  - "server/mcp-servers/**/*.py"
---

# MCP Tool Development Rules

When working on MCP tools:

1. **Input Validation**: Validate all inputs with Pydantic before processing
2. **Error Messages**: Return user-friendly error messages, not stack traces
3. **Idempotency**: Tools should be safe to call multiple times with same input
4. **JSON Output**: Always return JSON-serializable results
5. **Logging**: Use structured logging with tool name prefix

## Required Imports
```python
import json
from typing import Any
from mcp.server import Server
from mcp.types import Tool, TextContent
from pydantic import BaseModel, ValidationError
```

## Error Handling Pattern
```python
try:
    validated = InputModel(**arguments)
    result = await process(validated)
    return [TextContent(type="text", text=json.dumps(result))]
except ValidationError as e:
    return [TextContent(type="text", text=json.dumps({"error": str(e)}))]
```
