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
    // nguoi dung chua khai bao thi chua co mat tren do thi -> goi y
    const myCode = "USR_" + user.uid;
    if (!from && !window.VNNet.hasPerson(myCode)) {
      const r = document.getElementById("result");
      if (r) r.innerHTML = `<div class="panel empty-msg">
        <div class="big">👋 Bạn chưa có mặt trên mạng lưới</div>
        <div>Hãy <a href="khaibao.html">khai báo quan hệ của bạn</a> để tự xuất hiện và tìm đường từ chính mình.
        Trong lúc đó, bạn vẫn có thể chọn <b>2 người bất kỳ</b> ở trên để xem chuỗi kết nối.</div>
      </div>`;
    }
  }
});
