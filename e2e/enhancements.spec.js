import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const FILE = pathToFileURL(join(process.cwd(), "stratego.html")).href;

async function startGame(page, difficulty = "easy") {
  await page.goto(FILE);
  await page.getByTestId("difficulty-select").selectOption(difficulty);
  await page.getByTestId("btn-autofill").click();
  await page.getByTestId("btn-start").click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i);
}

test("choosing a named formation fills the board and starts the game", async ({ page }) => {
  await page.goto(FILE);
  await expect(page.getByTestId("btn-start")).toBeDisabled();
  await page.getByTestId("formation-select").selectOption("defensive");
  // all 40 squares of the deploy zone now hold a token
  await expect(
    page.locator('[data-testid^="cell-6-"] [data-testid="token"]'),
  ).toHaveCount(10);
  await expect(page.getByTestId("btn-start")).toBeEnabled();
  await page.getByTestId("btn-start").click();
  await expect(page.getByTestId("turn-indicator")).toContainText(/your turn/i);
});

test("pieces render an SVG glyph instead of a bare letter", async ({ page }) => {
  await page.goto(FILE);
  // deploy tray shows every rank; Bomb and Flag used to render as "B"/"F"
  await expect(page.locator('[data-testid="tray-piece-B"] svg')).toBeVisible();
  await expect(page.locator('[data-testid="tray-piece-F"] svg')).toBeVisible();
  await expect(page.locator('[data-testid="tray-piece-10"] svg')).toBeVisible();
});

test("hovering a piece shows its rules", async ({ page }) => {
  await startGame(page);
  const token = page
    .locator('[data-testid^="cell-6-"] [data-testid="token"]')
    .first();
  await token.hover();
  const tip = page.getByTestId("piece-tooltip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText(/moves|square|line|bomb|flag/i);
  await expect(tip).toContainText(/my remaining/i);
  await expect(tip).toContainText(/opponent remaining/i);
  await expect(tip).toContainText(/\d+ of \d+/);
});

test("a piece's text color marks whether it has been revealed", async ({ page }) => {
  await startGame(page);

  await page.evaluate(() => {
    const { Game, AI } = window.Stratego;
    const g = Game.state;
    const mk = (id, owner, rank, revealed) => ({
      id, owner, rank, hasMoved: false, revealed,
    });
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (g.engineState.board[r][c] && !g.engineState.board[r][c].lake)
          g.engineState.board[r][c] = null;
    g.engineState.board[8][1] = mk(1, "red", 6, false);   // secret own piece
    g.engineState.board[8][2] = mk(2, "red", 7, true);    // revealed own piece
    g.engineState.board[1][1] = mk(3, "blue", 8, true);   // revealed enemy
    g.engineState.board[1][2] = mk(4, "blue", 9, false);  // hidden enemy
    g.engineState.board[9][9] = mk(5, "red", "F", false);
    g.engineState.board[0][0] = mk(6, "blue", "F", false);
    g.engineState.turn = "red";
    g.beliefs = AI.createBeliefs(
      AI.redactState(g.engineState, g.aiOwner), g.aiOwner);
    window.Stratego.UI.render();
  });

  await expect(page.locator('[data-testid="cell-8-1"] .token')).toHaveClass(/secret/);
  await expect(page.locator('[data-testid="cell-8-2"] .token')).toHaveClass(/known/);
  await expect(page.locator('[data-testid="cell-1-1"] .token')).toHaveClass(/known/);
  await expect(page.locator('[data-testid="cell-1-2"] .token')).not.toHaveClass(/known|secret/);
});

test("an encounter opens a modal explaining the outcome", async ({ page }) => {
  await startGame(page);

  await page.evaluate(() => {
    const { Game, Engine, AI } = window.Stratego;
    const g = Game.state;
    const mk = (id, owner, rank) => ({
      id, owner, rank, hasMoved: false, revealed: false,
    });
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (g.engineState.board[r][c] && !g.engineState.board[r][c].lake)
          g.engineState.board[r][c] = null;
    g.engineState.board[6][0] = mk(101, "red", 6);   // human Captain
    g.engineState.board[5][0] = mk(102, "blue", 4);  // hidden AI Sergeant
    g.engineState.board[9][9] = mk(103, "red", "F");
    g.engineState.board[0][0] = mk(104, "blue", "F");
    g.engineState.board[9][8] = mk(105, "red", 2);
    g.engineState.board[0][1] = mk(106, "blue", 2);
    g.engineState.turn = "red";
    g.beliefs = AI.createBeliefs(
      AI.redactState(g.engineState, g.aiOwner), g.aiOwner);
    Game.selectPiece(6, 0);
    window.Stratego.UI.render();
  });

  await page.locator('[data-testid="cell-5-0"]').click();

  const modal = page.getByTestId("combat-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(/Captain/);
  await expect(modal).toContainText(/Sergeant/);
  await expect(modal).toContainText(/higher rank/i);

  // game does not advance to the AI until the modal is dismissed
  await expect(page.getByTestId("turn-indicator")).toContainText(/thinking|your turn/i);

  await page.getByTestId("btn-combat-continue").click();
  await expect(modal).toHaveCount(0);
});
