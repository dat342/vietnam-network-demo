/* ===== Danh ba doanh nghiep ===== */
import { requireAuth, renderShell, esc } from "./fb.js";

const $ = id => document.getElementById(id);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

requireAuth((user, profile) => {
  renderShell("danhba", profile);
  const ld = $("pageLoading"); if (ld) ld.remove();

  const D = window.GRAPH_DATA || { companies: {} };
  const list = Object.keys(D.companies).sort().map(sym => ({
    sym, sector: D.companies[sym].sector, group: D.companies[sym].group || "",
    n: (D.companies[sym].members || []).length,
    key: norm(sym + " " + D.companies[sym].sector + " " + (D.companies[sym].group || "")),
  }));
  const grid = $("coGrid");
  function render(q) {
    const nq = norm(q || "");
    const items = nq ? list.filter(c => c.key.includes(nq)) : list;
    grid.innerHTML = items.map(c => `
      <a class="co-card" href="tracuu.html?company=${encodeURIComponent(c.sym)}">
        <div class="co-sym">${esc(c.sym)}</div>
        <div class="co-sector">${esc(c.sector)}</div>
        <div class="co-count"><i class="ti ti-users" aria-hidden="true"></i> ${c.n} lãnh đạo</div>
      </a>`).join("") || `<div class="muted">Không thấy doanh nghiệp khớp.</div>`;
  }
  $("coSearch").addEventListener("input", e => render(e.target.value));
  render("");
});
