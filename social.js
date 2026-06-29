/* ===== Auth + Firestore (Firebase SDK) — dang nhap, khai bao quan he, trang ca nhan, admin ===== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc,
         collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CONFIG = {
  apiKey: "AIzaSyB0aZyxTLX_-_bJdp8WqbpaPWa5y6xjbcE",
  authDomain: "ketno-7650e.firebaseapp.com",
  projectId: "ketno-7650e",
  storageBucket: "ketno-7650e.firebasestorage.app",
  messagingSenderId: "644485750286",
  appId: "1:644485750286:web:c620df4960a984d091a65f",
};
const app = initializeApp(CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
const IMG_HOST = "https://cafef1.mediacdn.vn";
const avatarSm = (p) => {
  const parts = String(p.name||"?").trim().split(/\s+/);
  const ini = esc(((parts[parts.length-2]||parts[0]||"?")[0] + (parts[parts.length-1]||"")[0]).toUpperCase());
  const img = p.image ? `<img src="${IMG_HOST}${esc(p.image)}" loading="lazy" alt="" onerror="this.remove()">` : "";
  return `<div class="avatar sm"><span class="ini">${ini}</span>${img}</div>`;
};
const relIcon = (label) => { const t=(window.VNNet&&window.VNNet.relTypes||[]).find(r=>r.label===label); return t?t.icon:"🤝"; };
const relSelectHTML = () => {
  const types = (window.VNNet&&window.VNNet.relTypes) ? window.VNNet.relTypes : REL.map(l=>({label:l,icon:""}));
  return `<select class="cRel"><option value="">— Quan hệ —</option>${types.map(t=>`<option value="${esc(t.label)}">${t.icon?t.icon+" ":""}${esc(t.label)}</option>`).join("")}</select>`;
};
let ME = null, MY_PROFILE = null, PENDING_NAME = null;

/* ---------- DATA ---------- */
async function loadAllContributions() {
  const out = [];
  const snap = await getDocs(collection(db, "contributions"));
  snap.forEach(d => {
    const x = d.data();
    if (!x.ownerName || !Array.isArray(x.contacts)) return; // bo qua ban ghi cu / khong hop le
    out.push({ uid: d.id, user: x.ownerName, userTitle: x.title || "", userDepartment: x.department || "", contacts: x.contacts });
  });
  if (window.VNNet) window.VNNet.applyContributions(out);
  return out;
}
async function getMyContribution() {
  const s = await getDoc(doc(db, "contributions", ME.uid));
  return s.exists() ? s.data() : null;
}
async function saveMyContribution(title, department, contacts) {
  await setDoc(doc(db, "contributions", ME.uid), {
    ownerUid: ME.uid, ownerName: MY_PROFILE.displayName, title, department, contacts, updatedAt: serverTimestamp(),
  });
}
async function deleteMyContribution() { await deleteDoc(doc(db, "contributions", ME.uid)); }

async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  let s = await getDoc(ref);
  if (!s.exists()) {
    await setDoc(ref, {
      email: user.email, displayName: PENDING_NAME || (user.email || "user").split("@")[0],
      role: "user", blocked: false, createdAt: serverTimestamp(),
    });
    s = await getDoc(ref);
  }
  return s.data();
}

/* admin */
async function adminListUsers() { const a=[]; (await getDocs(collection(db,"users"))).forEach(d=>a.push({uid:d.id,...d.data()})); return a; }
async function adminListContribs() { const a=[]; (await getDocs(collection(db,"contributions"))).forEach(d=>a.push({uid:d.id,...d.data()})); return a; }
async function adminSetBlocked(uid, b) { await updateDoc(doc(db,"users",uid), { blocked: b }); }
async function adminDeleteUserData(uid) {
  await deleteDoc(doc(db,"contributions",uid)).catch(()=>{});
  await deleteDoc(doc(db,"users",uid)).catch(()=>{});
}
async function adminDeleteContrib(uid) { await deleteDoc(doc(db,"contributions",uid)); }

/* ---------- GATE (login/register) ---------- */
const gate = el(`
<div class="gate-overlay" id="gate">
  <div class="gate-card">
    <div class="gate-logo">🔗</div>
    <h2>Mạng lưới quan hệ doanh nhân VN</h2>
    <p class="gate-sub">Đăng nhập để sử dụng. Dữ liệu bạn khai báo do chính bạn quản lý.</p>
    <div class="gate-tabs">
      <button class="gt on" data-tab="login">Đăng nhập</button>
      <button class="gt" data-tab="register">Đăng ký</button>
    </div>
    <div id="loginForm">
      <input id="liEmail" type="email" autocomplete="email" placeholder="Email"/>
      <input id="liPass" type="password" autocomplete="current-password" placeholder="Mật khẩu"/>
      <button class="btn gate-btn" id="liBtn">Đăng nhập</button>
    </div>
    <div id="registerForm" hidden>
      <input id="rgName" placeholder="Tên hiển thị (vd: Nguyễn Văn A)"/>
      <input id="rgEmail" type="email" autocomplete="email" placeholder="Email"/>
      <input id="rgPass" type="password" autocomplete="new-password" placeholder="Mật khẩu (≥ 6 ký tự)"/>
      <button class="btn gate-btn" id="rgBtn">Tạo tài khoản</button>
    </div>
    <div class="gate-status" id="gateStatus"></div>
  </div>
</div>`);
document.body.appendChild(gate);
const $g = id => gate.querySelector(id);
const gateStatus = (msg, kind="") => { const s=$g("#gateStatus"); s.textContent=msg||""; s.className="gate-status "+kind; };

gate.querySelectorAll(".gt").forEach(b => b.addEventListener("click", () => {
  gate.querySelectorAll(".gt").forEach(x=>x.classList.remove("on")); b.classList.add("on");
  const t=b.dataset.tab; $g("#loginForm").hidden=(t!=="login"); $g("#registerForm").hidden=(t!=="register"); gateStatus("");
}));
function mapAuthErr(e){
  const c=(e&&e.code)||"";
  if(c.includes("invalid-credential")||c.includes("wrong-password")||c.includes("user-not-found")) return "Sai email hoặc mật khẩu.";
  if(c.includes("email-already-in-use")) return "Email đã được đăng ký.";
  if(c.includes("weak-password")) return "Mật khẩu quá ngắn (≥ 6 ký tự).";
  if(c.includes("invalid-email")) return "Email không hợp lệ.";
  if(c.includes("too-many-requests")) return "Thử lại sau ít phút.";
  return (e&&e.message)||"Có lỗi xảy ra.";
}
$g("#liBtn").addEventListener("click", async () => {
  const em=$g("#liEmail").value.trim(), pw=$g("#liPass").value;
  if(!em||!pw){ gateStatus("⚠ Nhập email và mật khẩu.","err"); return; }
  gateStatus("⏳ Đang đăng nhập…");
  try { await signInWithEmailAndPassword(auth, em, pw); } catch(e){ gateStatus("✕ "+mapAuthErr(e),"err"); }
});
$g("#rgBtn").addEventListener("click", async () => {
  const nm=$g("#rgName").value.trim(), em=$g("#rgEmail").value.trim(), pw=$g("#rgPass").value;
  if(!nm){ gateStatus("⚠ Nhập tên hiển thị.","err"); return; }
  if(!em||pw.length<6){ gateStatus("⚠ Email hợp lệ và mật khẩu ≥ 6 ký tự.","err"); return; }
  gateStatus("⏳ Đang tạo tài khoản…");
  PENDING_NAME = nm;
  try { await createUserWithEmailAndPassword(auth, em, pw); } catch(e){ gateStatus("✕ "+mapAuthErr(e),"err"); PENDING_NAME=null; }
});
[ "#liPass", "#rgPass" ].forEach(s => $g(s).addEventListener("keydown", e => { if(e.key==="Enter") gate.querySelector(s.startsWith("#li")?"#liBtn":"#rgBtn").click(); }));

/* ---------- AUTH STATE ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    ME = MY_PROFILE = null;
    gate.classList.remove("hidden");
    if (window.VNNet) window.VNNet.applyContributions([]);
    renderAuthBar();
    return;
  }
  ME = user;
  try {
    MY_PROFILE = await ensureProfile(user);
  } catch (e) { gateStatus("✕ Không tạo được hồ sơ: " + (e.message||e), "err"); return; }
  PENDING_NAME = null;
  if (MY_PROFILE.blocked) {
    gateStatus("⛔ Tài khoản của bạn đã bị khoá bởi quản trị viên.", "err");
    await signOut(auth); return;
  }
  gate.classList.add("hidden"); gateStatus("");
  renderAuthBar();
  try { await loadAllContributions(); } catch(e){ console.warn("load contribs:", e); }
  if (window.VNNet) window.VNNet.selectFrom("USR_" + user.uid);
});

/* ---------- AUTH BAR ---------- */
function renderAuthBar() {
  const bar = document.getElementById("authBar");
  if (!bar) return;
  if (!ME || !MY_PROFILE) { bar.innerHTML = ""; return; }
  const isAdmin = MY_PROFILE.role === "admin";
  bar.innerHTML = `
    <span class="ab-hi">👤 Xin chào <b>${esc(MY_PROFILE.displayName)}</b>${isAdmin?' <span class="ab-badge">ADMIN</span>':''}</span>
    <span class="ab-actions">
      <button class="btn sm" id="abDeclare">➕ Khai báo quan hệ</button>
      <button class="btn ghost sm" id="abMine">👤 Trang của tôi</button>
      ${isAdmin?'<button class="btn ghost sm" id="abAdmin">🛡️ Quản trị</button>':''}
      <button class="btn ghost sm" id="abOut">Đăng xuất</button>
    </span>`;
  bar.querySelector("#abDeclare").onclick = () => openDeclareModal();
  bar.querySelector("#abMine").onclick = () => openMyPage();
  bar.querySelector("#abOut").onclick = () => signOut(auth);
  if (isAdmin) bar.querySelector("#abAdmin").onclick = () => openAdmin();
}

/* ---------- contact autocomplete ---------- */
function wireContactAC(nameInput, acBox, badge) {
  nameInput._code = null;
  let items = [], hi = -1;
  const close = () => { acBox.classList.remove("open"); hi = -1; };
  const setBadge = () => {
    if (nameInput._code) { badge.textContent="✓ có sẵn"; badge.className="cBadge known"; }
    else if (nameInput.value.trim()) { badge.textContent="＋ người mới"; badge.className="cBadge nw"; }
    else { badge.textContent=""; badge.className="cBadge"; }
  };
  const search = (q) => {
    items = (window.VNNet ? window.VNNet.searchPeople(q, 30) : []);
    if (!q.trim()) { close(); return; }
    if (!items.length) { acBox.innerHTML = `<div class="ac-empty">Sẽ tạo người mới “${esc(q)}”</div>`; acBox.classList.add("open"); return; }
    acBox.innerHTML = items.map((p,i)=>`<div class="ac-item" data-i="${i}">${avatarSm(p)}<div class="ac-txt"><div class="nm">${esc(p.name)}</div><div class="co">${esc(p.comp)}</div></div></div>`).join("");
    acBox.classList.add("open"); hi=-1;
  };
  nameInput.addEventListener("input", () => { nameInput._code=null; setBadge(); search(nameInput.value); });
  nameInput.addEventListener("focus", () => { if(nameInput.value) search(nameInput.value); });
  nameInput.addEventListener("keydown", e => {
    const n = acBox.querySelectorAll(".ac-item");
    if(e.key==="ArrowDown"){hi=Math.min(hi+1,n.length-1);e.preventDefault();}
    else if(e.key==="ArrowUp"){hi=Math.max(hi-1,0);e.preventDefault();}
    else if(e.key==="Enter"){ if(hi>=0&&items[hi]) pick(items[hi]); e.preventDefault(); return; }
    else if(e.key==="Escape"){ close(); return; }
    n.forEach((x,i)=>x.classList.toggle("hi",i===hi));
  });
  acBox.addEventListener("mousedown", e => { const it=e.target.closest(".ac-item"); if(it) pick(items[+it.dataset.i]); });
  document.addEventListener("click", e => { if(!acBox.contains(e.target)&&e.target!==nameInput) close(); });
  function pick(p){ nameInput.value=p.name; nameInput._code=p.code; close(); setBadge(); }
}

/* ---------- DECLARE modal (khai bao / cap nhat quan he cua minh) ---------- */
const REL = ["Đồng nghiệp","Bạn bè","Gia đình / họ hàng","Bạn học","Cấp trên (sếp)","Cấp dưới","Đối tác","Người quen","Khác"];
let declareModal = null;
function buildDeclareModal() {
  let rows="";
  for(let i=0;i<3;i++) rows += `
    <div class="contact-card" data-i="${i}">
      <div class="cc-head">Người quen #${i+1}</div>
      <div class="cr-name field"><input class="cName" autocomplete="off" placeholder="Họ tên — chọn có sẵn hoặc gõ tên mới"/><div class="ac cAc"></div><span class="cBadge"></span></div>
      <div class="form-grid2">
        <input class="cDept" autocomplete="off" placeholder="Phòng ban (tuỳ chọn)"/>
        <input class="cTitle" autocomplete="off" placeholder="Chức vụ (tuỳ chọn)"/>
      </div>
      ${relSelectHTML()}
    </div>`;
  const m = el(`
  <div class="modal-overlay" id="declareOverlay">
    <div class="modal">
      <button class="modal-close" data-close>✕</button>
      <h2>➕ Khai báo / cập nhật quan hệ của bạn</h2>
      <p class="modal-sub">Node của bạn trong mạng lưới là <b id="dcMe"></b>. Khai báo tối đa 3 người bạn quen.</p>
      <div class="form-grid2">
        <div class="form-row"><label>Phòng ban của bạn (tuỳ chọn)</label><input id="dcDept" placeholder="VD: Khối Kinh doanh"/></div>
        <div class="form-row"><label>Chức vụ của bạn (tuỳ chọn)</label><input id="dcTitle" placeholder="VD: Trưởng phòng"/></div>
      </div>
      <div class="contacts-head">Người bạn quen</div>
      <div id="dcRows">${rows}</div>
      <div class="modal-status" id="dcStatus"></div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Huỷ</button>
        <button class="btn" id="dcSave">💾 Lưu</button>
      </div>
    </div>
    <datalist id="relList">${REL.map(r=>`<option value="${esc(r)}">`).join("")}</datalist>
  </div>`);
  document.body.appendChild(m);
  m.querySelectorAll(".contact-card").forEach(r => wireContactAC(r.querySelector(".cName"), r.querySelector(".cAc"), r.querySelector(".cBadge")));
  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("open"));
  m.addEventListener("mousedown", e=>{ if(e.target===m) m.classList.remove("open"); });
  m.querySelector("#dcSave").onclick = saveDeclare;
  return m;
}
async function openDeclareModal() {
  if (!declareModal) declareModal = buildDeclareModal();
  const m = declareModal;
  m.querySelector("#dcMe").textContent = MY_PROFILE.displayName;
  m.querySelector("#dcStatus").textContent = ""; m.querySelector("#dcStatus").className="modal-status";
  // prefill tu du lieu hien co
  let mine = null; try { mine = await getMyContribution(); } catch(e){}
  m.querySelector("#dcTitle").value = (mine && mine.title) || "";
  m.querySelector("#dcDept").value = (mine && mine.department) || "";
  const rows = m.querySelectorAll(".contact-card");
  rows.forEach((r,i) => {
    const c = mine && mine.contacts && mine.contacts[i];
    const nameI=r.querySelector(".cName"), badge=r.querySelector(".cBadge");
    nameI.value = c ? (c.name||"") : ""; nameI._code = c ? (c.code||null) : null;
    r.querySelector(".cDept").value = c ? (c.department||"") : "";
    r.querySelector(".cTitle").value = c ? (c.title||"") : "";
    r.querySelector(".cRel").value = c ? (c.relationship||"") : "";
    badge.textContent = nameI._code ? "✓ có sẵn" : (nameI.value ? "＋ người mới" : "");
    badge.className = "cBadge" + (nameI._code?" known":(nameI.value?" nw":""));
  });
  m.classList.add("open");
}
async function saveDeclare() {
  const m = declareModal, status = m.querySelector("#dcStatus");
  const title = m.querySelector("#dcTitle").value.trim();
  const department = m.querySelector("#dcDept").value.trim();
  const contacts = [];
  m.querySelectorAll(".contact-card").forEach(r => {
    const name = r.querySelector(".cName").value.trim(); if(!name) return;
    contacts.push({ name, code: r.querySelector(".cName")._code||null,
      department: r.querySelector(".cDept").value.trim(),
      title: r.querySelector(".cTitle").value.trim(), relationship: r.querySelector(".cRel").value.trim() });
  });
  if (!contacts.length) { status.textContent="⚠ Khai báo ít nhất 1 người quen."; status.className="modal-status err"; return; }
  const btn = m.querySelector("#dcSave"); btn.disabled=true; status.textContent="⏳ Đang lưu…"; status.className="modal-status";
  try {
    await saveMyContribution(title, department, contacts);
    await loadAllContributions();
    status.textContent="✓ Đã lưu!"; status.className="modal-status ok";
    setTimeout(()=>{ m.classList.remove("open"); if(window.VNNet) window.VNNet.selectFrom("USR_"+ME.uid);
      const fi=document.getElementById("fromInput"); fi&&fi.scrollIntoView({behavior:"smooth",block:"center"}); }, 800);
  } catch(e){ status.textContent="✕ Lưu thất bại: "+(e.message||e); status.className="modal-status err"; }
  finally { btn.disabled=false; }
}

/* ---------- MY PAGE ---------- */
let myPage = null;
function buildMyPage() {
  const m = el(`
  <div class="modal-overlay" id="myOverlay">
    <div class="modal">
      <button class="modal-close" data-close>✕</button>
      <h2>👤 Trang của tôi</h2>
      <div id="myBody"></div>
      <div class="modal-actions"><button class="btn ghost" data-close>Đóng</button></div>
    </div>
  </div>`);
  document.body.appendChild(m);
  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("open"));
  m.addEventListener("mousedown", e=>{ if(e.target===m) m.classList.remove("open"); });
  return m;
}
async function openMyPage() {
  if (!myPage) myPage = buildMyPage();
  const body = myPage.querySelector("#myBody");
  body.innerHTML = `<div class="muted">Đang tải…</div>`;
  myPage.classList.add("open");
  let mine=null; try { mine = await getMyContribution(); } catch(e){}
  const head = `<div class="my-profile"><div class="my-name">${esc(MY_PROFILE.displayName)}</div>
    <div class="muted">${esc(MY_PROFILE.email)} · vai trò: ${esc(MY_PROFILE.role)}</div></div>`;
  if (!mine || !mine.contacts || !mine.contacts.length) {
    body.innerHTML = head + `<div class="my-empty">Bạn chưa khai báo quan hệ nào.</div>
      <button class="btn" id="myDeclare">➕ Khai báo ngay</button>`;
    body.querySelector("#myDeclare").onclick = () => { myPage.classList.remove("open"); openDeclareModal(); };
    return;
  }
  const list = mine.contacts.map(c => {
    const sub = [c.title, c.department].filter(Boolean).map(esc).join(" · ");
    return `<div class="my-rel">
      <div><b>${esc(c.name)}</b>${sub?` <span class="muted">· ${sub}</span>`:""}</div>
      <div class="my-rel-tag">${relIcon(c.relationship)} ${esc(c.relationship||"quen biết")}</div></div>`;
  }).join("");
  body.innerHTML = head + `<div class="my-sec">Quan hệ bạn đã khai (${mine.contacts.length})</div>
    <div class="my-list">${list}</div>
    <div class="my-actions">
      <button class="btn sm" id="myEdit">✏️ Sửa</button>
      <button class="btn ghost sm danger" id="myDel">🗑️ Xoá toàn bộ khai báo</button>
    </div>`;
  body.querySelector("#myEdit").onclick = () => { myPage.classList.remove("open"); openDeclareModal(); };
  body.querySelector("#myDel").onclick = async () => {
    if (!confirm("Xoá toàn bộ quan hệ bạn đã khai? Không thể hoàn tác.")) return;
    try { await deleteMyContribution(); await loadAllContributions(); openMyPage(); }
    catch(e){ alert("Xoá thất bại: "+(e.message||e)); }
  };
}

/* ---------- ADMIN ---------- */
let adminPanel = null;
function buildAdmin() {
  const m = el(`
  <div class="modal-overlay" id="adminOverlay">
    <div class="modal modal-wide">
      <button class="modal-close" data-close>✕</button>
      <h2>🛡️ Quản trị tổng</h2>
      <div class="admin-stats" id="adStats"></div>
      <div class="admin-sec">Tài khoản</div>
      <div id="adUsers"></div>
      <div class="modal-actions"><button class="btn ghost" data-close>Đóng</button></div>
    </div>
  </div>`);
  document.body.appendChild(m);
  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>m.classList.remove("open"));
  m.addEventListener("mousedown", e=>{ if(e.target===m) m.classList.remove("open"); });
  return m;
}
async function openAdmin() {
  if (!adminPanel) adminPanel = buildAdmin();
  adminPanel.classList.add("open");
  const usersBox = adminPanel.querySelector("#adUsers");
  const stats = adminPanel.querySelector("#adStats");
  usersBox.innerHTML = `<div class="muted">Đang tải…</div>`;
  let users=[], contribs=[];
  try { [users, contribs] = await Promise.all([adminListUsers(), adminListContribs()]); }
  catch(e){ usersBox.innerHTML = `<div class="modal-status err">Không tải được: ${esc(e.message||e)}</div>`; return; }
  const contribByUid = {}; contribs.forEach(c=>contribByUid[c.uid]=c);
  stats.innerHTML = `<span class="pill">👥 <b>${users.length}</b> tài khoản</span>
    <span class="pill">🔗 <b>${contribs.length}</b> khai báo</span>
    <span class="pill">⛔ <b>${users.filter(u=>u.blocked).length}</b> bị khoá</span>`;
  usersBox.innerHTML = users.map(u => {
    const c = contribByUid[u.uid];
    const ncontacts = c && c.contacts ? c.contacts.length : 0;
    const me = u.uid === ME.uid;
    return `<div class="ad-user" data-uid="${esc(u.uid)}">
      <div class="ad-u-main">
        <div><b>${esc(u.displayName||"—")}</b> ${u.role==="admin"?'<span class="ab-badge">ADMIN</span>':""} ${u.blocked?'<span class="ad-blocked">ĐÃ KHOÁ</span>':""} ${me?'<span class="muted">(bạn)</span>':""}</div>
        <div class="muted">${esc(u.email||"")} · ${ncontacts} quan hệ đã khai</div>
      </div>
      <div class="ad-u-act">
        ${me||u.role==="admin"?"":`<button class="btn ghost sm" data-act="block">${u.blocked?"Mở khoá":"Khoá"}</button>`}
        ${ncontacts?`<button class="btn ghost sm" data-act="delc">Xoá khai báo</button>`:""}
        ${me||u.role==="admin"?"":`<button class="btn ghost sm danger" data-act="deluser">Xoá tài khoản (dữ liệu)</button>`}
      </div></div>`;
  }).join("") || `<div class="muted">Chưa có tài khoản.</div>`;
  usersBox.querySelectorAll(".ad-user").forEach(row => {
    const uid = row.dataset.uid;
    row.querySelectorAll("[data-act]").forEach(btn => btn.onclick = async () => {
      const act = btn.dataset.act;
      try {
        if (act==="block") { const u=users.find(x=>x.uid===uid); await adminSetBlocked(uid, !u.blocked); }
        else if (act==="delc") { if(!confirm("Xoá khai báo quan hệ của tài khoản này?")) return; await adminDeleteContrib(uid); }
        else if (act==="deluser") { if(!confirm("Xoá toàn bộ DỮ LIỆU của tài khoản này (hồ sơ + khai báo)? Tài khoản đăng nhập vẫn tồn tại tới khi bạn xoá trong Console.")) return; await adminDeleteUserData(uid); }
        await loadAllContributions(); openAdmin();
      } catch(e){ alert("Thao tác thất bại: "+(e.message||e)); }
    });
  });
}
