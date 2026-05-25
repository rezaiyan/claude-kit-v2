/**
 * HTML templates for plan types.
 * All output is self-contained: inline CSS + vanilla JS, no external deps.
 */

const TYPE_CONFIG = {
  feature: { color: "#3b82f6", badge: "Feature", accent: "#3b82f6" },
  bug: { color: "#ef4444", badge: "Bug Investigation", accent: "#ef4444" },
  architecture: { color: "#8b5cf6", badge: "Architecture", accent: "#8b5cf6" },
  migration: { color: "#f97316", badge: "Migration", accent: "#f97316" },
  research: { color: "#14b8a6", badge: "Research", accent: "#14b8a6" },
};

/**
 * Wrap H2 sections in .section-card divs with accent border.
 * Content between H2 tags becomes the card body.
 */
function wrapSections(html, accentColor) {
  const parts = html.split(/(<h2>[\s\S]*?<\/h2>)/);
  let result = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("<h2>")) {
      const h2 = part.replace(
        "<h2>",
        `<h2 style="border-left-color:${accentColor}">`,
      );
      const content =
        parts[i + 1] && !parts[i + 1].startsWith("<h2>") ? parts[++i] : "";
      result += `<div class="section-card">${h2}<div class="section-content">${content}</div></div>\n`;
    } else {
      result += part;
    }
  }
  return result;
}

const BASE_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
a { color: inherit; text-decoration: none; }

.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

.sidebar { background: #0f172a; padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.sidebar-title { color: #94a3b8; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 0.75rem; margin-bottom: 0.75rem; }
.sidebar-link { display: block; color: #94a3b8; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.82rem; margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background 0.1s; }
.sidebar-link:hover { background: #1e293b; color: #e2e8f0; }
.sidebar-link.active { background: #1e293b; color: #f1f5f9; font-weight: 600; }
.sidebar-index { display: block; color: #64748b; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
.sidebar-index:hover { color: #94a3b8; }

.main { padding: 2.5rem 3rem; max-width: 920px; }

.plan-header { margin-bottom: 2rem; }
.plan-header-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; color: white; letter-spacing: 0.04em; text-transform: uppercase; }
.plan-date { font-size: 0.8rem; color: #64748b; margin-left: auto; }
.plan-title { font-size: 1.9rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem; }
.plan-meta { font-size: 0.78rem; color: #64748b; }
.plan-meta span { margin-right: 1.25rem; }

.section-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.section-card h2 { font-size: 1rem; font-weight: 700; color: #0f172a; padding: 0.9rem 1.25rem; border-left: 4px solid #64748b; cursor: pointer; user-select: none; display: flex; justify-content: space-between; align-items: center; }
.section-card h2::after { content: '▾'; font-size: 0.8rem; color: #94a3b8; transition: transform 0.15s; }
.section-card h2.collapsed::after { transform: rotate(-90deg); }
.section-content { padding: 1.25rem 1.5rem; border-top: 1px solid #f1f5f9; }
.section-content > *:last-child { margin-bottom: 0; }

h3 { font-size: 0.95rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; margin-top: 1rem; }
h4 { font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.35rem; margin-top: 0.75rem; }
p { color: #374151; margin-bottom: 0.75rem; font-size: 0.9rem; }
strong { color: #1e293b; }

ul { padding-left: 1.4rem; margin-bottom: 0.75rem; }
li { margin-bottom: 0.3rem; font-size: 0.9rem; color: #374151; line-height: 1.55; }

ul.checklist { list-style: none; padding-left: 0; }
ul.checklist li { display: flex; align-items: flex-start; gap: 0.5rem; }
input[type=checkbox] { margin-top: 0.2rem; flex-shrink: 0; width: 15px; height: 15px; cursor: pointer; }
input[type=checkbox]:checked + * { text-decoration: line-through; color: #94a3b8; }

pre { background: #0f172a; color: #e2e8f0; padding: 1rem 1.25rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; margin-bottom: 0.75rem; }
code { font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace; }
pre code { font-size: 0.82rem; }
p code, li code { background: #f1f5f9; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.83em; color: #0f172a; }

@media print {
  .sidebar { display: none; }
  .layout { grid-template-columns: 1fr; }
  .section-card { box-shadow: none; break-inside: avoid; }
}
`;

const BASE_JS = `
document.querySelectorAll('.section-card h2').forEach(h2 => {
  h2.addEventListener('click', () => {
    const content = h2.nextElementSibling;
    const collapsed = content.style.display === 'none';
    content.style.display = collapsed ? '' : 'none';
    h2.classList.toggle('collapsed', !collapsed);
  });
});

const STORAGE_KEY = 'plan-checks::' + location.pathname;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  document.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
    if (saved[i] !== undefined) cb.checked = saved[i];
    cb.addEventListener('change', () => {
      const state = {};
      document.querySelectorAll('input[type="checkbox"]').forEach((c, j) => { state[j] = c.checked; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  });
} catch (_) { /* localStorage unavailable */ }
`;

/**
 * Render a full plan HTML page.
 *
 * @param {object} opts
 * @param {string} opts.planType - feature | bug | architecture | migration | research
 * @param {string} opts.title
 * @param {string} opts.date - YYYY-MM-DD
 * @param {string} opts.project
 * @param {string} opts.cwd
 * @param {string} opts.bodyHtml - converted markdown HTML
 * @param {Array<{name:string, href:string, active:boolean}>} opts.otherPlans
 * @returns {string} complete HTML document
 */
export function renderPlan({
  planType,
  title,
  date,
  project,
  cwd,
  bodyHtml,
  otherPlans = [],
}) {
  const cfg = TYPE_CONFIG[planType] ?? TYPE_CONFIG.feature;
  const wrapped = wrapSections(bodyHtml, cfg.accent);

  const sidebarLinks = otherPlans
    .map(
      (p) =>
        `<a href="${p.href}" class="sidebar-link${p.active ? " active" : ""}">${p.name}</a>`,
    )
    .join("\n    ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Plan</title>
  <style>${BASE_CSS}</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-title">Plans</div>
    <a href="index.html" class="sidebar-index">← All plans</a>
    ${sidebarLinks}
  </nav>
  <main class="main">
    <div class="plan-header">
      <div class="plan-header-top">
        <span class="badge" style="background:${cfg.color}">${cfg.badge}</span>
        <span class="plan-date">${date}</span>
      </div>
      <h1 class="plan-title">${title}</h1>
      <div class="plan-meta">
        <span>📁 ${project}</span>
        <span title="${cwd}">${cwd}</span>
      </div>
    </div>
    ${wrapped}
  </main>
</div>
<script>${BASE_JS}</script>
</body>
</html>`;
}

/**
 * Render the plans index page.
 *
 * @param {object} opts
 * @param {Array<{name:string, href:string}>} opts.plans
 * @param {string} opts.project
 * @param {string} opts.cwd
 * @returns {string} complete HTML document
 */
export function renderIndex({ plans, project, cwd }) {
  const items = plans.length
    ? plans
        .map((p) => `<li><a href="${p.href}">${p.name}</a></li>`)
        .join("\n      ")
    : "<li>No plans yet.</li>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project} — Plans</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; padding: 3rem; }
    h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }
    .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 2rem; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 0.5rem; }
    a { color: #3b82f6; font-size: 0.95rem; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${project} — Plans</h1>
  <div class="meta">${cwd}</div>
  <ul>
      ${items}
  </ul>
</body>
</html>`;
}
