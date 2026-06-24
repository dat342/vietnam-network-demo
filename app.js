/* ===== Mang luoi quan he doanh nhan VN — logic tim duong ===== */
(function () {
  "use strict";
  const D = window.GRAPH_DATA;
  if (!D) { alert("Khong tai duoc data.js"); return; }

  const people = D.people;        // code -> {name, companies[], positions{sym:pos}}
  const companies = D.companies;  // sym  -> {members[], sector, group?}

  /* ---------- xay do thi luong cuc (bipartite) + canh mo rong ---------- */
  // node id: "p:"+code (nguoi), "c:"+sym (cong ty)
  const adj = new Map();
  const addEdge = (a, b, weak) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, weak });
    adj.get(b).push({ to: a, weak });
  };

  // canh manh: nguoi <-> cong ty (cung ban lanh dao)
  for (const sym in companies) {
    for (const code of companies[sym].members) addEdge("p:" + code, "c:" + sym, false);
  }
  // canh yeu: cong ty <-> cong ty (cung nganh hoac cung tap doan)
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
  Object.values(bySector).forEach(linkClique);
  Object.values(byGroup).forEach(linkClique);

  /* ---------- BFS tim duong ngan nhat ---------- */
  function bfs(srcId, dstId, allowWeak) {
    if (srcId === dstId) return [srcId];
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
  // tap node toi duoc tu src (de bao "khong noi duoc")
  function reachableCount(srcId, allowWeak) {
    const seen = new Set([srcId]); const q = [srcId];
    while (q.length) { const u = q.shift();
      for (const e of (adj.get(u) || [])) {
        if (e.weak && !allowWeak) continue;
        if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
      } }
    let pp = 0; seen.forEach(n => { if (n[0] === "p") pp++; });
    return pp;
  }

  /* ---------- tien ich hien thi ---------- */
  const stripTitle = s => s.replace(/^(Ông|Bà)\s+/i, "");
  const initials = s => { const t = stripTitle(s).trim().split(/\s+/); return ((t[t.length-2]||t[0]||"?")[0] + (t[t.length-1]||"")[0]).toUpperCase(); };
  const nodeIsPerson = id => id[0] === "p";
  const codeOf = id => id.slice(2), symOf = id => id.slice(2);
  const companyLabel = sym => sym; // ma chung khoan = nhan, ai cung nhan ra

  // nhan canh giua 2 node lien tiep trong path
  function edgeLabel(a, b) {
    if (nodeIsPerson(a) !== nodeIsPerson(b)) {
      // nguoi <-> cong ty: hien chuc vu cua nguoi tai cong ty do
      const pid = nodeIsPerson(a) ? a : b, cid = nodeIsPerson(a) ? b : a;
      const pos = people[codeOf(pid)].positions[symOf(cid)] || "Thành viên";
      return { text: pos + " · " + symOf(cid), weak: false };
    }
    // cong ty <-> cong ty: cung tap doan (uu tien) hoac cung nganh
    const ca = companies[symOf(a)], cb = companies[symOf(b)];
    if (ca.group && ca.group === cb.group) return { text: "Cùng " + ca.group, weak: true };
    return { text: "Cùng ngành " + ca.sector, weak: true };
  }

  /* ---------- render ket qua ---------- */
  const resultEl = document.getElementById("result");

  function render(path, from, to, allowWeak) {
    if (!path) {
      const r = reachableCount("p:" + from, allowWeak);
      resultEl.innerHTML = `<div class="panel empty-msg">
        <div class="big">😕 Chưa tìm thấy đường kết nối</div>
        <div>Hai người này hiện thuộc hai cụm mạng lưới tách biệt.
        ${allowWeak ? "" : "Hãy thử bật <b>“Kết nối mở rộng”</b> ở trên để nối thêm liên kết cùng ngành / tập đoàn."}</div>
        <div style="margin-top:10px">Từ <b>${stripTitle(people[from].name)}</b> hiện có thể với tới
        <b>${r.toLocaleString("vi")}</b> người trong mạng lưới${allowWeak ? "" : " (chế độ quan hệ thật)"}.</div>
      </div>`;
      return;
    }

    const persons = path.filter(nodeIsPerson);
    const hops = persons.length - 1;          // so "buoc" nguoi-toi-nguoi
    const middlePeople = Math.max(persons.length - 2, 0);
    const usedWeak = path.some((id, i) => i > 0 && edgeLabel(path[i-1], id).weak);

    // headline
    let descr;
    if (middlePeople === 0) descr = `<b>${stripTitle(people[from].name)}</b> và <b>${stripTitle(people[to].name)}</b> kết nối <b>trực tiếp</b>.`;
    else descr = `<b>${stripTitle(people[from].name)}</b> → <b>${stripTitle(people[to].name)}</b> qua <b>${middlePeople}</b> người trung gian.`;

    let html = `<div class="panel">
      <div class="headline">
        <div class="deg-badge"><span class="n">${hops}</span> bước kết nối</div>
        <div class="desc">${descr}</div>
      </div>
      <div class="chain">`;

    path.forEach((id, i) => {
      // node
      if (i > 0) {
        const e = edgeLabel(path[i-1], id);
        html += `<div class="connector ${e.weak ? "weak" : "strong"}">
          <div class="lbl">${e.text}</div><div class="line"></div><div class="arrow">▸</div></div>`;
      }
      const ep = (i === 0 || i === path.length - 1) ? " endpoint" : "";
      if (nodeIsPerson(id)) {
        const p = people[codeOf(id)];
        const nc = p.companies.length;
        html += `<div class="node person${ep}" style="animation-delay:${i*70}ms">
          <div class="top"><div class="avatar">${initials(p.name)}</div>
            <div><div class="nm">${stripTitle(p.name)}</div></div></div>
          <div class="tag">${nc} doanh nghiệp${nc>1?" · cầu nối":""}</div></div>`;
      } else {
        const sym = symOf(id), c = companies[sym];
        html += `<div class="node company${ep}" style="animation-delay:${i*70}ms">
          <div class="top"><div class="avatar">${sym.slice(0,3)}</div>
            <div><div class="nm">${companyLabel(sym)}</div></div></div>
          <div class="tag">${c.sector}${c.group?" · "+c.group:""}</div></div>`;
      }
    });

    html += `</div>`;
    html += `<div class="note">📖 <b>Đọc chuỗi:</b> mỗi người nối với một công ty mà họ tham gia
      ban lãnh đạo; hai người gặp nhau khi cùng một công ty.
      ${usedWeak ? `Chuỗi này có dùng <b>liên kết mở rộng</b> (nét hồng đứt — cùng ngành/tập đoàn), không hàm ý hai bên quen nhau cá nhân.` : `Toàn bộ chuỗi là <b>quan hệ HĐQT thật</b> (nét xanh liền).`}</div>`;
    html += `</div>`;
    resultEl.innerHTML = html;
  }

  /* ---------- autocomplete ---------- */
  // danh sach nguoi de tim: {code, name, label}
  const peopleList = Object.keys(people).map(code => ({
    code,
    name: stripTitle(people[code].name),
    raw: people[code].name,
    comp: people[code].companies.join(", "),
  }));
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
                     .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  peopleList.forEach(p => p.key = norm(p.name));

  // danh sach cong ty de loc trung ten: {sym, sector, count}
  const companyList = Object.keys(companies).map(sym => ({
    sym, sector: companies[sym].sector, count: companies[sym].members.length,
  })).sort((a, b) => a.sym.localeCompare(b.sym));
  companyList.forEach(c => c.key = norm(c.sym + " " + c.sector));

  // ----- autocomplete NGUOI (co the loc theo 1 cong ty) -----
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
        const comp = people[p.code].companies.map(s => s === filterSym ? `<b>${s}</b>` : s).join(", ");
        return `<div class="ac-item" data-i="${i}"><div class="nm">${p.name}</div><div class="co">${comp}</div></div>`;
      }).join("");
      ac.classList.add("open"); hi = -1;
    }
    function search(q) {
      const nq = norm(q.trim());
      let pool = peopleList;
      if (filterSym) pool = pool.filter(p => people[p.code].companies.includes(filterSym));
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
      set(code){ selectedCode = code; input.value = stripTitle(people[code].name); clearFilterUI(); },
      setFilter(sym){
        filterSym = sym; selectedCode = null;
        const f = document.getElementById(coFieldId); if (f) f.classList.toggle("active", !!sym);
        search(input.value); if (sym) input.focus();
      },
      input,
    };
  }

  // ----- autocomplete CONG TY (de loc) -----
  function setupCompanyAC(inputId, acId, onPick) {
    const input = document.getElementById(inputId);
    const ac = document.getElementById(acId);
    let items = [], hi = -1;
    function close(){ ac.classList.remove("open"); hi = -1; }
    function search(q){
      const nq = norm(q.trim());
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

  /* ---------- cau noi (bridges) ---------- */
  const bridges = Object.keys(people)
    .map(code => ({ code, p: people[code] }))
    .filter(x => x.p.companies.length >= 2)
    .sort((a,b) => b.p.companies.length - a.p.companies.length);

  document.getElementById("bridges").innerHTML = bridges.slice(0, 14).map((x, i) =>
    `<div class="bridge" data-code="${x.code}">
      <div class="rank">${i+1}</div>
      <div><div class="bn">${stripTitle(x.p.name)}</div>
           <div class="bc">${x.p.companies.join(" · ")}</div></div>
      <div class="cnt">${x.p.companies.length} cty</div>
    </div>`).join("");
  document.getElementById("bridges").addEventListener("click", e => {
    const b = e.target.closest(".bridge"); if (!b) return;
    fromAC.set(b.dataset.code);
    document.getElementById("fromInput").scrollIntoView({behavior:"smooth",block:"center"});
  });

  /* ---------- thong ke ---------- */
  // dem thanh phan lien thong (che do quan he that)
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
  const cc = components(false);
  const npeople = Object.keys(people).length, ncomp = Object.keys(companies).length;
  document.getElementById("stats").innerHTML = `
    <div class="stat-row"><span>Doanh nghiệp niêm yết</span><b>${ncomp}</b></div>
    <div class="stat-row"><span>Tổng số nhân sự lãnh đạo</span><b>${npeople.toLocaleString("vi")}</b></div>
    <div class="stat-row"><span>Người làm cầu nối (≥2 HĐQT)</span><b>${bridges.length}</b></div>
    <div class="stat-row"><span>Số cụm tách biệt (quan hệ thật)</span><b>${cc.comps}</b></div>
    <div class="stat-row"><span>Cụm lớn nhất với tới</span><b>${cc.biggest} người</b></div>`;

  document.getElementById("metaPills").innerHTML = `
    <span class="pill">Nguồn <b>CafeF</b></span>
    <span class="pill"><b>${ncomp}</b> doanh nghiệp</span>
    <span class="pill"><b>${npeople.toLocaleString("vi")}</b> lãnh đạo</span>
    <span class="pill"><b>${bridges.length}</b> cầu nối</span>
    <span class="pill">Cập nhật <b>${(D.meta.generated_at||"").split(" ")[0]}</b></span>`;

  /* ---------- vi du goi y (cap chac chan co duong) ---------- */
  // chon vai cap doanh nhan noi tieng cung cum
  const exPairs = [];
  function findExamplesForBridge(b) {
    // ghep 2 cau noi trong cung cum lon
  }
  // tao cap ngau nhien co duong (che do that), uu tien nguoi noi tieng
  const famous = bridges.slice(0, 30).map(x => x.code);
  function makeExamples() {
    const found = [];
    const seenPairs = new Set();
    for (let tries = 0; tries < 400 && found.length < 6; tries++) {
      const a = famous[(Math.random()*famous.length)|0];
      const b = famous[(Math.random()*famous.length)|0];
      if (a===b) continue;
      const key = a<b?a+b:b+a; if (seenPairs.has(key)) continue; seenPairs.add(key);
      const path = bfs("p:"+a, "p:"+b, false);
      if (path && path.filter(nodeIsPerson).length>=3 && path.filter(nodeIsPerson).length<=6)
        found.push([a,b]);
    }
    return found;
  }
  let examples = makeExamples();
  // bo sung cap "kinh dien" neu co
  function ensurePair(nameA, nameB) {
    const a = peopleList.find(p=>norm(p.name).includes(norm(nameA)));
    const b = peopleList.find(p=>norm(p.name).includes(norm(nameB)));
    if (a&&b && bfs("p:"+a.code,"p:"+b.code,false)) examples.unshift([a.code,b.code]);
  }
  ensurePair("Phạm Nhật Vượng","Nguyễn Đăng Quang");
  examples = examples.slice(0,7);

  function renderExamples() {
    document.getElementById("examples").innerHTML = examples.map(([a,b]) =>
      `<span class="chip" data-a="${a}" data-b="${b}">${stripTitle(people[a].name)} ↔ ${stripTitle(people[b].name)}</span>`
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
    // cap ngau nhien bat ky (uu tien co duong)
    const codes = Object.keys(people);
    for (let i=0;i<300;i++){
      const a = codes[(Math.random()*codes.length)|0];
      const b = codes[(Math.random()*codes.length)|0];
      if (a===b) continue;
      const path = bfs("p:"+a,"p:"+b,allowWeak);
      if (path && path.filter(nodeIsPerson).length>=3){
        fromAC.set(a); toAC.set(b); doFind(); return;
      }
    }
    // fallback: cap cau noi
    const [a,b] = examples[(Math.random()*examples.length)|0] || [];
    if (a){ fromAC.set(a); toAC.set(b); doFind(); }
  });

  // trang thai ban dau
  resultEl.innerHTML = `<div class="panel empty-msg">
    <div class="big">👋 Chọn 2 người để bắt đầu</div>
    <div>Gõ tên vào ô phía trên, hoặc bấm một <b>cặp gợi ý</b> bên dưới để xem chuỗi kết nối.</div></div>`;
})();
