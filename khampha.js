/* ===== Kham pha mang luoi: do thi ego quanh 1 nguoi (vis-network) ===== */
import { requireAuth, renderShell, esc, loadAllContributions } from "./fb.js";

const $ = id => document.getElementById(id);
const strip = s => String(s || "").replace(/^(Ông|Bà)\s+/i, "");
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().trim();

const PER_COMPANY = 8, MAX_NODES = 60;
let D, contribAdj = {}, contribPeople = {}, network = null, PEOPLE = [];

requireAuth(async (user, profile) => {
  renderShell("khampha", profile);
  D = window.GRAPH_DATA || { people: {}, companies: {} };

  let list = []; try { list = await loadAllContributions(); } catch (e) {}
  buildContrib(list);
  buildSearchIndex();
  $("pageLoading") && $("pageLoading").remove();

  if (!window.vis) { $("graph").innerHTML = `<div class="muted" style="padding:30px;text-align:center">Không tải được thư viện đồ thị (mạng?). Tải lại trang giúp.</div>`; return; }

  setupSearch();
  // tam chon: chinh ban (neu da khai bao) hoac 1 doanh nhan noi tieng
  let start = "USR_" + user.uid;
  if (!contribPeople[start]) start = findCode("Trương Gia Bình") || Object.keys(D.people)[0];
  renderEgo(start);
});

function buildContrib(list) {
  contribAdj = {}; contribPeople = {};
  const link = (a, b) => { (contribAdj[a] = contribAdj[a] || []).push(b); (contribAdj[b] = contribAdj[b] || []).push(a); };
  for (const c of list) {
    const u = "USR_" + c.uid; contribPeople[u] = { name: c.user, image: "" };
    for (const k of (c.contacts || [])) {
      let t = k.code;
      if (!t || !(D.people[t] || contribPeople[t])) { t = "EXT_" + norm(k.name); contribPeople[t] = { name: k.name, image: "" }; }
      link(u, t);
    }
  }
}
const personOf = code => D.people[code] || contribPeople[code] || { name: code, image: "" };
const isContrib = code => /^(USR_|EXT_)/.test(code);

function buildSearchIndex() {
  PEOPLE = [];
  for (const code in D.people) PEOPLE.push({ code, name: strip(D.people[code].name) });
  for (const code in contribPeople) PEOPLE.push({ code, name: strip(contribPeople[code].name) });
  PEOPLE.forEach(p => p.key = norm(p.name));
}
const findCode = nm => { const r = PEOPLE.find(p => p.key.includes(norm(nm))); return r && r.code; };

/* ---- dung do thi ego quanh centerCode ---- */
function renderEgo(centerCode) {
  const nodesMap = new Map(), edges = [];
  const addP = (code, center) => {
    const id = "p:" + code; if (nodesMap.has(id)) return id;
    const p = personOf(code);
    nodesMap.set(id, { id, label: strip(p.name), group: center ? "center" : (isContrib(code) ? "user" : "person") });
    return id;
  };
  const addC = (sym) => { const id = "c:" + sym; if (!nodesMap.has(id)) nodesMap.set(id, { id, label: sym, group: "company" }); return id; };

  const cId = addP(centerCode, true);
  // cong ty cua center (neu la nguoi CafeF)
  const cos = (D.people[centerCode] && D.people[centerCode].companies) || [];
  for (const sym of cos) {
    if (nodesMap.size >= MAX_NODES) break;
    addC(sym); edges.push({ from: cId, to: "c:" + sym });
    const members = (D.companies[sym].members || []).filter(c => c !== centerCode).slice(0, PER_COMPANY);
    for (const m of members) { if (nodesMap.size >= MAX_NODES) break; const mid = addP(m); edges.push({ from: "c:" + sym, to: mid }); }
  }
  // quan he nguoi dung khai (contrib)
  for (const nb of (contribAdj[centerCode] || [])) {
    if (nodesMap.size >= MAX_NODES) break;
    const nid = addP(nb); edges.push({ from: cId, to: nid, dashes: true, color: { color: "#16a34a" } });
  }

  const data = {
    nodes: new vis.DataSet([...nodesMap.values()]),
    edges: new vis.DataSet(edges.map((e, i) => ({ id: i, ...e }))),
  };
  const options = {
    nodes: { shape: "dot", size: 15, borderWidth: 2, font: { size: 13, color: "#1f2430" } },
    groups: {
      center: { color: { background: "#004aef", border: "#0036b0" }, font: { color: "#fff" }, size: 26 },
      person: { color: { background: "#cfe0ff", border: "#3d74ff" } },
      user:   { color: { background: "#c8f0d8", border: "#16a34a" } },
      company:{ shape: "box", color: { background: "#ffe9b3", border: "#e0a400" }, font: { color: "#5a4500" } },
    },
    edges: { color: { color: "#cbd5e6" }, width: 1.5, smooth: { type: "continuous" } },
    physics: { stabilization: { iterations: 150 }, barnesHut: { springLength: 130, gravitationalConstant: -4000 } },
    interaction: { hover: true, tooltipDelay: 120 },
  };
  if (network) network.destroy();
  network = new vis.Network($("graph"), data, options);
  network.on("click", params => {
    if (!params.nodes.length) return;
    const id = params.nodes[0];
    if (id.startsWith("p:")) renderEgo(id.slice(2));
    else if (id.startsWith("c:")) renderCompany(id.slice(2));
  });
}

/* ---- do thi quanh 1 cong ty ---- */
function renderCompany(sym) {
  const nodesMap = new Map(), edges = [];
  nodesMap.set("c:" + sym, { id: "c:" + sym, label: sym, group: "center", shape: "box" });
  const members = (D.companies[sym].members || []).slice(0, MAX_NODES - 1);
  for (const m of members) {
    nodesMap.set("p:" + m, { id: "p:" + m, label: strip(personOf(m).name), group: "person" });
    edges.push({ from: "c:" + sym, to: "p:" + m });
  }
  const data = { nodes: new vis.DataSet([...nodesMap.values()]), edges: new vis.DataSet(edges.map((e,i)=>({id:i,...e}))) };
  const options = {
    nodes: { shape: "dot", size: 15, borderWidth: 2, font: { size: 13, color: "#1f2430" } },
    groups: {
      center: { shape: "box", color: { background: "#004aef", border: "#0036b0" }, font: { color: "#fff", size: 16 }, size: 26 },
      person: { color: { background: "#cfe0ff", border: "#3d74ff" } },
    },
    edges: { color: { color: "#cbd5e6" }, width: 1.5, smooth: { type: "continuous" } },
    physics: { stabilization: { iterations: 150 }, barnesHut: { springLength: 130 } },
    interaction: { hover: true },
  };
  if (network) network.destroy();
  network = new vis.Network($("graph"), data, options);
  network.on("click", params => { if (params.nodes.length && params.nodes[0].startsWith("p:")) renderEgo(params.nodes[0].slice(2)); });
}

/* ---- o tim trung tam ---- */
function setupSearch() {
  const input = $("centerSearch"), ac = $("centerAc");
  let items = [], hi = -1;
  const close = () => { ac.classList.remove("open"); hi = -1; };
  const search = q => {
    const nq = norm(q);
    items = nq ? PEOPLE.filter(p => p.key.includes(nq)).slice(0, 30) : [];
    if (!items.length) { close(); return; }
    ac.innerHTML = items.map((p, i) => `<div class="ac-item" data-i="${i}"><div class="nm">${esc(p.name)}</div></div>`).join("");
    ac.classList.add("open"); hi = -1;
  };
  input.addEventListener("input", () => search(input.value));
  input.addEventListener("keydown", e => {
    const n = ac.querySelectorAll(".ac-item");
    if (e.key === "ArrowDown") { hi = Math.min(hi+1, n.length-1); e.preventDefault(); }
    else if (e.key === "ArrowUp") { hi = Math.max(hi-1, 0); e.preventDefault(); }
    else if (e.key === "Enter") { if (hi>=0 && items[hi]) pick(items[hi]); e.preventDefault(); }
    else if (e.key === "Escape") close();
    n.forEach((el,i)=>el.classList.toggle("hi", i===hi));
  });
  ac.addEventListener("mousedown", e => { const it = e.target.closest(".ac-item"); if (it) pick(items[+it.dataset.i]); });
  document.addEventListener("click", e => { if (!ac.contains(e.target) && e.target !== input) close(); });
  function pick(p) { input.value = p.name; close(); renderEgo(p.code); }
}
