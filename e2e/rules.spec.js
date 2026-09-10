import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "field-marshal.html")).href;

test("the (?) button opens a rules modal on the deploy screen", async ({ page }) => {
  await page.goto(FILE);
  await expect(page.getByTestId("rules-modal")).toHaveCount(0);

  await page.getByTestId("btn-rules").click();
  const modal = page.getByTestId("rules-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(/how to play/i);
  await expect(modal).toContainText(/Spy/);
  await expect(modal).toContainText(/Miner/);
  await expect(modal).toContainText(/Flag/);
  // the rank table lists every rank
  await expect(modal.locator('[data-testid="rules-rank-row"]')).toHaveCount(12);

  await page.getByTestId("btn-rules-close").click();
  await expect(modal).toHaveCount(0);
});

test("the rules modal is also reachable during play", async ({ page }) => {
  await page.goto(FILE);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i);

  await page.getByTestId("btn-rules").click();
  await expect(page.getByTestId("rules-modal")).toBeVisible();

  // clicking the backdrop closes it
  await page.getByTestId("rules-modal").click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId("rules-modal")).toHaveCount(0);
});
