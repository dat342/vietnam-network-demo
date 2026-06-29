/* ===== Ho so nguoi ===== */
import { requireAuth, renderShell, esc, avatarSm, loadAllContributions } from "./fb.js";

const $ = id => document.getElementById(id);
const strip = s => String(s || "").replace(/^(Ông|Bà)\s+/i, "");
const IMG = "https://cafef1.mediacdn.vn";
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim();

function avatarBig(p) {
  const parts = strip(p.name || "?").trim().split(/\s+/);
  const ini = esc(((parts[parts.length-2]||parts[0]||"?")[0] + (parts[parts.length-1]||"")[0]).toUpperCase());
  const img = p.image ? `<img src="${IMG}${esc(p.image)}" loading="lazy" alt="" onerror="this.remove()">` : "";
  return `<div class="avatar big">${`<span class="ini">${ini}</span>`}${img}</div>`;
}

requireAuth(async (user, profile) => {
  renderShell("", profile);
  const ld = $("pageLoading"); if (ld) ld.remove();
  const code = new URLSearchParams(location.search).get("code") || "";
  const D = window.GRAPH_DATA || { people: {}, companies: {} };
  const body = $("hosoBody");

  if (D.people[code] && !/^(USR_|EXT_)/.test(code)) { renderCafeF(code, D.people[code], D); return; }
  // nguoi do nguoi dung dong gop
  let list = []; try { list = await loadAllContributions(); } catch (e) {}
  renderContrib(code, list, body);
});

function renderCafeF(code, p, D) {
  const body = $("hosoBody");
  const cos = p.companies || [];
  const primary = cos[0];
  const role = primary ? `${esc((p.positions||{})[primary]||"")} · ${esc(primary)}` : "";
  const quaTrinh = cos.map(sym => {
    const pos = (p.positions || {})[sym] || "Thành viên";
    const grp = (p.groups || {})[sym] || "";
    return `<div class="qt-row">
      <i class="ti ti-building" aria-hidden="true"></i>
      <div class="qt-main"><div class="qt-name">${esc(sym)} · ${esc(pos)}</div><div class="qt-sub">${esc(grp)}</div></div>
      <div class="qt-year">—</div></div>`;
  }).join("");
  // cung ban lanh dao (cong ty dau tien)
  let coMembers = "";
  if (primary) {
    const others = (D.companies[primary].members || []).filter(c => c !== code).slice(0, 12);
    coMembers = others.map(c => `<a class="chip-person" href="hoso.html?code=${encodeURIComponent(c)}">${avatarSm({name:D.people[c].name,image:D.people[c].image})}${esc(strip(D.people[c].name))}</a>`).join("");
  }
  body.innerHTML = `
    <div class="hs-head">
      ${avatarBig(p)}
      <div class="hs-id"><div class="hs-name">${esc(strip(p.name))}</div><div class="hs-role">${role}</div></div>
      <a class="btn" href="index.html?to=${encodeURIComponent(code)}"><i class="ti ti-route" aria-hidden="true"></i> Tìm đường tới người này</a>
    </div>
    <div class="stat-grid" style="margin-bottom:18px">
      <div class="stat-card"><div class="lbl"><i class="ti ti-building"></i>Doanh nghiệp</div><div class="val">${cos.length}</div></div>
      <div class="stat-card"><div class="lbl"><i class="ti ti-bridge"></i>Vai trò</div><div class="val">${cos.length>1?"Cầu nối":"—"}</div></div>
    </div>
    <div class="hs-sec">Quá trình công tác</div>
    <div class="list-card" style="margin-bottom:18px">${quaTrinh}</div>
    ${coMembers ? `<div class="hs-sec">Cùng ban lãnh đạo ${esc(primary)}</div><div class="chip-wrap">${coMembers}</div>` : ""}`;
}

function renderContrib(code, list, body) {
  const D = window.GRAPH_DATA;
  if (code.startsWith("USR_")) {
    const uid = code.slice(4);
    const c = list.find(x => x.uid === uid);
    if (!c) { body.innerHTML = `<div class="muted">Không tìm thấy hồ sơ.</div>`; return; }
    const role = [c.userTitle, c.userDepartment].filter(Boolean).map(esc).join(" · ");
    const yr = c.startYear ? `${esc(c.startYear)} – ${c.endYear?esc(c.endYear):"nay"}` : "";
    const contacts = (c.contacts||[]).map(k => `<div class="qt-row"><i class="ti ti-user" aria-hidden="true"></i>
      <div class="qt-main"><div class="qt-name">${esc(k.name)}</div><div class="qt-sub">${[k.title,k.department].filter(Boolean).map(esc).join(" · ")||"—"}</div></div>
      <div class="qt-year">${k.startYear?esc(k.startYear)+" – "+(k.endYear?esc(k.endYear):"nay"):""}</div></div>`).join("");
    body.innerHTML = `
      <div class="hs-head">
        ${avatarBig({name:c.user})}
        <div class="hs-id"><div class="hs-name">${esc(c.user)}</div><div class="hs-role">${role||"Người dùng đóng góp"}${yr?" · "+yr:""}</div></div>
        <a class="btn" href="index.html?to=${encodeURIComponent(code)}"><i class="ti ti-route" aria-hidden="true"></i> Tìm đường</a>
      </div>
      <div class="hs-sec">Quan hệ đã khai (${(c.contacts||[]).length})</div>
      <div class="list-card">${contacts||'<div class="qt-row"><div class="qt-main">Chưa khai báo</div></div>'}</div>`;
  } else {
    const name = code.startsWith("EXT_") ? code.slice(4) : code;
    const mentions = list.filter(c => (c.contacts||[]).some(k => norm(k.name) === name || (k.code === code)));
    body.innerHTML = `
      <div class="hs-head">${avatarBig({name})}
        <div class="hs-id"><div class="hs-name">${esc(name)}</div><div class="hs-role">Người được thêm vào mạng lưới</div></div></div>
      <div class="hs-sec">Được nhắc tới bởi (${mentions.length})</div>
      <div class="chip-wrap">${mentions.map(c=>`<a class="chip-person" href="hoso.html?code=USR_${encodeURIComponent(c.uid)}">${avatarSm({name:c.user})}${esc(c.user)}</a>`).join("")||'<span class="muted">—</span>'}</div>`;
  }
}
