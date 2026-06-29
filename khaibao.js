/* ===== Trang khai bao quan he ===== */
import { requireAuth, renderShell, esc, avatarSm, relSelectHTML,
         loadAllContributions, getMyContribution, saveMyContribution } from "./fb.js";

const $ = id => document.getElementById(id);
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim();

const PEOPLE = [];
function buildIndex(contribList) {
  PEOPLE.length = 0;
  const D = window.GRAPH_DATA;
  for (const code in D.people) {
    const p = D.people[code];
    PEOPLE.push({ code, name: String(p.name).replace(/^(Ông|Bà)\s+/i,""), image: p.image||"", comp: (p.companies||[]).join(", ") });
  }
  for (const c of contribList) {
    PEOPLE.push({ code: "USR_" + c.uid, name: c.user, image: "", comp: "🙋 Người dùng thêm" });
    for (const k of (c.contacts||[])) if (!k.code && k.name) PEOPLE.push({ code: "EXT_" + norm(k.name), name: k.name, image: "", comp: "➕ Người được thêm" });
  }
  PEOPLE.forEach(p => p.key = norm(p.name));
}
const searchPeople = (q, limit = 30) => { const nq = norm(q); return nq ? PEOPLE.filter(p => p.key.includes(nq)).slice(0, limit) : []; };

function buildRows() {
  let rows = "";
  for (let i = 0; i < 3; i++) rows += `
    <div class="contact-card" data-i="${i}">
      <div class="cc-head">Người quen #${i+1}</div>
      <div class="cr-name field"><input class="cName" autocomplete="off" placeholder="Họ tên — chọn có sẵn hoặc gõ tên mới"/><div class="ac cAc"></div><span class="cBadge"></span></div>
      <div class="form-grid2">
        <input class="cDept" autocomplete="off" placeholder="Phòng ban (tuỳ chọn)"/>
        <input class="cTitle" autocomplete="off" placeholder="Chức vụ (tuỳ chọn)"/>
      </div>
      <div class="form-grid2">
        <input class="cStart" inputmode="numeric" autocomplete="off" placeholder="Năm bắt đầu"/>
        <input class="cEnd" inputmode="numeric" autocomplete="off" placeholder="Năm kết thúc"/>
      </div>
      ${relSelectHTML()}
    </div>`;
  $("dcRows").innerHTML = rows;
  document.querySelectorAll(".contact-card").forEach(r =>
    wireContactAC(r.querySelector(".cName"), r.querySelector(".cAc"), r.querySelector(".cBadge")));
}

function wireContactAC(nameInput, acBox, badge) {
  nameInput._code = null;
  let items = [], hi = -1;
  const close = () => { acBox.classList.remove("open"); hi = -1; };
  const setBadge = () => {
    if (nameInput._code) { badge.textContent = "✓ có sẵn"; badge.className = "cBadge known"; }
    else if (nameInput.value.trim()) { badge.textContent = "＋ người mới"; badge.className = "cBadge nw"; }
    else { badge.textContent = ""; badge.className = "cBadge"; }
  };
  const search = (q) => {
    items = searchPeople(q, 30);
    if (!q.trim()) { close(); return; }
    if (!items.length) { acBox.innerHTML = `<div class="ac-empty">Sẽ tạo người mới “${esc(q)}”</div>`; acBox.classList.add("open"); return; }
    acBox.innerHTML = items.map((p,i)=>`<div class="ac-item" data-i="${i}">${avatarSm(p)}<div class="ac-txt"><div class="nm">${esc(p.name)}</div><div class="co">${esc(p.comp)}</div></div></div>`).join("");
    acBox.classList.add("open"); hi = -1;
  };
  nameInput.addEventListener("input", () => { nameInput._code = null; setBadge(); search(nameInput.value); });
  nameInput.addEventListener("focus", () => { if (nameInput.value) search(nameInput.value); });
  nameInput.addEventListener("keydown", e => {
    const n = acBox.querySelectorAll(".ac-item");
    if (e.key==="ArrowDown"){ hi=Math.min(hi+1,n.length-1); e.preventDefault(); }
    else if (e.key==="ArrowUp"){ hi=Math.max(hi-1,0); e.preventDefault(); }
    else if (e.key==="Enter"){ if(hi>=0&&items[hi]) pick(items[hi]); e.preventDefault(); return; }
    else if (e.key==="Escape"){ close(); return; }
    n.forEach((x,i)=>x.classList.toggle("hi",i===hi));
  });
  acBox.addEventListener("mousedown", e => { const it=e.target.closest(".ac-item"); if(it) pick(items[+it.dataset.i]); });
  document.addEventListener("click", e => { if(!acBox.contains(e.target)&&e.target!==nameInput) close(); });
  function pick(p){ nameInput.value=p.name; nameInput._code=p.code; close(); setBadge(); }
}

requireAuth(async (user, profile) => {
  renderShell("khaibao", profile);
  $("meName").textContent = profile.displayName;
  let contribList = [];
  try { contribList = await loadAllContributions(); } catch (e) {}
  buildIndex(contribList);
  buildRows();
  // prefill
  let mine = null; try { mine = await getMyContribution(user.uid); } catch (e) {}
  $("dcTitle").value = (mine && mine.title) || "";
  $("dcDept").value = (mine && mine.department) || "";
  $("dcStart").value = (mine && mine.startYear) || "";
  $("dcEnd").value = (mine && mine.endYear) || "";
  document.querySelectorAll(".contact-card").forEach((r, i) => {
    const c = mine && mine.contacts && mine.contacts[i];
    const nameI = r.querySelector(".cName"), badge = r.querySelector(".cBadge");
    nameI.value = c ? (c.name||"") : ""; nameI._code = c ? (c.code||null) : null;
    r.querySelector(".cDept").value = c ? (c.department||"") : "";
    r.querySelector(".cTitle").value = c ? (c.title||"") : "";
    r.querySelector(".cStart").value = c ? (c.startYear||"") : "";
    r.querySelector(".cEnd").value = c ? (c.endYear||"") : "";
    r.querySelector(".cRel").value = c ? (c.relationship||"") : "";
    badge.textContent = nameI._code ? "✓ có sẵn" : (nameI.value ? "＋ người mới" : "");
    badge.className = "cBadge" + (nameI._code ? " known" : (nameI.value ? " nw" : ""));
  });
  const ld = $("pageLoading"); if (ld) ld.remove();

  $("dcSave").onclick = async () => {
    const status = $("dcStatus");
    const title = $("dcTitle").value.trim(), department = $("dcDept").value.trim();
    const startYear = $("dcStart").value.trim(), endYear = $("dcEnd").value.trim();
    const contacts = [];
    document.querySelectorAll(".contact-card").forEach(r => {
      const name = r.querySelector(".cName").value.trim(); if (!name) return;
      contacts.push({ name, code: r.querySelector(".cName")._code || null,
        department: r.querySelector(".cDept").value.trim(),
        title: r.querySelector(".cTitle").value.trim(),
        startYear: r.querySelector(".cStart").value.trim(),
        endYear: r.querySelector(".cEnd").value.trim(),
        relationship: r.querySelector(".cRel").value.trim() });
    });
    if (!contacts.length) { status.textContent = "⚠ Khai báo ít nhất 1 người quen."; status.className = "modal-status err"; return; }
    const btn = $("dcSave"); btn.disabled = true; status.textContent = "⏳ Đang lưu…"; status.className = "modal-status";
    try {
      await saveMyContribution(user.uid, profile.displayName, { title, department, startYear, endYear, contacts });
      status.textContent = "✓ Đã lưu! Đang chuyển…"; status.className = "modal-status ok";
      setTimeout(() => location.href = "toi.html", 700);
    } catch (e) { status.textContent = "✕ Lưu thất bại: " + (e.message||e); status.className = "modal-status err"; btn.disabled = false; }
  };
});
