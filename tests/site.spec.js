import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const importantExternalUrls = {
  designs: "https://soltonigiri-designs.pages.dev/",
  designsEn: "https://soltonigiri-designs.pages.dev/en/",
  yomeiExe: "https://yomei-exe.pages.dev/",
  youtubeMarkdownArchiver: "https://github.com/soltonigiri/youtube-markdown-archiver",
  githubProfile: "https://github.com/soltonigiri",
  profileSite: "https://github.com/soltonigiri/profile-site",
  x: "https://x.com/solt_onigiri_",
  signal:
    "https://signal.me/#eu/By3IL7zBc_iEv25MBYRox2iEW_J4Pwv_kuYpf072hE4p0yc0oPFA-asgKM3MJxtX",
};

for (const route of ["/", "/en/"]) {
  test(`${route} is accessible without an empty Blog section`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#blog")).toHaveCount(0);
    await expect(page.locator('[data-nav] a[href="#blog"]')).toHaveCount(0);
    await expect(page.locator("#skills")).toHaveCount(0);
    await expect(page.locator('[data-nav] a[href="#skills"]')).toHaveCount(0);
    await expect(page.getByText("16 y/o", { exact: true })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("English route has independent metadata", async ({ page }) => {
  await page.goto("/en/");

  await expect(page).toHaveTitle("soltonigiri");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://soltonigiri.pages.dev/en/",
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(structuredData).url).toBe("https://soltonigiri.pages.dev/en/");
  await expect(page.getByRole("link", { name: /Available for freelance work/ })).toHaveAttribute(
    "href",
    "#contact",
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
    ).toHaveCount(3);
    await expect(page.locator(".svg-sprite")).toHaveCount(0);
    await expect(page.locator(".social-icon path")).toHaveCount(0);
  }
});

test("Projects, Contact, and footer keep the important external URLs", async ({ page }) => {
  for (const route of ["/", "/en/"]) {
    await page.goto(route);

    const projects = page.locator("#projects");
    const projectItems = projects.locator(".project-item");
    await expect(
      projects.locator(`a[href="${importantExternalUrls.youtubeMarkdownArchiver}"]`),
    ).toHaveCount(1);
    await expect(projects.locator(`a[href="${importantExternalUrls.yomeiExe}"]`)).toHaveCount(1);
    await expect(projectItems).toHaveCount(4);
    await expect(projectItems.nth(0)).toHaveAttribute("data-client-work", "");
    await expect(projectItems.nth(0)).toContainText(
      route === "/"
        ? "WordPressフォームのPDF出力とメール通知を自動化"
        : "Automated PDF output and email notifications from form submissions",
    );
    await expect(projectItems.nth(1)).toHaveAttribute("data-oss-contributions", "");
    await expect(projectItems.nth(2)).toHaveAttribute(
      "href",
      importantExternalUrls.youtubeMarkdownArchiver,
    );
    await expect(projectItems.nth(3)).toHaveAttribute("href", importantExternalUrls.yomeiExe);
    await expect(projectItems.nth(3)).toContainText(route === "/" ? "余命.exe" : "Yomei.exe");
    const contributionsLink = projects.locator(`a[href="${importantExternalUrls.githubProfile}"]`);
    await expect(contributionsLink).toHaveCount(1);
    await expect(contributionsLink).toContainText(
      route === "/" ? "外部OSSへの貢献" : "Open-source contributions",
    );
    await expect(contributionsLink).not.toContainText("activist · mcp-migrate · OpenClaw");

    const contact = page.locator("#contact");
    const xLink = contact.locator(`a[href="${importantExternalUrls.x}"]`);
    const signalLink = contact.locator(`a[href="${importantExternalUrls.signal}"]`);
    await expect(xLink).toHaveCount(1);
    await expect(signalLink).toHaveCount(1);
    await expect(xLink).toHaveAttribute("target", "_blank");
    await expect(xLink).toHaveAttribute("aria-label", "X");
    await expect(xLink).toHaveClass(/icon-only-link/);
    await expect(xLink).toHaveText("");
    await expect(signalLink).toHaveAttribute("target", "_blank");

    const siteSource = page.locator(`.site-footer a[href="${importantExternalUrls.profileSite}"]`);
    await expect(siteSource).toHaveCount(1);
    await expect(siteSource).toHaveText(
      route === "/" ? "このサイトのしくみ" : "How this site works",
    );
    await expect(siteSource).toHaveAttribute("target", "_blank");
    const footerLinks = page.locator(".site-footer .footer-links a");
    await expect(footerLinks).toHaveCount(3);
    await expect(footerLinks.nth(0)).toHaveAttribute(
      "href",
      route === "/" ? importantExternalUrls.designs : importantExternalUrls.designsEn,
    );
    await expect(footerLinks.nth(1)).toHaveAttribute("href", importantExternalUrls.profileSite);
    await expect(footerLinks.nth(2)).toHaveAttribute("href", "#profile");
  }
});

test("About copy lives in Profile and scroll navigation follows section order", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-nav] a[href="#about"]')).toHaveCount(0);
  await expect(page.locator("#about")).toHaveCount(0);
  await expect(page.locator("#profile .profile-about")).toContainText(
    "TypeScriptとPythonを使い、OSSへのコントリビュートやWebアプリ・CLIの開発をしています。",
  );
  await expect(page.getByRole("link", { name: /仕事のご依頼を受付中/ })).toHaveAttribute(
    "href",
    "#contact",
  );

  await expect(page.locator("#contact .contact-description")).toContainText(
    "開発のご依頼はXかSignalへ。",
  );

  for (const sectionId of ["profile", "projects", "contact"]) {
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
  await page.goto("/");

  const character = page.getByRole("button", { name: "おにぎりをつつく" });
  await character.focus();
  await page.keyboard.press("Enter");
  await expect(character).toHaveClass(/is-startled/);
  await expect(page.getByText("うわっ", { exact: true })).toHaveCount(0);
  await expect(character).not.toHaveClass(/is-startled/, { timeout: 1_500 });
});

test("selected client work shows delivery proof without publishing the contract price", async ({ page }) => {
  await page.goto("/");

  const clientWork = page.locator("[data-client-work]");
  await expect(clientWork).toContainText("WordPressフォームのPDF出力とメール通知を自動化");
  await expect(clientWork).toContainText(
    "フォームの入力4項目をPDFへ反映。実際のフォームで、メール通知とPDF出力を確認。",
  );
  await expect(clientWork).toContainText("Paid client work · ★ 5.0 / 5");
  await expect(clientWork).not.toContainText("申込者へのPDF案内と管理者通知までを自動化");
  await expect(clientWork).not.toContainText("Delivered");
  await expect(clientWork).not.toContainText("対応");
  await expect(clientWork).not.toContainText("結果");
  await expect(clientWork).not.toContainText("公開していません");
  await expect(clientWork).not.toContainText("未計測");
  await expect(clientWork).not.toContainText("12,000");
  await expect(clientWork.locator("a")).toHaveCount(0);
  await expect(clientWork.locator("details")).toHaveCount(0);

  await page.goto("/en/");
  const englishClientWork = page.locator("[data-client-work]");
  await expect(englishClientWork).toContainText(
    "Automated PDF output and email notifications from form submissions",
  );
  await expect(englishClientWork).toContainText(
    "Four form fields mapped to a PDF. Email notifications and PDF output tested through the live form.",
  );
  await expect(englishClientWork).toContainText("Paid client work · ★ 5.0 / 5");
  await expect(englishClientWork).not.toContainText("applicant access by email");
  await expect(englishClientWork).not.toContainText("Delivered");
  await expect(englishClientWork).not.toContainText("Implementation");
  await expect(englishClientWork).not.toContainText("Result");
  await expect(englishClientWork).not.toContainText("remain private");
  await expect(englishClientWork).not.toContainText("not measured");
  await expect(englishClientWork.locator("details")).toHaveCount(0);
});

test("unknown routes return the custom 404 with a 404 status", async ({ page }) => {
  const response = await page.goto("/definitely-not-a-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("mobile menu traps focus away from the page and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
