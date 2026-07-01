/* ===== Trang Tong quan (dashboard) ===== */
import { requireAuth, renderShell, getMyContribution } from "./fb.js";

requireAuth(async (user, profile) => {
  renderShell("dashboard", profile);
  const ld = document.getElementById("pageLoading"); if (ld) ld.remove();

  // Chi so lieu tong hop (graph-stats.js ~200 byte) thay vi keo ca do thi 380KB.
  // Fallback ve GRAPH_DATA neu vi ly do nao do stats khong nap duoc.
  const S = window.GRAPH_STATS;
  let ncomp, npeople, bridges;
  if (S) {
    ncomp = S.companies; npeople = S.people; bridges = S.bridges;
  } else {
    const D = window.GRAPH_DATA || { companies: {}, people: {} };
    ncomp = Object.keys(D.companies).length;
    npeople = Object.keys(D.people).length;
    bridges = 0;
    for (const c in D.people) if ((D.people[c].companies || []).length >= 2) bridges++;
  }
  let myCount = 0;
  try { const m = await getMyContribution(user.uid); myCount = m && m.contacts ? m.contacts.length : 0; } catch (e) {}

  const stat = (icon, label, val) =>
    `<div class="stat-card"><div class="lbl"><i class="ti ti-${icon}"></i>${label}</div><div class="val">${val}</div></div>`;
  document.getElementById("stats").innerHTML =
    stat("building", "Doanh nghiệp", ncomp) +
    stat("users", "Lãnh đạo", npeople.toLocaleString("vi")) +
    stat("affiliate", "Người cầu nối", bridges) +
    stat("user-check", "Quan hệ bạn khai", myCount);
});
