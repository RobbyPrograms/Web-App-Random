import { chromium } from "playwright";

const browser = await chromium.launch();

async function shot(url, name, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(() => localStorage.setItem("boxed-help-seen", "1"));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(200);
  const filter = await page.getByRole("group", { name: "Sports" }).count();
  const title = await page.locator("h1").innerText();
  const label = await page.locator("h1 + p").innerText();
  console.log(name, title, label, "filter", filter);
  await page.screenshot({ path: `qa-shots/${name}.png` });
  await page.close();
}

await shot("http://localhost:3456/", "pass2-mobile", 390, 844);
await shot("http://localhost:3456/", "pass2-desktop", 1440, 900);
await shot("http://localhost:3456/?sports=nba,nfl", "pass2-two", 390, 844);
await shot("http://localhost:3457/", "pass2-nba-only", 390, 844);
await shot("http://localhost:3457/", "pass2-nba-desktop", 1440, 900);
await browser.close();
