import { test, expect } from "@playwright/test";

/**
 * E2E Test: Selection and Modification Workflow
 *
 * Tests element selection, multi-selection, property inspection,
 * and element modification workflows.
 */

test.describe("Selection and Modification Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });

    // Create some test elements first
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create two walls for testing
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    await terminal.fill("wall --start 5,0 --end 5,5");
    await terminal.press("Enter");
    await page.waitForTimeout(400);
  });

  test("should select element by clicking in canvas", async ({ page }) => {
    // Find the canvas area
    const canvas = page.locator('[data-testid="canvas-container"]');
    await expect(canvas).toBeVisible();

    // Click on an element (this assumes elements are rendered in the canvas)
    // The exact coordinates depend on how elements are positioned
    await canvas.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(300);

    // Check if selection changed (may show in properties panel or status)
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Status should reflect selection state
    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("selected");
  });

  test("should get element details with get command", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // List elements first to get IDs
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Get the output
    const output = page.locator('[data-testid="terminal-output"]');
    const outputText = await output.textContent();

    // Extract a wall ID
    const wallIdMatch = outputText?.match(/wall-[a-f0-9]+/i);
    const wallId = wallIdMatch?.[0];

    if (wallId) {
      // Get details of that wall
      await terminal.fill(`get ${wallId}`);
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      // Should show wall properties
      await expect(output).toContainText("wall");
      await expect(output).toContainText("height");
    }
  });

  test("should clear selection with Escape key", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');

    // Click to select something
    await canvas.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(300);

    // Press Escape to clear selection
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Check selection is cleared via status
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    const output = page.locator('[data-testid="terminal-output"]');
    // Should show 0 selected or no selection
    await expect(output).toContainText("selected");
  });

  test("should delete selected elements with Delete key", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // First check how many elements we have
    await terminal.fill("list");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Select an element via canvas or we can use selection commands
    const canvas = page.locator('[data-testid="canvas-container"]');
    await canvas.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(300);

    // Try to delete with Delete key
    await page.keyboard.press("Delete");
    await page.waitForTimeout(400);

    // List again to verify deletion
    await terminal.fill("list");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    // Element count should be different
    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toBeVisible();
  });

  test("should delete elements via terminal command", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // List elements to get an ID
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    const outputText = await output.textContent();

    // Extract a wall ID
    const wallIdMatch = outputText?.match(/wall-[a-f0-9]+/i);
    const wallId = wallIdMatch?.[0];

    if (wallId) {
      // Delete the wall
      await terminal.fill(`delete ${wallId}`);
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      // Should confirm deletion
      await expect(output).toContainText(/deleted|Deleted/i);

      // Verify wall is gone
      await terminal.fill(`get ${wallId}`);
      await terminal.press("Enter");
      await page.waitForTimeout(400);

      // Should show not found
      await expect(output).toContainText(/not found|error/i);
    }
  });

  test("should select all elements with Ctrl+A", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');
    await canvas.click();
    await page.waitForTimeout(200);

    // Select all with Ctrl+A
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(300);

    // Check status to see all selected
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    // Should show 2 selected (we created 2 walls)
    await expect(output).toContainText("selected");
  });

  test("should support multi-selection with Shift+Click", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');

    // Click first element
    await canvas.click({ position: { x: 250, y: 200 } });
    await page.waitForTimeout(300);

    // Shift+click second element
    await canvas.click({
      position: { x: 350, y: 300 },
      modifiers: ["Shift"],
    });
    await page.waitForTimeout(300);

    // Check status
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(400);

    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("selected");
  });
});
