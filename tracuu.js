/* ===== Tra cuu nhan su theo cong ty + phong ban ===== */
import { requireAuth, renderShell, esc, avatarSm } from "./fb.js";

const $ = id => document.getElementById(id);
const strip = s => String(s || "").replace(/^(Ông|Bà)\s+/i, "");

requireAuth((user, profile) => {
  renderShell("tracuu", profile);
  const ld = $("pageLoading"); if (ld) ld.remove();

  const D = window.GRAPH_DATA || { companies: {}, people: {} };
  const selC = $("selCompany"), selD = $("selDept"), res = $("results");
  const syms = Object.keys(D.companies).sort();
  const params = new URLSearchParams(location.search);

  selC.innerHTML = syms.map(s => `<option value="${esc(s)}">${esc(s)} — ${esc(D.companies[s].sector)}</option>`).join("");
  const preC = params.get("company");
  if (preC && D.companies[preC]) selC.value = preC;

  function fillDepts() {
    const sym = selC.value;
    const groups = [...new Set((D.companies[sym].members || []).map(c => (D.people[c].groups || {})[sym] || "").filter(Boolean))];
    selD.innerHTML = `<option value="">Tất cả phòng ban</option>` + groups.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
  }
  function render() {
    const sym = selC.value, dept = selD.value;
    let members = (D.companies[sym].members || []).map(code => {
      const p = D.people[code];
      return { code, p, pos: (p.positions || {})[sym] || "", grp: (p.groups || {})[sym] || "" };
    });
    if (dept) members = members.filter(m => m.grp === dept);
    res.innerHTML = `<div class="muted" style="margin:4px 0 10px">${members.length} người · ${esc(sym)}${dept ? " · " + esc(dept) : ""}</div>
      <div class="list-card">` + members.map(m => `
        <a class="list-row" href="hoso.html?code=${encodeURIComponent(m.code)}">
          ${avatarSm({ name: m.p.name, image: m.p.image })}
          <div class="lr-main"><div class="lr-name">${esc(strip(m.p.name))}</div><div class="lr-sub">${esc(m.pos)}${m.grp ? " · " + esc(m.grp) : ""}</div></div>
          <i class="ti ti-chevron-right lr-arrow" aria-hidden="true"></i>
        </a>`).join("") + `</div>`;
  }
  selC.onchange = () => { fillDepts(); render(); };
  selD.onchange = render;
  fillDepts();
  const preD = params.get("dept");
  if (preD) selD.value = preD;
  render();
});
