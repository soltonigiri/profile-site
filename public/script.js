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

const japanHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  hourCycle: "h23",
});
let currentProfileState;
let profileImageTimer;

function updateProfileImage() {
  if (!profileImage) return;

  const hour = Number(japanHourFormatter.format(new Date()));
  const state = hour >= 7 && hour <= 21 ? "awake" : hour === 6 || hour === 22 ? "half" : "sleep";
  if (state === currentProfileState) return;
  currentProfileState = state;
  const image = profileImages[state];

  if (profileSource?.getAttribute("srcset") !== image.avif) {
    profileSource?.setAttribute("srcset", image.avif);
  }
  if (!profileImage.src.endsWith(image.webp)) {
    profileImage.src = image.webp;
  }
  profileImage.alt = image.alt[currentLanguage];
}

function scheduleProfileImage() {
  window.clearTimeout(profileImageTimer);
  if (document.hidden) return;

  updateProfileImage();
  // Japan uses whole-hour UTC offsets; check at the next hour boundary.
  const hourMs = 3_600_000;
  profileImageTimer = window.setTimeout(scheduleProfileImage, hourMs - (Date.now() % hourMs));
}

if (profileImage) {
  if (document.hidden) updateProfileImage();
  else scheduleProfileImage();
  document.addEventListener("visibilitychange", scheduleProfileImage);
}

let profileStartleTimer;

profileCharacter?.addEventListener("click", () => {
  window.clearTimeout(profileStartleTimer);
  profileCharacter.classList.remove("is-startled");
  // Restart the CSS animation even when a second click arrives mid-animation.
  void profileCharacter.offsetWidth;
  profileCharacter.classList.add("is-startled");

  profileStartleTimer = window.setTimeout(() => {
    profileCharacter.classList.remove("is-startled");
  }, 760);
});

if (year) {
  year.textContent = String(new Date().getFullYear());
}
