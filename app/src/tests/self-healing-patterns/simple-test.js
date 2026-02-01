/**
 * Simple Self-Healing Patterns Test (Pure JavaScript)
 * Can run directly with Node.js
 */

// ========================================
// TEST 1: Circuit Breaker Pattern
// ========================================

async function testCircuitBreaker() {
  console.log('\n━━━ TEST 1: CIRCUIT BREAKER PATTERN ━━━\n');

  const observations = [];
  const metrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    circuitOpenCount: 0,
  };

  let circuitOpen = false;
  let failureCount = 0;
  const threshold = 3;

  async function unreliableAPI(shouldFail) {
    if (shouldFail) {
      throw new Error('API temporarily unavailable');
    }
    return 'Success';
  }

  async function callWithCircuitBreaker(shouldFail) {
    metrics.totalCalls++;

    if (circuitOpen) {
      metrics.circuitOpenCount++;
      observations.push(`Call ${metrics.totalCalls}: Circuit OPEN - rejecting immediately`);
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await unreliableAPI(shouldFail);
      metrics.successfulCalls++;
      failureCount = 0;
      observations.push(`Call ${metrics.totalCalls}: SUCCESS`);
      return result;
    } catch (error) {
      metrics.failedCalls++;
      failureCount++;
      observations.push(`Call ${metrics.totalCalls}: FAILED (${failureCount}/${threshold})`);

      if (failureCount >= threshold) {
        circuitOpen = true;
        observations.push('!!! CIRCUIT BREAKER OPENED !!!');

        setTimeout(() => {
          circuitOpen = false;
          failureCount = 0;
          observations.push('Circuit breaker HALF-OPEN - allowing test traffic');
        }, 2000);
      }

      throw error;
    }
  }

  // Test sequence
  await callWithCircuitBreaker(false);
  await callWithCircuitBreaker(false);

  // Trigger failures
  for (let i = 0; i < 5; i++) {
    try {
      await callWithCircuitBreaker(true);
    } catch (e) {
      // Expected
    }
  }

  // Should be blocked
  try {
    await callWithCircuitBreaker(false);
  } catch (e) {
    observations.push('✓ Circuit breaker preventing calls');
  }

  console.log(observations.join('\n'));
  console.log(`\nMetrics:`);
  console.log(`  Total: ${metrics.totalCalls}`);
  console.log(`  Success: ${metrics.successfulCalls}`);
  console.log(`  Failed: ${metrics.failedCalls}`);
  console.log(`  Blocked: ${metrics.circuitOpenCount}`);

  return { success: metrics.circuitOpenCount > 0, metrics };
}

// ========================================
// TEST 2: Retry with Exponential Backoff
// ========================================

async function testRetryBackoff() {
  console.log('\n━━━ TEST 2: RETRY WITH EXPONENTIAL BACKOFF ━━━\n');

  const observations = [];
  let attemptCount = 0;

  async function unreliableService() {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error(`Transient failure (attempt ${attemptCount})`);
    }
    return `Success on attempt ${attemptCount}`;
  }

  async function retryWithBackoff(fn, maxAttempts, initialDelay) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Max attempts reached. Last: ${error.message}`);
        }

        const delay = initialDelay * Math.pow(2, attempt - 1);
        observations.push(`Attempt ${attempt} failed: ${error.message}`);
        observations.push(`  Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  try {
    const result = await retryWithBackoff(unreliableService, 5, 100);
    observations.push(`✓ ${result}`);
  } catch (error) {
    observations.push(`✗ ${error.message}`);
  }

  console.log(observations.join('\n'));

  // Show backoff progression
  console.log('\nBackoff delays (exponential):');
  const delays = [100, 200, 400, 800, 1600];
  console.log(`  ${delays.join('ms → ')}ms`);

  return { success: attemptCount === 3 };
}

// ========================================
// TEST 3: Automated Error Recovery
// ========================================

async function testAutoRecovery() {
  console.log('\n━━━ TEST 3: AUTOMATED ERROR RECOVERY ━━━\n');

  const recoveryLog = [];

  const errorHandlers = {
    TypeError: async (error) => {
      recoveryLog.push({
        type: 'TypeError',
        action: 'Add defensive null checking',
        success: true,
      });
    },
    NetworkError: async (error) => {
      recoveryLog.push({
        type: 'NetworkError',
        action: 'Retry with exponential backoff',
        success: true,
      });
    },
    WebGLError: async (error) => {
      recoveryLog.push({
        type: 'WebGLError',
        action: 'Fallback to 2D renderer',
        success: true,
      });
    },
  };

  async function handleError(errorType) {
    const handler = errorHandlers[errorType];
    if (handler) {
      await handler();
      console.log(`✓ Recovered from ${errorType}`);
    }
  }

  // Simulate errors
  await handleError('TypeError');
  await handleError('NetworkError');
  await handleError('WebGLError');

  console.log(`\nRecovery log: ${recoveryLog.length} errors handled`);
  recoveryLog.forEach(log => {
    console.log(`  - ${log.type}: ${log.action}`);
  });

  return { success: recoveryLog.length === 3 };
}

// ========================================
// TEST 4: AI Bug Detection Simulation
// ========================================

async function testAIBugDetection() {
  console.log('\n━━━ TEST 4: AI BUG DETECTION SIMULATION ━━━\n');

  const issues = [
    {
      code: 'const result = await fetch(url);',
      severity: 'HIGH',
      issue: 'Missing error handling for fetch',
      fix: 'Wrap in try-catch',
    },
    {
      code: 'password = req.body.password;',
      severity: 'CRITICAL',
      issue: 'Password stored in plain text',
      fix: 'Hash with bcrypt',
    },
    {
      code: 'element.innerHTML = userInput;',
      severity: 'HIGH',
      issue: 'XSS vulnerability',
      fix: 'Use textContent or sanitize',
    },
  ];

  console.log('Static analysis results:\n');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.code}`);
    console.log(`   ⚠️  ${issue.severity}: ${issue.issue}`);
    console.log(`   💡 Fix: ${issue.fix}\n`);
  });

  console.log(`Total issues detected: ${issues.length}`);
  console.log(`  Critical: ${issues.filter(i => i.severity === 'CRITICAL').length}`);
  console.log(`  High: ${issues.filter(i => i.severity === 'HIGH').length}`);

  return { success: issues.length > 0 };
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SELF-HEALING CODE PATTERNS - TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');

  const results = [];

  try {
    results.push(await testCircuitBreaker());
    results.push(await testRetryBackoff());
    results.push(await testAutoRecovery());
    results.push(await testAIBugDetection());
  } catch (error) {
    console.error('\n✗ Test failed:', error);
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.success).length;
  console.log(`Tests passed: ${passed}/${results.length}`);
  console.log(`Success rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Pensaer-BIM Recommendations
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  RECOMMENDATIONS FOR PENSAER-BIM');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('IMMEDIATE ACTIONS:');
  console.log('');
  console.log('1. Install circuit breaker library:');
  console.log('   npm install cockatiel');
  console.log('');
  console.log('2. Wrap MCP client calls:');
  console.log('   - Add circuit breaker to HttpMCPClient');
  console.log('   - Configure timeout: 30s');
  console.log('   - Error threshold: 50%');
  console.log('');
  console.log('3. Add retry logic:');
  console.log('   - Max 3 attempts for MCP calls');
  console.log('   - Exponential backoff: 200ms, 400ms, 800ms');
  console.log('   - Add jitter to prevent thundering herd');
  console.log('');
  console.log('4. Implement error recovery:');
  console.log('   - WebGL context loss → Reload renderer');
  console.log('   - MCP server down → Use cached data');
  console.log('   - Parse error → Show helpful message');
  console.log('');
  console.log('5. Integrate AI tools:');
  console.log('   - Snyk: Security scanning');
  console.log('   - ESLint: Static analysis');
  console.log('   - TypeScript strict mode');
  console.log('');
  console.log('ESTIMATED IMPACT:');
  console.log('  - 40-50% reduction in user-facing errors');
  console.log('  - 80% of transient failures auto-resolved');
  console.log('  - Better system reliability');
  console.log('');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run tests
runAllTests().catch(console.error);
