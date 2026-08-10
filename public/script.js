const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const navigationLinks = [...document.querySelectorAll("[data-nav] a")];
const languageToggle = document.querySelector(".language-toggle");
const menuBackgroundElements = [
  document.querySelector(".skip-link"),
  document.querySelector(".brand"),
  document.querySelector("main"),
  document.querySelector(".site-footer"),
].filter(Boolean);
const sections = [...document.querySelectorAll("[data-section]")];
const year = document.querySelector("[data-year]");
const profileCharacter = document.querySelector("[data-profile-character]");
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

let profileStartleTimer;

profileCharacter?.addEventListener("click", () => {
  window.clearTimeout(profileStartleTimer);
  profileCharacter.classList.remove("is-startled");
  void profileCharacter.offsetWidth;
  profileCharacter.classList.add("is-startled");

  profileStartleTimer = window.setTimeout(() => {
    profileCharacter.classList.remove("is-startled");
  }, 760);
});

if (year) {
  year.textContent = String(new Date().getFullYear());
}

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
  menuBackgroundElements.forEach((element) => {
    element.inert = shouldOpen;
  });
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
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    if (event.key === "Escape" && isOpen) {
      setMenuOpen(false, { restoreFocus: true });
      return;
    }

    if (event.key === "Tab" && isOpen) {
      const menuFocusables = [...navigationLinks, languageToggle, menuButton].filter(Boolean);
      const firstFocusable = menuFocusables[0];
      const lastFocusable = menuFocusables.at(-1);

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
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
