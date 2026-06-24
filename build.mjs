// Build-Script: wandelt die Obsidian-Markdown-Analysen/Rankings aus dem Vault
// in eine statische, BlackRock-inspirierte Webseite (./docs) um.
//
//   node build.mjs
//
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import * as cfg from "./config.mjs";
import * as T from "./templates/layout.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(__dirname, "docs");
const ASSETS = path.join(__dirname, "assets");

// docs/ ist reiner Build-Output → vor jedem Build leeren. Sonst hinterlassen
// entfernte oder ins Archiv verschobene Analysen/Rankings/Charts verwaiste
// Seiten, die weiter online wären (obwohl nicht mehr verlinkt).
fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });

// ---------------------------------------------------------------------------
// Markdown-Renderer
// ---------------------------------------------------------------------------
const md = new MarkdownIt({
  html: true, // erlaubt Inline-HTML (Stooq-Charts im Dashboard, Callout-Divs)
  linkify: true,
  breaks: false,
  typographer: false,
});

// Tabellen in scrollbaren Wrapper hüllen + Klasse setzen
const defaultTableOpen =
  md.renderer.rules.table_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
  return '<div class="table-wrap">\n' + '<table class="fin-table">';
};
md.renderer.rules.table_close = () => "</table>\n</div>";

// Externe Links in neuem Tab öffnen
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href") || "";
  if (/^https?:\/\//.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
const warnings = [];
const warn = (m) => warnings.push(m);

const IMG_RE = /\.(png|jpe?g|gif|webp|svg)$/i;
const CALLOUT_ICONS = {
  tip: "💡", info: "ℹ️", note: "📝", warning: "⚠️", caution: "⚠️",
  danger: "🛑", quote: "❝", success: "✅", question: "❓", example: "🔎",
};
const CALLOUT_LABELS = {
  tip: "Tipp", info: "Hinweis", note: "Notiz", warning: "Achtung",
  quote: "Zitat", success: "Erfolg", question: "Frage", example: "Beispiel",
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateFromName(basename) {
  const m = basename.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}
function fmtDate(iso) {
  if (!iso) return "";
  const m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso);
}
// gray-matter/js-yaml parst "2026-06-24" als JS-Date → robust zu YYYY-MM-DD normalisieren.
function isoDate(v, fallbackName) {
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = String(v ?? "");
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  return fallbackName ? dateFromName(fallbackName) : null;
}

function tickerRoot(ticker) {
  return String(ticker || "").split(".")[0].toUpperCase();
}
function tickerSuffix(ticker) {
  const parts = String(ticker || "").split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}
function regionFor(ticker) {
  const root = tickerRoot(ticker);
  if (cfg.REGION_OVERRIDE[root]) return cfg.REGION_OVERRIDE[root];
  const suf = tickerSuffix(ticker);
  if (!suf) return "USA";
  if (cfg.EUROPE_SUFFIXES.has(suf)) return "Europa";
  if (cfg.ASIA_SUFFIXES.has(suf)) return "Asien";
  return "USA";
}
function sektorFor(fm, ticker) {
  const root = tickerRoot(ticker);
  if (cfg.TICKER_SEKTOR_OVERRIDE[root]) return cfg.TICKER_SEKTOR_OVERRIDE[root];
  const raw = (fm.sektor || "").toString().trim();
  if (!raw) return "Sonstige";
  const mapped = cfg.SEKTOR_MAP[raw.toLowerCase()];
  if (!mapped) {
    warn(`Unbekannter Sektor "${raw}" (Ticker ${ticker}) → Bucket "Sonstige"`);
    return "Sonstige";
  }
  return mapped;
}
function ratingFor(fm) {
  const r = fm.rating;
  if (r === undefined || r === null || r === "") return null;
  const n = Number(String(r).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Obsidian-Markdown → Web-Markdown/HTML Transformationen
// ---------------------------------------------------------------------------
const BIG_IMG_BYTES = 1_000_000; // große PNGs → JPEG fürs Web
function transformEmbeds(text, relRoot, imageIndex, copyJobs) {
  return text.replace(/!\[\[([^\]]+)\]\]/g, (m, target) => {
    const name = target.split("|")[0].trim();
    if (IMG_RE.test(name)) {
      const srcPath = imageIndex.get(name);
      if (srcPath) {
        let big = false;
        try {
          big = /\.png$/i.test(name) && fs.statSync(srcPath).size > BIG_IMG_BYTES;
        } catch {}
        const destName = big ? name.replace(/\.png$/i, ".jpg") : name;
        copyJobs.set(destName, { src: srcPath, jpeg: big });
        const alt = name
          .replace(IMG_RE, "")
          .replace(/_2y$/i, " – 2 Jahre")
          .replace(/_3m$/i, " – 3 Monate")
          .replace(/_/g, " ");
        return `\n<figure class="chart"><img src="${relRoot}charts/${encodeURIComponent(
          destName
        )}" alt="${esc(alt)}" loading="lazy"></figure>\n`;
      }
      warn(`Fehlendes Chart-Bild: ${name}`);
      return `\n<div class="chart-missing">Chart aktuell nicht verfügbar</div>\n`;
    }
    // Nicht-Bild-Embed (z. B. .base) → entfernen
    warn(`Nicht-Bild-Embed entfernt: ${name}`);
    return "";
  });
}

function transformWikilinks(text, relRoot, registry) {
  return text.replace(/\[\[([^\]]+)\]\]/g, (m, inner) => {
    const [rawTarget, rawDisplay] = inner.split("|");
    const target = rawTarget.split("#")[0].trim();
    const display = (rawDisplay || rawTarget).trim();
    if (cfg.NONPUBLIC_WIKILINK_TARGETS.has(target) || /\.base$/i.test(target)) {
      return esc(display);
    }
    const entry = registry.get(target);
    if (entry) {
      return `<a href="${relRoot}${entry.url}">${esc(display)}</a>`;
    }
    warn(`Wikilink ohne Ziel (zu Text degradiert): [[${target}]]`);
    return esc(display);
  });
}

function transformCallouts(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^>\s*\[!(\w+)\]\s*(.*)$/);
    if (m) {
      const type = m[1].toLowerCase();
      const title = m[2].trim();
      const body = [];
      i++;
      while (i < lines.length && /^>/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const innerHtml = md.render(body.join("\n"));
      const icon = CALLOUT_ICONS[type] || "ℹ️";
      const label = title || CALLOUT_LABELS[type] || type;
      out.push(
        "",
        `<div class="callout callout-${type}">`,
        `<div class="callout-title">${icon} ${esc(label)}</div>`,
        `<div class="callout-body">\n${innerHtml}\n</div>`,
        `</div>`,
        ""
      );
    } else {
      out.push(lines[i]);
      i++;
    }
  }
  return out.join("\n");
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Entfernt die externen Stooq-Chart-Galerien (Hotlinking wird von stooq.com
// blockiert → kaputte Bilder). Tabellen/Inhalt bleiben erhalten.
let stooqRemoved = 0;
function stripStooqGalleries(text) {
  return text.replace(/<div style="display:flex[\s\S]*?stooq[\s\S]*?<\/div>/g, () => {
    stooqRemoved++;
    return '\n<p class="chart-note">12-Monats-Kursverläufe: extern verfügbar bei <a href="https://stooq.com" target="_blank" rel="noopener noreferrer">stooq.com</a> (aus Performance-/Lizenzgründen nicht eingebettet).</p>\n';
  });
}

// Entfernt Obsidian-Kontextzeilen "> Teil von [[Home]]" und private Depot-Zeilen.
function stripContextLines(text) {
  const out = [];
  for (const l of text.split("\n")) {
    if (/^>\s*Teil von /i.test(l)) continue;
    if (cfg.REDACT_LINE_PATTERNS.some((re) => re.test(l))) {
      warn(`Private Zeile redigiert: ${l.replace(/\s+/g, " ").trim().slice(0, 64)}…`);
      continue;
    }
    out.push(l);
  }
  return out.join("\n");
}

// Trennt führende H1 + Untertitel (italic) vom Body ab.
function splitHeading(text) {
  const lines = text.split("\n");
  let title = null;
  let idx = 0;
  // erste H1 finden (überspringt evtl. Leerzeilen)
  while (idx < lines.length && lines[idx].trim() === "") idx++;
  if (idx < lines.length && /^#\s+/.test(lines[idx])) {
    title = lines[idx].replace(/^#\s+/, "").trim();
    lines.splice(idx, 1);
    // folgenden italic-Untertitel und Leerzeilen entfernen
    while (idx < lines.length && lines[idx].trim() === "") lines.splice(idx, 1);
    if (idx < lines.length && /^\*.*\*$/.test(lines[idx].trim())) {
      lines.splice(idx, 1);
    }
    // führende '---' und Leerzeilen am Anfang aufräumen
    while (
      idx < lines.length &&
      (lines[idx].trim() === "" || lines[idx].trim() === "---")
    ) {
      lines.splice(idx, 1);
    }
  }
  return { title, body: lines.join("\n") };
}

function renderBody(rawMd, { relRoot, registry, chartFiles, copyJobs }) {
  let t = stripContextLines(rawMd);
  t = stripStooqGalleries(t);
  t = transformEmbeds(t, relRoot, chartFiles, copyJobs);
  t = transformWikilinks(t, relRoot, registry);
  t = transformCallouts(t);
  return md.render(t);
}

// ---------------------------------------------------------------------------
// 1) Quelldateien einlesen + klassifizieren
// ---------------------------------------------------------------------------
function classify(basename) {
  if (cfg.EXCLUDE_BASENAMES.has(basename)) return null;
  if (cfg.EXCLUDE_PREFIXES.some((p) => basename.startsWith(p))) return null;
  if (basename.startsWith("00_")) return "ranking";
  if (cfg.MARKT_META[basename]) return "markt";
  if (/\bAnalyse\b/.test(basename)) return "analyse";
  return null;
}

const files = fs
  .readdirSync(cfg.SRC_DIR)
  .filter((f) => f.endsWith(".md"));

// Bild-Index: Dateiname → Quellpfad. Sucht im Chart-Ordner UND im Finanz-Ordner
// (dort liegen eingebettete Grafiken wie die Momentum-Strategie).
const imageIndex = new Map();
for (const dir of [cfg.CHARTS_SRC, cfg.SRC_DIR]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (IMG_RE.test(f) && !imageIndex.has(f)) imageIndex.set(f, path.join(dir, f));
  }
}
const chartFiles = imageIndex; // bietet .has(name)

const docs = [];
for (const file of files) {
  const basename = file.replace(/\.md$/, "");
  const type = classify(basename);
  if (!type) continue;
  const raw = fs.readFileSync(path.join(cfg.SRC_DIR, file), "utf8");
  const { data: fm, content } = matter(raw);
  docs.push({ basename, type, fm, content });
}

// ---------------------------------------------------------------------------
// 2) Analysen anreichern + Dedup nach Ticker (jüngste gewinnt)
// ---------------------------------------------------------------------------
const analyses = [];
for (const d of docs.filter((d) => d.type === "analyse")) {
  const ticker = (d.fm.ticker || "").toString().trim();
  const unternehmen = (d.fm.unternehmen || d.basename.replace(/\s+Analyse.*$/, "")).toString().trim();
  const datum = isoDate(d.fm.erstellt, d.basename);
  analyses.push({
    ...d,
    ticker,
    unternehmen,
    datum,
    sektor: sektorFor(d.fm, ticker),
    region: regionFor(ticker),
    rating: ratingFor(d.fm),
    slug: slugify(unternehmen || d.basename),
  });
}

// Dedup
const byTicker = new Map();
for (const a of analyses) {
  const key = a.ticker || a.slug;
  const prev = byTicker.get(key);
  if (!prev || String(a.datum) > String(prev.datum)) {
    if (prev) warn(`Dublette übersprungen: ${prev.basename} (zugunsten ${a.basename})`);
    byTicker.set(key, a);
  } else {
    warn(`Dublette übersprungen: ${a.basename} (zugunsten ${prev.basename})`);
  }
}
const uniqueAnalyses = [...byTicker.values()].sort((a, b) =>
  a.unternehmen.localeCompare(b.unternehmen, "de")
);

// Slug-Kollisionen auflösen
const seenSlugs = new Set();
for (const a of uniqueAnalyses) {
  let s = a.slug;
  let n = 2;
  while (seenSlugs.has(s)) s = `${a.slug}-${n++}`;
  a.slug = s;
  seenSlugs.add(s);
  a.url = `analysen/${a.slug}.html`;
  a.outPath = path.join(DOCS, "analysen", `${a.slug}.html`);
}

// Rankings + Markt
const rankings = docs
  .filter((d) => d.type === "ranking" && cfg.RANKING_META[d.basename])
  .map((d) => {
    const meta = cfg.RANKING_META[d.basename];
    return {
      ...d,
      ...meta,
      datum: isoDate(d.fm.erstellt, d.basename),
      url: `rankings/${meta.slug}.html`,
      outPath: path.join(DOCS, "rankings", `${meta.slug}.html`),
    };
  });
// Reihenfolge wie in RANKING_META
const rankingOrder = Object.keys(cfg.RANKING_META);
rankings.sort((a, b) => rankingOrder.indexOf(a.basename) - rankingOrder.indexOf(b.basename));

const markt = docs
  .filter((d) => d.type === "markt")
  .map((d) => {
    const meta = cfg.MARKT_META[d.basename];
    return {
      ...d,
      ...meta,
      datum: isoDate(d.fm.updated, d.basename),
      url: `markt/${meta.slug}.html`,
      outPath: path.join(DOCS, "markt", `${meta.slug}.html`),
    };
  });

// ---------------------------------------------------------------------------
// 3) Registry für Wikilink-Auflösung (Basename → {url, title, type})
// ---------------------------------------------------------------------------
const registry = new Map();
for (const a of uniqueAnalyses)
  registry.set(a.basename, { url: a.url, title: a.unternehmen, type: "analyse" });
for (const r of rankings)
  registry.set(r.basename, { url: r.url, title: r.title, type: "ranking" });
for (const m of markt)
  registry.set(m.basename, { url: m.url, title: m.title, type: "markt" });

// ---------------------------------------------------------------------------
// 4) Seiten rendern
// ---------------------------------------------------------------------------
const copyJobs = new Map(); // destName → { src, jpeg }
const buildDate = fmtDate(process.env.BUILD_DATE || dateFromName(rankings[0]?.basename) || "");
let pageCount = 0;

function writePage(outPath, html) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  pageCount++;
}

// 4a) Analyse-Detailseiten
for (const a of uniqueAnalyses) {
  const { body } = splitHeading(a.content);
  const contentHtml = renderBody(body, {
    relRoot: "../",
    registry,
    chartFiles,
    copyJobs,
  });
  const hero = T.analysisHero(a);
  writePage(
    a.outPath,
    T.documentShell({
      title: `${a.unternehmen} (${a.ticker}) — Analyse`,
      relRoot: "../",
      active: "analysen",
      hero,
      content: `<article class="prose">${contentHtml}</article>`,
    })
  );
}

// 4b) Ranking-Seiten
for (const r of rankings) {
  const { body } = splitHeading(r.content);
  const contentHtml = renderBody(body, {
    relRoot: "../",
    registry,
    chartFiles,
    copyJobs,
  });
  writePage(
    r.outPath,
    T.documentShell({
      title: `${r.title} — ${r.eyebrow}`,
      relRoot: "../",
      active: "rankings",
      hero: T.simpleHero({ eyebrow: r.eyebrow, title: r.title, meta: `Stand: ${fmtDate(r.datum)}` }),
      content: `<article class="prose">${contentHtml}</article>`,
    })
  );
}

// 4c) Markt-Seiten
for (const m of markt) {
  const { body } = splitHeading(m.content);
  const contentHtml = renderBody(body, {
    relRoot: "../",
    registry,
    chartFiles,
    copyJobs,
  });
  writePage(
    m.outPath,
    T.documentShell({
      title: `${m.title} — ${m.eyebrow}`,
      relRoot: "../",
      active: "markt",
      hero: T.simpleHero({
        eyebrow: m.eyebrow,
        title: m.title,
        meta: `Stand: ${fmtDate(m.datum)} · externe Live-Charts (stooq.com)`,
      }),
      content: `<article class="prose">${contentHtml}</article>`,
    })
  );
}

// 4d) Analysen-Übersicht (filterbar)
const sektoren = [...new Set(uniqueAnalyses.map((a) => a.sektor))].sort((a, b) =>
  a.localeCompare(b, "de")
);
const regionen = [...new Set(uniqueAnalyses.map((a) => a.region))].sort();
writePage(
  path.join(DOCS, "analysen", "index.html"),
  T.documentShell({
    title: "Alle Analysen",
    relRoot: "../",
    active: "analysen",
    hero: T.simpleHero({
      eyebrow: "Einzelanalysen",
      title: "Alle Analysen",
      meta: `${uniqueAnalyses.length} Unternehmen · ${sektoren.length} Branchen · ${regionen.length} Regionen`,
    }),
    content: T.analysenIndex(uniqueAnalyses, { sektoren, regionen, relRoot: "../" }),
    scripts: `<script src="../assets/filter.js" defer></script>`,
  })
);

// 4e) Rankings-Übersicht
writePage(
  path.join(DOCS, "rankings", "index.html"),
  T.documentShell({
    title: "Rankings",
    relRoot: "../",
    active: "rankings",
    hero: T.simpleHero({ eyebrow: "Bestenlisten", title: "Rankings", meta: "Value · Wachstum · Momentum" }),
    content: T.rankingsIndex(rankings, "../"),
  })
);

// 4f) Markt-Übersicht
writePage(
  path.join(DOCS, "markt", "index.html"),
  T.documentShell({
    title: "Markt",
    relRoot: "../",
    active: "markt",
    hero: T.simpleHero({ eyebrow: "Marktdaten", title: "Markt", meta: "Dashboard & Briefing" }),
    content: T.marktIndex(markt, "../"),
  })
);

// 4g) Disclaimer
writePage(
  path.join(DOCS, "disclaimer.html"),
  T.documentShell({
    title: "Disclaimer",
    relRoot: "",
    active: "disclaimer",
    hero: T.simpleHero({ eyebrow: "Rechtliches", title: "Disclaimer & Hinweise", meta: "" }),
    content: T.disclaimerPage(buildDate),
  })
);

// 4h) Startseite
const neueste = [...uniqueAnalyses]
  .sort((a, b) => String(b.datum).localeCompare(String(a.datum)))
  .slice(0, 6);
writePage(
  path.join(DOCS, "index.html"),
  T.documentShell({
    title: `${SITE_TITLE()}`,
    relRoot: "",
    active: "start",
    hero: null,
    content: T.landing({
      rankings,
      markt,
      neueste,
      total: uniqueAnalyses.length,
      buildDate,
      relRoot: "",
    }),
    bodyClass: "home",
  })
);

function SITE_TITLE() {
  return `${cfg.SITE.tagline} — ${cfg.SITE.projectName}`;
}

// ---------------------------------------------------------------------------
// 5) Charts + Assets + .nojekyll kopieren
// ---------------------------------------------------------------------------
const chartsOut = path.join(DOCS, "charts");
fs.mkdirSync(chartsOut, { recursive: true });
let copied = 0;
for (const [destName, job] of copyJobs) {
  const dest = path.join(chartsOut, destName);
  let done = false;
  if (job.jpeg) {
    try {
      // Große PNGs → JPEG (q82, 1200px Breite) fürs Web.
      execFileSync(
        "sips",
        ["-s", "format", "jpeg", "-s", "formatOptions", "82", "--resampleWidth", "1200", job.src, "--out", dest],
        { stdio: "ignore" }
      );
      done = true;
    } catch {
      done = false;
    }
  }
  if (!done) fs.copyFileSync(job.src, dest); // Fallback: Original unter Zielnamen
  copied++;
}

const assetsOut = path.join(DOCS, "assets");
fs.mkdirSync(assetsOut, { recursive: true });
for (const f of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, f), path.join(assetsOut, f));
}

fs.writeFileSync(path.join(DOCS, ".nojekyll"), "");

// ---------------------------------------------------------------------------
// 6) Build-Report
// ---------------------------------------------------------------------------
const missingCharts = warnings.filter((w) => w.startsWith("Fehlendes Chart"));
const degraded = warnings.filter((w) => w.startsWith("Wikilink ohne Ziel"));
const noRating = uniqueAnalyses.filter((a) => a.rating === null);
const sonstige = uniqueAnalyses.filter((a) => a.sektor === "Sonstige");

console.log("\n── Build-Report ─────────────────────────────");
console.log(`Seiten geschrieben : ${pageCount}`);
console.log(`  Analysen         : ${uniqueAnalyses.length}`);
console.log(`  Rankings         : ${rankings.length}`);
console.log(`  Markt            : ${markt.length}`);
console.log(`Charts kopiert     : ${copied}`);
console.log(`Stooq-Galerien     : ${stooqRemoved} entfernt (externe Hotlinks)`);
console.log(`Branchen-Buckets   : ${sektoren.join(", ")}`);
console.log(`Ohne Rating (WL)   : ${noRating.length} (${noRating.map((a) => a.unternehmen).join(", ") || "—"})`);
if (sonstige.length)
  console.log(`Sektor "Sonstige"  : ${sonstige.map((a) => `${a.unternehmen}`).join(", ")}`);
console.log(`Fehlende Charts    : ${missingCharts.length}`);
console.log(`Degradierte Links  : ${degraded.length}`);
if (warnings.length) {
  console.log("\nWarnungen:");
  for (const w of [...new Set(warnings)]) console.log("  · " + w);
}
console.log("─────────────────────────────────────────────\n");
