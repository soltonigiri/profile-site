import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const blogFixture = {
  posts: [
    {
      title: "Test post",
      url: "https://sizu.me/soltonigiri/posts/test-post",
      publishedAt: "Tue, 21 Jul 2026 00:16:28 GMT",
    },
  ],
};

const importantExternalUrls = {
  youtubeMarkdownArchiver: "https://github.com/soltonigiri/youtube-markdown-archiver",
  scpMcp: "https://github.com/soltonigiri/scp-mcp",
  profileSite: "https://github.com/soltonigiri/profile-site",
  x: "https://x.com/solt_onigiri_",
  signal:
    "https://signal.me/#eu/By3IL7zBc_iEv25MBYRox2iEW_J4Pwv_kuYpf072hE4p0yc0oPFA-asgKM3MJxtX",
};

async function mockBlogApi(page) {
  await page.route("**/api/blog", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(blogFixture),
    }),
  );
}

for (const route of ["/", "/en/"]) {
  test(`${route} is accessible and renders blog posts`, async ({ page }) => {
    await mockBlogApi(page);
    await page.goto(route);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Test post")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("English route has independent metadata", async ({ page }) => {
  await mockBlogApi(page);
  await page.goto("/en/");

  await expect(page).toHaveTitle("soltonigiri | Software Engineer");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://soltonigiri.pages.dev/en/",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: /Available for freelance work/ })).toHaveAttribute(
    "href",
    "#contact",
  );
});

test("language switcher is one full-size control and toggles both ways", async ({ page }) => {
  await mockBlogApi(page);
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
  await mockBlogApi(page);
  await page.goto("/");

  const xLinks = page.locator(`a[href="${importantExternalUrls.x}"]`);
  await expect(xLinks).toHaveCount(2);
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(structuredData).toContain("https://x.com/solt_onigiri_");
});

test("both languages use the shared social icon sprite", async ({ page }) => {
  for (const route of ["/", "/en/"]) {
    await mockBlogApi(page);
    await page.goto(route);

    await expect(
      page.locator('use[href^="/assets/immutable/social-icons.v1.svg#"]'),
    ).toHaveCount(5);
    await expect(page.locator(".svg-sprite")).toHaveCount(0);
    await expect(page.locator(".social-icon path")).toHaveCount(0);
  }
});

test("Projects and Contact keep the important external URLs", async ({ page }) => {
  for (const route of ["/", "/en/"]) {
    await mockBlogApi(page);
    await page.goto(route);

    const projects = page.locator("#projects");
    await expect(
      projects.locator(`a[href="${importantExternalUrls.youtubeMarkdownArchiver}"]`),
    ).toHaveCount(1);
    await expect(projects.locator(`a[href="${importantExternalUrls.scpMcp}"]`)).toHaveCount(1);
    const sourceLink = projects.locator(`a[href="${importantExternalUrls.profileSite}"]`);
    await expect(sourceLink).toHaveCount(1);
    await expect(sourceLink).toContainText(
      route === "/" ? "このサイトのしくみ" : "How this site works",
    );

    const contact = page.locator("#contact");
    const xLink = contact.locator(`a[href="${importantExternalUrls.x}"]`);
    const signalLink = contact.locator(`a[href="${importantExternalUrls.signal}"]`);
    await expect(xLink).toHaveCount(1);
    await expect(signalLink).toHaveCount(1);
    await expect(xLink).toHaveAttribute("target", "_blank");
    await expect(signalLink).toHaveAttribute("target", "_blank");
    await expect(xLink).toContainText(route === "/" ? "Xで相談する" : "Contact via X");
  }
});

test("About copy lives in Profile and scroll navigation follows section order", async ({ page }) => {
  await mockBlogApi(page);
  await page.goto("/");

  await expect(page.locator('[data-nav] a[href="#about"]')).toHaveCount(0);
  await expect(page.locator("#about")).toHaveCount(0);
  await expect(page.locator("#profile .profile-about")).toContainText(
    "AIと個人開発が好きなソフトウェアエンジニア。",
  );
  await expect(page.getByRole("link", { name: /仕事のご依頼を受付中/ })).toHaveAttribute(
    "href",
    "#contact",
  );

  for (const sectionId of ["profile", "projects", "blog", "skills", "contact"]) {
    await page.locator(`#${sectionId}`).evaluate((section) =>
      section.scrollIntoView({ behavior: "instant", block: "start" }),
    );
    await expect(page.locator(`[data-nav] a[href="#${sectionId}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("profile character reacts to pointer and keyboard activation without reaction text", async ({ page }) => {
  await mockBlogApi(page);
  await page.goto("/");

  const character = page.getByRole("button", { name: "おにぎりをつつく" });
  await character.focus();
  await page.keyboard.press("Enter");
  await expect(character).toHaveClass(/is-startled/);
  await expect(page.getByText("うわっ", { exact: true })).toHaveCount(0);
  await expect(character).not.toHaveClass(/is-startled/, { timeout: 1_500 });
});

test("selected client work shows delivery proof without publishing the contract price", async ({ page }) => {
  await mockBlogApi(page);
  await page.goto("/");

  const clientWork = page.locator("[data-client-work]");
  await expect(clientWork).toContainText("フォーム入力からPDF帳票・メール通知までを自動化");
  await expect(clientWork).toContainText("Paid client work · Delivered · ★ 5.0 / 5");
  await expect(clientWork).not.toContainText("12,000");
  await expect(clientWork.locator("a")).toHaveCount(0);

  await page.goto("/en/");
  await expect(page.locator("[data-client-work]")).toContainText(
    "Automated PDF documents and email notifications from form submissions",
  );
});

test("unknown routes return the custom 404 with a 404 status", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("mobile menu traps focus away from the page and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBlogApi(page);
  await page.goto("/");

  const menu = page.locator("[data-nav]");
  const button = page.locator("[data-menu-button]");
  await expect(menu).toHaveAttribute("inert", "");

  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(menu).not.toHaveAttribute("inert", "");
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await expect(page.locator(".site-footer")).toHaveAttribute("inert", "");

  await button.focus();
  await page.keyboard.press("Tab");
  await expect(menu.locator("a").first()).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(button).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.locator(".site-footer")).not.toHaveAttribute("inert", "");
});

test("static and API responses carry the expected security and cache headers", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("default-src 'self'");

  const immutableAsset = await request.get("/assets/immutable/profile-onigiri-awake.304.v1.webp");
  expect(immutableAsset.headers()["cache-control"]).toContain("immutable");

  for (const sourcePng of ["awake", "half", "sleep"]) {
    const response = await request.get(`/assets/profile-onigiri-${sourcePng}.png`);
    expect(response.status()).toBe(404);
  }

  const blog = await request.get("/api/blog");
  expect([200, 502]).toContain(blog.status());
  expect(blog.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(blog.headers()["x-robots-tag"]).toBe("noindex");
});
