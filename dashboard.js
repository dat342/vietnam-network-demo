/* ===== Trang Tong quan (dashboard) ===== */
import { requireAuth, renderShell, getMyContribution } from "./fb.js";

requireAuth(async (user, profile) => {
  renderShell("dashboard", profile);
  const ld = document.getElementById("pageLoading"); if (ld) ld.remove();

  const D = window.GRAPH_DATA || { companies: {}, people: {} };
  const ncomp = Object.keys(D.companies).length;
  const npeople = Object.keys(D.people).length;
  let bridges = 0;
  for (const c in D.people) if ((D.people[c].companies || []).length >= 2) bridges++;
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
