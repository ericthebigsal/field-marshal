import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

test("deploy: auto-fill enables Start and reaches play phase", async ({ page }) => {
  await page.goto(FILE);
  await expect(page.getByTestId("board")).toBeVisible();
  await expect(page.getByTestId("btn-start")).toBeDisabled();

  await page.getByTestId("btn-autofill").click();
  await expect(page.getByTestId("btn-start")).toBeEnabled();

  // human back rows should be full of red tokens
  const redTokens = page.locator('[data-testid="token"][data-owner="red"]');
  await expect(redTokens).toHaveCount(40);

  await page.getByTestId("btn-start").click();

  // play phase: AI pieces present but hidden
  const hidden = page.locator('[data-testid="token"][data-owner="hidden"]');
  await expect(hidden).toHaveCount(40);
});

test("deploy: Clear empties the board", async ({ page }) => {
  await page.goto(FILE);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-clear").click();
  await expect(page.locator('[data-testid="token"][data-owner="red"]')).toHaveCount(0);
  await expect(page.getByTestId("btn-start")).toBeDisabled();
});

test("deploy: difficulty select offers four tiers", async ({ page }) => {
  await page.goto(FILE);
  const opts = page.getByTestId("difficulty-select").locator("option");
  await expect(opts).toHaveText([/easy/i, /medium/i, /hard/i, /expert/i]);
});
