// Clientseitiges Filtern / Sortieren / Suchen der Analysen-Übersicht.
(function () {
  const grid = document.getElementById("analyse-grid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".analyse-card"));
  const search = document.getElementById("f-search");
  const fSektor = document.getElementById("f-sektor");
  const fRegion = document.getElementById("f-region");
  const fSort = document.getElementById("f-sort");
  const count = document.getElementById("f-count");
  const empty = document.getElementById("f-empty");

  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    const s = fSektor.value;
    const r = fRegion.value;
    let visible = 0;

    cards.forEach((c) => {
      const okQ = !q || c.dataset.name.includes(q) || c.dataset.ticker.includes(q);
      const okS = !s || c.dataset.sektor === s;
      const okR = !r || c.dataset.region === r;
      const show = okQ && okS && okR;
      c.hidden = !show;
      if (show) visible++;
    });

    const sort = fSort.value;
    const sorted = cards.slice().sort((a, b) => {
      if (sort === "rating") {
        const ra = a.dataset.rating === "" ? -1 : parseFloat(a.dataset.rating);
        const rb = b.dataset.rating === "" ? -1 : parseFloat(b.dataset.rating);
        return rb - ra;
      }
      if (sort === "datum") {
        return (b.dataset.datum || "").localeCompare(a.dataset.datum || "");
      }
      return a.dataset.name.localeCompare(b.dataset.name, "de");
    });
    sorted.forEach((c) => grid.appendChild(c));

    if (count) count.textContent = visible + " von " + cards.length + " Analysen";
    if (empty) empty.hidden = visible !== 0;
  }

  [search, fSektor, fRegion, fSort].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });
  apply();
})();
