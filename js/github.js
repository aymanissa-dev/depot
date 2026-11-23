const USER = "damahrissa18-wq";
const CACHE_KEY = "da-github-cache-v1";
const TTL = 30 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.savedAt || Date.now() - data.savedAt > TTL) return null;
    return data;
  } catch (err) {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (err) {
    /* Storage may be blocked. */
  }
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function renderStats(user) {
  const root = document.getElementById("gh-stats");
  if (!root || !user) return;
  const items = [
    ["Public repos", user.public_repos],
    ["Followers", user.followers],
    ["Following", user.following],
  ].filter(([, value]) => Number.isFinite(value));
  root.replaceChildren();
  items.forEach(([label, value]) => {
    const item = document.createElement("div");
    const number = document.createElement("p");
    number.className = "gh-num";
    number.textContent = String(value);
    const name = document.createElement("p");
    name.className = "gh-label";
    name.textContent = label;
    item.append(number, name);
    root.append(item);
  });
  root.hidden = items.length === 0;
}

function renderRepos(repos) {
  const list = document.getElementById("repo-list");
  const fallback = document.getElementById("repo-fallback");
  if (!list) return;
  list.replaceChildren();
  list.removeAttribute("aria-busy");
  if (!repos?.length) {
    if (fallback) fallback.hidden = false;
    return;
  }
  if (fallback) fallback.hidden = true;
  repos.forEach((repo) => {
    const item = document.createElement("li");
    item.className = "repo-card";
    const link = document.createElement("a");
    link.href = repo.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const name = document.createElement("span");
    name.className = "repo-name";
    name.textContent = repo.name;
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = " (opens in a new tab)";
    link.append(name, sr);
    item.append(link);
    if (repo.description) {
      const copy = document.createElement("p");
      copy.className = "repo-desc";
      copy.textContent = repo.description;
      item.append(copy);
    }
    const meta = document.createElement("p");
    meta.className = "repo-meta";
    const bits = [];
    if (repo.fork) bits.push("Fork");
    if (repo.language) bits.push(repo.language);
    bits.push(`${repo.stars} ${repo.stars === 1 ? "star" : "stars"}`);
    if (repo.updated) bits.push(`Updated ${formatDate(repo.updated)}`);
    meta.textContent = bits.join(" · ");
    item.append(meta);
    list.append(item);
  });
}

function renderHeat(heat) {
  const grid = document.getElementById("heat-grid");
  const summary = document.getElementById("heat-summary");
  const fallback = document.getElementById("heat-fallback");
  if (!grid || !heat?.contributions?.length) {
    if (fallback) fallback.hidden = false;
    return;
  }
  const days = heat.contributions;
  const first = new Date(`${days[0].date}T00:00:00`);
  const pad = Number.isNaN(first.getTime()) ? 0 : first.getDay();
  grid.replaceChildren();
  for (let i = 0; i < pad; i += 1) {
    const empty = document.createElement("span");
    empty.className = "heat-cell is-empty";
    grid.append(empty);
  }
  days.forEach((day) => {
    const cell = document.createElement("span");
    const level = Math.max(0, Math.min(4, Number(day.level) || 0));
    cell.className = `heat-cell lv-${level}`;
    const count = Number(day.count) || 0;
    cell.title = `${day.date}: ${count} ${count === 1 ? "contribution" : "contributions"}`;
    grid.append(cell);
  });
  const totals = heat.total && typeof heat.total === "object" ? Object.entries(heat.total) : [];
  if (summary) {
    summary.textContent = totals.length
      ? totals.map(([year, count]) => `${count} contributions in ${year}`).join(". ") + "."
      : "Contribution graph loaded.";
  }
  if (fallback) fallback.hidden = true;
}

function showFallback() {
  const list = document.getElementById("repo-list");
  if (list) {
    list.replaceChildren();
    list.removeAttribute("aria-busy");
  }
  const repos = document.getElementById("repo-fallback");
  const heat = document.getElementById("heat-fallback");
  if (repos) repos.hidden = false;
  if (heat) heat.hidden = false;
}

async function fetchLive() {
  const [userRes, repoRes, heatRes] = await Promise.all([
    fetch(`https://api.github.com/users/${USER}`),
    fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`),
    fetch(`https://github-contributions-api.jogruber.de/v4/${USER}`),
  ]);
  if (!userRes.ok || !repoRes.ok) throw new Error("github");
  const userJson = await userRes.json();
  const repoJson = await repoRes.json();
  if (!Array.isArray(repoJson)) throw new Error("repos");
  const user = {
    public_repos: userJson.public_repos,
    followers: userJson.followers,
    following: userJson.following,
  };
  const repos = repoJson.filter((repo) => repo && repo.private !== true).map((repo) => ({
    name: repo.name,
    description: repo.description || "",
    language: repo.language || "",
    stars: repo.stargazers_count || 0,
    updated: repo.updated_at || "",
    url: repo.html_url,
    fork: Boolean(repo.fork),
  }));
  let heat = null;
  if (heatRes.ok) {
    const heatJson = await heatRes.json();
    if (Array.isArray(heatJson?.contributions)) heat = { total: heatJson.total || {}, contributions: heatJson.contributions };
  }
  return { user, repos, heat };
}

export function initGithub() {
  const section = document.getElementById("github");
  if (!section) return;
  const paint = (data) => {
    renderStats(data.user);
    renderRepos(data.repos);
    if (data.heat) renderHeat(data.heat);
    else {
      const fallback = document.getElementById("heat-fallback");
      if (fallback) fallback.hidden = false;
    }
  };
  const cached = readCache();
  if (cached) paint(cached);
  const load = async () => {
    try {
      const live = await fetchLive();
      writeCache(live);
      paint(live);
    } catch (err) {
      if (!cached) showFallback();
    }
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "280px" });
    observer.observe(section);
  } else load();
}
