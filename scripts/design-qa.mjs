import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.QA_URL ?? "http://localhost:3456";
const out = "qa-shots";
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const overflows = [];

function tile(status, direction) {
  const cols = [
    ["team", "Team", "LAL"],
    ["position", "Position", "G"],
    ["height", "Height", `6'6"`],
    ["draft", "Draft year", "2011"],
    ["origin", "Origin", "Duke"],
    ["jersey", "Jersey", "#23"],
  ];
  return cols.map(([id, label, display], index) => ({
    id,
    label,
    display,
    status: index === 2 && status === "row" ? "close" : status,
    direction: id === "height" ? direction : undefined,
  }));
}

function play(status, count, hint) {
  const rows = Array.from({ length: count }, (_, index) => ({
    name: `Guess ${index + 1}`,
    tiles: tile(status === "won" && index === count - 1 ? "exact" : index % 2 === 0 ? "miss" : "close", "higher"),
  }));
  return {
    guesses: rows.map((row) => row.name),
    results: rows.map((row) => row.tiles.every((item) => item.status === "exact")),
    clues: [],
    token: null,
    status,
    score: count,
    reveal: status === "playing" ? null : { name: "Hidden Until End", headline: "A season to remember", facts: [], position: "G", sportName: "NBA" },
    rows,
    hints: hint ? { team: hint === "letters" ? "Boston Celtics" : "Boston Celtics", letters: hint === "letters" ? "J · 5" : null } : { team: null, letters: null },
    puzzleSport: "nba",
  };
}

async function shoot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  const issues = await page.evaluate(() => {
    const found = [];
    for (const el of document.querySelectorAll("body *")) {
      const node = el;
      if (node.scrollWidth > node.clientWidth + 2 && node.clientWidth > 0) {
        const text = (node.innerText || "").slice(0, 40).replace(/\s+/g, " ");
        found.push(`${node.tagName}.${node.className?.toString?.().slice(0, 40)} ${text}`);
      }
    }
    return found.slice(0, 12);
  });
  if (issues.length) overflows.push(`${name}: ${issues.join(" | ")}`);
}

async function prepare(page, state) {
  await page.addInitScript((payload) => {
    localStorage.setItem("boxed-help-seen", payload.help ? "1" : "0");
    if (payload.contrast) localStorage.setItem("boxed-contrast", "high");
    if (payload.play) {
      const key = `boxed-v1:${payload.mode}:${payload.puzzle}`;
      localStorage.setItem(key, JSON.stringify(payload.play));
    }
  }, state);
}

async function runViewport(width, height, tag) {
  const probe = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await probe.goto(base, { waitUntil: "networkidle" });
  const title = await probe.locator("h1").innerText();
  const puzzle = Number(title.replace(/\D/g, ""));
  const mode = "epl,mlb,nba,nfl,nhl,wnba";
  await probe.close();

  async function scene(name, state, after) {
    const page = await browser.newPage({ viewport: { width, height } });
    await prepare(page, { ...state, mode, puzzle });
    await page.goto(state.url ?? base, { waitUntil: "networkidle" });
    if (after) await after(page);
    await page.waitForTimeout(250);
    await shoot(page, `${tag}-${name}`);
    await page.close();
  }

  await scene("fresh", { help: true });
  await scene("help", { help: false });
  await scene("guess-1", { help: true, play: play("playing", 1) });
  await scene("guess-3", { help: true, play: play("playing", 3) });
  await scene("guess-4-hint", { help: true, play: play("playing", 4, "team") });
  await scene("win", { help: true, play: play("won", 4, "team") }, async (page) => {
    await page.getByRole("button", { name: "View results" }).click();
  });
  await scene("loss", { help: true, play: play("lost", 6, "letters") });
  await scene("results", { help: true, play: play("lost", 6, "letters") }, async (page) => {
    await page.getByRole("button", { name: "View results" }).click();
  });
  await scene("stats", { help: true }, async (page) => {
    await page.getByRole("button", { name: "Stats" }).click();
  });
  await scene("settings", { help: true }, async (page) => {
    await page.getByRole("button", { name: "Settings" }).click();
  });
  await scene("contrast", { help: true, contrast: true, play: play("playing", 3) });
  await scene("filter-all", { help: true, url: `${base}/?sports=nba,wnba,nfl,mlb,nhl,epl` });
  await scene("filter-nba", { help: true, url: `${base}/?sports=nba` });
  await scene("filter-two", { help: true, url: `${base}/?sports=nba,nfl` });

  const keyboard = await browser.newPage({ viewport: { width, height } });
  await prepare(keyboard, { help: true, mode, puzzle });
  await keyboard.goto(`${base}/?sports=nba`, { waitUntil: "networkidle" });
  await keyboard.getByRole("combobox").focus();
  await keyboard.keyboard.type("jam");
  await keyboard.waitForTimeout(200);
  const option = keyboard.getByRole("option").first();
  if (await option.count()) {
    const name = (await option.innerText()).split("\n")[0];
    await keyboard.keyboard.press("Enter");
    await keyboard.waitForTimeout(800);
    const labels = await keyboard.locator("button[aria-label]").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label")).filter((label) => label && /match|close|taller|higher|lower/.test(label)),
    );
    console.log(tag, "keyboard guess", name, labels.join(" || "));
    await shoot(keyboard, `${tag}-keyboard`);
  } else {
    console.log(tag, "no autocomplete options");
  }
  await keyboard.close();
}

await runViewport(390, 844, "mobile");
await runViewport(1440, 900, "desktop");
await browser.close();
console.log("overflows", overflows.length ? overflows.join("\n") : "none");
