let listaTecnicos = [];
let usuarioPodeEditar = false; 
let todosAgendamentosGlobais = [];
let mapaTecnicoColuna = {};
let allTechsGlobal = [];
let duplaCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
    try { if (typeof initializeThemeAndUserInfo === 'function') initializeThemeAndUserInfo(); } catch (e) {}
    await verificarPermissoes();

    document.getElementById('filtro-data').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('filtro-data').addEventListener('change', carregarAgenda);
    document.getElementById('filtro-municipio').addEventListener('change', carregarAgenda);
    document.getElementById('filtro-setor').addEventListener('change', renderizarQuadro);
    document.getElementById('filtro-status').addEventListener('change', renderizarQuadro);

    const btnFecharTarefa = document.getElementById('btn-confirmar-tarefa-logistica');
    if (btnFecharTarefa) btnFecharTarefa.addEventListener('click', processarAvancoTarefaLogistica);
    
    const btnFechar = document.getElementById('btn-action-fechar');
    if (btnFechar) btnFechar.addEventListener('click', enviarFechamentoOS);

    const btnVerOnu = document.getElementById('btn-ver-onu');
    if (btnVerOnu) btnVerOnu.addEventListener('click', abrirModalONU);
    
    const btnAbrirConfig = document.getElementById('btn-abrir-config');
    if (btnAbrirConfig) btnAbrirConfig.addEventListener('click', abrirModalConfiguracoes);
    const btnSalvarConfig = document.getElementById('btn-salvar-config');
    if (btnSalvarConfig) btnSalvarConfig.addEventListener('click', salvarConfiguracoes);
    const btnAddDupla = document.getElementById('btn-add-dupla');
    if (btnAddDupla) btnAddDupla.addEventListener('click', () => adicionarLinhaDupla());
    const btnReagendar = document.getElementById('btn-action-reagendar');
    if (btnReagendar) btnReagendar.addEventListener('click', enviarReagendamento);
    const btnAceitarPrio = document.getElementById('btn-aceitar-prioridade');
    if (btnAceitarPrio) btnAceitarPrio.addEventListener('click', () => tratarPrioridade('aceitar'));
    const btnRecusarPrio = document.getElementById('btn-recusar-prioridade');
    if (btnRecusarPrio) btnRecusarPrio.addEventListener('click', () => tratarPrioridade('recusar'));

    carregarAgenda();
    setInterval(autoRefreshSilencioso, 45000); // 45s
    setInterval(atualizarTimers, 30000); // 30s
});

window.retrairTurno = function(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
};

window.retrairColuna = function(bodyId) {
    const el = document.getElementById(bodyId);
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

function getPrimeiroUltimoNome(nomeCompleto) {
    if (!nomeCompleto) return 'Técnico';
    const partes = nomeCompleto.trim().split(' ');
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
}

function showModalNativo(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    
    el.removeAttribute('aria-hidden'); 
    
    let m;
    if (bootstrap.Modal.getOrCreateInstance) {
        m = bootstrap.Modal.getOrCreateInstance(el);
    } 
    else if (bootstrap.Modal.getInstance) {
        m = bootstrap.Modal.getInstance(el);
        if (!m) m = new bootstrap.Modal(el);
    } 
    else {
        m = new bootstrap.Modal(el);
    }
    
    m.show();
}

function hideModalNativo(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    
    let m;
    if (bootstrap.Modal.getInstance) {
        m = bootstrap.Modal.getInstance(el);
    }
    
    if (m) {
        m.hide();
    } else {
        if (typeof $ !== 'undefined') {
            $('#' + modalId).modal('hide');
        }
    }
}

function atualizarFiltroSetor() {
    const selectSetor = document.getElementById('filtro-setor');
    const valorAtual = selectSetor.value;
    
    selectSetor.innerHTML = '<option value="TODOS">Todos os Setores</option>';
    
    const setoresUnicos = [...new Set(todosAgendamentosGlobais.map(os => os.nome_setor).filter(s => s))].sort();
    
    setoresUnicos.forEach(setor => {
        const option = document.createElement('option');
        option.value = setor;
        option.textContent = setor;
        selectSetor.appendChild(option);
    });

    if (setoresUnicos.includes(valorAtual)) {
        selectSetor.value = valorAtual;
    } else {
        selectSetor.value = 'TODOS';
    }
}

async function verificarPermissoes() {
    try {
        const response = await fetch('/api/username');
        const data = await response.json();
        const grupo = (data.group || '').toUpperCase();
        
        if (grupo.includes('LOGISTICA') || grupo.includes('LOGÍSTICA') || grupo.includes('ADMIN') || grupo.includes('NOC')) {
            usuarioPodeEditar = true;
            const areaAdmin = document.getElementById('area-admin-logistica');
            if (areaAdmin) areaAdmin.classList.remove('d-none');
        }
    } catch (e) {
        console.error("Erro ao checar permissões", e);
    }
}

async function carregarAgenda() {
    const data = document.getElementById('filtro-data').value;
    const municipio = document.getElementById('filtro-municipio').value;

    if (!data) return;
    await construirColunasTecnicos(data);

    document.querySelectorAll('.column-body').forEach(el => {
        el.innerHTML = '<div class="text-muted text-center small p-3"><span class="spinner-border spinner-border-sm mb-1"></span><br>Carregando...</div>';
    });

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=${municipio}`);
        todosAgendamentosGlobais = await response.json();
        
        atualizarFiltroSetor();
        renderizarQuadro();
    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
        document.querySelectorAll('.column-body').forEach(el => {
            el.innerHTML = '<div class="alert alert-danger small m-2">Erro.</div>';
        });
    }
}

function renderizarQuadro() {
    document.querySelectorAll('.column-body').forEach(col => col.innerHTML = '');
    
    const filtroSetor = document.getElementById('filtro-setor').value;
    const statusFiltro = document.getElementById('filtro-status').value;
    const filtroMun = document.getElementById('filtro-municipio').value;

    todosAgendamentosGlobais.forEach(os => {
        const statusIxc = os.ixc_status || 'A';
        const isConcluido = (statusIxc === 'F');
        const isFalha = (statusIxc === 'RAG');

        if (statusFiltro === 'OCULTAR_CONCLUIDOS' && isConcluido) return; 
        if (statusFiltro === 'PENDENTES' && (isConcluido || isFalha)) return;
        if (statusFiltro === 'FALHAS' && !isFalha) return;
        if (filtroSetor !== 'TODOS' && os.nome_setor !== filtroSetor) return;

        const cidadeUpper = (os.cidade_real || '').toUpperCase();
        const isSerra = cidadeUpper.includes('SERRA');
        
        if (filtroMun === 'SERRA' && !isSerra) return;
        if (filtroMun === 'VV_VIX_CCA' && isSerra) return;

        const card = criarCardOS(os);
        //console.log(`tecnico ${os.nome_tecnico || 'N/A'}`);
        const isInstalacao = (os.tipo_servico === 'INSTALACAO') || (os.nome_setor && os.nome_setor.toUpperCase().includes('INSTALA')) || (os.setor === '5');

        let turnoId = os.turno === 'MATUTINO' ? 'matutino' : 'vespertino';
        if(os.turno === 'NOTURNO') turnoId = 'vespertino';
        
        let baseDivId = '';
        if (isInstalacao) {
            baseDivId = isSerra ? `col-inst-serra-${turnoId}` : `col-inst-outros-${turnoId}`;
        } else {
            if (os.tipo_imovel === 'CASA' || os.tipo_imovel === 'CORPORATIVO') {
                baseDivId = `col-manut-casa-${turnoId}`;
            } else {
                baseDivId = isSerra ? `col-manut-predio-serra-${turnoId}` : `col-manut-predio-outros-${turnoId}`;
            }
        }

        const baseCol = document.getElementById(baseDivId);
        if (!baseCol) return;

        if (!os.ixc_tecnico_id) {
            baseCol.appendChild(card);
        } else {
            const techColId = `tec-${os.ixc_tecnico_id}-${baseDivId}`;
            let techCol = document.getElementById(techColId);

            if (!techCol) {
                techCol = criarColunaTecnico(os.ixc_tecnico_id, os.nome_tecnico, techColId, isInstalacao);
                baseCol.appendChild(techCol);
            }
            
            document.getElementById(`body-${techColId}`).appendChild(card);
        }
    });

    document.querySelectorAll('.kanban-column').forEach(col => {
        const spanCount = col.querySelector('.task-count');
        const totalCards = col.querySelectorAll('.asana-card').length;
        if (spanCount) spanCount.textContent = totalCards;
    });

    atualizarTimers();

    ['matutino', 'vespertino'].forEach(turnoId => {
        const turnoUpper = turnoId === 'matutino' ? 'MATUTINO' : 'VESPERTINO';
        const osNoTurno = todosAgendamentosGlobais.filter(os => os.turno === turnoUpper);
        
        const temPendentes = osNoTurno.some(os => {
            const st = os.ixc_status || 'A';
            return st !== 'F' && st !== 'C';
        });

        const elSwimlane = document.getElementById(`swimlane-${turnoId}`);
        if (elSwimlane) {
            if (osNoTurno.length > 0 && !temPendentes) {
                elSwimlane.classList.add('d-none');
                elSwimlane.classList.remove('d-flex');
            } else {
                elSwimlane.classList.remove('d-none');
                elSwimlane.classList.add('d-flex');
            }
        }
    });
}

function criarColunaTecnico(idTecnico, nomeTecnico, techColId, isInstalacao) {
    const div = document.createElement('div');
    div.className = 'tec-sub-column mb-3 border border-2 rounded bg-white overflow-hidden shadow-sm';
    div.id = techColId;

    const headerColor = isInstalacao ? 'bg-success text-white' : 'bg-primary text-white';

    div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center p-2 click-retrair-coluna ${headerColor}" style="cursor: pointer;" data-target="body-${techColId}" title="Clique para Retrair">
            <span class="fw-bold" style="font-size: 0.75rem; pointer-events: none;"><i class="bi bi-person-workspace me-1"></i>${nomeTecnico}</span>
            <i class="bi bi-arrows-collapse small" style="pointer-events: none;"></i>
        </div>
        <div class="p-2 bg-white" id="body-${techColId}" style="min-height: 10px;"></div>
    `;
    return div;
}

window.opcoesEscala = [];

async function construirColunasTecnicos(data) {
    try {
        const response = await fetch(`/api/v5/painel-logistica/tecnicos?data=${data}`);
        listaTecnicos = await response.json();

        let colunasMap = new Map();
        listaTecnicos.forEach(tec => {
            const isDupla = tec.dupla_id && tec.dupla_id.trim() !== '';
            const key = isDupla ? `DUPLA_${tec.dupla_id}` : `TEC_${tec.id}`;

            if (!colunasMap.has(key)) {
                colunasMap.set(key, {
                    id_tecnico: tec.id,
                    nomes: [getPrimeiroUltimoNome(tec.nome)],
                    turno: tec.turno_escala || 'INTEGRAL'
                });
            } else {
                colunasMap.get(key).nomes.push(getPrimeiroUltimoNome(tec.nome));
            }
        });

        window.opcoesEscala = Array.from(colunasMap.values()).map(col => ({
            id_tecnico: col.id_tecnico,
            nome_exibicao: col.nomes.join(' e '),
            turno: col.turno
        }));
    } catch (error) {
        console.error("Erro ao buscar escala do dia:", error);
    }
}

function criarCardOS(os) {
    const card = document.createElement('div');
    
    let cardClass = os.status_interno === 'ATRIBUIDO' ? 'card-os-atribuida' : 'card-os-pendente';
    card.className = `asana-card ${cardClass}`;
    card.id = `os-${os.id}`;

    let corBorda = 'border-left: 4px solid #6c757d;'; 
    let badgeStatus = `<span class="asana-badge badge-turno">Pendente</span>`;
    const statusIxc = os.ixc_status || 'A';

    if (statusIxc === 'DS') { 
        corBorda = 'border-left: 4px solid #ffc107;'; 
        badgeStatus = `<span class="asana-badge" style="background-color: #fff3cd; color: #856404;"><i class="bi bi-car-front-fill me-1"></i>A Caminho</span>`; 
    }
    else if (statusIxc === 'EX') { 
        corBorda = 'border-left: 4px solid #0dcaf0;'; 
        const tempoExecStr = os.data_hora_execucao ? `data-inicio="${os.data_hora_execucao}"` : '';
        badgeStatus = `<span class="asana-badge timer-execucao" style="background-color: #cff4fc; color: #055160;" ${tempoExecStr}><i class="bi bi-tools me-1"></i>0h 0m</span>`; 
    }
    else if (statusIxc === 'F') { 
        corBorda = 'border-left: 4px solid #198754;'; 
        badgeStatus = `<span class="asana-badge" style="background-color: #d1e7dd; color: #0f5132;"><i class="bi bi-check-circle-fill me-1"></i>Concluído</span>`; 
    }
    else if (statusIxc === 'RAG') { 
        corBorda = 'border-left: 4px solid #dc3545;'; 
        badgeStatus = `<span class="asana-badge" style="background-color: #f8d7da; color: #842029;"><i class="bi bi-x-circle-fill me-1"></i>Reagendar</span>`; 
    }

    card.style.cssText = corBorda + (os.is_futuro_prioridade ? ' background-color: #fff0f0 !important; border: 2px solid #dc3545 !important;' : '');

    let badgesHtml = os.horario_agendado ? `<span class="asana-badge bg-dark text-white"><i class="bi bi-clock me-1"></i>${os.horario_agendado}</span>` : '';
    badgesHtml += badgeStatus;
    badgesHtml += os.aceita_encaixe ? `<span class="asana-badge badge-encaixe"><i class="bi bi-lightning-fill"></i> Encaixe</span>` : '';

    badgesHtml += os.solicita_prioridade ? `<span class="asana-badge bg-danger text-white border border-danger shadow-sm ms-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Prioridade</span>` : '';
    
    const tituloExibicao = `${os.ixc_cliente_id} - ${os.nome_condominio || 'S/C'} - ${os.tipo_imovel}`;

    if (os.is_futuro_prioridade) {
        const dataBR = String(os.data_agendamento_original).split('T')[0].split('-').reverse().join('/');
        badgesHtml += `<span class="asana-badge bg-danger text-white border border-danger shadow-sm ms-1"><i class="bi bi-calendar-x me-1"></i>Vindo do dia ${dataBR}</span>`;
    } else if (os.solicita_prioridade) {
        badgesHtml += `<span class="asana-badge bg-danger text-white border border-danger shadow-sm ms-1"><i class="bi bi-exclamation-triangle-fill me-1"></i>Prioridade</span>`;
    }

    let optionsHtml = '';
    window.opcoesEscala.forEach(op => {
        if (os.turno === 'MATUTINO' && (op.turno === 'INTEGRAL' || op.turno === 'MANHA')) {
            const selected = os.ixc_tecnico_id == op.id_tecnico ? 'selected' : '';
            optionsHtml += `<option value="${op.id_tecnico}" ${selected}>${op.nome_exibicao}</option>`;
        }
        else if (os.turno === 'VESPERTINO' && (op.turno === 'INTEGRAL' || op.turno === 'TARDE')) {
            const selected = os.ixc_tecnico_id == op.id_tecnico ? 'selected' : '';
            optionsHtml += `<option value="${op.id_tecnico}" ${selected}>${op.nome_exibicao}</option>`;
        }
    });

    if (os.ixc_tecnico_id && !optionsHtml.includes(`value="${os.ixc_tecnico_id}"`)) {
        optionsHtml += `<option value="${os.ixc_tecnico_id}" selected>${os.nome_tecnico} (Fora Escala)</option>`;
    }

    card.innerHTML = `
        <div class="mb-2 cursor-pointer click-os-detalhes">${badgesHtml}</div>
        <div class="os-title cursor-pointer click-os-detalhes" style="font-size:0.85rem; line-height: 1.4; font-weight: bold; color: #212529;">
            ${tituloExibicao}
        </div>
        <div class="os-meta d-flex justify-content-between align-items-center mt-2">
            <span class="text-truncate small"><i class="bi bi-geo-alt me-1 text-danger"></i>${os.municipio_base}</span>
            <span class="text-muted small fw-bold">#${os.ixc_os_id}</span>
        </div>
        <div class="mt-3 border-top pt-2">
            <select class="form-select form-select-sm border-secondary fw-bold select-atribuir-tecnico" style="background-color: #f8f9fa;" data-id-agenda="${os.id}" data-ixc-os-id="${os.ixc_os_id}" ${!usuarioPodeEditar ? 'disabled' : ''}>
                <option value="">👤 Atribuir Técnico...</option>
                ${optionsHtml}
            </select>
        </div>
    `;

    card.querySelectorAll('.click-os-detalhes').forEach(el => {
        el.addEventListener('click', () => abrirModalDetalhes(os));
    });

    return card;
}

window.atribuirTecnicoOS = async function(id_agenda, id_tecnico, ixc_os_id) {
    const status = id_tecnico ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';
    try {
        await fetch('/api/v5/painel-logistica/atribuir-tecnico', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_agenda: id_agenda, ixc_tecnico_id: id_tecnico, status: status, ixc_os_id: ixc_os_id })
        });
        carregarAgenda();
    } catch (error) {
        alert("Erro ao atribuir técnico: " + error.message);
    }
};

async function abrirModalConfiguracoes() {
    showModalNativo('modalConfiguracoes');
    const data = document.getElementById('filtro-data').value;
    document.getElementById('display-data-escala').textContent = data.split('-').reverse().join('/');

    const containerIndiv = document.getElementById('lista-checkbox-tecnicos');
    const containerDuplas = document.getElementById('container-duplas');
    containerIndiv.innerHTML = '<div class="text-center mt-3"><div class="spinner-border text-primary"></div></div>';
    containerDuplas.innerHTML = '';

    try {
        const response = await fetch('/api/v5/painel-logistica/todos-tecnicos');
        allTechsGlobal = await response.json();
        containerIndiv.innerHTML = '';
        
        const duplasSalvas = {};
        const individuaisSalvos = [];

        listaTecnicos.forEach(t => {
            if (t.dupla_id && t.dupla_id.trim() !== '') {
                if (!duplasSalvas[t.dupla_id]) duplasSalvas[t.dupla_id] = { equipe: t.equipe, techs: [] };
                duplasSalvas[t.dupla_id].techs.push(t.id);
            } else {
                individuaisSalvos.push(t);
            }
        });

        Object.keys(duplasSalvas).forEach(dId => {
            const arr = duplasSalvas[dId].techs;
            adicionarLinhaDupla(arr[0] || '', arr[1] || '', duplasSalvas[dId].equipe);
        });

        allTechsGlobal.forEach(tec => {
            const indivObj = individuaisSalvos.find(t => t.id === tec.id);
            const isChecked = indivObj ? 'checked' : '';
            
            const equipe = indivObj ? indivObj.equipe : 'MANUTENCAO';
            const regiao = indivObj ? (indivObj.regiao || 'SERRA') : 'SERRA';
            const turno = indivObj ? (indivObj.turno || 'INTEGRAL') : 'INTEGRAL';
            const imovel = indivObj ? (indivObj.tipo_imovel || 'AMBOS') : 'AMBOS';

            containerIndiv.innerHTML += `
                <div class="col-12 mb-2">
                    <div class="p-2 border rounded bg-light d-flex align-items-center gap-2">
                        <div class="form-check me-2" style="width: 140px;">
                            <input class="form-check-input chk-escala" type="checkbox" value="${tec.id}" id="chk-tec-${tec.id}" ${isChecked}>
                            <label class="form-check-label fw-bold text-truncate w-100" for="chk-tec-${tec.id}">${getPrimeiroUltimoNome(tec.nome)}</label>
                        </div>
                        <select class="form-select form-select-sm sel-equipe" id="equipe-${tec.id}" style="width: 100px;">
                            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manut</option>
                            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instal</option>
                        </select>
                        <select class="form-select form-select-sm sel-regiao" id="regiao-${tec.id}" style="width: 100px;">
                            <option value="SERRA" ${regiao === 'SERRA' ? 'selected' : ''}>Serra</option>
                            <option value="VV_VIX_CAR" ${regiao === 'VV_VIX_CAR' ? 'selected' : ''}>VV/VIX/CAR</option>
                        </select>
                        <select class="form-select form-select-sm sel-turno" id="turno-${tec.id}" style="width: 90px;">
                            <option value="INTEGRAL" ${turno === 'INTEGRAL' ? 'selected' : ''}>Int.</option>
                            <option value="MANHA" ${turno === 'MANHA' ? 'selected' : ''}>Manhã</option>
                            <option value="TARDE" ${turno === 'TARDE' ? 'selected' : ''}>Tarde</option>
                        </select>
                        <select class="form-select form-select-sm sel-imovel" id="imovel-${tec.id}" style="width: 90px;">
                            <option value="AMBOS" ${imovel === 'AMBOS' ? 'selected' : ''}>Ambos</option>
                            <option value="CASA" ${imovel === 'CASA' ? 'selected' : ''}>Casa</option>
                            <option value="PREDIO" ${imovel === 'PREDIO' ? 'selected' : ''}>Prédio</option>
                        </select>
                    </div>
                </div>`;
        });

        const capCampos = ['cap-casa-m', 'cap-casa-t', 'cap-predio-serra-m', 'cap-predio-serra-t', 'cap-predio-outros-m', 'cap-predio-outros-t', 'cap-inst-serra-m', 'cap-inst-serra-t', 'cap-inst-outros-m', 'cap-inst-outros-t'];
        capCampos.forEach(id => document.getElementById(id).value = 0);

        const resCap = await fetch(`/api/v5/painel-logistica/capacidade-dia?data=${data}`);
        const capData = await resCap.json();
        
        if (capData && capData.encontrado) {
            document.getElementById('cap-casa-m').value = capData.casa_m;
            document.getElementById('cap-casa-t').value = capData.casa_t;
            document.getElementById('cap-predio-serra-m').value = capData.predio_serra_m;
            document.getElementById('cap-predio-serra-t').value = capData.predio_serra_t;
            document.getElementById('cap-predio-outros-m').value = capData.predio_outros_m;
            document.getElementById('cap-predio-outros-t').value = capData.predio_outros_t;
            document.getElementById('cap-inst-serra-m').value = capData.inst_serra_m;
            document.getElementById('cap-inst-serra-t').value = capData.inst_serra_t;
            document.getElementById('cap-inst-outros-m').value = capData.inst_outros_m;
            document.getElementById('cap-inst-outros-t').value = capData.inst_outros_t;
        }

        const resTemp = await fetch('/api/v5/painel-logistica/capacidade-templates');
        window.templatesCapacidade = await resTemp.json();
        const selectTemp = document.getElementById('select-template-capacidade');
        selectTemp.innerHTML = '<option value="">Selecione um modelo salvo...</option>';
        window.templatesCapacidade.forEach(t => {
            selectTemp.add(new Option(t.nome, t.id));
        });
        
        document.getElementById('btn-aplicar-template').onclick = () => {
            const idTemp = selectTemp.value;
            if (!idTemp) return;
            const t = window.templatesCapacidade.find(x => String(x.id) === String(idTemp));
            if (t) {
                document.getElementById('cap-casa-m').value = t.casa_m;
                document.getElementById('cap-casa-t').value = t.casa_t;
                document.getElementById('cap-predio-serra-m').value = t.predio_serra_m;
                document.getElementById('cap-predio-serra-t').value = t.predio_serra_t;
                document.getElementById('cap-predio-outros-m').value = t.predio_outros_m;
                document.getElementById('cap-predio-outros-t').value = t.predio_outros_t;
                document.getElementById('cap-inst-serra-m').value = t.inst_serra_m;
                document.getElementById('cap-inst-serra-t').value = t.inst_serra_t;
                document.getElementById('cap-inst-outros-m').value = t.inst_outros_m;
                document.getElementById('cap-inst-outros-t').value = t.inst_outros_t;
                alert(`Modelo '${t.nome}' carregado! Clique em 'Salvar Tudo' para aplicar a este dia.`);
            }
        };

    } catch (e) {
        containerIndiv.innerHTML = '<div class="text-danger mt-3">Erro ao carregar dados.</div>';
    }
}

function adicionarLinhaDupla(tec1 = '', tec2 = '', equipe = 'MANUTENCAO', regiao = 'SERRA', turno = 'INTEGRAL', imovel = 'AMBOS') {
    duplaCounter++;
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center gap-2 mb-2 p-2 border rounded bg-light dupla-row shadow-sm';
    div.dataset.id = duplaCounter;

    let options = `<option value="">Selecione...</option>`;
    allTechsGlobal.forEach(t => { options += `<option value="${t.id}">${getPrimeiroUltimoNome(t.nome)}</option>`; });

    div.innerHTML = `
        <select class="form-select form-select-sm sel-equipe-dupla border-primary fw-bold" style="width: 100px;">
            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manut</option>
            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instal</option>
        </select>
        <select class="form-select form-select-sm sel-regiao border-secondary" style="width: 100px;">
            <option value="SERRA" ${regiao === 'SERRA' ? 'selected' : ''}>Serra</option>
            <option value="VV_VIX_CAR" ${regiao === 'VV_VIX_CAR' ? 'selected' : ''}>VV/VIX/CAR</option>
        </select>
        <select class="form-select form-select-sm sel-turno border-secondary" style="width: 90px;">
            <option value="INTEGRAL" ${turno === 'INTEGRAL' ? 'selected' : ''}>Int.</option>
            <option value="MANHA" ${turno === 'MANHA' ? 'selected' : ''}>Manhã</option>
            <option value="TARDE" ${turno === 'TARDE' ? 'selected' : ''}>Tarde</option>
        </select>
        <select class="form-select form-select-sm sel-imovel border-secondary" style="width: 90px;">
            <option value="AMBOS" ${imovel === 'AMBOS' ? 'selected' : ''}>Ambos</option>
            <option value="CASA" ${imovel === 'CASA' ? 'selected' : ''}>Casa</option>
            <option value="PREDIO" ${imovel === 'PREDIO' ? 'selected' : ''}>Prédio</option>
        </select>
        <select class="form-select form-select-sm sel-tec1-dupla flex-grow-1">${options}</select>
        <select class="form-select form-select-sm sel-tec2-dupla flex-grow-1">${options}</select>
        <button type="button" class="btn btn-sm btn-outline-danger btn-rm-dupla"><i class="bi bi-trash"></i></button>
    `;

    div.querySelector('.sel-tec1-dupla').value = tec1;
    div.querySelector('.sel-tec2-dupla').value = tec2;

    div.querySelector('.btn-rm-dupla').addEventListener('click', () => div.remove());
    document.getElementById('container-duplas').appendChild(div);
}

async function salvarConfiguracoes() {
    const data = document.getElementById('filtro-data').value;
    const tecnicosArr = [];
    const idsUsados = new Set(); 

    document.querySelectorAll('.dupla-row').forEach((row, index) => {
        const equipe = row.querySelector('.sel-equipe-dupla').value;
        const t1 = row.querySelector('.sel-tec1-dupla').value;
        const t2 = row.querySelector('.sel-tec2-dupla').value;
        const duplaId = `D_DYN_${index + 1}`;

        if (t1) { tecnicosArr.push({ 
            id: row.querySelector('.sel-tec1-dupla').value, 
            equipe: row.querySelector('.sel-equipe-dupla').value,
            regiao: row.querySelector('.sel-regiao').value,
            turno: row.querySelector('.sel-turno').value,
            tipo_imovel: row.querySelector('.sel-imovel').value,
            dupla_id: `D_DYN_${index + 1}` 
        }); idsUsados.add(t1); }
        if (t2 && t2 !== t1) { tecnicosArr.push({ 
            id: row.querySelector('.sel-tec2-dupla').value, 
            equipe: row.querySelector('.sel-equipe-dupla').value,
            regiao: row.querySelector('.sel-regiao').value,
            turno: row.querySelector('.sel-turno').value,
            tipo_imovel: row.querySelector('.sel-imovel').value,
            dupla_id: `D_DYN_${index + 1}` 
        });idsUsados.add(t2); }
    });

    document.querySelectorAll('.chk-escala:checked').forEach(chk => {
        const id = chk.value;
        if (!idsUsados.has(id)) {
            tecnicosArr.push({ 
                id: id, 
                equipe: document.getElementById(`equipe-${id}`).value,
                regiao: document.getElementById(`regiao-${id}`).value,
                turno: document.getElementById(`turno-${id}`).value,
                tipo_imovel: document.getElementById(`imovel-${id}`).value,
                dupla_id: null 
            });
        }
    });

    const capacidades = {
        casa_m: document.getElementById('cap-casa-m').value,
        casa_t: document.getElementById('cap-casa-t').value,
        predio_serra_m: document.getElementById('cap-predio-serra-m').value,
        predio_serra_t: document.getElementById('cap-predio-serra-t').value,
        predio_outros_m: document.getElementById('cap-predio-outros-m').value,
        predio_outros_t: document.getElementById('cap-predio-outros-t').value,
        inst_serra_m: document.getElementById('cap-inst-serra-m').value,
        inst_serra_t: document.getElementById('cap-inst-serra-t').value,
        inst_outros_m: document.getElementById('cap-inst-outros-m').value,
        inst_outros_t: document.getElementById('cap-inst-outros-t').value
    };

    const btn = document.getElementById('btn-salvar-config');
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/salvar-configuracoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data, tecnicos: tecnicosArr, capacidades: capacidades })
        });
        hideModalNativo('modalConfiguracoes');
        carregarAgenda();
    } catch (e) {
        alert("Erro ao salvar as configurações.");
    } finally {
        btn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Salvar Tudo';
        btn.disabled = false;
    }
}

async function abrirModalDetalhes(os) {
    document.getElementById('action-os-id').value = os.ixc_os_id;
    document.getElementById('action-agenda-local-id').value = os.id; 
    document.getElementById('action-nova-data').value = document.getElementById('filtro-data').value;
    document.getElementById('detalhe-os-titulo').textContent = `Buscando OS #${os.ixc_os_id}...`;

    const areaAcoes = document.getElementById('area-acoes-os');
    if (areaAcoes) areaAcoes.style.display = usuarioPodeEditar ? 'block' : 'none';

    document.getElementById('loading-detalhes-os').style.display = 'flex';
    document.getElementById('conteudo-detalhes-os').style.display = 'none';

    showModalNativo('modalDetalhesOS');

    try {
        const response = await fetch(`/api/v5/painel-logistica/os-detalhes/${os.ixc_os_id}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        const turnoLabel = os.turno === 'MATUTINO' ? 'Manhã' : (os.turno === 'VESPERTINO' ? 'Tarde' : 'Noite');
        document.getElementById('detalhe-os-titulo').textContent = `OS #${os.ixc_os_id} - ${turnoLabel} (${os.tipo_imovel})`;
        
        document.getElementById('det-cliente-nome').textContent = data.cliente.nome || 'Cliente não encontrado';
        document.getElementById('det-cliente-fone').textContent = data.cliente.telefones || 'Sem telefone';
        
        document.getElementById('det-contrato').textContent = data.contrato.descricao || 'Sem contrato vinculado';
        
        if (data.login && data.login.login) {
            document.getElementById('det-login').textContent = `Login PPPOE: ${data.login.login}`;
            document.getElementById('btn-ver-onu').style.display = 'inline-block';
            
            window.loginAtualData = data.login;
            window.onuAtualData = data.onu;
        } else {
            document.getElementById('det-login').textContent = 'Sem login PPPoE vinculado';
            document.getElementById('btn-ver-onu').style.display = 'none';
        }

        const osData = data.os;
        let endCompleto = `${osData.endereco || ''}, ${osData.numero || 'S/N'} - ${osData.bairro || ''}`;
        if(osData.complemento) endCompleto += ` (${osData.complemento})`;
        
        document.getElementById('det-endereco').textContent = endCompleto;
        document.getElementById('det-referencia').textContent = osData.referencia || 'Sem ponto de referência.';
        
        let msgSintoma = osData.mensagem || os.sintoma_relatado || 'Sem descrição cadastrada.';
        
        if (osData.relato_ticket) {
            const relatoLimpo = osData.relato_ticket.replace(/(<([^>]+)>)/gi, "").trim();
            if (relatoLimpo && !msgSintoma.includes(relatoLimpo)) {
                msgSintoma = `🔸 RELATO INICIAL DO CLIENTE:\n${relatoLimpo}\n\n🔸 STATUS DA ETAPA ATUAL:\n${msgSintoma}`;
            }
        }

        document.getElementById('det-sintoma').innerHTML = msgSintoma.replace(/\n/g, "<br>");

        document.getElementById('loading-detalhes-os').style.display = 'none';
        document.getElementById('conteudo-detalhes-os').style.display = 'flex';

        const alertaPrioridade = document.getElementById('alerta-prioridade-futura');
        if (os.is_futuro_prioridade) {
            const dataBR = String(os.data_agendamento_original).split('T')[0].split('-').reverse().join('/');
            document.getElementById('data-prioridade-original').textContent = dataBR;
            alertaPrioridade.classList.remove('d-none');
            window.osPrioridadeAtual = os;
        } else {
            alertaPrioridade.classList.add('d-none');
            window.osPrioridadeAtual = null;
        }

        window.osAtualParaFechar = {
            ixc_os_id: os.ixc_os_id,
            id_processo: data.os.id_wfl_processo || data.os.id_processo || null,
            id_tarefa_atual: data.os.id_wfl_tarefa || data.os.id_tarefa_atual || null,
            id_tecnico: data.os.id_tecnico
        };

        const inputMensagem = document.getElementById('input-fechar-mensagem');
        if (inputMensagem) inputMensagem.value = '';

    } catch (e) {
        alert("Não foi possível carregar os detalhes do IXC.");
        hideModalNativo('modalDetalhesOS');
    }
}

function abrirModalONU() {
    const login = window.loginAtualData;
    const onu = window.onuAtualData;

    if (!login) return;

    document.getElementById('det-onu-login').textContent = login.login || 'N/A';
    document.getElementById('det-onu-senha').textContent = login.senha || 'N/A';
    document.getElementById('det-onu-mac-login').textContent = login.mac || 'N/A';
    document.getElementById('det-onu-ip').textContent = login.ip || 'N/A';

    const hist = login.historico;
    if (hist) {
        document.getElementById('det-onu-queda-data').textContent = hist.acctstoptime ? hist.acctstoptime : 'Cliente Online no Momento';
        document.getElementById('det-onu-queda-motivo').textContent = hist.acctterminatecause || (hist.acctstoptime ? 'Desconhecido' : 'Sessão Ativa');
        
        let tempoFormatado = 'N/A';
        if (hist.acctsessiontime) {
            const horas = Math.floor(hist.acctsessiontime / 3600);
            const minutos = Math.floor((hist.acctsessiontime % 3600) / 60);
            tempoFormatado = `${horas}h ${minutos}m`;
        }
        document.getElementById('det-onu-uptime').textContent = tempoFormatado;
    } else {
        document.getElementById('det-onu-queda-data').textContent = 'Sem registros recentes';
        document.getElementById('det-onu-queda-motivo').textContent = '---';
        document.getElementById('det-onu-uptime').textContent = '---';
    }

    if (onu) {
        document.getElementById('det-onu-nao-encontrada').style.display = 'none';
        document.getElementById('det-onu-dados').style.display = 'block';
        
        atualizarLayoutOnu(onu);

        document.getElementById('loading-sinal-olt').style.display = 'inline-block';
        fetch('/api/v5/painel-logistica/onu-realtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_fibra: onu.id })
        })
        .then(res => res.json())
        .then(onuLive => {
            document.getElementById('loading-sinal-olt').style.display = 'none';
            if(onuLive) atualizarLayoutOnu(onuLive);
        }).catch(e => {
            console.error("Falha ao atualizar ONU", e);
            document.getElementById('loading-sinal-olt').style.display = 'none';
        });
        
    } else {
        document.getElementById('det-onu-nao-encontrada').style.display = 'block';
        document.getElementById('det-onu-dados').style.display = 'none';
        document.getElementById('loading-sinal-olt').style.display = 'none';
    }

    showModalNativo('modalDetalhesONU');
}

function atualizarLayoutOnu(onu) {
    document.getElementById('det-onu-mac').textContent = onu.mac || 'N/A';
    document.getElementById('det-onu-distancia').textContent = onu.distancia ? `${onu.distancia} metros` : 'N/A';

    // RX
    const rxInfo = parseFloat(onu.sinal_rx);
    let corRx = 'text-dark';
    if (rxInfo) {
        if (rxInfo < -26 || rxInfo > -10) corRx = 'text-danger fw-bold';
        else if (rxInfo <= -10 && rxInfo >= -26) corRx = 'text-success fw-bold';
    }
    document.getElementById('det-onu-sinal').innerHTML = onu.sinal_rx ? `<span class="${corRx}">${onu.sinal_rx} dBm</span>` : 'N/A';

    // TX
    const txInfo = parseFloat(onu.sinal_tx);
    let corTx = 'text-dark';
    if (txInfo) {
        if (txInfo < 0 || txInfo > 5) corTx = 'text-warning fw-bold'; 
        else corTx = 'text-success fw-bold'; 
    }
    document.getElementById('det-onu-sinal-tx').innerHTML = onu.sinal_tx ? `<span class="${corTx}">${onu.sinal_tx} dBm</span>` : 'N/A';

    // Status
    let statusOnu = onu.status;
    if (statusOnu === 'A') statusOnu = '<span class="badge bg-success">Online</span>';
    else if (statusOnu === 'I') statusOnu = '<span class="badge bg-danger">Offline / LOS</span>';
    document.getElementById('det-onu-status').innerHTML = statusOnu || 'Desconhecido';
}

async function enviarReagendamento() {
    const ixc_os_id = document.getElementById('action-os-id').value;
    const id_agenda_local = document.getElementById('action-agenda-local-id').value;
    const nova_data = document.getElementById('action-nova-data').value;
    const novo_turno = document.getElementById('action-novo-turno').value;

    if (!nova_data) return alert("Selecione a nova data!");

    const btn = document.getElementById('btn-action-reagendar');
    btn.innerHTML = 'Reagendando...';
    btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/reagendar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ixc_os_id, id_agenda_local, nova_data, novo_turno })
        });
        
        hideModalNativo('modalDetalhesOS');
        carregarAgenda(); 
    } catch (e) {
        alert("Erro ao reagendar: " + e.message);
    } finally {
        btn.innerHTML = 'Reagendar Visita';
        btn.disabled = false;
    }
}

function enviarFechamentoOS() {
    const mensagem = document.getElementById('input-fechar-mensagem').value;
    if (!mensagem) return alert('Por favor, descreva o que foi feito na mensagem de resolução.');

    const pId = window.osAtualParaFechar ? window.osAtualParaFechar.id_processo : null;

    if (pId && String(pId).trim() !== '' && String(pId).trim() !== '0') {
        
        hideModalNativo('modalDetalhesOS');
        
        setTimeout(() => {
            abrirModalDecisaoWFL();
        }, 500);

    } else {
        executarFechamentoFinal(mensagem, null);
    }
}

function abrirModalDecisaoWFL() {
    document.getElementById('sucesso-ticket-id').textContent = window.osAtualParaFechar.ixc_os_id;
    const listaWfl = document.getElementById('lista-tarefas-processo');
    listaWfl.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando fluxo...</div>';

    showModalNativo('modalDecisaoAgendamento');

    fetch('/api/v5/abertura-OS/tarefas/' + window.osAtualParaFechar.id_processo)
        .then(r => r.json())
        .then(tarefas => {
            if (tarefas.length > 0) {
                let html = '';
                tarefas.forEach((t, index) => {
                    html += `
                        <div class="form-check p-2 border rounded mb-1 bg-white">
                            <input class="form-check-input ms-1" type="radio" name="tarefa_wfl" id="tarefa_${t.id}" value="${t.id}" ${index === 0 ? 'checked' : ''}>
                            <label class="form-check-label fw-bold ms-2 w-100" style="cursor:pointer;" for="tarefa_${t.id}">
                                ${t.descricao}
                            </label>
                        </div>`;
                });
                listaWfl.innerHTML = html;
            } else {
                listaWfl.innerHTML = '<span class="text-muted small">Nenhuma etapa subsequente localizada.</span>';
            }
        })
        .catch(() => {
            listaWfl.innerHTML = '<span class="text-danger small">Erro ao carregar etapas.</span>';
        });
}

async function processarAvancoTarefaLogistica() {
    const mensagem = document.getElementById('input-fechar-mensagem').value;
    const selectedTarefa = document.querySelector('input[name="tarefa_wfl"]:checked');
    
    if (!selectedTarefa) return alert('Selecione uma etapa para avançar!');

    const btn = document.getElementById('btn-confirmar-tarefa-logistica');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

    await executarFechamentoFinal(mensagem, selectedTarefa.value);
}

async function executarFechamentoFinal(mensagem, id_tarefa_selecionada) {
    const payload = {
        ixc_os_id: window.osAtualParaFechar.ixc_os_id,
        mensagem_resposta: mensagem,
        id_tecnico: window.osAtualParaFechar.id_tecnico
    };

    if (window.osAtualParaFechar.id_processo && id_tarefa_selecionada) {
        payload.id_processo = window.osAtualParaFechar.id_processo;
        payload.id_tarefa_atual = window.osAtualParaFechar.id_tarefa_atual;
        payload.id_tarefa = id_tarefa_selecionada;
    }

    try {
        const response = await fetch('/api/v5/painel-logistica/fechar-os', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || 'Erro ao fechar OS');
        
        alert('OS Finalizada com sucesso!');
        window.location.reload();
    } catch (error) {
        alert("Falha no fechamento: " + error.message);
    }
}

async function autoRefreshSilencioso() {
    const data = document.getElementById('filtro-data').value;
    const municipio = document.getElementById('filtro-municipio').value;
    if (!data) return;

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=TODOS`);
        todosAgendamentosGlobais = await response.json();
        renderizarQuadro();
    } catch (e) {
        console.error("Falha no refresh silencioso", e);
    }
}

function atualizarTimers() {
    document.querySelectorAll('.timer-execucao').forEach(el => {
        const inicioStr = el.dataset.inicio;
        if (!inicioStr || inicioStr === 'null' || inicioStr === 'undefined') {
            el.innerHTML = '<i class="bi bi-tools me-1"></i>Executando';
            return;
        }
        
        const dataInicio = new Date(inicioStr.replace(/-/g, '/')); 
        if(isNaN(dataInicio)) return;

        const diffMinutos = Math.floor((new Date() - dataInicio) / 60000);
        const horas = Math.floor(diffMinutos / 60);
        const mins = diffMinutos % 60;
        
        const textoVisor = horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
        el.innerHTML = `<i class="bi bi-tools me-1"></i>${textoVisor}`;

        el.classList.remove('text-success', 'text-danger', 'text-roxo-vibrante', 'blink');
        el.style.backgroundColor = '';

        if (diffMinutos >= 90) { 
            el.classList.add('text-roxo-vibrante', 'blink'); 
            el.style.backgroundColor = '#f3e5f5'; // roxo suave
        } else if (diffMinutos >= 60) { 
            el.classList.add('text-danger', 'fw-bold');
            el.style.backgroundColor = '#f8d7da'; // vermelho suave
        } else {
            el.classList.add('text-success', 'fw-bold');
            el.style.backgroundColor = '#d1e7dd'; // verde suave
        }
    });
}

document.addEventListener('click', (e) => {
    const btnTurno = e.target.closest('.btn-retrair-turno');
    if (btnTurno) {
        const targetId = btnTurno.getAttribute('data-target');
        const el = document.getElementById(targetId);
        if (el) {
            el.classList.toggle('d-none');
            el.classList.toggle('d-flex');
        }
        return;
    }

    const btnColuna = e.target.closest('.click-retrair-coluna');
    if (btnColuna) {
        const targetId = btnColuna.getAttribute('data-target');
        const el = document.getElementById(targetId);
        if (el) el.classList.toggle('d-none');
        return;
    }
});

window.tratarPrioridade = async function(acao) {
    if (!window.osPrioridadeAtual) return;
    
    const msgConfirma = acao === 'aceitar' 
        ? 'Tem certeza que deseja PUXAR este agendamento para HOJE?' 
        : 'Tem certeza que deseja RECUSAR a prioridade?';
        
    if (!confirm(msgConfirma)) return;

    try {
        const response = await fetch('/api/v5/painel-logistica/tratar-prioridade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_local: window.osPrioridadeAtual.id,
                ixc_os_id: window.osPrioridadeAtual.ixc_os_id,
                acao: acao,
                data_hoje: document.getElementById('filtro-data').value
            })
        });
        
        if (!response.ok) throw new Error('Falha na comunicação com o servidor');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesOS'));
        if (modal) modal.hide();
        
        carregarAgenda();
    } catch (error) {
        alert('Erro ao processar a prioridade: ' + error.message);
    }
};

document.addEventListener('change', function(e) {
    if (e.target.classList.contains('select-atribuir-tecnico')) {
        const id_agenda = e.target.getAttribute('data-id-agenda');
        const ixc_os_id = e.target.getAttribute('data-ixc-os-id');
        const id_tecnico = e.target.value;
        if (typeof window.atribuirTecnicoOS === 'function') {
            window.atribuirTecnicoOS(id_agenda, id_tecnico, ixc_os_id);
        }
    }
});

function initializeThemeAndUserInfo() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');
    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
    } else {
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
    }
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');
            const newTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            themeToggleButton.innerHTML = newTheme === 'dark' ? '<i class="bi bi-brightness-high"></i>' : '<i class="bi bi-moon-stars"></i>';
        });
    }
    const logoutButton = document.getElementById('btnLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            window.location.href = '/logout';
        });
    }
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const rawGroup = data.group || '';
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                showModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                setTimeout(() => { window.location = "/"; }, 300);
                return;
            }
            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) {
                    el.textContent = username;
                }
                if (el.textContent.includes('{group}')) {
                    el.textContent = group;
                }
            });
        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
             showModal('Erro de Autenticação', 'Não foi possível verificar seu usuário. Por favor, faça o login novamente.', 'danger');
             setTimeout(() => { window.location = "/"; }, 300);
        });
}