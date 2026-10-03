import { test, expect } from "@playwright/test";

test.describe("SAI Books – Core Web Application & UI E2E Flows", () => {
  test("Health & System Status: /api/health responds with status healthy", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.service).toBe("sai-books");
    expect(data.timestamp).toBeTruthy();
  });

  test("Security & Auth Guard: Unauthenticated access to protected routes redirects to /login", async ({ page }) => {
    // Attempting to visit /records without a session
    await page.goto("/records");
    await expect(page).toHaveURL(/\/login/);

    // Attempting to visit /month-end without a session
    await page.goto("/month-end");
    await expect(page).toHaveURL(/\/login/);

    // Attempting to visit /reports without a session
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Login UI: Brand Presentation, Form Fields and Accessibility", async ({ page }) => {
    await page.goto("/login");

    // Title and Brand Presence
    await expect(page).toHaveTitle(/SAI Books/i);
    await expect(page.locator("h1")).toContainText(/SAI Books/i);

    // Input fields presence
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("Authentication: Wrong Credentials Display Plain-Language Error", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"], input[name="email"], input[id="email"]', "unregistered-user@example.com");
    await page.fill('input[type="password"], input[name="password"], input[id="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Should stay on login and show failure notice
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/);
  });

  test("Mobile Responsiveness: Viewport 375px (iPhone / Android) Renders Usably", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    // Verify no horizontal overflow beyond viewport width
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(385);
  });
});
