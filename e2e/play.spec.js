import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "field-marshal.html")).href;

async function startGame(page, difficulty = "easy") {
  await page.goto(FILE);
  await page.getByTestId("difficulty-select").selectOption(difficulty);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i);
}

// The computer's move may end in an encounter, which raises a blocking modal.
async function clearCombatModal(page) {
  const cont = page.getByTestId("btn-combat-continue");
  if (await cont.isVisible().catch(() => false)) await cont.click();
}

test("human can select a front-row piece and see legal targets", async ({ page }) => {
  await startGame(page);
  // red front row is row index 6 -> cell-6-c. Find one with a token.
  const cell = page.locator('[data-testid^="cell-6-"]').filter({
    has: page.locator('[data-testid="token"]'),
  }).first();
  await cell.click();
  await expect(page.locator(".cell.legal")).not.toHaveCount(0);
});

test("making a move triggers the computer to reply", async ({ page }) => {
  await startGame(page);
  const from = page.locator('[data-testid="cell-6-0"]');
  await from.click();
  // advancing to row 5 (cell-5-0) should be legal from the front row
  await page.locator('[data-testid="cell-5-0"]').click();
  // after the AI replies the turn returns to the human, and the move log grows
  await expect(page.getByTestId("move-log")).toContainText(/→/);
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
});

test("Undo restores the previous position", async ({ page }) => {
  await startGame(page);
  await page.locator('[data-testid="cell-6-0"]').click();
  await page.locator('[data-testid="cell-5-0"]').click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
  await clearCombatModal(page);
  const logBefore = await page.getByTestId("move-log").innerText();
  await page.getByTestId("btn-undo").click();
  const logAfter = await page.getByTestId("move-log").innerText();
  expect(logAfter.length).toBeLessThan(logBefore.length);
  // the piece is back on its start square
  await expect(page.locator('[data-testid="cell-6-0"] [data-testid="token"]')).toBeVisible();
});

test("New Game returns to the deploy screen", async ({ page }) => {
  await startGame(page);
  await page.getByTestId("btn-newgame").click();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
});
