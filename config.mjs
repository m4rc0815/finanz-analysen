// Konfiguration für den Build der Finanz-Webseite.
// Quelle = Obsidian-Vault (NUR LESEN). Output = ./docs (GitHub-Pages-Quelle).

export const VAULT_ROOT =
  "/Users/marcmarx/Documents/Claude/Projects/Vault/Mein Vault";

export const SRC_DIR = `${VAULT_ROOT}/03 Bereiche/Finanzen & Börse`;
export const CHARTS_SRC = `${VAULT_ROOT}/07 Anhänge/Aktienanalyse`;

// Archiv: archivierte Analysen werden als eigener "Archiv"-Bereich publiziert
// (separat von den aktiven Analysen). Auto-Discovery: alle Unterordner von
// "06 Archiv", deren Name mit "Aktienanalysen" beginnt (z. B. "Aktienanalysen 2026-05").
export const ARCHIVE_ROOT = `${VAULT_ROOT}/06 Archiv`;
export const ARCHIVE_DIR_PREFIX = "Aktienanalysen";

// --- Seiten-Metadaten -------------------------------------------------------
export const SITE = {
  projectName: "Finanzanalysen mit Claude",
  tagline: "Aktienanalysen & Rankings",
  baseUrl: "https://m4rc0815.github.io/finanz-analysen/",
  claudeBadge: "Erstellt mit Claude",
  disclaimerShort:
    "Keine Anlageberatung — rein informative Auswertung öffentlich verfügbarer Daten.",
};

// --- Was NICHT veröffentlicht wird (Allowlist-Logik in build.mjs) -----------
// Diese Basenamen (ohne .md) werden grundsätzlich übersprungen.
export const EXCLUDE_BASENAMES = new Set([
  "Allianz Depot-Position", // privat: echtes Depot
  "Finanzen & Börse", // interner Bereichs-Index (verlinkt unpublizierte Notizen)
  "Finanzanalysen Homepage", // interne Doku der Webseite selbst — nicht publizieren
]);

// Basename-Präfixe, die ausgeschlossen werden (z. B. Weltraum-Material).
// "00_Momentum": Das Momentum-Ranking wird bewusst NICHT veröffentlicht
// (auf Wunsch dauerhaft entfernt). Der Präfix fängt auch künftige Datums-
// Versionen der Vault-Notiz ab, damit es bei keinem Sync wieder auftaucht.
export const EXCLUDE_PREFIXES = ["Weltraum", "00_Momentum"];

// Zeilen mit privaten Depot-Daten, die aus JEDER Seite entfernt werden.
// (Marcs persönliche Allianz-Position steht auch in der Allianz-Analyse selbst.)
// Bewusst eng gefasst, um öffentliche Begriffe wie "Depot-Position" als
// generische Überschrift (z. B. ARM Holdings im Wachstums-Ranking) NICHT zu treffen.
export const REDACT_LINE_PATTERNS = [/Eigene Position/i, /Einstand\s*166/i];

// Wikilink-Ziele, die NIE zu einem Link werden (nur Anzeigetext) -------------
export const NONPUBLIC_WIKILINK_TARGETS = new Set([
  "Home",
  "Aktien und Börse",
  "Selbständigkeit",
  "Aktien-Analysen.base",
  "Allianz Depot-Position",
]);

// --- Rankings: saubere Titel/Slugs/Teaser -----------------------------------
// Key = Basename (ohne .md). Reihenfolge bestimmt Anzeige auf der Startseite.
export const RANKING_META = {
  "00_Value-Ranking Gesamt – 5 Jahres Potenzial 2026-06-24": {
    slug: "value-ranking",
    title: "Value-Ranking",
    eyebrow: "5-Jahres-Potenzial",
    teaser:
      "Aktien nach einheitlicher Value-Matrix: Bewertungsabschlag, KGV/KBV, Dividende, Bilanzsicherheit.",
  },
  "00_Aktien Ranking – 5 Jahres Potenzial 2026-05-30": {
    slug: "wachstums-ranking",
    title: "Wachstums-Ranking",
    eyebrow: "5-Jahres-Potenzial",
    teaser:
      "Aggregiertes Ranking nach 3–5 Jahren Kurspotenzial — Wachstum und Momentum kombiniert.",
  },
  "00_Weltraum-Aktien 2026-06-15": {
    slug: "weltraum-ranking",
    title: "Weltraum-Ranking",
    eyebrow: "Raumfahrt & Space",
    teaser:
      "Weltraum-Aktien im Überblick: Pure-Plays (Raketen, Satelliten, Erdbeobachtung) vs. Defense-Primes — bewertet nach Risiko, Bewertung und Weltraum-Bezug.",
  },
};

// --- Markt-Seiten -----------------------------------------------------------
export const MARKT_META = {
  "Börsen Dashboard": {
    slug: "dashboard",
    title: "Börsen-Dashboard",
    eyebrow: "Marktüberblick",
    teaser: "Indizes, Top-Mover, Nachrichten und Earnings im Tagesüberblick.",
  },
  "Börsen Briefing": {
    slug: "briefing",
    title: "Börsen-Briefing",
    eyebrow: "Tiefenanalyse",
    teaser: "Themen, Zitate und Einordnung als zusammenhängender Lesetext.",
  },
};

// --- Sektor-Normalisierung (Filter-Buckets) ---------------------------------
// Key = lowercase Frontmatter-Wert; Value = Anzeige-Bucket.
export const SEKTOR_MAP = {
  halbleiter: "Technologie & Halbleiter",
  "halbleiter-equipment": "Technologie & Halbleiter",
  "halbleiter-ip": "Technologie & Halbleiter",
  "information technology": "Technologie & Halbleiter",
  tech: "Technologie & Halbleiter",
  "tech / cloud": "Software & Internet",
  "tech / internet": "Software & Internet",
  "tech / enterprise": "Software & Internet",
  software: "Software & Internet",
  "software / security": "Software & Internet",
  internet: "Software & Internet",
  "communication services": "Software & Internet",
  industrials: "Industrie & Verteidigung",
  industrie: "Industrie & Verteidigung",
  "defence / elektronik": "Industrie & Verteidigung",
  defence: "Industrie & Verteidigung",
  "defense / elektronik": "Industrie & Verteidigung",
  financials: "Finanzwerte",
  "health care": "Gesundheit & Pharma",
  pharma: "Gesundheit & Pharma",
  "pharma/glp-1": "Gesundheit & Pharma",
  energy: "Energie",
  utilities: "Versorger",
  materials: "Rohstoffe",
};

// Ticker-Wurzel (vor dem Punkt) → Sektor-Override (für Dateien ohne sektor).
export const TICKER_SEKTOR_OVERRIDE = {
  MUV2: "Versicherung",
  CS: "Versicherung", // AXA
  ALV: "Versicherung", // Allianz
  AMZN: "Software & Internet", // Amazon
  ARM: "Technologie & Halbleiter", // ARM Holdings
  ASML: "Technologie & Halbleiter", // ASML
  LRCX: "Technologie & Halbleiter", // Lam Research
  MRVL: "Technologie & Halbleiter", // Marvell
  NXPI: "Technologie & Halbleiter", // NXP Semiconductors
  GOOGL: "Software & Internet", // Alphabet
  AVGO: "Technologie & Halbleiter", // Broadcom
  NET: "Software & Internet", // Cloudflare
  IBM: "Software & Internet", // IBM
  ZM: "Software & Internet", // Zoom
  KIT: "Industrie & Verteidigung", // Kitron (KIT.OL)
  SIE: "Industrie & Verteidigung", // Siemens AG
  // Weltraum-Welle — Pure-Plays
  RKLB: "Raumfahrt & Satelliten", // Rocket Lab
  ASTS: "Raumfahrt & Satelliten", // AST SpaceMobile
  LUNR: "Raumfahrt & Satelliten", // Intuitive Machines
  PL: "Raumfahrt & Satelliten",   // Planet Labs
  RDW: "Raumfahrt & Satelliten",  // Redwire
  BKSY: "Raumfahrt & Satelliten", // BlackSky Technology
  SPCE: "Raumfahrt & Satelliten", // Virgin Galactic
  IRDM: "Raumfahrt & Satelliten", // Iridium Communications
  SESG: "Raumfahrt & Satelliten", // SES S.A.
  // Weltraum-Welle — Defense/Aerospace-Primes (indirekte Plays)
  LMT: "Industrie & Verteidigung",  // Lockheed Martin
  NOC: "Industrie & Verteidigung",  // Northrop Grumman
  LHX: "Industrie & Verteidigung",  // L3Harris
  RTX: "Industrie & Verteidigung",  // RTX Corporation
  AIR: "Industrie & Verteidigung",  // Airbus
  BA:  "Industrie & Verteidigung",  // Boeing
  HON: "Industrie & Verteidigung",  // Honeywell International
  PLTR: "Software & Internet",      // Palantir (Defense-/Space-Software)
};

// --- Region aus Ticker-Suffix ----------------------------------------------
export const EUROPE_SUFFIXES = new Set([
  "DE", "PA", "MC", "MI", "CO", "OL", "SW", "AS", "L", "BR", "VI", "ST", "HE", "F",
]);
export const ASIA_SUFFIXES = new Set(["HK", "KS", "T", "TW", "SS", "SZ", "KQ"]);

// Ticker-Wurzel → Region-Override (ADRs/Sonderfälle, wo das Suffix täuscht).
export const REGION_OVERRIDE = {
  TSM: "Asien",   // Taiwan Semiconductor (US-ADR)
  MUFG: "Asien",  // Mitsubishi UFJ (US-ADR)
  BABA: "Asien",  // Alibaba (US-ADR)
  NVO: "Europa",  // Novo Nordisk (US-ADR, dänisch)
  AIR: "Europa",  // Airbus (Euronext Paris, kein .PA-Suffix im Frontmatter)
  SESG: "Europa", // SES S.A. (Euronext Paris, kein .PA-Suffix im Frontmatter)
};
