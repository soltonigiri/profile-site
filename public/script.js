const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const navigationLinks = [...document.querySelectorAll("[data-nav] a")];
const sections = [...document.querySelectorAll("[data-section]")];
const languageToggle = document.querySelector("[data-language-toggle]");
const languageOptions = [...document.querySelectorAll("[data-language-option]")];
const year = document.querySelector("[data-year]");
const blogList = document.querySelector("[data-blog-list]");
const profileImage = document.querySelector("[data-profile-image]");

const LANGUAGE_STORAGE_KEY = "soltonigiri-language";

const translations = {
  ja: {
    "meta.description": "soltonigiriのプロフィールと公開プロジェクトを紹介するポートフォリオサイト。",
    "skip.content": "本文へ移動",
    "nav.home": "ページ上部へ戻る",
    "nav.main": "メインナビゲーション",
    "menu.open": "メニューを開く",
    "menu.close": "メニューを閉じる",
    "language.switchToJa": "日本語に切り替える",
    "language.switchToEn": "英語に切り替える",
    "profile.meta": "プロフィール情報",
    "profile.links": "外部リンク",
    "profile.image.awake": "目を開けたおにぎり",
    "profile.image.half": "半分目を開けたおにぎり",
    "profile.image.sleep": "眠っているおにぎり",
    "about.copy":
      "AIと個人開発が好きなソフトウェアエンジニア。現在は個人でソフトウェア開発の仕事を<span class=\"no-wrap\">請け負いながら</span>、<br>AIエージェントやローカルLLM、個人開発に取り組んでいます。",
    "projects.youtube":
      "YouTubeのメタデータ、字幕、ASR、OCRを統合し、検索可能なMarkdownアーカイブとして保存するローカルCLI。",
    "projects.scp":
      "SCP Data APIを一次ソースとして、SCP Wiki由来のページを検索・取得・引用できるMCPサーバー。",
    "blog.empty": "公開記事はまだありません。",
    "contact.copy": "連絡はこちらから。",
    "footer.back": "ページ上部へ ↑",
  },
  en: {
    "meta.description": "The portfolio of soltonigiri, a software engineer based in Tokyo.",
    "skip.content": "Skip to content",
    "nav.home": "Back to the top",
    "nav.main": "Main navigation",
    "menu.open": "Open menu",
    "menu.close": "Close menu",
    "language.switchToJa": "Switch to Japanese",
    "language.switchToEn": "Switch to English",
    "profile.meta": "Profile details",
    "profile.links": "External links",
    "profile.image.awake": "An onigiri with its eyes open",
    "profile.image.half": "A half-awake onigiri",
    "profile.image.sleep": "A sleeping onigiri",
    "about.copy":
      "A software engineer who enjoys AI and indie development.<br>I currently work independently on software projects while exploring AI agents, local LLMs, and indie development.",
    "projects.youtube":
      "A local CLI that combines YouTube metadata, subtitles, ASR, and OCR into searchable Markdown archives.",
    "projects.scp":
      "An MCP server that uses the SCP Data API as its primary source to search, retrieve, and cite pages originating from the SCP Wiki.",
    "blog.empty": "No public posts yet.",
    "contact.copy": "Get in touch.",
    "footer.back": "Back to top ↑",
  },
};

const profileImages = {
  awake: {
    src: "./assets/profile-onigiri-awake.png",
    altKey: "profile.image.awake",
  },
  half: {
    src: "./assets/profile-onigiri-half.png",
    altKey: "profile.image.half",
  },
  sleep: {
    src: "./assets/profile-onigiri-sleep.png",
    altKey: "profile.image.sleep",
  },
};

let currentLanguage = "ja";
let languageWasManuallySelected = false;
let loadedBlogPosts = null;

function translate(key) {
  return translations[currentLanguage][key] ?? translations.ja[key] ?? key;
}

function readStoredLanguage() {
  try {
    const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return language === "ja" || language === "en" ? language : null;
  } catch {
    return null;
  }
}

function storeLanguage(language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Some file:// and privacy-restricted contexts do not expose localStorage.
  }
}

function getLocalFallbackLanguage() {
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const usesJapanese = browserLanguages.some((language) => language?.toLowerCase().startsWith("ja"));

  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Browser language remains available as the fallback.
  }

  return usesJapanese || timeZone === "Asia/Tokyo" ? "ja" : "en";
}

function updateMenuLabel() {
  if (!menuButton) return;
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-label", translate(isOpen ? "menu.close" : "menu.open"));
}

function renderBlogPosts() {
  if (!blogList || !Array.isArray(loadedBlogPosts) || loadedBlogPosts.length === 0) return;

  const fragment = document.createDocumentFragment();
  loadedBlogPosts.forEach((post) => fragment.append(createBlogItem(post)));
  blogList.replaceChildren(fragment);
}

function applyLanguage(language) {
  currentLanguage = language === "en" ? "en" : "ja";
  document.documentElement.lang = currentLanguage;
  document.documentElement.dataset.currentLanguage = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = translate(element.dataset.i18nHtml);
  });

  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    element.setAttribute("content", translate(element.dataset.i18nContent));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  });

  languageOptions.forEach((option) => {
    option.classList.toggle("is-active", option.dataset.languageOption === currentLanguage);
  });

  languageToggle?.setAttribute(
    "aria-label",
    translate(currentLanguage === "ja" ? "language.switchToEn" : "language.switchToJa"),
  );

  updateMenuLabel();
  updateProfileImage();
  renderBlogPosts();
}

async function initializeLanguage() {
  const storedLanguage = readStoredLanguage();

  if (storedLanguage) {
    languageWasManuallySelected = true;
    applyLanguage(storedLanguage);
    return;
  }

  applyLanguage(getLocalFallbackLanguage());

  if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

  try {
    const response = await fetch("/api/locale", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;

    const data = await response.json();
    if (!languageWasManuallySelected && (data.language === "ja" || data.language === "en")) {
      applyLanguage(data.language);
    }
  } catch {
    // Browser language and timezone remain the fallback when the API is unavailable.
  }
}

function getJapanHour() {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "hour");

  return Number(hourPart?.value ?? 0);
}

function updateProfileImage() {
  if (!profileImage) return;

  const hour = getJapanHour();
  const state = hour >= 7 && hour <= 21 ? "awake" : hour === 6 || hour === 22 ? "half" : "sleep";
  const image = profileImages[state];

  if (!profileImage.src.endsWith(image.src.slice(1))) {
    profileImage.src = image.src;
  }
  profileImage.alt = translate(image.altKey);
}

Object.values(profileImages).forEach(({ src }) => {
  const image = new Image();
  image.src = src;
});

languageToggle?.addEventListener("click", () => {
  const language = currentLanguage === "ja" ? "en" : "ja";
  languageWasManuallySelected = true;
  storeLanguage(language);
  applyLanguage(language);
});

initializeLanguage();
window.setInterval(updateProfileImage, 60_000);
document.addEventListener("visibilitychange", updateProfileImage);

if (year) {
  year.textContent = String(new Date().getFullYear());
}

function createBlogItem(post) {
  const link = document.createElement("a");
  const main = document.createElement("span");
  const title = document.createElement("span");
  const meta = document.createElement("span");
  const action = document.createElement("span");
  const arrow = document.createElement("span");
  const destination = document.createElement("span");
  const publishedAt = new Date(post.publishedAt);
  const formattedDate = Number.isNaN(publishedAt.getTime())
    ? ""
    : new Intl.DateTimeFormat(currentLanguage === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: currentLanguage === "ja" ? "numeric" : "short",
        day: "numeric",
      }).format(publishedAt);

  link.className = "blog-item";
  link.href = post.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  main.className = "blog-main";
  title.className = "blog-title";
  title.textContent = post.title;
  meta.className = "blog-meta";
  meta.textContent = formattedDate ? `${formattedDate} · sizu.me` : "sizu.me";

  action.className = "blog-action";
  arrow.textContent = "↗";
  arrow.setAttribute("aria-hidden", "true");
  destination.textContent = "Sizu.me";

  main.append(title, meta);
  action.append(arrow, destination);
  link.append(main, action);

  return link;
}

async function loadBlogPosts() {
  if (!blogList) return;

  try {
    const response = await fetch("/api/blog", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return;

    const data = await response.json();

    if (!Array.isArray(data.posts) || data.posts.length === 0) return;

    loadedBlogPosts = data.posts;
    renderBlogPosts();
  } catch {
    // The localized static fallback remains visible when the feed cannot be reached.
  }
}

loadBlogPosts();

function closeMenu() {
  if (!menuButton || !navigation) return;

  menuButton.setAttribute("aria-expanded", "false");
  navigation.dataset.open = "false";
  document.body.style.overflow = "";
  updateMenuLabel();
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    menuButton.setAttribute("aria-expanded", String(!isOpen));
    navigation.dataset.open = String(!isOpen);
    document.body.style.overflow = isOpen ? "" : "hidden";
    updateMenuLabel();
  });

  navigationLinks.forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visibleSection) return;

      navigationLinks.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${visibleSection.target.id}`;

        if (isCurrent) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    {
      rootMargin: "-30% 0px -55%",
      threshold: [0, 0.25, 0.5],
    },
  );

  sections.forEach((section) => observer.observe(section));
}
