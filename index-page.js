/* ===== Trang tim kiem (index): gate dang nhap + nap dong gop vao do thi ===== */
import { requireAuth, renderShell, loadAllContributions } from "./fb.js";

requireAuth(async (user, profile) => {
  renderShell("index", profile);
  const ld = document.getElementById("pageLoading"); if (ld) ld.remove();
  try {
    const list = await loadAllContributions();
    if (window.VNNet) window.VNNet.applyContributions(list);
  } catch (e) { console.warn("load contributions:", e); }
  if (window.VNNet) window.VNNet.selectFrom("USR_" + user.uid);
  const to = new URLSearchParams(location.search).get("to");
  if (to && window.VNNet) window.VNNet.selectTo(to);
});
