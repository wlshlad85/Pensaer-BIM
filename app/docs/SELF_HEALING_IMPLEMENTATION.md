# Self-Healing Code Implementation Guide

**Status:** ✅ Implemented
**Date:** 2026-01-19
**Version:** 1.0.0

---

## Overview

Pensaer-BIM now includes comprehensive self-healing capabilities that automatically detect, recover from, and prevent errors during development and runtime. This guide explains how to use these features effectively.

## Features Implemented

### 1. Circuit Breaker Pattern ✅
**Location:** `SelfHealingMCPClient`
**Purpose:** Prevents cascade failures in MCP server communication

**How it works:**
- Monitors failure rate for each MCP server
- Opens circuit after 50% failure threshold
- Fast-fails subsequent requests when open
- Auto-recovers after 10 seconds

**Configuration:**
```typescript
import { createMCPClient } from './services/mcp';

// Circuit breaker is enabled by default
const client = createMCPClient();

// To disable:
// Set env: VITE_MCP_SELF_HEALING=false
```

### 2. Retry with Exponential Backoff ✅
**Location:** `utils/retry.ts`
**Purpose:** Automatically retry transient failures

**Usage:**
```typescript
import { retryWithBackoff, RETRY_CONFIGS } from './utils/retry';

// Use predefined config
const result = await retryWithBackoff(
  () => someAsyncOperation(),
  RETRY_CONFIGS.FAST_MCP
);

// Custom config
const result = await retryWithBackoff(
  () => someAsyncOperation(),
  {
    maxAttempts: 5,
    initialDelay: 200,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    onRetry: (attempt, delay, error) => {
      console.log(`Retry ${attempt}, waiting ${delay}ms`);
    },
  }
);
```

**Predefined Configs:**
- `RETRY_CONFIGS.FAST_MCP` - Fast MCP calls (3 attempts, 100-2000ms)
- `RETRY_CONFIGS.SLOW_MCP` - Slow MCP calls (5 attempts, 1000-10000ms)
- `RETRY_CONFIGS.FILE_OPS` - File operations (3 attempts, 500-5000ms)
- `RETRY_CONFIGS.GPU_OPS` - GPU operations (5 attempts, 100-3000ms)
- `RETRY_CONFIGS.NETWORK_SYNC` - Network sync (5 attempts, 200-8000ms)

### 3. Error Recovery System ✅
**Location:** `utils/errorRecovery.ts`
**Purpose:** Automated error detection and recovery

**Automatic Handlers:**
- `TypeError` → Defensive null checking + fallback
- `NetworkError` → Retry with exponential backoff
- `WebGLContextLost` → Reload context or fallback to 2D
- `ParseError` → Show helpful error message
- `QuotaExceededError` → Clear old cache

**Custom Handler Example:**
```typescript
import { selfHealingSystem } from './utils/errorRecovery';

// Register custom handler
selfHealingSystem.registerHandler('CustomError', async (error) => {
  console.log('Handling custom error:', error);

  // Your recovery logic here
  await performRecovery();

  return {
    success: true,
    action: 'auto-fix',
    message: 'Custom error recovered',
  };
});

// Use in code
try {
  await riskyOperation();
} catch (error) {
  const recovery = await selfHealingSystem.handleError(error);
  console.log('Recovery:', recovery);
}
```

**Wrapper Function:**
```typescript
import { withErrorRecovery } from './utils/errorRecovery';

const safeFunction = withErrorRecovery(
  async () => await riskyOperation(),
  {
    onRecovery: (result) => {
      console.log('Recovered:', result.message);
    },
    fallbackValue: null, // Return this if recovery fails
  }
);

const result = await safeFunction();
```

### 4. React Error Boundary ✅
**Location:** `components/common/SelfHealingErrorBoundary.tsx`
**Purpose:** Catch React component errors with recovery options

**Usage:**
```tsx
import { SelfHealingErrorBoundary } from './components/common/SelfHealingErrorBoundary';

// Wrap your component
function App() {
  return (
    <SelfHealingErrorBoundary
      componentName="App"
      onError={(error, errorInfo) => {
        console.error('App error:', error);
      }}
      onRetry={() => {
        console.log('User clicked retry');
      }}
    >
      <YourComponent />
    </SelfHealingErrorBoundary>
  );
}

// Or use HOC
import { withErrorRecovery } from './components/common/SelfHealingErrorBoundary';

const SafeComponent = withErrorRecovery(MyComponent, {
  componentName: 'MyComponent',
});
```

**Features:**
- Automatic retry (3 attempts)
- Safe mode option (minimal features)
- Custom fallback UI
- Development mode error details

### 5. Self-Healing MCP Client ✅
**Location:** `services/mcp/SelfHealingMCPClient.ts`
**Purpose:** Wraps MCP client with all self-healing features

**Enabled by default:**
```typescript
import { createMCPClient } from './services/mcp';

// Circuit breaker + retry + cache + metrics
const client = createMCPClient();

// Use normally - self-healing happens automatically
const result = await client.callTool('geometry', 'create_wall', params);
```

**Manual Configuration:**
```typescript
import { SelfHealingMCPClient } from './services/mcp';
import { HttpMCPClient } from './services/mcp';

const baseClient = new HttpMCPClient({ baseUrl: 'http://localhost:8000' });

const client = new SelfHealingMCPClient(baseClient, {
  enableCircuitBreaker: true,
  enableRetry: true,
  enableCache: true,
  enableMetrics: true,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  circuitBreakerConfig: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
  },
});

// Get metrics
const metrics = client.getMetrics();
console.log('Circuit status:', client.getCircuitStatus('geometry'));

// Manual circuit control
client.openCircuit('geometry');  // Force open
client.closeCircuit('geometry'); // Force close
```

### 6. Monitoring & Metrics ✅
**Location:** `components/debug/SelfHealingMonitor.tsx`
**Purpose:** Real-time visualization of self-healing metrics

**Usage:**
```tsx
import { SelfHealingMonitor } from './components/debug/SelfHealingMonitor';

function DebugPanel() {
  const mcpClient = useMCPClient(); // Your MCP client

  return (
    <div>
      <SelfHealingMonitor
        mcpClient={mcpClient}
        refreshInterval={5000}
        compact={false}
      />
    </div>
  );
}

// Compact mode (for status bar)
<SelfHealingMonitor mcpClient={mcpClient} compact={true} />
```

**Metrics Collected:**
- Total calls per server
- Success/failure rates
- Circuit breaker activations
- Retry attempts
- Cache hit rates
- Average response times
- Error recovery statistics

### 7. TypeScript Strict Mode ✅
**Location:** `tsconfig.app.json`
**Purpose:** Catch errors at compile time

**Enabled Options:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**What this prevents:**
- Unsafe array/object access
- Missing return statements
- Type coercion bugs
- Unused variables
- Switch statement fall-through

### 8. ESLint Security Rules ✅
**Location:** `eslint.config.js`
**Purpose:** Catch security and code quality issues

**Rules Added:**
```javascript
{
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/await-thenable": "error",
  "@typescript-eslint/explicit-function-return-type": "warn",
  "no-eval": "error",
  "no-implied-eval": "error",
  "no-new-func": "error",
  "no-console": ["warn", { allow: ["warn", "error", "info"] }]
}
```

---

## Environment Variables

```bash
# Enable/disable self-healing (default: true)
VITE_MCP_SELF_HEALING=true

# MCP server configuration
VITE_MCP_BASE_URL=http://localhost:8000

# Enable mock mode for development
VITE_MCP_MOCK_MODE=false
```

---

## Testing

### Test Self-Healing Patterns
```bash
# Run the comprehensive test suite
node app/src/tests/self-healing-patterns/simple-test.js
```

**Expected Output:**
```
Tests passed: 4/4
Success rate: 100.0%

✓ Circuit Breaker Pattern
✓ Retry with Exponential Backoff
✓ Automated Error Recovery
✓ AI Bug Detection
```

### Test Individual Components

**Circuit Breaker:**
```typescript
const client = createMCPClient();

// Force failures to trigger circuit breaker
for (let i = 0; i < 5; i++) {
  try {
    await client.callTool('geometry', 'invalid_tool', {});
  } catch (error) {
    console.log('Failed as expected');
  }
}

// Circuit should be open now
const status = client.getCircuitStatus('geometry');
console.log('Circuit state:', status.state); // 'open'
```

**Retry Logic:**
```typescript
import { retryWithBackoff, RETRY_CONFIGS } from './utils/retry';

let attemptCount = 0;

const result = await retryWithBackoff(
  async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error('Transient failure');
    }
    return 'Success!';
  },
  {
    ...RETRY_CONFIGS.FAST_MCP,
    onRetry: (attempt, delay) => {
      console.log(`Retry ${attempt}, delay: ${delay}ms`);
    },
  }
);

console.log(result); // 'Success!' after 2 retries
```

**Error Recovery:**
```typescript
import { selfHealingSystem } from './utils/errorRecovery';

try {
  throw new TypeError("Cannot read property 'x' of null");
} catch (error) {
  const recovery = await selfHealingSystem.handleError(error);
  console.log('Recovery:', recovery);
}

// Check statistics
const stats = selfHealingSystem.getStatistics();
console.log('Total recoveries:', stats.total);
console.log('Successful:', stats.successful);
```

---

## Best Practices

### 1. Always Use Retry for External Operations
```typescript
// ✅ Good
const data = await retryWithBackoff(
  () => fetch(url),
  RETRY_CONFIGS.NETWORK_SYNC
);

// ❌ Bad - no retry
const data = await fetch(url);
```

### 2. Wrap Components with Error Boundaries
```tsx
// ✅ Good
<SelfHealingErrorBoundary>
  <ExpensiveComponent />
</SelfHealingErrorBoundary>

// ❌ Bad - errors crash the app
<ExpensiveComponent />
```

### 3. Use Error Recovery for Critical Operations
```typescript
// ✅ Good
const safeLoad = withErrorRecovery(
  () => loadIFCFile(path),
  { fallbackValue: null }
);

// ❌ Bad - unhandled errors
await loadIFCFile(path);
```

### 4. Monitor Metrics in Development
```tsx
// Add to your debug panel
{process.env.NODE_ENV === 'development' && (
  <SelfHealingMonitor mcpClient={mcpClient} />
)}
```

### 5. Handle Promise Rejections
```typescript
// ✅ Good - explicit error handling
try {
  await operation();
} catch (error) {
  await selfHealingSystem.handleError(error);
}

// ❌ Bad - floating promise (ESLint will warn)
operation(); // Promise rejected silently
```

---

## Monitoring & Debugging

### View Recovery Logs
```typescript
import { selfHealingSystem } from './utils/errorRecovery';

// Get recovery log
const log = selfHealingSystem.getRecoveryLog();

log.forEach(entry => {
  console.log(`[${new Date(entry.timestamp).toISOString()}]`);
  console.log(`  Error: ${entry.errorType} - ${entry.errorMessage}`);
  console.log(`  Action: ${entry.action}`);
  console.log(`  Success: ${entry.success}`);
  console.log(`  Details: ${entry.details}`);
});
```

### View MCP Client Metrics
```typescript
const client = createMCPClient();
const metrics = client.getMetrics();

console.log('Global metrics:', metrics.global);
console.log('Server metrics:', metrics.servers);

// Check specific server
const geometryStats = metrics.servers.geometry;
console.log('Geometry server success rate:',
  geometryStats.successfulCalls / geometryStats.totalCalls
);
```

### Monitor Circuit Breaker State
```typescript
// Listen for circuit breaker events
window.addEventListener('mcp-circuit-open', (event) => {
  const { server } = event.detail;
  console.warn(`Circuit breaker opened for ${server}`);

  // Show toast notification
  showToast(`${server} server unavailable, using cached data`);
});
```

### Debug Mode
```typescript
// Enable verbose logging
localStorage.setItem('DEBUG_SELF_HEALING', 'true');

// Logs will show:
// [Self-Healing] Circuit breaker OPEN for geometry server
// [Self-Healing] Retry 1/3 for geometry.create_wall after 100ms
// [Self-Healing] TypeError detected: Cannot read property 'x' of null
// [Self-Healing] Using cached data for geometry.create_wall
```

---

## Performance Impact

### Overhead Measurements

| Feature | Overhead | Notes |
|---------|----------|-------|
| Circuit Breaker | ~1-2ms | Per request |
| Retry Logic | 0ms | Only on failure |
| Error Recovery | <1ms | Per error |
| Metrics Collection | <0.5ms | Per operation |
| **Total** | ~2-3ms | Negligible |

### Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| Circuit Breakers (4 servers) | ~2KB | Stats storage |
| Retry Configs | <1KB | Static |
| Recovery Log (1000 entries) | ~100KB | Auto-pruned |
| MCP Cache (100 entries) | ~50KB | Configurable TTL |
| **Total** | ~150KB | Minimal |

---

## Troubleshooting

### Circuit Breaker Stuck Open

**Problem:** Circuit breaker won't close after server recovers

**Solution:**
```typescript
// Force close the circuit
client.closeCircuit('geometry');

// Or adjust threshold
const client = new SelfHealingMCPClient(baseClient, {
  circuitBreakerConfig: {
    errorThresholdPercentage: 70, // More tolerant
    resetTimeout: 5000, // Faster recovery
  },
});
```

### Too Many Retries

**Problem:** Operations taking too long due to retries

**Solution:**
```typescript
// Reduce retry attempts
const result = await retryWithBackoff(
  () => operation(),
  {
    ...RETRY_CONFIGS.FAST_MCP,
    maxAttempts: 2, // Reduce from 3
    maxDelay: 1000, // Cap at 1s
  }
);
```

### Cache Stale Data

**Problem:** Getting old cached data

**Solution:**
```typescript
// Clear cache
client.clearCache();

// Or reduce TTL
const client = new SelfHealingMCPClient(baseClient, {
  cacheTTL: 60 * 1000, // 1 minute instead of 5
});
```

### Error Recovery Not Working

**Problem:** Errors not being recovered

**Solution:**
```typescript
// Check if handler is registered
import { selfHealingSystem } from './utils/errorRecovery';

// Register handler for your error type
selfHealingSystem.registerHandler('YourError', async (error) => {
  // Your recovery logic
  return {
    success: true,
    action: 'auto-fix',
    message: 'Recovered',
  };
});
```

---

## Migration Guide

### From Old MCP Client

**Before:**
```typescript
import { createMCPClient } from './services/mcp';

const client = createMCPClient();
const result = await client.callTool('geometry', 'create_wall', params);
```

**After:**
```typescript
// No changes needed! Self-healing is automatic
import { createMCPClient } from './services/mcp';

const client = createMCPClient();
const result = await client.callTool('geometry', 'create_wall', params);
```

### Adding Retry to Existing Code

**Before:**
```typescript
async function loadData() {
  return await fetch(url);
}
```

**After:**
```typescript
import { retryWithBackoff, RETRY_CONFIGS } from './utils/retry';

async function loadData() {
  return await retryWithBackoff(
    () => fetch(url),
    RETRY_CONFIGS.NETWORK_SYNC
  );
}
```

### Adding Error Boundaries

**Before:**
```tsx
function App() {
  return <MyComponent />;
}
```

**After:**
```tsx
import { SelfHealingErrorBoundary } from './components/common/SelfHealingErrorBoundary';

function App() {
  return (
    <SelfHealingErrorBoundary componentName="App">
      <MyComponent />
    </SelfHealingErrorBoundary>
  );
}
```

---

## Future Enhancements

### Planned Features

1. **Predictive Failure Detection** (Q2 2026)
   - Machine learning model to predict failures
   - Proactive circuit breaking
   - Auto-scaling based on patterns

2. **Advanced Caching** (Q2 2026)
   - LRU cache with compression
   - Persistent cache (IndexedDB)
   - Cache warming strategies

3. **Distributed Circuit Breaker** (Q3 2026)
   - Shared state across tabs/windows
   - Coordinated recovery
   - Leader election

4. **AI-Powered Auto-Fix** (Q3 2026)
   - Integration with Kodezi API
   - Automated code patches
   - Test generation

---

## Resources

- [Research Document](../../docs/SELF_HEALING_CODE_RESEARCH.md)
- [Test Suite](../src/tests/self-healing-patterns/)
- [Circuit Breaker (opossum)](https://github.com/nodeshift/opossum)
- [Azure Self-Healing Patterns](https://learn.microsoft.com/en-us/azure/architecture/guide/design-principles/self-healing)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-19
**Status:** ✅ Complete
