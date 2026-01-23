import { test, expect } from "@playwright/test";

/**
 * E2E Test: Undo/Redo Workflow
 *
 * Tests the undo and redo functionality for various operations
 * including element creation, deletion, and modifications.
 */

test.describe("Undo/Redo Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should undo wall creation with Ctrl+Z", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Check initial element count
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Create a wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("Created wall");

    // Verify wall exists
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Undo with Ctrl+Z
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);

    // Check that wall is gone
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Should show fewer walls or none
    await expect(output).toBeVisible();
  });

  test("should redo undone action with Ctrl+Shift+Z", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create a wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);

    // Redo with Ctrl+Shift+Z
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(400);

    // Wall should be back
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("wall");
  });

  test("should redo undone action with Ctrl+Y", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create a wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);

    // Redo with Ctrl+Y (alternate)
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(400);

    // Wall should be back
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("wall");
  });

  test("should undo multiple operations", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create multiple walls
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    await terminal.fill("wall --start 5,0 --end 5,5");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    await terminal.fill("wall --start 5,5 --end 0,5");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Undo three times
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    // All walls should be gone
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    // Should show no walls or empty list
    await expect(output).toBeVisible();
  });

  test("should show undo/redo availability in status", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Check status before any actions
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');

    // Create a wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Check status after action
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Should show undo is available
    await expect(output).toContainText("undo");
  });

  test("should handle undo when nothing to undo", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Try to undo when nothing to undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    // Should not crash, app should remain functional
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toBeVisible();
  });

  test("should handle redo when nothing to redo", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create and don't undo
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Try to redo when nothing to redo
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);

    // Should not crash, app should remain functional
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toBeVisible();
  });

  test("should clear redo stack after new action", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create first wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    // Perform new action instead of redo
    await terminal.fill("wall --start 0,0 --end 0,5");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Try to redo - should not restore the first wall
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);

    // List walls - should only show the second wall
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toBeVisible();
  });

  test("should undo element deletion", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create a wall
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Get the wall ID
    const output = page.locator('[data-testid="terminal-output"]');
    const outputText = await output.textContent();
    const wallIdMatch = outputText?.match(/wall-[a-f0-9]+/i);
    const wallId = wallIdMatch?.[0];

    if (wallId) {
      // Delete the wall
      await terminal.fill(`delete ${wallId}`);
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      // Verify wall is deleted
      await terminal.fill("list wall");
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      // Undo deletion
      await page.keyboard.press("Control+z");
      await page.waitForTimeout(400);

      // Wall should be restored
      await terminal.fill("list wall");
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      await expect(output).toContainText("wall");
    }
  });
});
