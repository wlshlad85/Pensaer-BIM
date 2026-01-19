/**
 * Retry with Exponential Backoff Pattern Test
 * Testing automatic retry logic for transient failures
 */

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface TestResult {
  pattern: string;
  success: boolean;
  observations: string[];
  metrics: {
    totalAttempts: number;
    successfulAttempt: number;
    totalDelay: number;
    retriesPerformed: number;
  };
}

/**
 * Simulates transient failures (succeeds after N attempts)
 */
class UnreliableService {
  private callCount = 0;
  private readonly succeedAfter: number;

  constructor(succeedAfter: number) {
    this.succeedAfter = succeedAfter;
  }

  async call(): Promise<string> {
    this.callCount++;

    if (this.callCount < this.succeedAfter) {
      throw new Error(`Transient failure (attempt ${this.callCount})`);
    }

    return `Success on attempt ${this.callCount}`;
  }

  reset(): void {
    this.callCount = 0;
  }
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, delay: number, error: Error) => void
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxAttempts) {
        throw new Error(`Max retry attempts (${config.maxAttempts}) reached. Last error: ${lastError.message}`);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      if (onRetry) {
        onRetry(attempt, delay, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Test Retry with Exponential Backoff
 */
export async function testRetryBackoff(): Promise<TestResult> {
  const observations: string[] = [];
  const metrics = {
    totalAttempts: 0,
    successfulAttempt: 0,
    totalDelay: 0,
    retriesPerformed: 0,
  };

  observations.push('Starting Retry with Exponential Backoff test...');

  const config: RetryConfig = {
    maxAttempts: 5,
    initialDelay: 100,  // 100ms
    maxDelay: 5000,     // 5s max
    backoffMultiplier: 2,
  };

  // Test 1: Service succeeds on 3rd attempt
  observations.push('\n--- Test 1: Transient failure (succeeds on attempt 3) ---');
  const service1 = new UnreliableService(3);

  try {
    const result = await retryWithBackoff(
      () => service1.call(),
      config,
      (attempt, delay, error) => {
        metrics.totalAttempts++;
        metrics.retriesPerformed++;
        metrics.totalDelay += delay;
        observations.push(
          `  Attempt ${attempt} failed: ${error.message} | Retrying in ${delay}ms`
        );
      }
    );

    metrics.totalAttempts++; // Count successful attempt
    metrics.successfulAttempt = metrics.totalAttempts;
    observations.push(`  ✓ ${result}`);
  } catch (error) {
    observations.push(`  ✗ Failed: ${error}`);
  }

  // Test 2: Permanent failure (exceeds max attempts)
  observations.push('\n--- Test 2: Permanent failure (never succeeds) ---');
  const service2 = new UnreliableService(999);
  metrics.totalAttempts = 0;
  metrics.retriesPerformed = 0;

  try {
    await retryWithBackoff(
      () => service2.call(),
      { ...config, maxAttempts: 3 },
      (attempt, delay, error) => {
        metrics.totalAttempts++;
        metrics.retriesPerformed++;
        observations.push(
          `  Attempt ${attempt} failed: ${error.message} | Delay: ${delay}ms`
        );
      }
    );
  } catch (error) {
    metrics.totalAttempts++; // Count final failed attempt
    observations.push(`  ✓ Correctly gave up after max attempts`);
    observations.push(`     Error: ${(error as Error).message}`);
  }

  // Test 3: Exponential backoff verification
  observations.push('\n--- Test 3: Verify exponential backoff delays ---');
  const delays: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, i - 1),
      config.maxDelay
    );
    delays.push(delay);
    observations.push(`  Attempt ${i}: ${delay}ms`);
  }

  observations.push('\nDelay progression (should be exponential):');
  observations.push(`  ${delays.join('ms → ')}ms`);

  observations.push(`\nFinal Metrics:`);
  observations.push(`  Total retries performed: ${metrics.retriesPerformed}`);
  observations.push(`  Total delay accumulated: ${metrics.totalDelay}ms`);
  observations.push(`  Success on attempt: ${metrics.successfulAttempt || 'N/A'}`);

  return {
    pattern: 'Retry with Exponential Backoff',
    success: metrics.successfulAttempt > 0,
    observations,
    metrics,
  };
}

/**
 * Advanced: Retry with jitter (prevents thundering herd)
 */
async function retryWithJitter<T>(
  fn: () => Promise<T>,
  config: RetryConfig & { jitterFactor?: number },
  onRetry?: (attempt: number, delay: number, error: Error) => void
): Promise<T> {
  const jitterFactor = config.jitterFactor || 0.1;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === config.maxAttempts) {
        throw new Error(`Max retry attempts reached. Last error: ${lastError.message}`);
      }

      // Calculate delay with exponential backoff + jitter
      let delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      // Add random jitter (±10% by default)
      const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
      delay = Math.max(0, delay + jitter);

      if (onRetry) {
        onRetry(attempt, delay, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Analysis for Pensaer-BIM
 */
export function analyzeForPensaer(): string[] {
  return [
    'APPLICABILITY TO PENSAER-BIM:',
    '',
    '✓ MCP Tool Calls:',
    '  - Network hiccups during geometry operations',
    '  - Server restarts or brief unavailability',
    '  - Retry geometry/spatial/validation calls automatically',
    '',
    '✓ IFC File Operations:',
    '  - Large file reads can timeout',
    '  - File system locks (antivirus, backup software)',
    '  - Retry with backoff prevents user frustration',
    '',
    '✓ 3D Mesh Generation:',
    '  - GPU operations can occasionally fail',
    '  - WebGL context loss',
    '  - Automatic retry with increasing delays',
    '',
    '✓ CRDT Sync Operations:',
    '  - Network partitions during sync',
    '  - Retry ensures eventual consistency',
    '  - Exponential backoff prevents network congestion',
    '',
    'IMPLEMENTATION RECOMMENDATIONS:',
    '  1. Wrap all MCP calls in retryWithBackoff()',
    '  2. Use jitter to prevent thundering herd',
    '  3. Different retry configs per operation:',
    '     - Fast operations: 3 attempts, 100ms initial',
    '     - Slow operations: 5 attempts, 1s initial',
    '     - File operations: 3 attempts, 500ms initial',
    '  4. Add retry indicators in UI ("Retrying 2/3...")',
    '  5. Log retry metrics for monitoring',
    '',
    'CODE EXAMPLE:',
    '  const result = await retryWithBackoff(',
    '    () => mcpClient.callTool("geometry", "create_wall", params),',
    '    { maxAttempts: 3, initialDelay: 200, maxDelay: 2000, backoffMultiplier: 2 }',
    '  );',
  ];
}
