/* ===== Camada de dados =====
 * Fonte de verdade: data/bens.json e data/depositarios.json (versionados no repositório).
 * O painel admin grava rascunhos no localStorage do navegador e permite exportar
 * os JSONs atualizados para serem commitados no repositório (site estático, sem backend).
 */

const LS_BENS = "abf_bens_v1";
const LS_DEPOSITARIOS = "abf_depositarios_v1";

const STATUS_DEF = {
  aguardando: { label: "Aguardando destinação", cls: "badge-aguardando", color: "var(--status-neutral)" },
  andamento: { label: "Em andamento", cls: "badge-andamento", color: "var(--status-warning)" },
  concluido: { label: "Destinação concluída", cls: "badge-concluido", color: "var(--status-good)" },
  nao_localizado: { label: "Bem não localizado", cls: "badge-nao_localizado", color: "var(--status-critical)" },
};

const TIPO_DESTINACAO = [
  "Leilão", "Alienação antecipada", "Doação", "Restituição ao proprietário",
  "Destruição/Inutilização", "Transferência de depósito", "Outro",
];

function statusInfo(id) {
  return STATUS_DEF[id] || STATUS_DEF.aguardando;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar " + path);
  return res.json();
}

function loadLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Não foi possível ler localStorage", key, e);
    return null;
  }
}

function saveLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Não foi possível gravar localStorage", key, e);
  }
}

/**
 * Carrega bens: base do repositório (data/bens.json) mesclada com rascunho local
 * (edições feitas no admin.html que ainda não foram exportadas/commitadas).
 */
async function loadBens() {
  const base = await fetchJson("data/bens.json").catch(() => []);
  const local = loadLocal(LS_BENS);
  if (!local) return base;
  const byId = new Map(base.map((b) => [b.id, b]));
  for (const item of local) byId.set(item.id, item);
  return Array.from(byId.values());
}

async function loadDepositarios() {
  const base = await fetchJson("data/depositarios.json").catch(() => []);
  const local = loadLocal(LS_DEPOSITARIOS);
  if (!local) return base;
  const byId = new Map(base.map((d) => [d.id, d]));
  for (const item of local) byId.set(item.id, item);
  return Array.from(byId.values());
}

function saveBensDraft(bens) {
  saveLocal(LS_BENS, bens);
}
function saveDepositariosDraft(depositarios) {
  saveLocal(LS_DEPOSITARIOS, depositarios);
}

function hasLocalDraft() {
  return !!(localStorage.getItem(LS_BENS) || localStorage.getItem(LS_DEPOSITARIOS));
}

function currentStatus(bem) {
  if (bem.status_atual) return bem.status_atual;
  if (bem.historico && bem.historico.length) {
    return bem.historico[bem.historico.length - 1].status || "aguardando";
  }
  return "aguardando";
}

function fmtDate(d) {
  if (!d) return "—";
  return d;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function setActiveNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".topbar nav a").forEach((a) => {
    const target = a.getAttribute("href").split("?")[0];
    if (target === here) a.classList.add("active");
  });
}
document.addEventListener("DOMContentLoaded", setActiveNav);
