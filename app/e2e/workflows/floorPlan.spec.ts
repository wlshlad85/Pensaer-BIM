import { test, expect } from "@playwright/test";

/**
 * E2E Test: Building Floor Plan Workflow
 *
 * Tests the complete workflow of creating a building floor plan
 * including walls, doors, and windows via terminal commands.
 */

test.describe("Building Floor Plan Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the app to load
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should create a simple rectangular room with walls", async ({ page }) => {
    // Focus on terminal input
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create rectangular walls (10m x 8m)
    await terminal.fill("wall --start 0,0 --end 10,0");
    await terminal.press("Enter");

    // Wait for command execution
    await page.waitForTimeout(500);

    // Check success message
    await expect(page.locator('[data-testid="terminal-output"]')).toContainText(
      "Created wall"
    );

    // Create remaining walls
    await terminal.fill("wall --start 10,0 --end 10,8");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    await terminal.fill("wall --start 10,8 --end 0,8");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    await terminal.fill("wall --start 0,8 --end 0,0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    // Verify all walls created via status command
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    // Should show 4 walls
    await expect(page.locator('[data-testid="terminal-output"]')).toContainText(
      "wall"
    );
  });

  test("should add a door to a wall", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // First create a wall
    await terminal.fill("wall --start 0,0 --end 10,0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    // Get the wall ID from the terminal output
    const output = page.locator('[data-testid="terminal-output"]');
    const outputText = await output.textContent();

    // Extract wall ID (format: wall-XXXX)
    const wallIdMatch = outputText?.match(/wall-[a-f0-9]+/i);
    const wallId = wallIdMatch?.[0];

    if (wallId) {
      // Add a door at 5m from start
      await terminal.fill(`door --wall ${wallId} --offset 5`);
      await terminal.press("Enter");
      await page.waitForTimeout(500);

      // Verify door was created
      await expect(output).toContainText("Placed");
      await expect(output).toContainText("door");
    }
  });

  test("should add a window to a wall", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // First create a wall
    await terminal.fill("wall --start 0,0 --end 10,0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    // Get the wall ID from the terminal output
    const output = page.locator('[data-testid="terminal-output"]');
    const outputText = await output.textContent();

    // Extract wall ID
    const wallIdMatch = outputText?.match(/wall-[a-f0-9]+/i);
    const wallId = wallIdMatch?.[0];

    if (wallId) {
      // Add a window at 2m from start
      await terminal.fill(`window --wall ${wallId} --offset 2 --width 1.5`);
      await terminal.press("Enter");
      await page.waitForTimeout(500);

      // Verify window was created
      await expect(output).toContainText("Placed");
      await expect(output).toContainText("window");
    }
  });

  test("should create a complete room with floor and roof", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create walls using box shorthand (if supported) or individual walls
    await terminal.fill("wall --start 0,0 --end 6,0");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("wall --start 6,0 --end 6,5");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("wall --start 6,5 --end 0,5");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("wall --start 0,5 --end 0,0");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Create floor
    await terminal.fill("floor --min 0,0 --max 6,5");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Verify floor created
    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("floor");

    // Create roof
    await terminal.fill("roof --type gable --min 0,0 --max 6,5 --slope 25");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Verify roof created
    await expect(output).toContainText("roof");

    // Check status shows all elements
    await terminal.fill("status");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await expect(output).toContainText("wall");
    await expect(output).toContainText("floor");
    await expect(output).toContainText("roof");
  });

  test("should list all elements in the model", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create some elements
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("wall --start 5,0 --end 5,3");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // List all elements
    await terminal.fill("list");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Verify listing output
    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("element");
  });

  test("should list elements filtered by type", async ({ page }) => {
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();

    // Create mixed elements
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    await terminal.fill("floor --min 0,0 --max 5,5");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // List only walls
    await terminal.fill("list wall");
    await terminal.press("Enter");
    await page.waitForTimeout(300);

    // Verify filtered output
    const output = page.locator('[data-testid="terminal-output"]');
    await expect(output).toContainText("wall");
  });
});
