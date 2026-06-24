// Dezenter Besucherzähler über Abacus (https://abacus.jasoncameron.dev) —
// kostenlos, anmeldungsfrei, kein Backend nötig. Zählt pro Browser EINMAL
// (localStorage-Flag) → entspricht ungefähr "Anzahl Personen".
// Angezeigt wird die Zahl nur dort, wo ein Element #visit-count existiert
// (= unten im Disclaimer). Auf allen anderen Seiten wird nur still gezählt.
(function () {
  var NS = "m4rc0815-finanz-analysen";
  var KEY = "visits";
  var BASE = "https://abacus.jasoncameron.dev";
  var FLAG = "fa_visit_counted";

  var out = document.getElementById("visit-count");

  var counted = false;
  try { counted = localStorage.getItem(FLAG) === "1"; } catch (e) {}

  var needCount = !counted;   // neuer Browser → hochzählen
  var needShow = !!out;       // Disclaimer-Seite → anzeigen
  if (!needCount && !needShow) return; // nichts zu tun (Wiederkehrer auf Inhaltsseite)

  var url = needCount ? BASE + "/hit/" + NS + "/" + KEY : BASE + "/get/" + NS + "/" + KEY;

  fetch(url, { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (needCount) { try { localStorage.setItem(FLAG, "1"); } catch (e) {} }
      if (out && d && typeof d.value === "number") {
        out.textContent = d.value.toLocaleString("de-DE");
      }
    })
    .catch(function () { /* offline/blockiert → Anzeige bleibt leer, kein Fehler */ });
})();
