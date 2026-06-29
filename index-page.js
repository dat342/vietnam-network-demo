/* ===== Trang tim kiem (index): gate dang nhap + nap dong gop vao do thi ===== */
import { requireAuth, renderAuthBar, loadAllContributions } from "./fb.js";

requireAuth(async (user, profile) => {
  renderAuthBar("authBar", profile, "index");
  const ld = document.getElementById("pageLoading"); if (ld) ld.remove();
  try {
    const list = await loadAllContributions();
    if (window.VNNet) window.VNNet.applyContributions(list);
  } catch (e) { console.warn("load contributions:", e); }
  if (window.VNNet) window.VNNet.selectFrom("USR_" + user.uid);
});
