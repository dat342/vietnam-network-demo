/* ===== Trang dang nhap / dang ky ===== */
import { onAuth, login, register, resetPassword, ensureProfile, logout, mapAuthErr } from "./fb.js";

const $ = id => document.getElementById(id);
let pendingName = null, redirecting = false;
const status = (msg, kind = "") => { const s = $("gateStatus"); s.textContent = msg || ""; s.className = "gate-status " + kind; };

if (location.search.includes("blocked=1")) status("⛔ Tài khoản của bạn đã bị khoá bởi quản trị viên.", "err");

document.querySelectorAll(".gt").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".gt").forEach(x => x.classList.remove("on")); b.classList.add("on");
  const t = b.dataset.tab;
  $("loginForm").hidden = (t !== "login"); $("registerForm").hidden = (t !== "register"); status("");
}));

// hien / an mat khau
$("liShow").addEventListener("change", e => { $("liPass").type = e.target.checked ? "text" : "password"; });
$("rgShow").addEventListener("change", e => { $("rgPass").type = e.target.checked ? "text" : "password"; });

$("liBtn").addEventListener("click", async () => {
  const em = $("liEmail").value.trim(), pw = $("liPass").value;
  if (!em || !pw) { status("⚠ Nhập email và mật khẩu.", "err"); return; }
  const btn = $("liBtn"); btn.disabled = true;
  status("⏳ Đang đăng nhập…");
  try { await login(em, pw); }
  catch (e) { status("✕ " + mapAuthErr(e), "err"); btn.disabled = false; }
});
$("rgBtn").addEventListener("click", async () => {
  const nm = $("rgName").value.trim(), em = $("rgEmail").value.trim(), pw = $("rgPass").value;
  if (!nm) { status("⚠ Nhập tên hiển thị.", "err"); return; }
  if (!em || pw.length < 6) { status("⚠ Email hợp lệ và mật khẩu ≥ 6 ký tự.", "err"); return; }
  const btn = $("rgBtn"); btn.disabled = true;
  status("⏳ Đang tạo tài khoản…");
  pendingName = nm;
  try { await register(em, pw); }
  catch (e) { status("✕ " + mapAuthErr(e), "err"); pendingName = null; btn.disabled = false; }
});
$("liForgot").addEventListener("click", async e => {
  e.preventDefault();
  const em = $("liEmail").value.trim();
  if (!em) { status("⚠ Nhập email vào ô trên rồi bấm “Quên mật khẩu?”.", "err"); return; }
  status("⏳ Đang gửi email đặt lại…");
  try { await resetPassword(em); status("✓ Đã gửi email đặt lại mật khẩu tới " + em + " (kiểm tra cả hộp thư rác).", "ok"); }
  catch (e) { status("✕ " + mapAuthErr(e), "err"); }
});
$("liPass").addEventListener("keydown", e => { if (e.key === "Enter") $("liBtn").click(); });
$("rgPass").addEventListener("keydown", e => { if (e.key === "Enter") $("rgBtn").click(); });

onAuth(async (user) => {
  if (!user || redirecting) return;
  redirecting = true;
  try {
    const profile = await ensureProfile(user, pendingName);
    if (profile.blocked) { await logout(); redirecting = false; status("⛔ Tài khoản đã bị khoá.", "err"); return; }
  } catch (e) { redirecting = false; status("✕ " + mapAuthErr(e), "err"); return; }
  location.replace("dashboard.html");
});
