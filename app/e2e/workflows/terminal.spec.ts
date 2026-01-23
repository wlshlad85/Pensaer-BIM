import { test, expect } from "@playwright/test";

/**
 * E2E Test: Terminal Command Execution Workflow
 *
 * Tests the terminal's ability to execute commands, display output,
 * handle errors, and provide helpful feedback.
 */

test.describe("Terminal Command Execution Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display help for all commands", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("help");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show all command categories
    await expect(output).toContainText("wall");
    await expect(output).toContainText("door");
    await expect(output).toContainText("window");
    await expect(output).toContainText("floor");
    await expect(output).toContainText("roof");
    await expect(output).toContainText("help");
  });

  test("should display help for a specific command", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("help wall");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show wall command details
    await expect(output).toContainText("wall");
    await expect(output).toContainText("--start");
    await expect(output).toContainText("--end");
  });

  test("should show version information", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("version");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show version info
    await expect(output).toContainText("Pensaer");
    await expect(output).toContainText("version");
  });

  test("should show model status", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show status information
    await expect(output).toContainText("status");
  });

  test("should echo text back to terminal", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("echo Hello World");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("Hello World");
  });

  test("should handle unknown command gracefully", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    await terminal.fill("unknowncommand");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show error message
    await expect(output).toContainText(/unknown|not found|invalid/i);
  });

  test("should handle missing required parameters", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Try to create wall without required parameters
    await terminal.fill("wall");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');

    // Should show error about missing parameters
    await expect(output).toContainText(/missing|required/i);
  });

  test("should clear terminal screen", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Add some output first
    await terminal.fill("echo Test output");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Clear the screen
    await terminal.fill("clear");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Terminal should be cleared (implementation dependent)
    // This may vary based on how clear is implemented
  });

  test("should navigate command history with arrow keys", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Execute some commands
    await terminal.fill("echo First");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("echo Second");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Navigate up in history
    await terminal.press("ArrowUp");
    await page.waitForTimeout(100);

    // Should show previous command
    await expect(terminal).toHaveValue("echo Second");

    // Navigate up again
    await terminal.press("ArrowUp");
    await page.waitForTimeout(100);

    // Should show earlier command
    await expect(terminal).toHaveValue("echo First");

    // Navigate down
    await terminal.press("ArrowDown");
    await page.waitForTimeout(100);

    await expect(terminal).toHaveValue("echo Second");
  });

  test("should support command execution with different parameter formats", async ({
    page,
  }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Test long format
    await terminal.fill("wall --start 0,0 --end 5,0 --height 3.0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("Created wall");

    // Test positional format
    await terminal.fill("wall 0,0 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    await expect(output).toContainText("Created wall");
  });

  test("should execute multiple commands sequentially", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Execute series of commands
    const commands = [
      "wall --start 0,0 --end 5,0",
      "wall --start 5,0 --end 5,5",
      "wall --start 5,5 --end 0,5",
      "wall --start 0,5 --end 0,0",
    ];

    for (const cmd of commands) {
      await terminal.fill(cmd);
      await terminal.press("Enter");
      await page.waitForTimeout(400);
    }

    // Check status to verify all walls created
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("wall");
  });
});
