/* ===== Trang ca nhan: xem / sua / xoa khai bao cua minh ===== */
import { requireAuth, renderShell, esc, relIcon, getMyContribution, saveMyContribution, deleteMyContribution } from "./fb.js";

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
  const yrStr = (s, e) => s ? `${s}–${e || "nay"}` : "";
  const meRole = [mine.title, mine.department, yrStr(mine.startYear, mine.endYear)].filter(Boolean).map(esc).join(" · ");
  const list = mine.contacts.map((c, i) => {
    const sub = [c.title, c.department, yrStr(c.startYear, c.endYear)].filter(Boolean).map(esc).join(" · ");
    return `<div class="my-rel">
      <div><b>${esc(c.name)}</b>${sub ? ` <span class="muted">· ${sub}</span>` : ""}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="my-rel-tag">${relIcon(c.relationship)} ${esc(c.relationship||"quen biết")}</div>
        <button class="cc-remove" data-i="${i}" title="Xoá người quen này" aria-label="Xoá">✕</button>
      </div></div>`;
  }).join("");

  body.innerHTML = head +
    (meRole ? `<div class="muted" style="margin:-6px 0 6px">Chức vụ của bạn: ${meRole}</div>` : "") +
    `<div class="my-sec">Quan hệ bạn đã khai (${mine.contacts.length})</div>
     <div class="my-list">${list}</div>
     <div class="my-actions">
       <a class="btn sm" href="khaibao.html">✏️ Sửa</a>
       <button class="btn ghost sm danger" id="myDel">🗑️ Xoá toàn bộ khai báo</button>
     </div>`;

  body.querySelectorAll(".my-rel .cc-remove").forEach(btn => {
    btn.onclick = async () => {
      const i = +btn.dataset.i;
      if (!confirm(`Xoá người quen “${mine.contacts[i].name}” khỏi khai báo?`)) return;
      mine.contacts.splice(i, 1);
      try {
        if (mine.contacts.length)
          await saveMyContribution(user.uid, profile.displayName,
            { title: mine.title, department: mine.department, startYear: mine.startYear, endYear: mine.endYear, contacts: mine.contacts });
        else
          await deleteMyContribution(user.uid);
        await render(user, profile);
      } catch (e) { alert("Xoá thất bại: " + (e.message||e)); }
    };
  });

  $("myDel").onclick = async () => {
    if (!confirm("Xoá toàn bộ quan hệ bạn đã khai? Không thể hoàn tác.")) return;
    try { await deleteMyContribution(user.uid); await render(user, profile); }
    catch (e) { alert("Xoá thất bại: " + (e.message||e)); }
  };
}
