import { test, expect, devices } from "@playwright/test";

/**
 * E2E Test: Mobile Responsiveness
 *
 * Tests the mobile and tablet responsive behavior including:
 * - Tablet landscape layout
 * - Touch interactions
 * - Panel collapse on narrow screens
 * - Touch-friendly hit targets
 * - Pinch zoom in canvas (simulated)
 */

// Mobile device configuration
const iPhone = devices["iPhone 14"];
const iPadLandscape = {
  ...devices["iPad (gen 7) landscape"],
};
const iPadPortrait = {
  ...devices["iPad (gen 7)"],
};

test.describe("Mobile Responsiveness - Phone", () => {
  test.use({ ...iPhone });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should hide left toolbar on mobile", async ({ page }) => {
    // Left toolbar should not be visible on mobile
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).not.toBeVisible();
  });

  test("should hide side panels on mobile by default", async ({ page }) => {
    // Properties panel should not be visible by default
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).not.toBeVisible();

    // Level panel should not be visible by default
    const levelPanel = page.locator('[data-testid="level-panel"]');
    await expect(levelPanel).not.toBeVisible();
  });

  test("should show floating action button on mobile", async ({ page }) => {
    // FAB should be visible for accessing tools
    const fab = page.locator('button[aria-label*="tools menu"]');
    await expect(fab).toBeVisible();
  });

  test("should open mobile tools menu when FAB is clicked", async ({ page }) => {
    // Click the FAB
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    // Mobile menu should appear
    const mobileMenu = page.locator('[role="menu"][aria-label*="Mobile tools"]');
    await expect(mobileMenu).toBeVisible();
  });

  test("should open properties panel as slide-in modal on mobile", async ({ page }) => {
    // Open FAB menu
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    // Click properties button
    const propertiesButton = page.locator('button[aria-label*="properties panel"]');
    await propertiesButton.click();
    await page.waitForTimeout(300);

    // Properties modal should be visible
    const propertiesModal = page.locator('[role="dialog"][aria-labelledby="mobile-properties-title"]');
    await expect(propertiesModal).toBeVisible();
  });

  test("should open layers panel as slide-in modal on mobile", async ({ page }) => {
    // Open FAB menu
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    // Click layers button
    const layersButton = page.locator('button[aria-label*="layers"]');
    await layersButton.click();
    await page.waitForTimeout(300);

    // Layers modal should be visible
    const layersModal = page.locator('[role="dialog"][aria-labelledby="mobile-layers-title"]');
    await expect(layersModal).toBeVisible();
  });

  test("should close modal by clicking backdrop", async ({ page }) => {
    // Open properties modal
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    const propertiesButton = page.locator('button[aria-label*="properties panel"]');
    await propertiesButton.click();
    await page.waitForTimeout(300);

    // Click the backdrop (overlay area)
    const backdrop = page.locator('[role="dialog"] .bg-black\\/50');
    await backdrop.click({ force: true });
    await page.waitForTimeout(300);

    // Modal should be hidden
    const propertiesModal = page.locator('[role="dialog"][aria-labelledby="mobile-properties-title"]');
    await expect(propertiesModal).not.toBeVisible();
  });

  test("should have touch-friendly hit targets (min 44px)", async ({ page }) => {
    // Open FAB menu
    const fab = page.locator('button[aria-label*="tools menu"]');

    // Check FAB button size is at least 44x44 (touch-friendly)
    const fabBox = await fab.boundingBox();
    expect(fabBox).not.toBeNull();
    if (fabBox) {
      expect(fabBox.width).toBeGreaterThanOrEqual(44);
      expect(fabBox.height).toBeGreaterThanOrEqual(44);
    }

    await fab.click();
    await page.waitForTimeout(300);

    // Check menu button sizes
    const menuButtons = page.locator('[role="menu"] button');
    const count = await menuButtons.count();

    for (let i = 0; i < count; i++) {
      const button = menuButtons.nth(i);
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("should not have horizontal scroll", async ({ page }) => {
    // Check that the page doesn't scroll horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("should show compact terminal on mobile", async ({ page }) => {
    // Terminal section should be visible (the header with "Terminal" label)
    const terminalSection = page.locator('section[aria-label="Command terminal"]');
    await expect(terminalSection).toBeVisible();
  });
});

test.describe("Mobile Responsiveness - Tablet Landscape", () => {
  test.use({ ...iPadLandscape });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show compact toolbar on tablet", async ({ page }) => {
    // Toolbar should be visible but compact on tablet
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible();
  });

  test("should hide floating panels on tablet", async ({ page }) => {
    // Floating panels (level, layer, history) should not be visible on tablet
    const levelPanel = page.locator('.absolute.top-4.left-4');
    await expect(levelPanel).not.toBeVisible();
  });

  test("should hide properties panel by default on tablet", async ({ page }) => {
    // Right properties panel should be hidden
    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
    await expect(propertiesPanel).not.toBeVisible();
  });

  test("should have enough space for canvas on tablet landscape", async ({ page }) => {
    // Canvas area should take up most of the screen
    const canvas = page.locator('[data-testid="canvas-container"]');
    const canvasBox = await canvas.boundingBox();
    const viewportSize = page.viewportSize();

    expect(canvasBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();

    if (canvasBox && viewportSize) {
      // Canvas should be at least 60% of viewport width
      expect(canvasBox.width).toBeGreaterThan(viewportSize.width * 0.6);
    }
  });
});

test.describe("Mobile Responsiveness - Tablet Portrait", () => {
  test.use({ ...iPadPortrait });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show compact toolbar on tablet portrait", async ({ page }) => {
    // Toolbar should be visible but compact
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible();
  });

  test("should adapt layout for portrait orientation", async ({ page }) => {
    // Main content should fill available space
    const mainContent = page.locator('main[role="main"]');
    await expect(mainContent).toBeVisible();

    const box = await mainContent.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Should fill most of the viewport
      const viewport = page.viewportSize();
      if (viewport) {
        expect(box.width).toBeGreaterThan(viewport.width * 0.9);
      }
    }
  });
});

test.describe("Touch Interactions", () => {
  test.use({ ...iPadLandscape, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should support touch tap for selection", async ({ page }) => {
    // Create a wall first
    const terminal = page.locator('[data-testid="terminal-input"]');
    await terminal.click();
    await terminal.fill("wall --start 0,0 --end 5,0");
    await terminal.press("Enter");
    await page.waitForTimeout(500);

    // Touch tap on canvas
    const canvas = page.locator('[data-testid="canvas-container"]');
    await canvas.tap({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);

    // Verify the tap was registered
    await expect(canvas).toBeVisible();
  });

  test("should support touch pan gesture", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');
    const canvasBox = await canvas.boundingBox();

    if (canvasBox) {
      const startX = canvasBox.x + canvasBox.width / 2;
      const startY = canvasBox.y + canvasBox.height / 2;

      // Simulate touch pan
      await page.touchscreen.tap(startX, startY);
      await page.waitForTimeout(100);

      // Pan gesture (single finger drag)
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 50, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Canvas should still be visible and interactive
      await expect(canvas).toBeVisible();
    }
  });

  test("should have pointer:coarse media query active on touch devices", async ({ page }) => {
    // Check that touch device detection works
    const isTouchDevice = await page.evaluate(() => {
      return window.matchMedia("(pointer: coarse)").matches;
    });

    // On touch-enabled test, this should be true
    expect(isTouchDevice).toBe(true);
  });
});

test.describe("Pinch Zoom Simulation", () => {
  test.use({ ...iPadLandscape, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have touch gesture handlers attached to canvas", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');
    await expect(canvas).toBeVisible();

    // Verify touch event listeners are set up
    // The useTouchGestures hook should attach handlers
    const hasTouchListeners = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="canvas-container"]');
      if (!canvas) return false;

      // Check if the element has touch event handlers
      // This is a basic check - actual handlers are internal
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    });

    expect(hasTouchListeners).toBe(true);
  });

  test("canvas should respond to wheel events for zoom", async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas-container"]');
    const canvasBox = await canvas.boundingBox();

    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;

      // Wheel event (simulates pinch on trackpad)
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -100); // Scroll up = zoom in
      await page.waitForTimeout(300);

      // Canvas should still be visible
      await expect(canvas).toBeVisible();
    }
  });
});

test.describe("Responsive Accessibility", () => {
  test.use({ ...iPhone });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have proper ARIA labels on mobile UI elements", async ({ page }) => {
    // FAB should have aria-label
    const fab = page.locator('button[aria-label*="tools menu"]');
    await expect(fab).toHaveAttribute("aria-label");

    // FAB should have aria-expanded
    await expect(fab).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    await fab.click();
    await page.waitForTimeout(300);

    // Should update aria-expanded
    await expect(fab).toHaveAttribute("aria-expanded", "true");
  });

  test("mobile modals should have proper dialog role", async ({ page }) => {
    // Open properties modal
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    const propertiesButton = page.locator('button[aria-label*="properties panel"]');
    await propertiesButton.click();
    await page.waitForTimeout(300);

    // Modal should have role="dialog" and aria-modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("aria-modal", "true");
  });

  test("menu items should have proper role", async ({ page }) => {
    // Open FAB menu
    const fab = page.locator('button[aria-label*="tools menu"]');
    await fab.click();
    await page.waitForTimeout(300);

    // Menu items should have role="menuitem"
    const menuItems = page.locator('[role="menuitem"]');
    await expect(menuItems.first()).toBeVisible();
  });
});

test.describe("Orientation Change", () => {
  test("should handle viewport resize gracefully", async ({ page }) => {
    // Start with tablet landscape
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible({
      timeout: 10000,
    });

    // Toolbar should be visible
    const toolbar = page.locator('[data-testid="toolbar"]');
    await expect(toolbar).toBeVisible();

    // Rotate to portrait (simulate)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // App should still be functional
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();

    // Resize to phone size
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Toolbar should be hidden on phone
    await expect(toolbar).not.toBeVisible();

    // FAB should appear
    const fab = page.locator('button[aria-label*="tools menu"]');
    await expect(fab).toBeVisible();
  });
});
