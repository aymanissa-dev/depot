import { initGithub } from "./github.js";

const reduce = document.documentElement.classList.contains("reduce");
const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const narrow = () => window.matchMedia("(max-width: 860px)").matches;
const forced = window.matchMedia("(forced-colors: active)").matches;

const nameLine = document.getElementById("name-line");
const portraitTilt = document.getElementById("portrait-tilt");
const heroStage = document.getElementById("hero-stage");
const scrollCue = document.querySelector(".scroll-cue");
const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
let progress = 0;
let scene = null;
let heroVisible = true;
let hidden = false;
let frame = 0;

function loop(time) {
  if (hidden || !heroVisible) {
    frame = 0;
    return;
  }
  frame = requestAnimationFrame(loop);
  pointer.sx += (pointer.x - pointer.sx) * 0.08;
  pointer.sy += (pointer.y - pointer.sy) * 0.08;
  if (!reduce && nameLine && portraitTilt && heroStage) {
    nameLine.style.transform = `translate3d(${(pointer.sx * 8).toFixed(1)}px, ${(pointer.sy * 4).toFixed(1)}px, 0)`;
    const idle = Math.sin(time * 0.00055) * 3;
    portraitTilt.style.transform = `translate3d(${(pointer.sx * -12).toFixed(1)}px, ${(pointer.sy * -6 + idle - progress * 36).toFixed(1)}px, 0)`;
    heroStage.style.opacity = (1 - progress * 0.45).toFixed(3);
    if (scrollCue) scrollCue.style.opacity = (1 - Math.min(1, progress * 2.5)).toFixed(3);
  }
  scene?.setPointer(pointer.sx, pointer.sy);
  scene?.setProgress(progress);
  scene?.render(time);
}
function wake() {
  if (!frame && heroVisible && !hidden) frame = requestAnimationFrame(loop);
}

const hero = document.querySelector(".hero");
if (hero && "IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    wake();
  }).observe(hero);
}
document.addEventListener("visibilitychange", () => {
  hidden = document.hidden;
  wake();
});
if (!reduce && fine) {
  window.addEventListener("pointermove", (event) => {
    pointer.x = Math.max(-1, Math.min(1, (event.clientX / innerWidth - 0.5) * 2));
    pointer.y = Math.max(-1, Math.min(1, (event.clientY / innerHeight - 0.5) * 2));
  });
}

function initHeader() {
  const header = document.getElementById("header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    if (open) nav.querySelector("a")?.focus();
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function initCursor() {
  if (!fine || reduce || forced) return;
  const cursor = document.getElementById("cursor");
  const dot = cursor.querySelector(".cursor-dot");
  const ring = cursor.querySelector(".cursor-ring");
  let x = 0; let y = 0; let rx = 0; let ry = 0;
  window.addEventListener("pointermove", (event) => {
    x = event.clientX; y = event.clientY;
    document.documentElement.dataset.cursor = "on";
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Tab") delete document.documentElement.dataset.cursor;
  });
  const paint = () => {
    if (document.documentElement.dataset.cursor === "on") {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    }
    requestAnimationFrame(paint);
  };
  paint();
  document.querySelectorAll("a, button, .soon-card").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hot"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hot"));
  });
}

function initCards() {
  if (!fine || reduce) return;
  document.querySelectorAll(".soon-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
  document.querySelectorAll("[data-tilt]").forEach((grid) => {
    grid.addEventListener("pointermove", (event) => {
      const rect = grid.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      grid.style.transform = `rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
    });
    grid.addEventListener("pointerleave", () => { grid.style.transform = ""; });
  });
}

function initTabs() {
  const root = document.getElementById("toolkit-stage");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const labels = {
    "tab-demonstrated": "Built into StudentsSoko",
    "tab-learning": "MERN focus",
    "tab-listed": "In toolkit",
    "tab-domain": "By domain",
  };
  const status = document.getElementById("tool-status");
  const select = (tab) => {
    tabs.forEach((item) => {
      const on = item === tab;
      item.setAttribute("aria-selected", on ? "true" : "false");
      item.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(item.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (status) status.textContent = labels[tab.id] || "";
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      tabs[next].focus();
      select(tabs[next]);
    });
  });
  const current = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
  if (current) select(current);
  root.querySelectorAll(".tiles button").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".tiles")?.querySelectorAll("button").forEach((item) => item.classList.remove("is-on"));
      button.classList.add("is-on");
      button.setAttribute("aria-pressed", "true");
      if (status) status.textContent = `${button.dataset.name} — ${button.dataset.group}`;
    });
  });
}

function initReveals() {
  const nodes = document.querySelectorAll(".block");
  if (reduce || !("IntersectionObserver" in window)) return;
  nodes.forEach((node) => node.classList.add("reveal"));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  nodes.forEach((node) => observer.observe(node));
}

function initSpy() {
  const links = [...document.querySelectorAll(".nav-list a")];
  const map = new Map();
  links.forEach((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    if (!map.has(target)) map.set(target, []);
    map.get(target).push(link);
  });
  if (!map.size || !("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.removeAttribute("aria-current"));
      map.get(entry.target)?.forEach((link) => link.setAttribute("aria-current", "true"));
    });
  }, { rootMargin: "-40% 0px -50% 0px" });
  map.forEach((_, el) => observer.observe(el));
}

async function bootScene() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas || reduce || navigator.connection?.saveData) {
    canvas?.remove();
    document.documentElement.classList.add("no-webgl");
    return;
  }
  try {
    const { createHeroScene } = await import("./hero-scene.js");
    scene = createHeroScene(canvas, { lite: narrow() });
    if (!scene) {
      canvas.remove();
      document.documentElement.classList.add("no-webgl");
    } else scene.resize();
  } catch (err) {
    canvas.remove();
    document.documentElement.classList.add("no-webgl");
  }
}

function initScrollProgress() {
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => { progress = self.progress; },
  });
}

function initTrail() {
  if (!fine || reduce) return;
  let last = 0;
  window.addEventListener("pointermove", (event) => {
    const now = performance.now();
    if (now - last < 48) return;
    last = now;
    const petal = document.createElement("span");
    petal.className = "trail-petal";
    petal.setAttribute("aria-hidden", "true");
    petal.style.left = `${event.clientX}px`;
    petal.style.top = `${event.clientY}px`;
    document.body.append(petal);
    window.setTimeout(() => petal.remove(), 720);
  });
}

document.getElementById("print-cv")?.addEventListener("click", () => window.print());
initTrail();
initHeader();
initCursor();
initCards();
initTabs();
initReveals();
initSpy();
initGithub();
wake();
window.addEventListener("load", () => {
  bootScene();
  initScrollProgress();
});
window.addEventListener("resize", () => scene?.resize());
