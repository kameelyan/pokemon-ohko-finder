import { test, expect } from '@playwright/test';

// ─── App load ─────────────────────────────────────────────────────────────────

test('app loads and shows search UI', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');
  await expect(page.getByPlaceholder('Search Pokémon...')).toBeVisible();
});

// ─── Target search & results ──────────────────────────────────────────────────

test('searching for a target Pokémon shows results', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');

  // Type in the target search box (first one = attacker search, look for target-specific)
  const searchInputs = page.getByPlaceholder('Search Pokémon...');
  // The target slot search is one of the search boxes — use the one inside the target panel
  const targetSearch = searchInputs.first();
  await targetSearch.click();
  await targetSearch.fill('Garchomp');

  // Pick from dropdown
  await page.getByText('Garchomp').first().click();

  // Results list should appear with at least one result card
  await expect(page.locator('[data-tour="results-list"]')).toBeVisible();
  const resultCards = page.locator('[data-tour="results-list"] > div');
  await expect(resultCards.first()).toBeVisible();
});

test('result cards show attacker Pokémon names', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');

  const targetSearch = page.getByPlaceholder('Search Pokémon...').first();
  await targetSearch.click();
  await targetSearch.fill('Garchomp');
  await page.getByText('Garchomp').first().click();

  // Wait for results
  await expect(page.locator('[data-tour="results-list"] > div').first()).toBeVisible();

  // Cards should have Pokémon names visible
  const firstCard = page.locator('[data-tour="results-list"] > div').first();
  await expect(firstCard).not.toBeEmpty();
});

// ─── Target ability tooltip ───────────────────────────────────────────────────

test('hovering an ability button shows tooltip with description', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');

  const targetSearch = page.getByPlaceholder('Search Pokémon...').first();
  await targetSearch.click();
  await targetSearch.fill('Garchomp');
  await page.getByText('Garchomp').first().click();

  // Garchomp has Sand Veil / Rough Skin — find one of its ability buttons
  const abilityBtn = page.getByRole('button', { name: /Sand Veil|Rough Skin|Sand Force/ }).first();
  await expect(abilityBtn).toBeVisible();

  await abilityBtn.hover();

  // Tooltip should appear in document.body via portal
  const tooltip = page.locator('body > span');
  await expect(tooltip).toBeVisible();
  // Should contain some description text (not empty)
  await expect(tooltip).not.toBeEmpty();
});

// ─── Weather filter ───────────────────────────────────────────────────────────

test('selecting Sun weather updates the UI', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');

  const targetSearch = page.getByPlaceholder('Search Pokémon...').first();
  await targetSearch.click();
  await targetSearch.fill('Garchomp');
  await page.getByText('Garchomp').first().click();

  // Open the Battle Effects dropdown first
  await page.getByRole('button', { name: /Battle Effects/i }).click();

  // Find the Sun weather button inside the dropdown
  const sunBtn = page.getByRole('button', { name: /☀️|Sun/i }).first();
  await sunBtn.click();

  // Results should still be present
  await expect(page.locator('[data-tour="results-list"] > div').first()).toBeVisible();
});

// ─── Result expansion ─────────────────────────────────────────────────────────

test('clicking a result card expands it to show moves', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');

  const targetSearch = page.getByPlaceholder('Search Pokémon...').first();
  await targetSearch.click();
  await targetSearch.fill('Garchomp');
  await page.getByText('Garchomp').first().click();

  // Wait for first result
  const firstCard = page.locator('[data-tour="results-list"] > div').first();
  await expect(firstCard).toBeVisible();

  // Click to expand
  await firstCard.click();

  // Move table should now be visible
  await expect(page.locator('.ohko-move-table').first()).toBeVisible();
});

// ─── No results state ─────────────────────────────────────────────────────────

test('shows empty state when no target is selected', async ({ page }) => {
  await page.goto('/pokemon-ohko-finder/');
  // Without a target, results area should show the "search for a Pokémon" prompt
  await expect(page.getByText(/Search for a Pokémon above/i)).toBeVisible();
});
