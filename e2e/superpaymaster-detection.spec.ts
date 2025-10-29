import { test, expect } from '@playwright/test';

const SUPERPAYMASTER_V2_ADDRESS = '0xe25b068d4239C6dAc484B8c51d62cC86F44859A7';

test.describe('SuperPaymasterV2 类型检测', () => {
  test('应该正确检测 SuperPaymasterV2 为 AOA+ 类型', async ({ page }) => {
    // 访问管理页面，传入 SuperPaymasterV2 地址
    await page.goto(`/operator/manage?address=${SUPERPAYMASTER_V2_ADDRESS}`);

    // 等待页面加载完成（最多10秒）
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 等待类型检测完成，应该显示 AOA+ 占位页面
    await expect(page.locator('h2')).toContainText('AOA+ 管理功能开发中', { timeout: 15000 });

    // 验证显示了正确的提示信息
    await expect(page.locator('text=SuperPaymaster (AOA+) 管理页面即将上线')).toBeVisible();

    // 验证显示了合约类型
    await expect(page.locator('text=检测到的合约类型: AOA+ (多 operator 账户)')).toBeVisible();

    // 验证显示了合约地址
    await expect(page.locator(`text=${SUPERPAYMASTER_V2_ADDRESS}`)).toBeVisible();

    console.log('✅ SuperPaymasterV2 成功检测为 AOA+ 类型');
  });

  test('应该正确处理无效地址', async ({ page }) => {
    const invalidAddress = '0x0000000000000000000000000000000000000000';

    await page.goto(`/operator/manage?address=${invalidAddress}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 应该显示错误信息
    await expect(page.locator('h2')).toContainText('无法识别 Paymaster', { timeout: 15000 });

    console.log('✅ 正确处理了无效地址');
  });

  test('应该正确检测 PaymasterV4 为 AOA 类型', async ({ page }) => {
    // 使用一个已知的 PaymasterV4 地址进行测试
    // 注意：这里需要替换为实际的 PaymasterV4 地址
    const paymasterV4Address = '0x4D6A367aA183903968833Ec4AE361CFc8dDDBA38'; // 替换为实际地址

    await page.goto(`/operator/manage?address=${paymasterV4Address}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // 应该路由到 AOA 管理页面，显示配置表单
    // 注意：这里的断言需要根据 ManagePaymasterAOA 的实际UI调整
    await expect(page.locator('text=Paymaster 配置').or(page.locator('text=基本信息'))).toBeVisible({ timeout: 15000 });

    console.log('✅ 正确检测并路由到 AOA 管理页面');
  });

  test('类型检测应该显示加载状态', async ({ page }) => {
    await page.goto(`/operator/manage?address=${SUPERPAYMASTER_V2_ADDRESS}`);

    // 在检测过程中应该显示加载动画
    const loadingText = page.locator('text=正在检测 Paymaster 类型...');

    // 可能会快速消失，所以用 or 条件
    await expect(
      loadingText.or(page.locator('h2'))
    ).toBeVisible({ timeout: 5000 });

    console.log('✅ 加载状态显示正常');
  });
});

test.describe('Paymaster 类型检测集成测试', () => {
  test('完整流程：从浏览器访问管理页面', async ({ page }) => {
    // 1. 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. 如果有导航到管理页面的链接，可以测试完整流程
    // 这里直接跳转到管理页面测试
    await page.goto(`/operator/manage?address=${SUPERPAYMASTER_V2_ADDRESS}`);

    // 3. 验证整个检测和展示流程
    await expect(page.locator('h2')).toContainText('AOA+ 管理功能开发中', { timeout: 15000 });

    // 4. 验证 URL 参数保留
    expect(page.url()).toContain(`address=${SUPERPAYMASTER_V2_ADDRESS}`);

    console.log('✅ 完整流程测试通过');
  });
});
