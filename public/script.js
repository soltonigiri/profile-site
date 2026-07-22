const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const navigationLinks = [...document.querySelectorAll("[data-nav] a")];
const sections = [...document.querySelectorAll("[data-section]")];
const year = document.querySelector("[data-year]");
const blogList = document.querySelector("[data-blog-list]");
const profileImage = document.querySelector("[data-profile-image]");
const profileSource = document.querySelector("[data-profile-source]");
const currentLanguage = document.documentElement.lang === "en" ? "en" : "ja";

const profileImages = {
  awake: {
    avif: "/assets/immutable/profile-onigiri-awake.304.v1.avif",
    webp: "/assets/immutable/profile-onigiri-awake.304.v1.webp",
    alt: {
      ja: "目を開けたおにぎり",
      en: "An onigiri with its eyes open",
    },
  },
  half: {
    avif: "/assets/immutable/profile-onigiri-half.304.v1.avif",
    webp: "/assets/immutable/profile-onigiri-half.304.v1.webp",
    alt: {
      ja: "半分目を開けたおにぎり",
      en: "A half-awake onigiri",
    },
  },
  sleep: {
    avif: "/assets/immutable/profile-onigiri-sleep.304.v1.avif",
    webp: "/assets/immutable/profile-onigiri-sleep.304.v1.webp",
    alt: {
      ja: "眠っているおにぎり",
      en: "A sleeping onigiri",
    },
  },
};

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

  if (profileSource?.getAttribute("srcset") !== image.avif) {
    profileSource?.setAttribute("srcset", image.avif);
  }
  if (!profileImage.src.endsWith(image.webp)) {
    profileImage.src = image.webp;
  }
  profileImage.alt = image.alt[currentLanguage];
}

updateProfileImage();
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

function setBlogStatus(message) {
  const status = blogList?.querySelector("[data-blog-status]");
  if (status) status.textContent = message;
}

async function loadBlogPosts() {
  if (!blogList) return;

  try {
    const response = await fetch("/api/blog", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Blog API returned ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.posts) || data.posts.length === 0) {
      setBlogStatus(blogList.dataset.emptyMessage ?? "No public posts yet.");
      return;
    }

    const fragment = document.createDocumentFragment();
    data.posts.forEach((post) => fragment.append(createBlogItem(post)));
    blogList.replaceChildren(fragment);
  } catch {
    setBlogStatus(blogList.dataset.errorMessage ?? "Posts are temporarily unavailable.");
  }
}

loadBlogPosts();

function isMobileNavigation() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function updateMenuLabel(isOpen) {
  if (!menuButton) return;
  const label = isOpen ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel;
  if (label) menuButton.setAttribute("aria-label", label);
}

function setMenuOpen(isOpen, { restoreFocus = false } = {}) {
  if (!menuButton || !navigation) return;

  const shouldOpen = isMobileNavigation() && isOpen;
  menuButton.setAttribute("aria-expanded", String(shouldOpen));
  navigation.dataset.open = String(shouldOpen);
  navigation.inert = isMobileNavigation() && !shouldOpen;
  document.body.classList.toggle("menu-open", shouldOpen);
  updateMenuLabel(shouldOpen);

  if (shouldOpen) {
    navigationLinks[0]?.focus();
  } else if (restoreFocus) {
    menuButton.focus();
  }
}

if (menuButton && navigation) {
  setMenuOpen(false);

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuOpen(!isOpen, { restoreFocus: isOpen });
  });

  navigationLinks.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false, { restoreFocus: true });
    }
  });

  window.addEventListener("resize", () => setMenuOpen(false));
}

let navigationFrame = 0;

function updateActiveNavigation() {
  navigationFrame = 0;
  if (sections.length === 0 || navigationLinks.length === 0) return;

  const headerHeight = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
  ) || 0;
  const activationPoint = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.25, 180);
  const isAtPageEnd =
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let activeSection = sections[0];

  for (const section of sections) {
    if (section.offsetTop > activationPoint) break;
    activeSection = section;
  }

  if (isAtPageEnd) activeSection = sections.at(-1);

  navigationLinks.forEach((link) => {
    const isCurrent = link.getAttribute("href") === `#${activeSection.id}`;

    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function requestNavigationUpdate() {
  if (navigationFrame) return;
  navigationFrame = window.requestAnimationFrame(updateActiveNavigation);
}

window.addEventListener("scroll", requestNavigationUpdate, { passive: true });
window.addEventListener("resize", requestNavigationUpdate);
window.addEventListener("load", requestNavigationUpdate);
updateActiveNavigation();

if ("ResizeObserver" in window) {
  const layoutObserver = new ResizeObserver(requestNavigationUpdate);
  const main = document.querySelector("main");
  if (main) layoutObserver.observe(main);
}
