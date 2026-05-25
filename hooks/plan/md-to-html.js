/**
 * Markdown → HTML converter — no external dependencies.
 * Handles: headings, bullets, checkboxes, code blocks, inline formatting.
 */

/**
 * Convert inline markdown (bold, italic, inline code, HTML escape).
 * HTML escaping runs first so the formatting patterns don't clash.
 */
function inline(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

/**
 * Convert markdown string to HTML string.
 * Strips <!-- plan-type: ... --> comments before processing.
 *
 * @param {string} markdown
 * @returns {string} html
 */
export function mdToHtml(markdown) {
  // Strip HTML comments (e.g. <!-- plan-type: feature -->)
  const cleaned = markdown.replace(/<!--[\s\S]*?-->\n?/g, "");

  const lines = cleaned.split("\n");
  let html = "";
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = "";
  let inList = false;
  let listClass = "";

  const flushList = () => {
    if (inList) {
      html += `</ul>\n`;
      inList = false;
      listClass = "";
    }
  };

  for (const line of lines) {
    // ── Fenced code block ────────────────────────────────────────────────────
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeLang = line.slice(3).trim() || "text";
        codeLines = [];
      } else {
        inCodeBlock = false;
        const escaped = codeLines
          .join("\n")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        html += `<pre><code class="language-${codeLang}">${escaped}</code></pre>\n`;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // ── Headings ─────────────────────────────────────────────────────────────
    let m;
    if ((m = line.match(/^#### (.+)/))) {
      flushList();
      html += `<h4>${inline(m[1])}</h4>\n`;
      continue;
    }
    if ((m = line.match(/^### (.+)/))) {
      flushList();
      html += `<h3>${inline(m[1])}</h3>\n`;
      continue;
    }
    if ((m = line.match(/^## (.+)/))) {
      flushList();
      html += `<h2>${inline(m[1])}</h2>\n`;
      continue;
    }
    if ((m = line.match(/^# (.+)/))) {
      flushList();
      html += `<h1>${inline(m[1])}</h1>\n`;
      continue;
    }

    // ── Checkboxes ───────────────────────────────────────────────────────────
    if ((m = line.match(/^- \[x\] (.+)/i))) {
      if (!inList || listClass !== "checklist") {
        flushList();
        html += `<ul class="checklist">\n`;
        inList = true;
        listClass = "checklist";
      }
      const label = m[1].replace(/"/g, "&quot;");
      html += `<li><input type="checkbox" checked data-label="${label}"> ${inline(m[1])}</li>\n`;
      continue;
    }
    if ((m = line.match(/^- \[ \] (.+)/))) {
      if (!inList || listClass !== "checklist") {
        flushList();
        html += `<ul class="checklist">\n`;
        inList = true;
        listClass = "checklist";
      }
      const label = m[1].replace(/"/g, "&quot;");
      html += `<li><input type="checkbox" data-label="${label}"> ${inline(m[1])}</li>\n`;
      continue;
    }

    // ── Bullets ──────────────────────────────────────────────────────────────
    if ((m = line.match(/^[-*] (.+)/))) {
      if (!inList || listClass !== "bullet") {
        flushList();
        html += `<ul>\n`;
        inList = true;
        listClass = "bullet";
      }
      html += `<li>${inline(m[1])}</li>\n`;
      continue;
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    flushList();
    html += `<p>${inline(line)}</p>\n`;
  }

  flushList();
  return html;
}
