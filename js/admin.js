(async function () {
  const state = {
    bens: await loadBens(),
    depositarios: await loadDepositarios(),
    editingDepId: null,
    editingBemId: null,
  };

  function persist() {
    saveBensDraft(state.bens);
    saveDepositariosDraft(state.depositarios);
  }

  function slug(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function uniqueId(base, existingIds) {
    let id = base || "item";
    let i = 2;
    while (existingIds.has(id)) {
      id = `${base}-${i}`;
      i++;
    }
    return id;
  }

  // ================= DEPOSITÁRIOS =================
  const depForm = document.getElementById("depForm");
  const depTableWrap = document.getElementById("depTableWrap");
  const btnNewDep = document.getElementById("btnNewDep");

  function depFieldsTemplate(d) {
    d = d || {};
    return `
      <div class="form-grid">
        <div><label>Nome *</label><input id="f_nome" value="${escapeHtml(d.nome || "")}" placeholder="Nome do depositário" /></div>
        <div><label>CPF/CNPJ</label><input id="f_doc" value="${escapeHtml(d.cpf_cnpj || "")}" /></div>
        <div><label>Contato (nome)</label><input id="f_contato" value="${escapeHtml(d.contato_nome || "")}" /></div>
        <div><label>Telefone</label><input id="f_tel" value="${escapeHtml(d.contato_telefone || "")}" /></div>
        <div><label>E-mail</label><input id="f_email" value="${escapeHtml(d.contato_email || "")}" /></div>
        <div><label>Endereço</label><input id="f_end" value="${escapeHtml(d.endereco || "")}" /></div>
      </div>
      <div style="margin-bottom:14px;"><label>Observações</label><textarea id="f_obs">${escapeHtml(d.observacoes || "")}</textarea></div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-primary" id="f_save">Salvar</button>
        <button class="btn" id="f_cancel">Cancelar</button>
      </div>
    `;
  }

  function openDepForm(dep) {
    state.editingDepId = dep ? dep.id : "__new__";
    depForm.style.display = "";
    depForm.innerHTML = `<h4 style="margin:0 0 10px;">${dep ? "Editar depositário" : "Novo depositário"}</h4>` + depFieldsTemplate(dep);
    document.getElementById("f_cancel").addEventListener("click", () => {
      depForm.style.display = "none";
      state.editingDepId = null;
    });
    document.getElementById("f_save").addEventListener("click", () => {
      const nome = document.getElementById("f_nome").value.trim();
      if (!nome) {
        toast("Informe o nome do depositário.");
        return;
      }
      const payload = {
        nome,
        cpf_cnpj: document.getElementById("f_doc").value.trim(),
        contato_nome: document.getElementById("f_contato").value.trim(),
        contato_telefone: document.getElementById("f_tel").value.trim(),
        contato_email: document.getElementById("f_email").value.trim(),
        endereco: document.getElementById("f_end").value.trim(),
        observacoes: document.getElementById("f_obs").value.trim(),
      };
      if (dep) {
        Object.assign(dep, payload);
      } else {
        const ids = new Set(state.depositarios.map((d) => d.id));
        payload.id = uniqueId(slug(nome), ids);
        state.depositarios.push(payload);
      }
      persist();
      depForm.style.display = "none";
      state.editingDepId = null;
      renderDepTable();
      renderBensTable();
      populateBensFilters();
      toast("Depositário salvo.");
    });
  }

  btnNewDep.addEventListener("click", () => openDepForm(null));

  function renderDepTable() {
    if (!state.depositarios.length) {
      depTableWrap.innerHTML = `<div class="empty-state">Nenhum depositário cadastrado. Clique em “+ Novo depositário”.</div>`;
      return;
    }
    depTableWrap.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Contato</th><th>Bens</th><th></th></tr></thead>
        <tbody>
          ${state.depositarios
            .map((d) => {
              const n = state.bens.filter((b) => b.depositario_id === d.id).length;
              return `<tr>
                <td><a href="depositario.html?id=${encodeURIComponent(d.id)}" target="_blank">${escapeHtml(d.nome)}</a></td>
                <td>${escapeHtml(d.contato_nome || "—")}</td>
                <td class="mono">${n}</td>
                <td style="white-space:nowrap;">
                  <button class="btn" data-edit-dep="${d.id}">Editar</button>
                  <button class="btn btn-danger" data-del-dep="${d.id}">Excluir</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
    depTableWrap.querySelectorAll("[data-edit-dep]").forEach((btn) =>
      btn.addEventListener("click", () => openDepForm(state.depositarios.find((d) => d.id === btn.dataset.editDep)))
    );
    depTableWrap.querySelectorAll("[data-del-dep]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = btn.dataset.delDep;
        const n = state.bens.filter((b) => b.depositario_id === id).length;
        if (!confirm(`Excluir este depositário?${n ? ` ${n} bem(ns) ficarão sem depositário atribuído.` : ""}`)) return;
        state.depositarios = state.depositarios.filter((d) => d.id !== id);
        state.bens.forEach((b) => {
          if (b.depositario_id === id) b.depositario_id = null;
        });
        persist();
        renderDepTable();
        renderBensTable();
        populateBensFilters();
        toast("Depositário excluído.");
      })
    );
  }

  // ================= BENS =================
  const bensTableWrap = document.getElementById("bensTableWrap");
  const bensSearch = document.getElementById("bensSearch");
  const bensDepFilter = document.getElementById("bensDepFilter");
  const bensStatusFilter = document.getElementById("bensStatusFilter");
  const bemEditPanel = document.getElementById("bemEditPanel");

  function populateBensFilters() {
    bensStatusFilter.innerHTML =
      `<option value="">Todos os status</option>` +
      Object.entries(STATUS_DEF).map(([id, def]) => `<option value="${id}">${def.label}</option>`).join("");
    bensDepFilter.innerHTML =
      `<option value="">Todos os depositários</option><option value="__none__">Sem depositário</option>` +
      state.depositarios.map((d) => `<option value="${d.id}">${escapeHtml(d.nome)}</option>`).join("");
  }

  function renderBensTable() {
    const q = bensSearch.value.toLowerCase().trim();
    const df = bensDepFilter.value;
    const sf = bensStatusFilter.value;
    const depById = new Map(state.depositarios.map((d) => [d.id, d]));

    const filtered = state.bens.filter((b) => {
      if (sf && currentStatus(b) !== sf) return false;
      if (df === "__none__" && b.depositario_id) return false;
      if (df && df !== "__none__" && b.depositario_id !== df) return false;
      if (!q) return true;
      const hay = [b.descricao, b.numero_registro, b.numero_autos].join(" ").toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      bensTableWrap.innerHTML = `<div class="empty-state">Nenhum bem encontrado.</div>`;
      return;
    }

    bensTableWrap.innerHTML = `
      <table>
        <thead><tr><th>Bem</th><th>Depositário</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${filtered
            .map((b) => {
              const dep = depById.get(b.depositario_id);
              const st = statusInfo(currentStatus(b));
              return `<tr>
                <td style="max-width:340px;">${escapeHtml(truncate(b.descricao, 80))}<br/><span class="cell-muted" style="font-size:12px;">${escapeHtml(b.numero_registro || b.numero_autos || "")}</span></td>
                <td>${dep ? escapeHtml(dep.nome) : '<span class="cell-muted">—</span>'}</td>
                <td><span class="badge ${st.cls}">${st.label}</span></td>
                <td><button class="btn" data-edit-bem="${b.id}">Gerenciar</button></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      <p class="cell-muted" style="margin-top:8px;">${filtered.length} de ${state.bens.length} bens</p>
    `;
    bensTableWrap.querySelectorAll("[data-edit-bem]").forEach((btn) =>
      btn.addEventListener("click", () => openBemEdit(state.bens.find((b) => b.id === btn.dataset.editBem)))
    );
  }

  function truncate(s, n) {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function openBemEdit(b) {
    state.editingBemId = b.id;
    bemEditPanel.style.display = "";
    const hist = (b.historico || []).slice().reverse();
    bemEditPanel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 4px;">${escapeHtml(b.descricao)}</h3>
          <p class="cell-muted" style="margin:0;">Processo ${escapeHtml(b.numero_registro || b.numero_autos || "—")} · ${escapeHtml(b.tipo_bem || "")}</p>
        </div>
        <button class="btn" id="closeBemEdit">Fechar</button>
      </div>
      <div class="form-grid" style="margin-top:14px;">
        <div>
          <label>Depositário responsável</label>
          <select id="bem_dep">
            <option value="">Não atribuído</option>
            ${state.depositarios.map((d) => `<option value="${d.id}" ${b.depositario_id === d.id ? "selected" : ""}>${escapeHtml(d.nome)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Local atual</label>
          <input id="bem_local" value="${escapeHtml(b.local_atual || "")}" />
        </div>
      </div>

      <h4 style="margin:16px 0 8px;">Registrar novo acompanhamento</h4>
      <div class="form-grid">
        <div><label>Data</label><input type="date" id="hist_data" value="${todayISO()}" /></div>
        <div>
          <label>Status</label>
          <select id="hist_status">
            ${Object.entries(STATUS_DEF).map(([id, def]) => `<option value="${id}">${def.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>Tipo de destinação (se concluído)</label>
          <select id="hist_tipo">
            <option value="">—</option>
            ${TIPO_DESTINACAO.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px;"><label>Observação</label><textarea id="hist_obs" placeholder="Detalhes do andamento..."></textarea></div>
      <button class="btn btn-primary" id="btnAddHist">+ Adicionar ao histórico</button>

      <h4 style="margin:20px 0 8px;">Histórico</h4>
      ${
        hist.length
          ? `<ul class="hist-list">${hist
              .map(
                (h, idxRev) => `<li class="hist-item">
                <div class="hist-date">${fmtDate(h.data)} — ${statusInfo(h.status).label}${h.tipo_destinacao ? " · " + escapeHtml(h.tipo_destinacao) : ""}
                  <button class="btn btn-danger" style="padding:2px 8px; font-size:11px; margin-left:8px;" data-del-hist="${hist.length - 1 - idxRev}">remover</button>
                </div>
                ${h.observacao ? `<div class="hist-obs">${escapeHtml(h.observacao)}</div>` : ""}
              </li>`
              )
              .join("")}</ul>`
          : `<p class="cell-muted">Sem registros ainda.</p>`
      }
    `;

    document.getElementById("closeBemEdit").addEventListener("click", () => {
      bemEditPanel.style.display = "none";
      state.editingBemId = null;
    });
    document.getElementById("bem_dep").addEventListener("change", (e) => {
      b.depositario_id = e.target.value || null;
      persist();
      renderBensTable();
      renderDepTable();
    });
    document.getElementById("bem_local").addEventListener("change", (e) => {
      b.local_atual = e.target.value.trim();
      persist();
    });
    document.getElementById("btnAddHist").addEventListener("click", () => {
      const data = document.getElementById("hist_data").value || todayISO();
      const status = document.getElementById("hist_status").value;
      const tipo_destinacao = document.getElementById("hist_tipo").value;
      const observacao = document.getElementById("hist_obs").value.trim();
      b.historico = b.historico || [];
      b.historico.push({ data, status, tipo_destinacao: tipo_destinacao || undefined, observacao: observacao || undefined });
      b.status_atual = status;
      persist();
      renderBensTable();
      openBemEdit(b);
      toast("Acompanhamento registrado.");
    });
    bemEditPanel.querySelectorAll("[data-del-hist]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.delHist);
        b.historico.splice(idx, 1);
        b.status_atual = b.historico.length ? b.historico[b.historico.length - 1].status : "aguardando";
        persist();
        renderBensTable();
        openBemEdit(b);
      })
    );
  }

  [bensSearch, bensDepFilter, bensStatusFilter].forEach((el) => el.addEventListener("input", renderBensTable));

  // ================= EXPORT =================
  document.getElementById("btnExportBens").addEventListener("click", () => downloadJson("bens.json", state.bens));
  document.getElementById("btnExportDeps").addEventListener("click", () => downloadJson("depositarios.json", state.depositarios));
  document.getElementById("btnResetDraft").addEventListener("click", () => {
    if (!confirm("Descartar todas as edições não publicadas deste navegador?")) return;
    localStorage.removeItem(LS_BENS);
    localStorage.removeItem(LS_DEPOSITARIOS);
    location.reload();
  });

  // init
  populateBensFilters();
  renderDepTable();
  renderBensTable();
})();
