/* ===== Mang luoi quan he doanh nhan VN — logic tim duong ===== */
(function () {
  "use strict";
  const D = window.GRAPH_DATA;
  if (!D) { alert("Khong tai duoc data.js"); return; }

  const people = D.people;        // code -> {name, companies[], positions{sym:pos}}  (+ synthetic: kind,title)
  const companies = D.companies;  // sym  -> {members[], sector, group?}

  /* ---------- tien ich chung ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const stripTitle = s => s.replace(/^(Ông|Bà)\s+/i, "");
  const initials = s => { const t = stripTitle(s).trim().split(/\s+/); return ((t[t.length-2]||t[0]||"?")[0] + (t[t.length-1]||"")[0]).toUpperCase(); };
  const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g, "")
                     .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  const nodeIsPerson = id => id[0] === "p";
  const codeOf = id => id.slice(2), symOf = id => id.slice(2);
  const companyLabel = sym => sym;
  const IMG_HOST = "https://cafef1.mediacdn.vn";
  function avatarHTML(p, extra) {
    const ini = esc(initials(p.name || ""));
    const img = p.image ? `<img src="${IMG_HOST}${esc(p.image)}" loading="lazy" alt="" onerror="this.remove()">` : "";
    return `<div class="avatar ${extra||""}"><span class="ini">${ini}</span>${img}</div>`;
  }
  const REL_TYPES = [
    { label:"Đồng nghiệp",        icon:"💼", color:"#0dd1ff" },
    { label:"Gia đình / họ hàng", icon:"🏠", color:"#ff7eb6" },
    { label:"Bạn bè",             icon:"🤝", color:"#07ef9c" },
    { label:"Bạn học",            icon:"🎓", color:"#ffce00" },
    { label:"Cấp trên (sếp)",     icon:"🔼", color:"#a78bfa" },
    { label:"Cấp dưới",           icon:"🔽", color:"#a78bfa" },
    { label:"Đối tác",            icon:"🔗", color:"#fb923c" },
    { label:"Người quen",         icon:"👤", color:"#8aa0d0" },
    { label:"Khác",               icon:"•",  color:"#8aa0d0" },
  ];
  const relInfo = (txt) => REL_TYPES.find(r => norm(r.label) === norm(txt||"")) || { icon:"🤝", color:"#07ef9c" };

  /* ---------- do thi (co the dung lai) ---------- */
  // node id: "p:"+code (nguoi), "c:"+sym (cong ty). Nguoi dung them: code "USR_xxx"/"EXT_xxx".
  const adj = new Map();
  const addEdge = (a, b, weak) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, weak });
    adj.get(b).push({ to: a, weak });
  };
  // cum cong ty theo nganh / tap doan (tinh 1 lan)
  const bySector = {}, byGroup = {};
  for (const sym in companies) {
    const c = companies[sym];
    (bySector[c.sector] = bySector[c.sector] || []).push(sym);
    if (c.group) (byGroup[c.group] = byGroup[c.group] || []).push(sym);
  }
  const linkClique = (list) => {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        addEdge("c:" + list[i], "c:" + list[j], true);
  };

  // canh do nguoi dung dong gop (nguoi <-> nguoi), co nhan quan he
  let contribEdges = [];                 // [{a,b}] voi a,b la code
  const contribLabels = new Map();       // "p:a|p:b" -> nhan quan he
  const synthCodes = new Set();          // cac code nguoi-dung-them dang ton tai trong `people`

  function rebuildAdj() {
    adj.clear();
    // manh: nguoi <-> cong ty
    for (const sym in companies)
      for (const code of companies[sym].members) addEdge("p:" + code, "c:" + sym, false);
    // yeu: cong ty <-> cong ty (cung nganh / tap doan)
    Object.values(bySector).forEach(linkClique);
    Object.values(byGroup).forEach(linkClique);
    // dong gop: nguoi <-> nguoi (quan he that, khong yeu)
    for (const e of contribEdges) addEdge("p:" + e.a, "p:" + e.b, false);
  }
  rebuildAdj();

  /* ---------- BFS tim duong ngan nhat ---------- */
  function bfs(srcId, dstId, allowWeak) {
    if (srcId === dstId) return [srcId];
    if (!adj.has(srcId) || !adj.has(dstId)) return null;
    const prev = new Map([[srcId, null]]);
    const q = [srcId];
    while (q.length) {
      const u = q.shift();
      if (u === dstId) break;
      for (const e of (adj.get(u) || [])) {
        if (e.weak && !allowWeak) continue;
        if (!prev.has(e.to)) { prev.set(e.to, u); q.push(e.to); }
      }
    }
    if (!prev.has(dstId)) return null;
    const path = [];
    for (let n = dstId; n != null; n = prev.get(n)) path.push(n);
    return path.reverse();
  }
  function reachableCount(srcId, allowWeak) {
    if (!adj.has(srcId)) return 0;
    const seen = new Set([srcId]); const q = [srcId];
    while (q.length) { const u = q.shift();
      for (const e of (adj.get(u) || [])) {
        if (e.weak && !allowWeak) continue;
        if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
      } }
    let pp = 0; seen.forEach(n => { if (n[0] === "p") pp++; });
    return pp - 1;
  }

  // nhan canh giua 2 node lien tiep
  function edgeLabel(a, b) {
    const pa = nodeIsPerson(a), pb = nodeIsPerson(b);
    if (pa && pb) { // canh dong gop nguoi-nguoi
      const lbl = contribLabels.get(a + "|" + b) || contribLabels.get(b + "|" + a) || "quen biết";
      const info = relInfo(lbl);
      return { text: info.icon + " " + lbl, weak: false, contrib: true, color: info.color };
    }
    if (pa !== pb) { // nguoi <-> cong ty
      const pid = pa ? a : b, cid = pa ? b : a;
      const pr = people[codeOf(pid)];
      const pos = (pr.positions && pr.positions[symOf(cid)]) || "Thành viên";
      return { text: pos + " · " + symOf(cid), weak: false };
    }
    const ca = companies[symOf(a)], cb = companies[symOf(b)];
    if (ca.group && ca.group === cb.group) return { text: "Cùng " + ca.group, weak: true };
    return { text: "Cùng ngành " + ca.sector, weak: true };
  }

  // sinh text "goi y cach ket noi" tu duong di
  function buildSuggestion(path) {
    const pIdx = [];
    path.forEach((id, i) => { if (nodeIsPerson(id)) pIdx.push(i); });
    if (pIdx.length < 2) return "";
    const nameOf = id => `<b>${esc(stripTitle(people[codeOf(id)].name))}</b>`;
    const steps = [];
    for (let k = 0; k < pIdx.length - 1; k++) {
      const a = path[pIdx[k]], b = path[pIdx[k+1]];
      const between = path.slice(pIdx[k] + 1, pIdx[k+1]).filter(x => x[0] === "c");
      let how;
      if (between.length === 0) how = `quan hệ ${esc(edgeLabel(a, b).text)}`;
      else if (between.length === 1) how = `cùng ban lãnh đạo <b>${esc(symOf(between[0]))}</b>`;
      else how = `qua <b>${esc(symOf(between[0]))}</b>–<b>${esc(symOf(between[between.length-1]))}</b> (cùng ngành/tập đoàn)`;
      steps.push(`nhờ ${nameOf(a)} giới thiệu ${nameOf(b)} <span class="how">(${how})</span>`);
    }
    const dest = nameOf(path[pIdx[pIdx.length-1]]);
    return `💡 <b>Cách kết nối tới ${dest}:</b> ` + steps.join(";<br>→ rồi ") + ".";
  }

  /* ---------- render ket qua ---------- */
  const resultEl = document.getElementById("result");

  function personNodeHTML(id, i, ep, adjSym) {
    const p = people[codeOf(id)];
    if (p.kind) { // nguoi dung them
      const role = [p.title, p.department].filter(Boolean).map(esc).join(" · ");
      const pre = p.kind === "user" ? "🙋 " : "➕ ";
      const tag = pre + (role || (p.kind === "user" ? "Người dùng thêm" : "Người được thêm"));
      return `<div class="node person contrib${ep}" style="animation-delay:${i*70}ms">
        <div class="top">${avatarHTML(p)}
          <div><div class="nm">${esc(stripTitle(p.name))}</div></div></div>
        <div class="tag">${tag}</div></div>`;
    }
    const nc = p.companies.length;
    let role = "";
    if (adjSym && p.positions && p.positions[adjSym]) {
      const grp = (p.groups && p.groups[adjSym]) || "";
      role = esc(p.positions[adjSym]) + (grp ? " · " + esc(grp) : "");
    }
    const tag = role ? (role + (nc > 1 ? ` · 🌉 ${nc} DN` : ""))
                     : `${nc} doanh nghiệp${nc>1?" · cầu nối":""}`;
    return `<div class="node person${ep}" style="animation-delay:${i*70}ms">
      <div class="top">${avatarHTML(p)}
        <div><div class="nm">${esc(stripTitle(p.name))}</div></div></div>
      <div class="tag">${tag}</div></div>`;
  }

  function render(path, from, to, allowWeak) {
    if (!path) {
      const r = reachableCount("p:" + from, allowWeak);
      resultEl.innerHTML = `<div class="panel empty-msg">
        <div class="big">😕 Chưa tìm thấy đường kết nối</div>
        <div>Hai người này hiện thuộc hai cụm mạng lưới tách biệt.
        ${allowWeak ? "" : "Hãy thử bật <b>“Kết nối mở rộng”</b> để nối thêm liên kết cùng ngành / tập đoàn."}</div>
        <div style="margin-top:10px">Từ <b>${esc(stripTitle(people[from].name))}</b> hiện có thể với tới
        <b>${r.toLocaleString("vi")}</b> người trong mạng lưới${allowWeak ? "" : " (chế độ quan hệ thật)"}.</div>
        <div class="cta-row" style="margin-top:18px">
          ${allowWeak ? "" : `<button class="btn sm" id="expandRetryBtn" type="button"><i class="ti ti-arrows-maximize"></i> Bật kết nối mở rộng &amp; thử lại</button>`}
          <a class="btn ghost sm" href="khaibao.html"><i class="ti ti-user-plus"></i> Khai báo quan hệ để mở đường</a>
        </div>
      </div>`;
      const er = document.getElementById("expandRetryBtn");
      if (er) er.onclick = () => { const w = document.getElementById("weakToggle"); w.checked = true; doFind(); };
      return;
    }

    const persons = path.filter(nodeIsPerson);
    const hops = persons.length - 1;
    const middlePeople = Math.max(persons.length - 2, 0);
    const usedWeak = path.some((id, i) => i > 0 && edgeLabel(path[i-1], id).weak);

    let descr;
    if (middlePeople === 0) descr = `<b>${esc(stripTitle(people[from].name))}</b> và <b>${esc(stripTitle(people[to].name))}</b> kết nối <b>trực tiếp</b>.`;
    else descr = `<b>${esc(stripTitle(people[from].name))}</b> → <b>${esc(stripTitle(people[to].name))}</b> qua <b>${middlePeople}</b> người trung gian.`;

    let html = `<div class="panel">
      <div class="headline">
        <div class="deg-badge"><span class="n">${hops}</span> bước kết nối</div>
        <div class="desc">${descr}</div>
        <button class="btn ghost sm" id="shareBtn" type="button" style="margin-left:auto"><i class="ti ti-share"></i> Chia sẻ</button>
      </div>
      <div class="chain vertical">`;

    path.forEach((id, i) => {
      if (i > 0) {
        const e = edgeLabel(path[i-1], id);
        const cls = e.contrib ? "contrib" : (e.weak ? "weak" : "strong");
        const stl = e.color ? ` style="--rel:${esc(e.color)}"` : "";
        html += `<div class="connector ${cls}"${stl}>
          <div class="line"></div><div class="lbl">${esc(e.text)}</div><div class="line"></div></div>`;
      }
      const ep = (i === 0 || i === path.length - 1) ? " endpoint" : "";
      if (nodeIsPerson(id)) {
        let adjSym = "";
        if (i > 0 && path[i-1][0] === "c") adjSym = symOf(path[i-1]);
        else if (i < path.length-1 && path[i+1][0] === "c") adjSym = symOf(path[i+1]);
        html += personNodeHTML(id, i, ep, adjSym);
      } else {
        const sym = symOf(id), c = companies[sym];
        html += `<div class="node company${ep}" style="animation-delay:${i*70}ms">
          <div class="top"><div class="avatar">${sym.slice(0,3)}</div>
            <div><div class="nm">${companyLabel(sym)}</div></div></div>
          <div class="tag">${c.sector}${c.group?" · "+c.group:""}</div></div>`;
      }
    });

    html += `</div>`;
    const sugg = buildSuggestion(path);
    if (sugg) html += `<div class="suggest">${sugg}</div>`;
    html += `<div class="note">📖 <b>Đọc chuỗi:</b> mỗi người nối với một công ty mà họ tham gia
      ban lãnh đạo; hai người gặp nhau khi cùng một công ty.
      ${usedWeak ? `Chuỗi này có dùng <b>liên kết mở rộng</b> (nét đứt — cùng ngành/tập đoàn), không hàm ý hai bên quen nhau cá nhân.` : `Quan hệ HĐQT (nét xanh liền) và quan hệ do người dùng khai báo (nét xanh lá) đều là quan hệ trực tiếp.`}</div>`;
    html += `</div>`;
    resultEl.innerHTML = html;

    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) shareBtn.onclick = () => shareChain(path, from, to, hops);
  }

  /* ---------- chia se chuoi ket noi ---------- */
  function chainToText(path) {
    return path.map(id => nodeIsPerson(id)
      ? stripTitle(people[codeOf(id)].name)
      : "[" + symOf(id) + "]").join(" → ");
  }
  function shareChain(path, from, to, hops) {
    const nf = stripTitle(people[from].name), nt = stripTitle(people[to].name);
    const url = location.origin + location.pathname
      + "?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to);
    const text = `🔗 ${nf} ↔ ${nt}: ${hops} bước kết nối\n${chainToText(path)}\n${url}`;
    if (navigator.share) { navigator.share({ title: "Mạng lưới quan hệ doanh nhân VN", text }).catch(() => {}); return; }
    const done = (ok) => {
      const b = document.getElementById("shareBtn"); if (!b) return;
      const o = b.innerHTML;
      b.innerHTML = ok ? '<i class="ti ti-check"></i> Đã copy' : '<i class="ti ti-copy"></i> Copy thủ công';
      setTimeout(() => { b.innerHTML = o; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => done(true)).catch(() => { prompt("Sao chép chuỗi:", text); });
    else prompt("Sao chép chuỗi:", text);
  }

  /* ---------- danh sach tim kiem (co the dung lai) ---------- */
  const peopleList = [];   // {code,name,raw,comp,key,kind}
  function rebuildPeopleList() {
    peopleList.length = 0;
    for (const code of Object.keys(people)) {
      const p = people[code];
      const nm = stripTitle(p.name);
      peopleList.push({
        code,
        name: nm,
        raw: p.name,
        image: p.image || "",
        comp: p.kind ? (p.kind === "user" ? "🙋 Bạn (người dùng thêm)" : "➕ Người được thêm")
                     : (p.companies || []).join(", "),
        key: norm(nm),
        kind: p.kind || null,
      });
    }
  }
  rebuildPeopleList();

  const companyList = Object.keys(companies).map(sym => ({
    sym, sector: companies[sym].sector, count: companies[sym].members.length,
  })).sort((a, b) => a.sym.localeCompare(b.sym));
  companyList.forEach(c => c.key = norm(c.sym + " " + c.sector));

  /* ---------- autocomplete NGUOI (loc theo cong ty) ---------- */
  function setupPersonAC(inputId, acId, coInputId, coFieldId) {
    const input = document.getElementById(inputId);
    const ac = document.getElementById(acId);
    let items = [], hi = -1, selectedCode = null, filterSym = null;

    function close() { ac.classList.remove("open"); hi = -1; }
    function renderList(list, q) {
      items = list;
      if (!items.length) {
        ac.innerHTML = `<div class="ac-empty">Không thấy ai khớp${q ? ` “${q}”` : ""}${filterSym ? ` trong ${filterSym}` : ""}</div>`;
        ac.classList.add("open"); return;
      }
      ac.innerHTML = items.map((p, i) => {
        const comp = p.kind ? esc(p.comp)
          : (people[p.code].companies || []).map(s => s === filterSym ? `<b>${esc(s)}</b>` : esc(s)).join(", ");
        return `<div class="ac-item" data-i="${i}">${avatarHTML(p,"sm")}<div class="ac-txt"><div class="nm">${esc(p.name)}</div><div class="co">${comp}</div></div></div>`;
      }).join("");
      ac.classList.add("open"); hi = -1;
    }
    function search(q) {
      const nq = norm(q);
      let pool = peopleList;
      if (filterSym) pool = pool.filter(p => !p.kind && (people[p.code].companies || []).includes(filterSym));
      if (!nq) { if (filterSym) renderList(pool.slice(0, 80), ""); else close(); return; }
      renderList(pool.filter(p => p.key.includes(nq)).slice(0, 40), q);
    }
    input.addEventListener("input", () => { selectedCode = null; search(input.value); });
    input.addEventListener("focus", () => { if (input.value || filterSym) search(input.value); });
    input.addEventListener("keydown", e => {
      const n = ac.querySelectorAll(".ac-item");
      if (e.key === "ArrowDown") { hi = Math.min(hi+1, n.length-1); e.preventDefault(); }
      else if (e.key === "ArrowUp") { hi = Math.max(hi-1, 0); e.preventDefault(); }
      else if (e.key === "Enter") { if (hi>=0 && items[hi]) pick(items[hi]); e.preventDefault(); return; }
      else if (e.key === "Escape") { close(); return; }
      n.forEach((el,i)=>el.classList.toggle("hi", i===hi));
      if (hi>=0 && n[hi]) n[hi].scrollIntoView({block:"nearest"});
    });
    ac.addEventListener("mousedown", e => {
      const it = e.target.closest(".ac-item"); if (!it) return;
      pick(items[+it.dataset.i]);
    });
    document.addEventListener("click", e => { if (!ac.contains(e.target) && e.target!==input) close(); });
    function pick(p) { input.value = p.name; selectedCode = p.code; close(); }
    function clearFilterUI() {
      filterSym = null;
      const co = document.getElementById(coInputId); if (co) co.value = "";
      const f = document.getElementById(coFieldId); if (f) f.classList.remove("active");
    }
    return {
      get code(){ return selectedCode; },
      set(code){ if(!people[code]) return; selectedCode = code; input.value = stripTitle(people[code].name); clearFilterUI(); },
      setFilter(sym){
        filterSym = sym; selectedCode = null;
        const f = document.getElementById(coFieldId); if (f) f.classList.toggle("active", !!sym);
        search(input.value); if (sym) input.focus();
      },
      input,
    };
  }

  function setupCompanyAC(inputId, acId, onPick) {
    const input = document.getElementById(inputId);
    const ac = document.getElementById(acId);
    let items = [], hi = -1;
    function close(){ ac.classList.remove("open"); hi = -1; }
    function search(q){
      const nq = norm(q);
      items = (nq ? companyList.filter(c => c.key.includes(nq)) : companyList).slice(0, 60);
      if (!items.length){ ac.innerHTML = `<div class="ac-empty">Không thấy công ty “${q}”</div>`; ac.classList.add("open"); return; }
      ac.innerHTML = items.map((c, i) =>
        `<div class="ac-item" data-i="${i}"><div class="nm">${c.sym}</div><div class="co">${c.sector} · ${c.count} lãnh đạo</div></div>`).join("");
      ac.classList.add("open"); hi = -1;
    }
    input.addEventListener("input", () => search(input.value));
    input.addEventListener("focus", () => search(input.value));
    input.addEventListener("keydown", e => {
      const n = ac.querySelectorAll(".ac-item");
      if (e.key === "ArrowDown"){ hi = Math.min(hi+1, n.length-1); e.preventDefault(); }
      else if (e.key === "ArrowUp"){ hi = Math.max(hi-1, 0); e.preventDefault(); }
      else if (e.key === "Enter"){ if (hi>=0 && items[hi]) pick(items[hi]); e.preventDefault(); return; }
      else if (e.key === "Escape"){ close(); return; }
      n.forEach((el,i)=>el.classList.toggle("hi", i===hi));
      if (hi>=0 && n[hi]) n[hi].scrollIntoView({block:"nearest"});
    });
    ac.addEventListener("mousedown", e => { const it = e.target.closest(".ac-item"); if (!it) return; pick(items[+it.dataset.i]); });
    document.addEventListener("click", e => { if (!ac.contains(e.target) && e.target!==input) close(); });
    function pick(c){ input.value = c.sym; close(); onPick(c.sym); }
    return { input, clear(){ input.value = ""; onPick(null); } };
  }

  const fromAC = setupPersonAC("fromInput", "fromAc", "fromCo", "fromCoField");
  const toAC = setupPersonAC("toInput", "toAc", "toCo", "toCoField");
  const fromCoAC = setupCompanyAC("fromCo", "fromCoAc", sym => fromAC.setFilter(sym));
  const toCoAC = setupCompanyAC("toCo", "toCoAc", sym => toAC.setFilter(sym));
  document.getElementById("fromCoClr").addEventListener("click", () => fromCoAC.clear());
  document.getElementById("toCoClr").addEventListener("click", () => toCoAC.clear());

  /* ---------- nut tim ---------- */
  function doFind() {
    const allowWeak = document.getElementById("weakToggle").checked;
    const f = fromAC.code, t = toAC.code;
    if (!f || !t) {
      resultEl.innerHTML = `<div class="panel empty-msg"><div class="big">Hãy chọn đủ 2 người</div>
        <div>Gõ tên rồi chọn trong danh sách gợi ý (hoặc bấm một cặp ví dụ bên dưới).</div></div>`;
      return;
    }
    if (f === t) {
      resultEl.innerHTML = `<div class="panel empty-msg"><div class="big">🙂 Cùng một người rồi</div></div>`;
      return;
    }
    const path = bfs("p:" + f, "p:" + t, allowWeak);
    render(path, f, t, allowWeak);
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  document.getElementById("findBtn").addEventListener("click", doFind);
  document.getElementById("weakToggle").addEventListener("change", () => { if (fromAC.code && toAC.code) doFind(); });
  document.getElementById("swapBtn").addEventListener("click", () => {
    const a = fromAC.code, b = toAC.code;
    if (a) toAC.set(a); else { toAC.input.value=""; }
    if (b) fromAC.set(b); else { fromAC.input.value=""; }
    if (fromAC.code && toAC.code) doFind();
  });

  /* ---------- cau noi (bridges) — chi tinh nguoi CafeF ---------- */
  const bridges = Object.keys(people)
    .filter(code => !people[code].kind)
    .map(code => ({ code, p: people[code] }))
    .filter(x => (x.p.companies||[]).length >= 2)
    .sort((a,b) => b.p.companies.length - a.p.companies.length);

  document.getElementById("bridges").innerHTML = bridges.slice(0, 14).map((x, i) =>
    `<div class="bridge" data-code="${x.code}">
      <div class="rank">${i+1}</div>
      ${avatarHTML(x.p,"sm")}
      <div class="bridge-info"><div class="bn">${esc(stripTitle(x.p.name))}</div>
           <div class="bc">${esc(x.p.companies.join(" · "))}</div></div>
      <div class="cnt">${x.p.companies.length} cty</div>
    </div>`).join("");
  document.getElementById("bridges").addEventListener("click", e => {
    const b = e.target.closest(".bridge"); if (!b) return;
    fromAC.set(b.dataset.code);
    document.getElementById("fromInput").scrollIntoView({behavior:"smooth",block:"center"});
  });

  /* ---------- thong ke ---------- */
  function components(allowWeak) {
    const seen = new Set(); let comps = 0, biggest = 0;
    for (const n of adj.keys()) {
      if (seen.has(n)) continue;
      comps++; let sz=0; const q=[n]; seen.add(n);
      while (q.length){ const u=q.shift(); if(u[0]==="p")sz++;
        for(const e of adj.get(u)){ if(e.weak&&!allowWeak)continue; if(!seen.has(e.to)){seen.add(e.to);q.push(e.to);} } }
      biggest=Math.max(biggest,sz);
    }
    return { comps, biggest };
  }
  const ncomp = Object.keys(companies).length;
  function refreshStats() {
    const basePeople = Object.keys(people).filter(c => !people[c].kind).length;
    const contribCount = synthCodes.size;
    const cc = components(false);
    document.getElementById("stats").innerHTML = `
      <div class="stat-row"><span>Doanh nghiệp niêm yết</span><b>${ncomp}</b></div>
      <div class="stat-row"><span>Tổng số nhân sự lãnh đạo</span><b>${basePeople.toLocaleString("vi")}</b></div>
      <div class="stat-row"><span>Người làm cầu nối (≥2 HĐQT)</span><b>${bridges.length}</b></div>
      ${contribCount ? `<div class="stat-row"><span>👥 Người dùng đóng góp</span><b>${contribCount}</b></div>` : ""}
      <div class="stat-row"><span>Số cụm tách biệt (quan hệ thật)</span><b>${cc.comps}</b></div>
      <div class="stat-row"><span>Cụm lớn nhất với tới</span><b>${cc.biggest} người</b></div>`;
    document.getElementById("metaPills").innerHTML = `
      <span class="pill">Nguồn <b>CafeF</b></span>
      <span class="pill"><b>${ncomp}</b> doanh nghiệp</span>
      <span class="pill"><b>${basePeople.toLocaleString("vi")}</b> lãnh đạo</span>
      ${contribCount ? `<span class="pill">👥 <b>${contribCount}</b> đóng góp</span>` : ""}
      <span class="pill">Cập nhật <b>${(D.meta.generated_at||"").split(" ")[0]}</b></span>`;
  }
  refreshStats();

  /* ---------- vi du goi y ---------- */
  const famous = bridges.slice(0, 30).map(x => x.code);
  function makeExamples() {
    const found = [], seenPairs = new Set();
    for (let tries = 0; tries < 400 && found.length < 6; tries++) {
      const a = famous[(Math.random()*famous.length)|0];
      const b = famous[(Math.random()*famous.length)|0];
      if (a===b) continue;
      const key = a<b?a+b:b+a; if (seenPairs.has(key)) continue; seenPairs.add(key);
      const path = bfs("p:"+a, "p:"+b, false);
      if (path && path.filter(nodeIsPerson).length>=3 && path.filter(nodeIsPerson).length<=6) found.push([a,b]);
    }
    return found;
  }
  let examples = makeExamples();
  function ensurePair(nameA, nameB) {
    const a = peopleList.find(p=>norm(p.name).includes(norm(nameA)));
    const b = peopleList.find(p=>norm(p.name).includes(norm(nameB)));
    if (a&&b && bfs("p:"+a.code,"p:"+b.code,false)) examples.unshift([a.code,b.code]);
  }
  ensurePair("Phạm Nhật Vượng","Nguyễn Đăng Quang");
  examples = examples.slice(0,7);

  function renderExamples() {
    document.getElementById("examples").innerHTML = examples.map(([a,b]) =>
      `<span class="chip" data-a="${a}" data-b="${b}">${esc(stripTitle(people[a].name))} ↔ ${esc(stripTitle(people[b].name))}</span>`
    ).join("") || `<span class="ac-empty">Bấm “Thử ví dụ ngẫu nhiên”.</span>`;
  }
  renderExamples();
  document.getElementById("examples").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    fromAC.set(c.dataset.a); toAC.set(c.dataset.b);
    document.getElementById("weakToggle").checked = false;
    doFind();
  });

  document.getElementById("exBtn").addEventListener("click", () => {
    const allowWeak = document.getElementById("weakToggle").checked;
    const codes = Object.keys(people).filter(c => !people[c].kind);
    for (let i=0;i<300;i++){
      const a = codes[(Math.random()*codes.length)|0];
      const b = codes[(Math.random()*codes.length)|0];
      if (a===b) continue;
      const path = bfs("p:"+a,"p:"+b,allowWeak);
      if (path && path.filter(nodeIsPerson).length>=3){ fromAC.set(a); toAC.set(b); doFind(); return; }
    }
    const [a,b] = examples[(Math.random()*examples.length)|0] || [];
    if (a){ fromAC.set(a); toAC.set(b); doFind(); }
  });

  /* ---------- nap du lieu dong gop tu nguoi dung ---------- */
  // list: [{user, userTitle, contacts:[{code|null, name, title, relationship}]}]
  function applyContributions(list) {
    for (const c of synthCodes) delete people[c];
    synthCodes.clear(); contribEdges = []; contribLabels.clear();

    list = Array.isArray(list) ? list : [];
    // pass 1: tao node nguoi dung (USR_)
    for (const ct of list) {
      const uname = (ct.user||"").trim(); if (!uname) continue;
      const uCode = "USR_" + (ct.uid || norm(uname));
      if (!people[uCode]) people[uCode] = { name: uname, companies: [], kind: "user", title: (ct.userTitle||"").trim(), department: (ct.userDepartment||"").trim() };
      else { if (ct.userTitle) people[uCode].title = (ct.userTitle||"").trim(); if (ct.userDepartment) people[uCode].department = (ct.userDepartment||"").trim(); }
      synthCodes.add(uCode);
    }
    // pass 2: tao contact + canh
    for (const ct of list) {
      const uname = (ct.user||"").trim(); if (!uname) continue;
      const uCode = "USR_" + (ct.uid || norm(uname));
      for (const k of (ct.contacts||[])) {
        const cname = (k.name||"").trim(); if (!cname) continue;
        let tCode = k.code;
        if (!tCode || !people[tCode]) {
          if (tCode && /^(USR_|EXT_)/.test(tCode)) {
            people[tCode] = { name: cname, companies: [], kind: tCode.startsWith("USR_")?"user":"ext", title:(k.title||"").trim(), department:(k.department||"").trim() };
          } else {
            tCode = "EXT_" + norm(cname);
            if (!people[tCode]) people[tCode] = { name: cname, companies: [], kind: "ext", title:(k.title||"").trim(), department:(k.department||"").trim() };
            else { if (k.title && !people[tCode].title) people[tCode].title = (k.title||"").trim(); if (k.department && !people[tCode].department) people[tCode].department = (k.department||"").trim(); }
          }
          synthCodes.add(tCode);
        } else if (people[tCode].kind) {
          synthCodes.add(tCode);
        }
        if (tCode === uCode) continue;
        contribEdges.push({ a: uCode, b: tCode });
        contribLabels.set("p:"+uCode+"|p:"+tCode, (k.relationship||"").trim() || "quen biết");
      }
    }
    rebuildAdj();
    rebuildPeopleList();
    refreshStats();
  }

  /* ---------- API cho social.js ---------- */
  window.VNNet = {
    norm,
    applyContributions,
    relTypes: REL_TYPES,
    searchPeople(q, limit = 20) {
      const nq = norm(q);
      if (!nq) return [];
      return peopleList.filter(p => p.key.includes(nq)).slice(0, limit)
        .map(p => ({ code: p.code, name: p.name, comp: p.comp, kind: p.kind, image: p.image }));
    },
    selectFrom(code){ fromAC.set(code); },
    selectTo(code){ toAC.set(code); },
    findFromTo(fromCode, toCode){ fromAC.set(fromCode); if (toCode) toAC.set(toCode); doFind(); },
  };

  // trang thai ban dau
  resultEl.innerHTML = `<div class="panel empty-msg">
    <div class="big">👋 Chọn 2 người để bắt đầu</div>
    <div>Gõ tên vào ô phía trên, hoặc bấm một <b>cặp gợi ý</b> bên dưới để xem chuỗi kết nối.</div></div>`;
})();
