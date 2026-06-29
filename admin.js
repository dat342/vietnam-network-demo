/* ===== Trang quan tri tong ===== */
import { requireAuth, renderShell, esc, adminListUsers, adminListContribs,
         adminSetBlocked, adminDeleteUserData, adminDeleteContrib } from "./fb.js";

const $ = id => document.getElementById(id);
let ME_UID = null;

requireAuth(async (user, profile) => {
  ME_UID = user.uid;
  renderShell("admin", profile);
  const ld = $("pageLoading"); if (ld) ld.remove();
  await render();
}, { needAdmin: true });

async function render() {
  const usersBox = $("adUsers"), stats = $("adStats");
  usersBox.innerHTML = `<div class="muted">Đang tải…</div>`;
  let users = [], contribs = [];
  try { [users, contribs] = await Promise.all([adminListUsers(), adminListContribs()]); }
  catch (e) { usersBox.innerHTML = `<div class="modal-status err">Không tải được: ${esc(e.message||e)}</div>`; return; }
  const byUid = {}; contribs.forEach(c => byUid[c.uid] = c);
  stats.innerHTML = `<span class="pill">👥 <b>${users.length}</b> tài khoản</span>
    <span class="pill">🔗 <b>${contribs.length}</b> khai báo</span>
    <span class="pill">⛔ <b>${users.filter(u=>u.blocked).length}</b> bị khoá</span>`;

  usersBox.innerHTML = users.map(u => {
    const c = byUid[u.uid];
    const nc = c && c.contacts ? c.contacts.length : 0;
    const me = u.uid === ME_UID, isAdmin = u.role === "admin";
    return `<div class="ad-user" data-uid="${esc(u.uid)}">
      <div class="ad-u-main">
        <div><b>${esc(u.displayName||"—")}</b> ${isAdmin?'<span class="ab-badge">ADMIN</span>':""} ${u.blocked?'<span class="ad-blocked">ĐÃ KHOÁ</span>':""} ${me?'<span class="muted">(bạn)</span>':""}</div>
        <div class="muted">${esc(u.email||"")} · ${nc} quan hệ đã khai</div>
      </div>
      <div class="ad-u-act">
        ${me||isAdmin?"":`<button class="btn ghost sm" data-act="block">${u.blocked?"Mở khoá":"Khoá"}</button>`}
        ${nc?`<button class="btn ghost sm" data-act="delc">Xoá khai báo</button>`:""}
        ${me||isAdmin?"":`<button class="btn ghost sm danger" data-act="deluser">Xoá tài khoản (dữ liệu)</button>`}
      </div></div>`;
  }).join("") || `<div class="muted">Chưa có tài khoản.</div>`;

  usersBox.querySelectorAll(".ad-user").forEach(row => {
    const uid = row.dataset.uid;
    row.querySelectorAll("[data-act]").forEach(btn => btn.onclick = async () => {
      const act = btn.dataset.act;
      try {
        if (act === "block") { const u = users.find(x => x.uid === uid); await adminSetBlocked(uid, !u.blocked); }
        else if (act === "delc") { if (!confirm("Xoá khai báo quan hệ của tài khoản này?")) return; await adminDeleteContrib(uid); }
        else if (act === "deluser") { if (!confirm("Xoá toàn bộ DỮ LIỆU của tài khoản này (hồ sơ + khai báo)? Tài khoản đăng nhập vẫn tồn tại tới khi bạn xoá trong Console.")) return; await adminDeleteUserData(uid); }
        await render();
      } catch (e) { alert("Thao tác thất bại: " + (e.message||e)); }
    });
  });
}
