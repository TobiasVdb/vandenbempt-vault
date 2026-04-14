import { expect, test } from '@playwright/test'

test('integration settings flow works end-to-end', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Enable AWS Cloud' }).click()

  const panel = page.getByRole('complementary', { name: 'Integration settings panel' })
  await expect(panel).toBeVisible()

  await panel.getByLabel('Name').fill('AWS Production')
  await panel.getByLabel('Workspace ID').fill('workspace_prod_001')
  await panel.getByLabel('Account ID').fill('123456789012')
  await panel.getByLabel('Role ARN').fill('arn:aws:iam::123456789012:role/security-role')
  await panel.getByLabel('Region').fill('eu-west-1')

  await panel.getByRole('button', { name: 'Save Settings' }).click()
  await expect(page.getByRole('status')).toContainText('AWS Cloud settings saved.')

  await page.getByRole('button', { name: 'Close settings panel' }).click()
  await expect(panel).toBeHidden()
})
