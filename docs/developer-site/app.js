const root = document.documentElement;
const body = document.body;
const menuToggle = document.querySelector("[data-menu-toggle]");
const menuClosers = Array.from(document.querySelectorAll("[data-close-menu]"));
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
const copyButtons = Array.from(document.querySelectorAll("[data-copy-for]"));
const searchInput = document.querySelector("#docs-search");
const sections = Array.from(document.querySelectorAll("[data-search]"));
const navLinks = Array.from(document.querySelectorAll(".side-nav a, .right-rail a"));

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  root.dataset.theme = nextTheme;
  localStorage.setItem("borderpay-docs-theme", nextTheme);
  if (themeLabel) themeLabel.textContent = nextTheme === "dark" ? "Light" : "Dark";
}

const savedTheme = localStorage.getItem("borderpay-docs-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
setTheme(savedTheme || preferredTheme);

themeToggle?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

function setMenu(open) {
  body.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
}

menuToggle?.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
menuClosers.forEach((closer) => closer.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

function activateTab(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const panel = target.closest(".code-panel");
  const scope = panel || document;
  scope.querySelectorAll(".code-sample").forEach((sample) => {
    sample.classList.toggle("active", sample.id === id);
  });
  scope.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === id);
  });
  scope.querySelectorAll("[data-copy-for]").forEach((button) => {
    button.dataset.copyFor = id;
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyFor);
    const text = target?.innerText || "";
    if (!text) return;
    const previous = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
      button.classList.add("copied");
      window.setTimeout(() => {
        button.textContent = previous || "Copy";
        button.classList.remove("copied");
      }, 1200);
    } catch {
      button.textContent = "Select";
      window.setTimeout(() => {
        button.textContent = previous || "Copy";
      }, 1200);
    }
  });
});

searchInput?.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  sections.forEach((section) => {
    if (!query) {
      section.classList.remove("is-hidden");
      return;
    }
    const haystack = `${section.textContent || ""} ${section.dataset.search || ""}`.toLowerCase();
    section.classList.toggle("is-hidden", !haystack.includes(query));
  });
});

document.querySelectorAll(".side-nav a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const id = visible.target.id;
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    });
  },
  { rootMargin: "-22% 0px -64% 0px", threshold: [0.08, 0.2, 0.45] },
);

sections.forEach((section) => observer.observe(section));
