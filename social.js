/* ===== Lop "dong gop" — dang nhap nhe + khai bao quan he, luu chung tren Firestore ===== */
(function () {
  "use strict";

  // ---- Firebase config (apiKey web la cong khai, bao mat bang Firestore rules) ----
  const CONFIG = { apiKey: "AIzaSyB0aZyxTLX_-_bJdp8WqbpaPWa5y6xjbcE", projectId: "ketno-7650e" };
  const BASE = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents`;
  const COLL = "contributions";
  const MAX_CONTACTS = 3;

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const $ = id => document.getElementById(id);

  /* ---------- Firestore REST ---------- */
  async function loadContributions() {
    try {
      const res = await fetch(`${BASE}/${COLL}?key=${CONFIG.apiKey}&pageSize=300`);
      if (!res.ok) return [];
      const data = await res.json();
      const out = [];
      for (const doc of (data.documents || [])) {
        const sv = doc.fields && doc.fields.payload && doc.fields.payload.stringValue;
        if (!sv) continue;
        try { const p = JSON.parse(sv); if (p && p.user) out.push(p); } catch (e) {}
      }
      return out;
    } catch (e) { console.warn("loadContributions:", e); return []; }
  }
  async function saveContribution(contrib) {
    const body = { fields: {
      user: { stringValue: String(contrib.user || "").slice(0, 80) },
      createdAt: { integerValue: String(Date.now()) },
      payload: { stringValue: JSON.stringify(contrib) },
    }};
    const res = await fetch(`${BASE}/${COLL}?key=${CONFIG.apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 200));
    return res.json();
  }

  async function refresh() {
    const list = await loadContributions();
    if (window.VNNet) window.VNNet.applyContributions(list);
    return list;
  }

  /* ---------- dung modal ---------- */
  const REL_SUGGEST = ["Đồng nghiệp","Bạn bè","Gia đình / họ hàng","Bạn học","Cấp trên (sếp)","Cấp dưới","Đối tác","Người quen","Khác"];

  function buildModal() {
    const wrap = document.createElement("div");
    wrap.className = "modal-overlay";
    wrap.id = "socialOverlay";
    let rows = "";
    for (let i = 0; i < MAX_CONTACTS; i++) {
      rows += `
      <div class="contact-row" data-i="${i}">
        <div class="cr-name field">
          <input class="cName" autocomplete="off" placeholder="Người quen #${i+1} — chọn có sẵn hoặc gõ tên mới"/>
          <div class="ac cAc"></div>
          <span class="cBadge"></span>
        </div>
        <input class="cTitle" autocomplete="off" placeholder="Chức vị (tuỳ chọn)"/>
        <input class="cRel" autocomplete="off" list="relList" placeholder="Quan hệ (vd: đồng nghiệp)"/>
      </div>`;
    }
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" id="socialClose" title="Đóng">✕</button>
        <h2>➕ Thêm bạn vào mạng lưới</h2>
        <p class="modal-sub">Khai báo tên bạn và tối đa ${MAX_CONTACTS} người bạn quen.
          Dữ liệu lưu <b>chung</b> — mọi người đều thấy. Đừng nhập thông tin nhạy cảm.</p>

        <div class="form-row">
          <label>Tên của bạn <span class="req">*</span></label>
          <input id="meName" autocomplete="off" placeholder="VD: Nguyễn Văn A"/>
        </div>
        <div class="form-row">
          <label>Chức vị / nghề của bạn (tuỳ chọn)</label>
          <input id="meTitle" autocomplete="off" placeholder="VD: Giám đốc Công ty X"/>
        </div>

        <div class="contacts-head">Người bạn quen</div>
        <div id="contactRows">${rows}</div>

        <div class="modal-status" id="socialStatus"></div>
        <div class="modal-actions">
          <button class="btn ghost" id="socialCancel">Huỷ</button>
          <button class="btn" id="socialSave">💾 Lưu vào mạng lưới</button>
        </div>
      </div>
      <datalist id="relList">${REL_SUGGEST.map(r=>`<option value="${esc(r)}">`).join("")}</datalist>`;
    document.body.appendChild(wrap);
    return wrap;
  }

  // autocomplete cho 1 o ten nguoi quen
  function wireContactAC(nameInput, acBox, badge) {
    nameInput._code = null;
    let items = [], hi = -1;
    const close = () => { acBox.classList.remove("open"); hi = -1; };
    function setBadge() {
      if (nameInput._code) { badge.textContent = "✓ có sẵn"; badge.className = "cBadge known"; }
      else if (nameInput.value.trim()) { badge.textContent = "＋ người mới"; badge.className = "cBadge nw"; }
      else { badge.textContent = ""; badge.className = "cBadge"; }
    }
    function search(q) {
      items = (window.VNNet ? window.VNNet.searchPeople(q, 30) : []);
      if (!q.trim()) { close(); return; }
      if (!items.length) { acBox.innerHTML = `<div class="ac-empty">Không có ai sẵn — sẽ tạo người mới “${esc(q)}”</div>`; acBox.classList.add("open"); return; }
      acBox.innerHTML = items.map((p, i) =>
        `<div class="ac-item" data-i="${i}"><div class="nm">${esc(p.name)}</div><div class="co">${esc(p.comp)}</div></div>`).join("");
      acBox.classList.add("open"); hi = -1;
    }
    nameInput.addEventListener("input", () => { nameInput._code = null; setBadge(); search(nameInput.value); });
    nameInput.addEventListener("focus", () => { if (nameInput.value) search(nameInput.value); });
    nameInput.addEventListener("keydown", e => {
      const n = acBox.querySelectorAll(".ac-item");
      if (e.key === "ArrowDown") { hi = Math.min(hi+1, n.length-1); e.preventDefault(); }
      else if (e.key === "ArrowUp") { hi = Math.max(hi-1, 0); e.preventDefault(); }
      else if (e.key === "Enter") { if (hi>=0 && items[hi]) pick(items[hi]); e.preventDefault(); return; }
      else if (e.key === "Escape") { close(); return; }
      n.forEach((el,i)=>el.classList.toggle("hi", i===hi));
    });
    acBox.addEventListener("mousedown", e => { const it = e.target.closest(".ac-item"); if (!it) return; pick(items[+it.dataset.i]); });
    document.addEventListener("click", e => { if (!acBox.contains(e.target) && e.target !== nameInput) close(); });
    function pick(p) { nameInput.value = p.name; nameInput._code = p.code; close(); setBadge(); }
  }

  /* ---------- khoi tao ---------- */
  function init() {
    const overlay = buildModal();
    const status = $("socialStatus");
    overlay.querySelectorAll(".contact-row").forEach(row => {
      wireContactAC(row.querySelector(".cName"), row.querySelector(".cAc"), row.querySelector(".cBadge"));
    });

    const open = () => { overlay.classList.add("open"); $("meName").focus(); };
    const close = () => { overlay.classList.remove("open"); status.textContent = ""; status.className = "modal-status"; };
    $("openSocialBtn") && $("openSocialBtn").addEventListener("click", open);
    $("socialClose").addEventListener("click", close);
    $("socialCancel").addEventListener("click", close);
    overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });

    $("socialSave").addEventListener("click", async () => {
      const user = $("meName").value.trim();
      const userTitle = $("meTitle").value.trim();
      if (!user) { status.textContent = "⚠ Hãy nhập tên của bạn."; status.className = "modal-status err"; $("meName").focus(); return; }
      const contacts = [];
      overlay.querySelectorAll(".contact-row").forEach(row => {
        const name = row.querySelector(".cName").value.trim();
        if (!name) return;
        contacts.push({
          name,
          code: row.querySelector(".cName")._code || null,
          title: row.querySelector(".cTitle").value.trim(),
          relationship: row.querySelector(".cRel").value.trim(),
        });
      });
      if (!contacts.length) { status.textContent = "⚠ Hãy khai báo ít nhất 1 người quen."; status.className = "modal-status err"; return; }

      const btn = $("socialSave");
      btn.disabled = true; status.textContent = "⏳ Đang lưu lên cơ sở dữ liệu chung…"; status.className = "modal-status";
      try {
        await saveContribution({ user, userTitle, contacts });
        await refresh();
        status.textContent = "✓ Đã lưu! Bạn đã có mặt trong mạng lưới.";
        status.className = "modal-status ok";
        // dat o "Tu nguoi" = chinh ban, de thu tim duong ngay
        const myCode = "USR_" + (window.VNNet ? window.VNNet.norm(user) : user.toLowerCase());
        setTimeout(() => { close(); if (window.VNNet) window.VNNet.selectFrom(myCode);
          const fi = $("fromInput"); fi && fi.scrollIntoView({ behavior: "smooth", block: "center" }); }, 900);
      } catch (e) {
        console.error(e);
        status.textContent = "✕ Lưu thất bại: " + e.message + " (kiểm tra mạng / quyền Firestore).";
        status.className = "modal-status err";
      } finally { btn.disabled = false; }
    });

    // nap dong gop hien co vao do thi
    refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
