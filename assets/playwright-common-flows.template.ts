import { expect, type Locator, type Page } from 'playwright/test';

export async function clickIfVisible(locator: Locator, timeout = 2000) {
  if (await locator.isVisible({ timeout }).catch(() => false)) {
    await locator.click();
    return true;
  }
  return false;
}

export type OverlayCleanupOptions = {
  timeout?: number;
  closeButtonNames?: Array<string | RegExp>;
  blockingTextPatterns?: Array<string | RegExp>;
};

export async function closeCommonOverlays(page: Page, options: OverlayCleanupOptions = {}) {
  const timeout = options.timeout ?? 2500;
  const closeButtonNames = options.closeButtonNames ?? [/^(OK|确定|知道了|我知道了|Got it|Close|关闭|跳过|Skip|Done)$/i];
  const blockingTextPatterns = options.blockingTextPatterns ?? [];
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    let clicked = false;

    for (const name of closeButtonNames) {
      clicked ||= await clickIfVisible(page.getByRole('button', { name }).first(), 100);
      clicked ||= await clickIfVisible(page.getByText(name).first(), 100);
      if (clicked) break;
    }

    const blockerVisible = await Promise.any(
      blockingTextPatterns.map((pattern) =>
        page.getByText(pattern).first().isVisible({ timeout: 50 }).catch(() => false),
      ),
    ).catch(() => false);

    if (!clicked && !blockerVisible) return;

    await page.waitForTimeout(clicked ? 250 : 150);
  }
}

export async function expectCurrentPage(page: Page, pattern: RegExp, visibleText?: string | RegExp) {
  await expect(page).toHaveURL(pattern);
  if (visibleText) await expect(page.getByText(visibleText).first()).toBeVisible();
}

export async function openLinkByExactText(page: Page, text: string) {
  await page.getByRole('link', { name: text, exact: true }).click();
}

export async function selectOption(page: Page, comboboxName: string | RegExp, optionName: string | RegExp) {
  await page.getByRole('combobox', { name: comboboxName }).click();
  await page.getByRole('option', { name: optionName }).click();
}

export async function verifyTableRow(page: Page, rowText: string | RegExp) {
  await expect(page.getByText(rowText).first()).toBeVisible();
}

export async function openResearchSpace(page: Page, spaceName: string) {
  const commonSpace = page.getByRole('listitem').filter({ hasText: spaceName }).first();
  if (await commonSpace.isVisible({ timeout: 3000 }).catch(() => false)) {
    await commonSpace.click();
    return;
  }

  await page.getByRole('textbox', { name: '研发空间名称' }).fill(spaceName);
  await page.getByRole('button', { name: '查询' }).click();
  await page.getByRole('row').filter({ hasText: spaceName }).first().click();
}

export async function openDesignAssetType(page: Page, assetType: string) {
  await page.getByText('设计管理', { exact: true }).click();
  await page.getByText(assetType, { exact: true }).click();
  await expect(page.getByRole('navigation').getByText(assetType).or(page.getByText(assetType).first())).toBeVisible();
}

export async function createWorkspace(page: Page, data: { name: string; description?: string }) {
  await page.locator('header').filter({ hasText: '工作区' }).locator('img').click();
  await page.getByRole('textbox', { name: '名称*' }).fill(data.name);
  if (data.description !== undefined) {
    await page.getByRole('textbox', { name: '描述' }).fill(data.description);
  }
  await page.getByRole('button', { name: '确定' }).click();
  await verifyTableRow(page, data.name);
}

export type PrototypeData = {
  name: string;
  product: string;
  system: string;
  project: string;
};

export async function createPrototypeFromCurrentPage(page: Page, data: PrototypeData) {
  await page.getByRole('button', { name: '创建原型' }).click();
  await page.getByRole('textbox', { name: '原型名称*' }).fill(data.name);
  await selectOption(page, '产品/平台', data.product);
  await selectOption(page, '所属系统', data.system);
  await page.getByLabel('创建原型').getByText(/所属项目请选择|所属项目/).click();
  await page.getByRole('option', { name: data.project }).click();

  const popupPromise = page.waitForEvent('popup', { timeout: 12000 }).catch(() => null);
  await page.getByRole('button', { name: '确定' }).click();
  const popup = await popupPromise;

  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await expect(popup).toHaveURL(/\/proto\/design\//);
  }

  await verifyTableRow(page, data.name);
  return popup;
}
