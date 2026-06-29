/* ===== Module dung chung: Firebase + auth + data + dieu huong (cho cac trang) ===== */
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
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ---------- helpers ---------- */
export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
export const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
const IMG_HOST = "https://cafef1.mediacdn.vn";
export const avatarSm = (p) => {
  const parts = String(p.name||"?").trim().split(/\s+/);
  const ini = esc(((parts[parts.length-2]||parts[0]||"?")[0] + (parts[parts.length-1]||"")[0]).toUpperCase());
  const img = p.image ? `<img src="${IMG_HOST}${esc(p.image)}" loading="lazy" alt="" onerror="this.remove()">` : "";
  return `<div class="avatar sm"><span class="ini">${ini}</span>${img}</div>`;
};
export const REL_TYPES = [
  { label:"Đồng nghiệp", icon:"💼" }, { label:"Gia đình / họ hàng", icon:"🏠" },
  { label:"Bạn bè", icon:"🤝" }, { label:"Bạn học", icon:"🎓" },
  { label:"Cấp trên (sếp)", icon:"🔼" }, { label:"Cấp dưới", icon:"🔽" },
  { label:"Đối tác", icon:"🔗" }, { label:"Người quen", icon:"👤" }, { label:"Khác", icon:"•" },
];
export const relIcon = (label) => { const t = REL_TYPES.find(r => r.label === label); return t ? t.icon : "🤝"; };
export const relSelectHTML = () =>
  `<select class="cRel"><option value="">— Quan hệ —</option>${REL_TYPES.map(t=>`<option value="${esc(t.label)}">${t.icon} ${esc(t.label)}</option>`).join("")}</select>`;

/* ---------- auth ---------- */
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }
export const login = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const register = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
export const logout = () => signOut(auth);
export function mapAuthErr(e) {
  const c = (e && e.code) || "";
  if (c.includes("invalid-credential")||c.includes("wrong-password")||c.includes("user-not-found")) return "Sai email hoặc mật khẩu.";
  if (c.includes("email-already-in-use")) return "Email đã được đăng ký.";
  if (c.includes("weak-password")) return "Mật khẩu quá ngắn (≥ 6 ký tự).";
  if (c.includes("invalid-email")) return "Email không hợp lệ.";
  if (c.includes("too-many-requests")) return "Thử lại sau ít phút.";
  return (e && e.message) || "Có lỗi xảy ra.";
}
export async function ensureProfile(user, pendingName) {
  const ref = doc(db, "users", user.uid);
  let s = await getDoc(ref);
  if (!s.exists()) {
    await setDoc(ref, { email: user.email, displayName: pendingName || (user.email||"user").split("@")[0],
      role: "user", blocked: false, createdAt: serverTimestamp() });
    s = await getDoc(ref);
  }
  return s.data();
}

/* gate dung chung cho cac trang can dang nhap.
   onReady(user, profile) duoc goi khi da dang nhap & khong bi khoa.
   needAdmin=true thi non-admin bi day ve index. */
export function requireAuth(onReady, { needAdmin = false } = {}) {
  onAuth(async (user) => {
    if (!user) { location.replace("login.html"); return; }
    let profile;
    try { profile = await ensureProfile(user); }
    catch (e) { document.body.innerHTML = `<p style="color:#fff;padding:40px">Lỗi tải hồ sơ: ${esc(e.message||e)}</p>`; return; }
    if (profile.blocked) { await logout(); location.replace("login.html?blocked=1"); return; }
    if (needAdmin && profile.role !== "admin") { location.replace("index.html"); return; }
    onReady(user, profile);
  });
}

/* ---------- data ---------- */
export async function loadAllContributions() {
  const out = [];
  const snap = await getDocs(collection(db, "contributions"));
  snap.forEach(d => {
    const x = d.data();
    if (!x.ownerName || !Array.isArray(x.contacts)) return;
    out.push({ uid: d.id, user: x.ownerName, userTitle: x.title || "", userDepartment: x.department || "", contacts: x.contacts });
  });
  return out;
}
export async function getMyContribution(uid) {
  const s = await getDoc(doc(db, "contributions", uid));
  return s.exists() ? s.data() : null;
}
export async function saveMyContribution(uid, name, title, department, contacts) {
  await setDoc(doc(db, "contributions", uid), {
    ownerUid: uid, ownerName: name, title, department, contacts, updatedAt: serverTimestamp() });
}
export async function deleteMyContribution(uid) { await deleteDoc(doc(db, "contributions", uid)); }

/* admin */
export async function adminListUsers() { const a=[]; (await getDocs(collection(db,"users"))).forEach(d=>a.push({uid:d.id,...d.data()})); return a; }
export async function adminListContribs() { const a=[]; (await getDocs(collection(db,"contributions"))).forEach(d=>a.push({uid:d.id,...d.data()})); return a; }
export async function adminSetBlocked(uid, b) { await updateDoc(doc(db,"users",uid), { blocked: b }); }
export async function adminDeleteUserData(uid) {
  await deleteDoc(doc(db,"contributions",uid)).catch(()=>{});
  await deleteDoc(doc(db,"users",uid)).catch(()=>{});
}
export async function adminDeleteContrib(uid) { await deleteDoc(doc(db,"contributions",uid)); }

/* ---------- thanh dieu huong (link sang trang khac) ---------- */
export function renderAuthBar(barId, profile, current) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const isAdmin = profile.role === "admin";
  const lnk = (href, label, key) => `<a class="ab-link${current===key?" on":""}" href="${href}">${label}</a>`;
  bar.innerHTML = `
    <span class="ab-hi">👤 <b>${esc(profile.displayName)}</b>${isAdmin?' <span class="ab-badge">ADMIN</span>':''}</span>
    <span class="ab-actions">
      ${lnk("index.html","🔎 Tìm kết nối","index")}
      ${lnk("khaibao.html","➕ Khai báo","khaibao")}
      ${lnk("toi.html","👤 Trang của tôi","toi")}
      ${isAdmin ? lnk("admin.html","🛡️ Quản trị","admin") : ""}
      <button class="btn ghost sm" id="abOut">Đăng xuất</button>
    </span>`;
  const out = bar.querySelector("#abOut");
  if (out) out.onclick = () => logout().then(() => location.replace("login.html"));
}
