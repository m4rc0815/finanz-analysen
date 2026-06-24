# Finanzanalysen mit Claude

Statische Webseite mit Aktienanalysen, Rankings und einem Markt-Dashboard.
Die Inhalte werden aus Obsidian-Markdown-Notizen automatisch in eine
BlackRock-inspirierte Webseite gebaut und auf **GitHub Pages** veröffentlicht.

**Live:** https://m4rc0815.github.io/finanz-analysen/

> Keine Anlageberatung — rein informative Auswertung öffentlich verfügbarer Daten.
> Inhalte erstellt mit Claude.

## Workflow

```bash
npm install        # einmalig
npm run build      # Seite nach ./docs bauen
npm run preview    # lokal ansehen (http://localhost:4173)
npm run deploy     # bauen + auf GitHub Pages veröffentlichen
```

## Aufbau

| Datei | Zweck |
|---|---|
| `build.mjs` | Liest die Vault-Markdown-Dateien, wandelt sie in HTML um |
| `config.mjs` | Pfade, Allowlist, Sektor-/Region-Zuordnung, Redaktionsregeln |
| `templates/layout.mjs` | HTML-Templates (Header, Hero, Karten, Footer) |
| `assets/style.css` | Design (hell, institutionell, Weiß/Schwarz/Gelb) |
| `assets/filter.js` | Clientseitiges Filtern/Sortieren der Analysen |
| `docs/` | Build-Output = GitHub-Pages-Quelle |

Quelle der Inhalte: der Obsidian-Vault (nur gelesen, nie verändert).
Private Notizen (z. B. die eigene Depot-Position) werden bewusst ausgeschlossen.
