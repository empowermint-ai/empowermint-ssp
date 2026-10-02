import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://plan.empowermint.co.za';

function formatLocalMobile(mobile) {
  const digits = mobile.replace('+27', '');
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.getByPlaceholder('83 123 4567').click();
  await page.getByPlaceholder('83 123 4567').fill(formatLocalMobile(process.env.MOBILE));
  await page.locator('input[type="password"]').click();
  await page.locator('input[type="password"]').fill(process.env.PASSWORD);
  await page.waitForTimeout(300);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(() => {}),
    page.locator('button[type="submit"]').click(),
  ]);
  await page.waitForLoadState('networkidle');
  console.log('landed:', page.url());
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-pass-SSP/7f34ae82-4f0c-414e-9361-ffda51bb9918/scratchpad/cookie-debug.png' });
  const cookies = await ctx.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  console.log('COOKIE_HEADER_START');
  console.log(cookieHeader);
  console.log('COOKIE_HEADER_END');
  await browser.close();
}

main();
