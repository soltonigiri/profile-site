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
});

test("unknown routes return the custom 404 with a 404 status", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("mobile menu is inert while closed and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBlogApi(page);
  await page.goto("/");

  const menu = page.locator("[data-nav]");
  const button = page.locator("[data-menu-button]");
  await expect(menu).toHaveAttribute("inert", "");

  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(menu).not.toHaveAttribute("inert", "");

  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("static and API responses carry the expected security and cache headers", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("default-src 'self'");

  const immutableAsset = await request.get("/assets/immutable/profile-onigiri-awake.304.v1.webp");
  expect(immutableAsset.headers()["cache-control"]).toContain("immutable");

  const blog = await request.get("/api/blog");
  expect([200, 502]).toContain(blog.status());
  expect(blog.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
  expect(blog.headers()["x-robots-tag"]).toBe("noindex");
});
