import { test, expect } from '@playwright/test'

// ── helpers ────────────────────────────────────────────────────────────────
// Wait for page to be visually stable before screenshot
async function waitAndShot(page: any, name: string) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  await page.screenshot({
    path:     `playwright-report/screenshots/${name}.png`,
    fullPage: true,
  })
}

// ── test suite ─────────────────────────────────────────────────────────────
test.describe('TBP Auto CRM — Full App Report', () => {

  test('01 · Landing Hub', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await waitAndShot(page, '01-landing-hub')
  })

  test('02 · Market Radar', async ({ page }) => {
    await page.goto('/market-radar')
    await expect(page.getByText('Global Freight Radar')).toBeVisible()
    await waitAndShot(page, '02-market-radar')
  })

  test('03 · Market Radar — Control Panel filters', async ({ page }) => {
    await page.goto('/market-radar')
    await page.waitForLoadState('networkidle')
    // Open destination region dropdown
    const regionSelect = page.locator('select').nth(1)
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption({ index: 1 })
      await page.waitForTimeout(400)
    }
    await waitAndShot(page, '03-market-radar-filtered')
  })

  test('04 · Quote Builder — initial state', async ({ page }) => {
    await page.goto('/market-radar/quote/1')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Phase A/i).first()).toBeVisible({ timeout: 15_000 })
    await waitAndShot(page, '04-quote-builder-initial')
  })

  test('05 · Quote Builder — Phase A filled', async ({ page }) => {
    await page.goto('/market-radar/quote/1')
    await page.waitForLoadState('networkidle')
    // Fill customer info if fields exist
    const customerInput = page.locator('input[placeholder*="customer" i], input[placeholder*="company" i]').first()
    if (await customerInput.isVisible()) {
      await customerInput.fill('Test Distributor LLC')
    }
    await waitAndShot(page, '05-quote-builder-phase-a')
  })

  test('06 · Quote Builder — Phase C ZIP search', async ({ page }) => {
    await page.goto('/market-radar/quote/1')
    await page.waitForLoadState('networkidle')
    // Open ZIP dropdown
    const zipInput = page.locator('input[placeholder*="ZIP" i], input[placeholder*="zip" i]').first()
    if (await zipInput.isVisible()) {
      await zipInput.click()
      await page.waitForTimeout(600)
      await waitAndShot(page, '06-quote-builder-zip-dropdown')
      // Select first suggestion
      const firstSuggestion = page.locator('[onmousedown], button').filter({ hasText: /\d{5}/ }).first()
      if (await firstSuggestion.isVisible()) {
        await firstSuggestion.click()
        await page.waitForTimeout(800)
        await waitAndShot(page, '06b-quote-builder-zip-selected')
      }
    }
  })

  test('07 · Quote Builder — LOW/MID/HIGH selector', async ({ page }) => {
    await page.goto('/market-radar/quote/1')
    await page.waitForLoadState('networkidle')
    // Select a ZIP to trigger rate selector
    const zipInput = page.locator('input[placeholder*="ZIP" i], input[placeholder*="zip" i]').first()
    if (await zipInput.isVisible()) {
      await zipInput.fill('90744')
      await page.waitForTimeout(1500) // wait for rate calc
      await waitAndShot(page, '07-quote-builder-rate-selector')
      // Click HIGH
      const highBtn = page.getByText('HIGH').first()
      if (await highBtn.isVisible()) {
        await highBtn.click()
        await page.waitForTimeout(300)
        await waitAndShot(page, '07b-quote-builder-high-selected')
      }
    }
  })

  test('08 · CRM Dashboard', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    await waitAndShot(page, '08-crm-dashboard')
  })

  test('09 · CRM Dashboard — search filter', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search" i]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('TBP')
      await page.waitForTimeout(400)
      await waitAndShot(page, '09-crm-dashboard-search')
    }
  })

  test('10 · Quote Detail page', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    // Click first quote ID link
    const firstQuoteLink = page.locator('a[href*="/shipping-crm/TBP"]').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForLoadState('networkidle')
      await waitAndShot(page, '10-quote-detail')
    } else {
      // Fallback: navigate directly if quotes exist
      await page.goto('/shipping-crm')
      await waitAndShot(page, '10-quote-detail-fallback')
    }
  })

  test('11 · Quote Detail — shipment timeline', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    const firstQuoteLink = page.locator('a[href*="/shipping-crm/TBP"]').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForLoadState('networkidle')
      // Scroll to timeline
      await page.locator('text=Shipment Timeline').scrollIntoViewIfNeeded()
      await waitAndShot(page, '11-quote-timeline')
    }
  })

  test('12 · Document Checklist', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    const firstQuoteLink = page.locator('a[href*="/shipping-crm/TBP"]').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForLoadState('networkidle')
      // Click Documents tab if exists
      const docsTab = page.getByRole('tab', { name: /document/i })
                   .or(page.getByText('Documents').first())
      if (await docsTab.isVisible()) {
        await docsTab.click()
        await page.waitForTimeout(400)
      }
      await waitAndShot(page, '12-document-checklist')
    }
  })

  test('13 · Customer Address Book', async ({ page }) => {
    await page.goto('/shipping-crm/customers')
    await page.waitForLoadState('networkidle')
    await waitAndShot(page, '13-customer-address-book')
  })

  test('14 · Customer search dropdown', async ({ page }) => {
    await page.goto('/shipping-crm/customers')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="search" i]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Auto')
      await page.waitForTimeout(500)
      await waitAndShot(page, '14-customer-search')
    }
  })

  test('15 · Trucking Rates Admin', async ({ page }) => {
    await page.goto('/shipping-crm/settings/trucking-rates')
    await page.waitForLoadState('networkidle')
    await waitAndShot(page, '15-trucking-rates-admin')
  })

  test('16 · Quote Edit page', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    const firstQuoteLink = page.locator('a[href*="/shipping-crm/TBP"]').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForLoadState('networkidle')
      const editBtn = page.getByText('Edit Quote').or(page.locator('a[href*="/edit"]')).first()
      if (await editBtn.isVisible()) {
        await editBtn.click()
        await page.waitForLoadState('networkidle')
        await waitAndShot(page, '16-quote-edit')
      }
    }
  })

  test('17 · Print preview — Commercial Invoice', async ({ page }) => {
    await page.goto('/shipping-crm')
    await page.waitForLoadState('networkidle')
    const firstQuoteLink = page.locator('a[href*="/shipping-crm/TBP"]').first()
    if (await firstQuoteLink.isVisible()) {
      await firstQuoteLink.click()
      await page.waitForLoadState('networkidle')
      // Listen for popup (print window)
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        page.getByText('Generate & Print').first().click().catch(() => {}),
      ])
      if (popup) {
        await popup.waitForLoadState('networkidle')
        await popup.screenshot({
          path:     'playwright-report/screenshots/17-print-commercial-invoice.png',
          fullPage: true,
        })
        await popup.close()
      }
      await waitAndShot(page, '17-documents-with-print')
    }
  })

})
