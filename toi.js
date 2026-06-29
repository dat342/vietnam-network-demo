/* ===== Trang ca nhan: xem / sua / xoa khai bao cua minh ===== */
import { requireAuth, renderShell, esc, relIcon, getMyContribution, deleteMyContribution } from "./fb.js";

const $ = id => document.getElementById(id);

requireAuth(async (user, profile) => {
  renderShell("toi", profile);
  const ld = $("pageLoading"); if (ld) ld.remove();
  await render(user, profile);
});

async function render(user, profile) {
  const body = $("myBody");
  body.innerHTML = `<div class="muted">Đang tải…</div>`;
  let mine = null; try { mine = await getMyContribution(user.uid); } catch (e) {}
  const head = `<div class="my-profile">
      <div class="my-name">${esc(profile.displayName)}</div>
      <div class="muted">${esc(profile.email)} · vai trò: ${esc(profile.role)}</div>
    </div>`;

  if (!mine || !mine.contacts || !mine.contacts.length) {
    body.innerHTML = head + `<div class="my-empty">Bạn chưa khai báo quan hệ nào.</div>
      <div class="my-actions"><a class="btn" href="khaibao.html">➕ Khai báo ngay</a></div>`;
    return;
  }
  const meRole = [mine.title, mine.department].filter(Boolean).map(esc).join(" · ");
  const list = mine.contacts.map(c => {
    const sub = [c.title, c.department].filter(Boolean).map(esc).join(" · ");
    return `<div class="my-rel">
      <div><b>${esc(c.name)}</b>${sub ? ` <span class="muted">· ${sub}</span>` : ""}</div>
      <div class="my-rel-tag">${relIcon(c.relationship)} ${esc(c.relationship||"quen biết")}</div></div>`;
  }).join("");

  body.innerHTML = head +
    (meRole ? `<div class="muted" style="margin:-6px 0 6px">Chức vụ của bạn: ${meRole}</div>` : "") +
    `<div class="my-sec">Quan hệ bạn đã khai (${mine.contacts.length})</div>
     <div class="my-list">${list}</div>
     <div class="my-actions">
       <a class="btn sm" href="khaibao.html">✏️ Sửa</a>
       <button class="btn ghost sm danger" id="myDel">🗑️ Xoá toàn bộ khai báo</button>
     </div>`;
  $("myDel").onclick = async () => {
    if (!confirm("Xoá toàn bộ quan hệ bạn đã khai? Không thể hoàn tác.")) return;
    try { await deleteMyContribution(user.uid); await render(user, profile); }
    catch (e) { alert("Xoá thất bại: " + (e.message||e)); }
  };
}
