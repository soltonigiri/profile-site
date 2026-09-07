import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const importantExternalUrls = {
  yomeiExe: "https://yomei-exe.pages.dev/",
  youtubeMarkdownArchiver: "https://github.com/soltonigiri/youtube-markdown-archiver",
  githubProfile: "https://github.com/soltonigiri",
  profileSite: "https://github.com/soltonigiri/profile-site",
  x: "https://x.com/solt_onigiri_",
  directMessage: "https://x.com/messages/compose?recipient_id=1839890345158639616",
};

for (const route of ["/", "/en/"]) {
  test(`${route} is accessible without an empty Blog section`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#blog")).toHaveCount(0);
    await expect(page.locator('[data-nav] a[href="#blog"]')).toHaveCount(0);
    await expect(page.locator("#skills")).toHaveCount(0);
    await expect(page.locator('[data-nav] a[href="#skills"]')).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("English route has independent metadata", async ({ page }) => {
  await page.goto("/en/");

  await expect(page).toHaveTitle("soltonigiri");
  await expect(page.locator("h1")).toHaveText("soltonigiri");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://soltonigiri.pages.dev/en/",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(structuredData).url).toBe("https://soltonigiri.pages.dev/en/");
  await expect(page.getByRole("link", { name: /Contact Me/ })).toHaveAttribute(
    "href",
    importantExternalUrls.directMessage,
  );
});

test("language switcher is one full-size control and toggles both ways", async ({ page }) => {
  await page.goto("/");

  const englishSwitcher = page.getByRole("link", { name: "英語に切り替える" });
  await expect(englishSwitcher).toHaveAttribute("href", "/en/");
  expect((await englishSwitcher.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await englishSwitcher.click();

  const japaneseSwitcher = page.getByRole("link", { name: "Switch to Japanese" });
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(japaneseSwitcher).toHaveAttribute("href", "/");
  expect((await japaneseSwitcher.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});

test("all X links and structured data use the current account", async ({ page }) => {
  await page.goto("/");

  const xLinks = page.locator(`a[href="${importantExternalUrls.x}"]`);
  await expect(xLinks).toHaveCount(1);
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structuredData).toContain("https://x.com/solt_onigiri_");
});

test("both languages use the shared social icon sprite", async ({ page }) => {
  for (const route of ["/", "/en/"]) {
    await page.goto(route);

    await expect(
      page.locator('use[href^="/assets/immutable/social-icons.v1.svg#"]'),
    ).toHaveCount(2);
    await expect(page.locator(".svg-sprite")).toHaveCount(0);
    await expect(page.locator(".social-icon path")).toHaveCount(0);
  }
});

test("work, projects, and Contact point to their intended destinations", async ({ page }) => {
  for (const route of ["/", "/en/"]) {
    await page.goto(route);
    const projects = page.locator("#projects");
    await expect(projects.locator(".project-item")).toHaveCount(2);
    await expect(projects.locator(`a[href="${importantExternalUrls.youtubeMarkdownArchiver}"]`)).toBeVisible();
    await expect(projects.locator(`a[href="${importantExternalUrls.yomeiExe}"]`)).toBeVisible();
    await expect(page.locator("[data-oss-contributions]")).toHaveAttribute("href", importantExternalUrls.githubProfile);
    await expect(page.locator("[data-client-work]")).toContainText("WordPress");
    await expect(page.locator("[data-client-work]")).toContainText("PDF");
    await expect(page.locator("[data-client-work] a")).toHaveCount(0);
    const contact = page.getByRole("link", { name: /Contact Me/ });
    await expect(contact).toHaveAttribute("href", importantExternalUrls.directMessage);
    await expect(contact).toHaveAttribute("target", "_blank");
    const siteSource = page.locator(".site-footer a");
    await expect(siteSource).toHaveCount(1);
    await expect(siteSource).toHaveAttribute("href", importantExternalUrls.profileSite);
  }
});

test("Contact opens the owner's DM composer directly in both languages", async ({ page, context }) => {
  // Capture the destination locally; this test must not contact X or send a message.
  await context.route("https://x.com/**", (route) => route.fulfill({
    contentType: "text/html",
    body: "<title>DM destination</title>",
  }));
  for (const route of ["/", "/en/"]) {
    await page.goto(route);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: /Contact Me/ }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(importantExternalUrls.directMessage);
    await popup.close();
  }
});

test("profile character reacts to pointer and keyboard activation without reaction text", async ({ page }) => {
  await page.goto("/");

  const character = page.getByRole("button", { name: "おにぎりをつつく" });
  await character.focus();
  await page.keyboard.press("Enter");
  await expect(character).toHaveClass(/is-startled/);
  await expect(page.getByText("うわっ", { exact: true })).toHaveCount(0);
  await expect(character).not.toHaveClass(/is-startled/, { timeout: 1_500 });
});

test("unknown routes return the custom 404 with a 404 status", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

for (const width of [320, 390, 768]) {
  test(`portfolio stays readable at ${width}px without a menu`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/en/"]) {
      await page.goto(route);
      await expect(page.locator("[data-nav], [data-menu-button]")).toHaveCount(0);
      const contact = page.getByRole("link", { name: /Contact Me/ });
      await contact.scrollIntoViewIfNeeded();
      await expect(contact).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const items = page.locator(".project-item, .work-item");
      for (const item of await items.all()) {
        const bounds = await item.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      }
      if (width === 390) {
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      }
    }
  });
}

test("keyboard navigation reaches content and Contact; reduced motion suppresses animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "本文へ移動" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const character = page.getByRole("button", { name: "おにぎりをつつく" });
  await expect(character).toBeFocused();
  await page.keyboard.press("Enter");
  expect(await character.locator("img").evaluate((img) => getComputedStyle(img).animationName)).toBe("none");
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    if (await page.getByRole("link", { name: /Contact Me/ }).evaluate((link) => link === document.activeElement)) break;
  }
  await expect(page.getByRole("link", { name: /Contact Me/ })).toBeFocused();
});

test("static responses carry the expected security and cache headers", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("default-src 'self'");

  const immutableAsset = await request.get("/assets/immutable/profile-onigiri-awake.304.v1.webp");
  expect(immutableAsset.headers()["cache-control"]).toContain("immutable");

  for (const sourcePng of ["awake", "half", "sleep"]) {
    const response = await request.get(`/assets/profile-onigiri-${sourcePng}.png`);
    expect(response.status()).toBe(404);
  }
});

for (const route of ["/", "/en/", "/not-found"]) {
  test(`${route} keeps the chosen palette and one background across system themes`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(route);
    const lightBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
    await page.emulateMedia({ colorScheme: "dark" });
    const darkBackground = await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
    expect(darkBackground).toBe(lightBackground);
    expect(darkBackground).toBe("rgb(24, 26, 27)");
    const canvas = await page.evaluate(() => ({
      background: getComputedStyle(document.documentElement).backgroundColor,
      bodyHeight: document.body.getBoundingClientRect().height,
      viewport: innerHeight,
    }));
    expect(canvas.background).toBe(darkBackground);
    expect(canvas.bodyHeight).toBeGreaterThanOrEqual(canvas.viewport);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.emulateMedia({ colorScheme: "light" });
    expect(await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).toBe(lightBackground);
  });
}

for (const width of [1920, 2487]) {
  test(`the portfolio uses the available space at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1305 });
    for (const route of ["/", "/en/"]) {
      await page.goto(route);
      const bounds = await page.locator(".page").boundingBox();
      expect(bounds.width / width).toBeGreaterThan(0.7);
      expect(bounds.x).toBeGreaterThan(0);
      expect(bounds.x + bounds.width).toBeLessThan(width);
      expect(Math.abs(bounds.x - (width - bounds.x - bounds.width))).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
}

test("hover and keyboard focus give feedback without moving the link hit area", async ({ page }) => {
  await page.goto("/");
  const social = page.getByRole("link", { name: "GitHub", exact: true });
  const icon = social.locator("svg");
  const startBounds = await social.boundingBox();
  const startTransform = await icon.evaluate((node) => getComputedStyle(node).transform);
  await social.hover();
  await expect.poll(() => icon.evaluate((node) => getComputedStyle(node).transform)).not.toBe(startTransform);
  expect(await social.boundingBox()).toEqual(startBounds);
  await page.mouse.move(0, 0);
  await expect.poll(() => icon.evaluate((node) => getComputedStyle(node).transform)).toBe(startTransform);

  const project = page.locator(".project-item").first();
  await project.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(project).toBeFocused();
  expect(await project.evaluate((node) => node.matches(":focus-visible"))).toBe(true);
  await expect.poll(() => project.locator(".link-label").evaluate((node) => getComputedStyle(node).backgroundSize)).toBe("100% 1px");
  const arrow = project.locator(".external-arrow");
  await expect.poll(() => arrow.evaluate((node) => getComputedStyle(node).transform)).toBe("matrix(1, 0, 0, 1, 2, -2)");
  await page.keyboard.press("Tab");
  await expect.poll(() => project.locator(".link-label").evaluate((node) => getComputedStyle(node).backgroundSize)).toBe("0% 1px");
});

test("reduced motion keeps focus feedback and stops hover movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const social = page.getByRole("link", { name: "GitHub", exact: true });
  await social.hover();
  expect(await social.locator("svg").evaluate((node) => getComputedStyle(node).transform)).toBe("none");
  const project = page.locator(".project-item").first();
  await project.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(project).toBeFocused();
  expect(await project.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
  expect(await project.locator(".external-arrow").evaluate((node) => getComputedStyle(node).transform)).toBe("none");
  expect(await project.locator(".link-label").evaluate((node) => getComputedStyle(node).backgroundSize)).toBe("100% 1px");
});

for (const [utcTime, before, after] of [
  ["2026-09-06T20:59:59Z", "sleep", "half"],
  ["2026-09-06T21:59:59Z", "half", "awake"],
  ["2026-09-07T12:59:59Z", "awake", "half"],
  ["2026-09-07T13:59:59Z", "half", "sleep"],
]) {
  test(`character switches from ${before} to ${after} at ${utcTime}`, async ({ page }) => {
    await page.clock.install({ time: new Date(utcTime) });
    await page.clock.pauseAt(new Date(utcTime));
    await page.goto("/");
    const image = page.locator("[data-profile-image]");
    await expect(image).toHaveAttribute("src", new RegExp(`-${before}\\.`));
    await page.clock.runFor(1_000);
    await expect(image).toHaveAttribute("src", new RegExp(`-${after}\\.`));
    await expect(page.locator("[data-profile-source]")).toHaveAttribute("srcset", new RegExp(`-${after}\\.`));
  });
}

test("character checks hourly, pauses while hidden, and refreshes on return", async ({ page }) => {
  const start = new Date("2026-09-07T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start);
  await page.goto("/en/");
  await page.evaluate(() => {
    window.scheduledTimers = 0;
    const setTimeout = window.setTimeout.bind(window);
    window.setTimeout = (...args) => {
      window.scheduledTimers += 1;
      return setTimeout(...args);
    };
  });
  const initialChecks = await page.evaluate(() => window.scheduledTimers);
  await page.clock.runFor(3_599_999);
  expect(await page.evaluate(() => window.scheduledTimers)).toBe(initialChecks);
  await page.clock.runFor(1);
  expect(await page.evaluate(() => window.scheduledTimers)).toBe(initialChecks + 1);
  await expect(page.locator("[data-profile-image]")).toHaveAttribute("alt", "A half-awake onigiri");

  // Simulate browser visibility without relying on OS window focus in headless CI.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(3_600_000);
  expect(await page.evaluate(() => window.scheduledTimers)).toBe(initialChecks + 1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("[data-profile-image]")).toHaveAttribute("alt", "A sleeping onigiri");
});
