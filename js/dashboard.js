(async function () {
  const [bens, depositarios] = await Promise.all([loadBens(), loadDepositarios()]);

  const total = bens.length;
  const counts = { aguardando: 0, andamento: 0, concluido: 0, nao_localizado: 0 };
  for (const b of bens) counts[currentStatus(b)] = (counts[currentStatus(b)] || 0) + 1;

  const semDep = bens.filter((b) => !b.depositario_id);

  // ---- stat tiles ----
  const statsEl = document.getElementById("stats");
  const tiles = [
    { label: "Total de bens", value: total, cls: "" },
    { label: "Aguardando destinação", value: counts.aguardando, cls: "" },
    { label: "Em andamento", value: counts.andamento, cls: "accent-warning" },
    { label: "Destinação concluída", value: counts.concluido, cls: "accent-good" },
    { label: "Não localizados", value: counts.nao_localizado, cls: "accent-critical" },
    { label: "Depositários cadastrados", value: depositarios.length, cls: "" },
  ];
  statsEl.innerHTML = tiles
    .map(
      (t) => `<div class="stat-tile ${t.cls}"><div class="value">${t.value}</div><div class="label">${t.label}</div></div>`
    )
    .join("");

  // ---- chart: status ----
  renderBarRows(
    document.getElementById("chartStatus"),
    Object.entries(STATUS_DEF).map(([id, def]) => ({
      label: def.label,
      value: counts[id] || 0,
      color: def.color,
    })),
    total
  );

  // ---- chart: tipo ----
  const tipoCounts = {};
  for (const b of bens) {
    const t = (b.tipo_bem || "Não informado").trim() || "Não informado";
    tipoCounts[t] = (tipoCounts[t] || 0) + 1;
  }
  const seriesColors = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)"];
  const tipoEntries = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]);
  renderBarRows(
    document.getElementById("chartTipo"),
    tipoEntries.map(([label, value], i) => ({ label, value, color: seriesColors[i % seriesColors.length] })),
    total
  );

  // ---- chart: por depositário (stacked por status) ----
  const depEl = document.getElementById("chartDepositarios");
  if (!depositarios.length) {
    depEl.innerHTML = `<div class="empty-state">Nenhum depositário cadastrado ainda. Vá em <a href="admin.html">Administração</a> para cadastrar.</div>`;
  } else {
    const rows = depositarios
      .map((d) => {
        const bensDoDep = bens.filter((b) => b.depositario_id === d.id);
        const c = { aguardando: 0, andamento: 0, concluido: 0, nao_localizado: 0 };
        for (const b of bensDoDep) c[currentStatus(b)]++;
        return { dep: d, total: bensDoDep.length, c };
      })
      .sort((a, b) => b.total - a.total);

    depEl.innerHTML = rows
      .map(({ dep, total: t, c }) => {
        const segs = Object.entries(STATUS_DEF)
          .map(([id, def]) => {
            const v = c[id];
            if (!v) return "";
            const pct = t ? (v / t) * 100 : 0;
            return `<span title="${def.label}: ${v}" style="width:${pct}%; background:${def.color}"></span>`;
          })
          .join("");
        return `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:4px;">
            <a href="depositario.html?id=${encodeURIComponent(dep.id)}"><strong>${escapeHtml(dep.nome)}</strong></a>
            <span class="cell-muted mono">${t} ${t === 1 ? "bem" : "bens"}</span>
          </div>
          <div class="dep-progress-track">${segs || '<span style="width:100%; background:var(--gridline)"></span>'}</div>
        </div>`;
      })
      .join("");
    depEl.innerHTML += legendHtml();
  }

  // ---- bens sem depositário ----
  if (semDep.length) {
    document.getElementById("semDepositarioPanel").style.display = "";
    const list = document.getElementById("semDepositarioList");
    list.innerHTML = `
      <table>
        <thead><tr><th>Bem</th><th>Tipo</th><th>Processo</th><th>Status</th></tr></thead>
        <tbody>
          ${semDep
            .slice(0, 12)
            .map(
              (b) => `<tr>
                <td>${escapeHtml(truncate(b.descricao, 70))}</td>
                <td>${escapeHtml(b.tipo_bem || "—")}</td>
                <td class="mono">${escapeHtml(b.numero_registro || b.numero_autos || "—")}</td>
                <td><span class="badge ${statusInfo(currentStatus(b)).cls}">${statusInfo(currentStatus(b)).label}</span></td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${semDep.length > 12 ? `<p class="cell-muted" style="margin-top:10px;">+ ${semDep.length - 12} outros bens sem depositário. Veja a lista completa em <a href="bens.html">Todos os bens</a>.</p>` : ""}
    `;
  }

  function legendHtml() {
    return `<div class="legend-inline">${Object.values(STATUS_DEF)
      .map((d) => `<span class="item"><span class="dot" style="background:${d.color}"></span>${d.label}</span>`)
      .join("")}</div>`;
  }
})();

function renderBarRows(container, items, total) {
  if (!items.length || !total) {
    container.innerHTML = `<div class="empty-state">Sem dados ainda.</div>`;
    return;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  container.innerHTML = items
    .map((i) => {
      const pct = (i.value / max) * 100;
      return `
      <div style="display:grid; grid-template-columns: 150px 1fr 34px; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:13px; color:var(--text-secondary);">${escapeHtml(i.label)}</span>
        <div style="background:var(--gridline); border-radius:5px; height:10px; overflow:hidden;">
          <div style="width:${pct}%; background:${i.color}; height:100%; border-radius:5px;" title="${escapeHtml(i.label)}: ${i.value}"></div>
        </div>
        <span class="mono" style="font-size:13px; text-align:right;">${i.value}</span>
      </div>`;
    })
    .join("");
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
