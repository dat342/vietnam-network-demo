/* ===== Trang tim kiem (index): gate dang nhap + nap dong gop vao do thi ===== */
import { requireAuth, renderShell, loadAllContributions } from "./fb.js";

requireAuth(async (user, profile) => {
  renderShell("index", profile);
  const ld = document.getElementById("pageLoading"); if (ld) ld.remove();
  try {
    const list = await loadAllContributions();
    if (window.VNNet) window.VNNet.applyContributions(list);
  } catch (e) { console.warn("load contributions:", e); }
  const params = new URLSearchParams(location.search);
  const from = params.get("from");
  const to = params.get("to");
  if (window.VNNet) {
    // mac dinh chon chinh minh; neu mo tu link chia se (co ?from=) thi chon dung nguoi do
    window.VNNet.selectFrom(from || "USR_" + user.uid);
    if (to) window.VNNet.selectTo(to);
  }
});
