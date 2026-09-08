import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

test("a game in progress survives a reload", async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("difficulty-select").selectOption("easy");
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await page.locator('[data-testid="cell-6-0"]').click();
  await page.locator('[data-testid="cell-5-0"]').click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
  const logBefore = await page.getByTestId("move-log").innerText();

  await page.reload();
  // resume prompt appears; choose resume
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("move-log")).toHaveText(logBefore);
});

test("a save taken mid-AI-turn resumes without freezing", async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("difficulty-select").selectOption("easy");
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await page.locator('[data-testid="cell-6-0"]').click();
  await page.locator('[data-testid="cell-5-0"]').click();
  // Reload WITHOUT waiting for /your turn/ — the save is written synchronously
  // in humanMove (before the AI timer), with engineState.turn === the AI side.
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem("stratego.save.v1");
      if (!raw) return false;
      return JSON.parse(raw).engineState.turn === "blue";
    } catch { return false; }
  });
  await page.reload();
  const resume = page.getByRole("button", { name: /resume/i });
  if (await resume.count()) await resume.click();
  // The AI turn must be re-scheduled: the indicator returns to the human.
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i, { timeout: 5000 });
});

test("New game from the resume prompt wipes the save", async ({ page }) => {
  await page.goto(FILE);
  await page.getByTestId("difficulty-select").selectOption("easy");
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await page.reload();
  await page.getByRole("button", { name: /new game/i }).click();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
  await page.reload();
  // no resume prompt this time
  await expect(page.getByRole("button", { name: /resume/i })).toHaveCount(0);
});

test("corrupt save is discarded without crashing", async ({ page }) => {
  await page.goto(FILE);
  await page.evaluate(() => localStorage.setItem("stratego.save.v1", "{not json"));
  await page.reload();
  await expect(page.getByTestId("btn-autofill")).toBeVisible();
});
