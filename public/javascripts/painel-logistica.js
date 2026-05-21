let listaTecnicos = [];
let usuarioPodeEditar = false; 
let todosAgendamentosGlobais = [];
let mapaTecnicoColuna = {};
let allTechsGlobal = [];
let duplaCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof initializeThemeAndUserInfo === 'function') {
            initializeThemeAndUserInfo(); 
        }
    } catch (e) { console.warn("initializeTheme ignorado"); }

    await verificarPermissoes();

    document.getElementById('filtro-data').value = new Date().toISOString().split('T')[0];

    const btnVerOnu = document.getElementById('btn-ver-onu');
    if (btnVerOnu) btnVerOnu.addEventListener('click', abrirModalONU);

    const filtroSetor = document.getElementById('filtro-setor');
    if (filtroSetor) filtroSetor.addEventListener('change', renderizarQuadro);

    const filtroMunicipio = document.getElementById('filtro-municipio');
    if (filtroMunicipio) filtroMunicipio.addEventListener('change', renderizarQuadro);
    
    const btnCarregar = document.getElementById('btn-carregar-agenda');
    if (btnCarregar) btnCarregar.addEventListener('click', carregarAgenda);

    const btnSalvarEscala = document.getElementById('btn-salvar-escala');
    if (btnSalvarEscala) btnSalvarEscala.addEventListener('click', salvarEscala);

    const btnAddDupla = document.getElementById('btn-add-dupla');
    if (btnAddDupla) btnAddDupla.addEventListener('click', () => adicionarLinhaDupla());

    const btnAbrirEscala = document.getElementById('btn-abrir-escala');
    if (btnAbrirEscala) btnAbrirEscala.addEventListener('click', abrirModalEscala);

    const filtroStatus = document.getElementById('filtro-status');
    if (filtroStatus) filtroStatus.addEventListener('change', renderizarQuadro);

    const btnReagendar = document.getElementById('btn-action-reagendar');
    if (btnReagendar) btnReagendar.addEventListener('click', enviarReagendamento);

    const btnFechar = document.getElementById('btn-action-fechar');
    if (btnFechar) btnFechar.addEventListener('click', enviarFechamentoOS);

    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) {
        kanbanBoard.addEventListener('dragover', allowDrop);
        kanbanBoard.addEventListener('drop', drop);
    }

    carregarAgenda();

    setInterval(autoRefreshSilencioso, 45000); // Recarrega a tela a cada 45 segundos
    setInterval(atualizarTimers, 1000); // Atualiza os timers a cada segundo
});

function getPrimeiroUltimoNome(nomeCompleto) {
    if (!nomeCompleto) return 'Técnico';
    const partes = nomeCompleto.trim().split(' ');
    return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
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

function atualizarFiltroMunicipio() {
    const selectMun = document.getElementById('filtro-municipio');
    const valorAtual = selectMun.value;
    
    selectMun.innerHTML = '<option value="TODOS">Todas as Regiões</option>';
    
    const municipiosUnicos = [...new Set(todosAgendamentosGlobais.map(os => os.cidade_real).filter(s => s))].sort();
    
    municipiosUnicos.forEach(mun => {
        const option = document.createElement('option');
        option.value = mun;
        option.textContent = mun;
        selectMun.appendChild(option);
    });

    if (municipiosUnicos.includes(valorAtual)) {
        selectMun.value = valorAtual;
    } else {
        selectMun.value = 'TODOS';
    }
}

async function verificarPermissoes() {
    try {
        const response = await fetch('/api/username');
        const data = await response.json();
        const grupo = (data.group || '').toUpperCase();
        
        if (grupo.includes('LOGISTICA') || grupo.includes('LOGÍSTICA') || grupo.includes('ADMIN')) {
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

    if (!data) return alert("Selecione uma data.");

    await construirColunasTecnicos(data);

    document.getElementById('col-aguardando').innerHTML = '<div class="text-center text-muted mt-5"><div class="spinner-border spinner-border-sm"></div> Buscando...</div>';

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=${municipio}`);
        todosAgendamentosGlobais = await response.json();
        
        atualizarFiltroSetor();
        atualizarFiltroMunicipio();
        renderizarQuadro();

    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
    }
}

function renderizarQuadro() {
    document.getElementById('col-aguardando').innerHTML = '';
    
    document.querySelectorAll('.column-body').forEach(col => {
        if (col.id !== 'col-aguardando') {
            col.innerHTML = '';
        }
    });

    const statusFiltro = document.getElementById('filtro-status').value;
    const setorFiltro = document.getElementById('filtro-setor').value;
    const munFiltro = document.getElementById('filtro-municipio').value;

    let countAguardando = 0;
    let contadoresTecnicos = {};

    todosAgendamentosGlobais.forEach(os => {
        const statusIxc = os.ixc_status || 'A';
        const isConcluido = (statusIxc === 'F');
        const isFalha = (statusIxc === 'RAG');

        if (statusFiltro === 'OCULTAR_CONCLUIDOS' && isConcluido) return; 
        if (statusFiltro === 'PENDENTES' && (isConcluido || isFalha)) return;
        if (statusFiltro === 'FALHAS' && !isFalha) return;

        if (setorFiltro !== 'TODOS' && os.nome_setor !== setorFiltro) return;
        if (munFiltro !== 'TODOS' && os.cidade_real !== munFiltro) return;

        const card = criarCardOS(os);
        card.addEventListener('click', () => abrirModalDetalhes(os));
        
        if (!os.ixc_tecnico_id || os.status_interno === 'AGUARDANDO_LOGISTICA') {
            document.getElementById('col-aguardando').appendChild(card);
            countAguardando++;
        } else {
            let targetDivId = mapaTecnicoColuna[os.ixc_tecnico_id] || `col-extra-${os.ixc_tecnico_id}`;
            let colTecnico = document.getElementById(targetDivId);
            
            if (!colTecnico) {
                const board = document.getElementById('kanban-board');
                const nomeCompleto = (os.nome_tecnico || 'Desconhecido').trim();
                const partesNome = nomeCompleto.split(' ');
                const nomeExibicao = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}` : partesNome[0];
                
                const colHTML = `
                    <div class="kanban-column" style="border: 2px dashed #ffc107; background-color: #fffdf5;">
                        <div class="column-header">
                            <div class="column-title" title="Agendado no IXC, mas fora da Escala Intranet">
                                <i class="bi bi-exclamation-triangle-fill me-2 text-warning"></i> ${nomeExibicao} 
                                <span class="task-count" id="count-tec-${os.ixc_tecnico_id}">0</span>
                            </div>
                        </div>
                        <div class="column-body" id="${targetDivId}" data-tecnico-id="${os.ixc_tecnico_id}"></div>
                    </div>`;
                board.insertAdjacentHTML('beforeend', colHTML);
                colTecnico = document.getElementById(targetDivId);
            }

            colTecnico.appendChild(card);
            contadoresTecnicos[os.ixc_tecnico_id] = (contadoresTecnicos[os.ixc_tecnico_id] || 0) + 1;
        }
    });

    const isFiltroSetorAtivo = setorFiltro !== 'TODOS';
    
    const filtroUpper = setorFiltro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    document.querySelectorAll('.kanban-column').forEach(col => {
        if (col.querySelector('#col-aguardando')) return;
        
        const body = col.querySelector('.column-body');
        const hasCards = body.children.length > 0;
        const equipeDaColuna = col.getAttribute('data-equipe');
        
        let pertenceAoFiltro = false;
        if (isFiltroSetorAtivo && equipeDaColuna) {
            if (filtroUpper.includes('INSTALAC') && equipeDaColuna === 'INSTALACAO') pertenceAoFiltro = true;
            if (filtroUpper.includes('MANUTENC') && equipeDaColuna === 'MANUTENCAO') pertenceAoFiltro = true;
        }

        if (isFiltroSetorAtivo && !hasCards && !pertenceAoFiltro) {
            col.style.display = 'none';
        } else {
            col.style.display = 'flex';
        }
    });

    document.getElementById('count-aguardando').textContent = countAguardando;
    listaTecnicos.forEach(t => {
        const badge = document.getElementById(`count-tec-${t.id}`);
        if (badge) badge.textContent = contadoresTecnicos[t.id] || 0;
    });
    
    todosAgendamentosGlobais.forEach(os => {
       if (os.ixc_tecnico_id && !listaTecnicos.some(t => String(t.id) === String(os.ixc_tecnico_id))) {
           const badge = document.getElementById(`count-tec-${os.ixc_tecnico_id}`);
           if (badge) badge.textContent = contadoresTecnicos[os.ixc_tecnico_id] || 0;
       }
    });
}

async function construirColunasTecnicos(data) {
    try {
        const response = await fetch(`/api/v5/painel-logistica/tecnicos?data=${data}`);
        listaTecnicos = await response.json();
        mapaTecnicoColuna = {};

        const board = document.getElementById('kanban-board');
        while (board.children.length > 1) {
            board.removeChild(board.lastChild);
        }

        if (listaTecnicos.length === 0) return;

        let colunasMap = new Map();
        listaTecnicos.forEach(tec => {
            const isDupla = tec.dupla_id && tec.dupla_id.trim() !== '';
            const key = isDupla ? `DUPLA_${tec.dupla_id}` : `TEC_${tec.id}`;

            if (!colunasMap.has(key)) {
                colunasMap.set(key, {
                    id: key,
                    ids_tecnicos: [tec.id],
                    nomes: [getPrimeiroUltimoNome(tec.nome)],
                    equipe: tec.equipe || 'MANUTENCAO'
                });
            } else {
                const col = colunasMap.get(key);
                col.ids_tecnicos.push(tec.id);
                col.nomes.push(getPrimeiroUltimoNome(tec.nome));
            }
        });

        let colunasProntas = Array.from(colunasMap.values());
        colunasProntas.sort((a, b) => {
            if (a.equipe !== b.equipe) return a.equipe === 'MANUTENCAO' ? -1 : 1;
            return a.nomes[0].localeCompare(b.nomes[0]);
        });

        colunasProntas.forEach(col => {
            const divId = `col-board-${col.id}`;
            const tituloVisual = col.nomes.join(' | ');
            const equipeLabel = col.equipe === 'MANUTENCAO' ? 'Manutenção' : 'Instalação';
            const iconeCor = col.equipe === 'MANUTENCAO' ? 'text-primary' : 'text-success';

            col.ids_tecnicos.forEach(tid => {
                mapaTecnicoColuna[tid] = divId;
            });

            const colHTML = `
                <div class="kanban-column border-top border-3 ${col.equipe === 'MANUTENCAO' ? 'border-primary' : 'border-success'}" data-equipe="${col.equipe}">
                    <div class="column-header d-flex flex-column align-items-center pb-2 text-center bg-white border-bottom mb-2">
                        <div class="text-uppercase fw-bold mb-1" style="font-size: 0.75rem; letter-spacing: 0.5px; color: #6c757d;">
                            <i class="bi bi-briefcase-fill me-1 ${iconeCor}"></i>${equipeLabel}
                        </div>
                        <div class="fw-bold text-dark mb-2 w-100 px-2" style="font-size: 0.9rem; word-wrap: break-word;">
                            ${tituloVisual}
                        </div>
                        <div class="badge bg-secondary rounded-pill px-3 py-1 mt-auto">
                            <span class="task-count" id="count-tec-${col.ids_tecnicos[0]}">0</span> OS
                        </div>
                    </div>
                    <div class="column-body" id="${divId}" data-tecnico-id="${col.ids_tecnicos[0]}"></div>
                </div>
            `;
            board.insertAdjacentHTML('beforeend', colHTML);
        });
    } catch (error) {
        console.error("Erro ao buscar colunas:", error);
    }
}

function criarCardOS(os) {
    const card = document.createElement('div');
    card.className = `asana-card`;
    
    card.draggable = usuarioPodeEditar; 
    if (!usuarioPodeEditar) card.style.cursor = 'pointer';

    card.id = `os-${os.id}`;
    card.dataset.id = os.id;
    card.dataset.osIxc = os.ixc_os_id;

    let corBorda = 'border-left: 4px solid #6c757d;'; 
    let badgeStatus = '';
    const statusIxc = os.ixc_status || 'A';

    if (statusIxc === 'DS') { 
        corBorda = 'border-left: 4px solid #ffc107;';
        badgeStatus = `<span class="asana-badge" style="background-color: #fff3cd; color: #856404;"><i class="bi bi-car-front-fill me-1"></i>A Caminho</span>`;
    } else if (statusIxc === 'EX') { 
        corBorda = 'border-left: 4px solid #0dcaf0;';
        badgeStatus = `<span class="asana-badge" style="background-color: #cff4fc; color: #055160;"><i class="bi bi-tools me-1"></i>Executando</span>`;
        if (os.data_hora_execucao) {
            badgeStatus += `<span class="timer-execucao ms-2 badge bg-info text-dark" data-inicio="${os.data_hora_execucao}">⏱️ Calculando...</span>`;
        }
    } else if (statusIxc === 'F') { 
        corBorda = 'border-left: 4px solid #198754;';
        badgeStatus = `<span class="asana-badge" style="background-color: #d1e7dd; color: #0f5132;"><i class="bi bi-check-circle-fill me-1"></i>Concluído</span>`;
    } else if (statusIxc === 'RAG') { 
        corBorda = 'border-left: 4px solid #dc3545;';
        badgeStatus = `<span class="asana-badge" style="background-color: #f8d7da; color: #842029;"><i class="bi bi-x-circle-fill me-1"></i>Reagendar</span>`;
    } else { 
        badgeStatus = `<span class="asana-badge badge-turno">Pendente</span>`;
    }

    card.style = corBorda;

    let badgesHtml = '';
    if (os.horario_agendado) {
        badgesHtml += `<span class="asana-badge bg-dark text-white"><i class="bi bi-clock me-1"></i>${os.horario_agendado}</span>`;
    }
    
    badgesHtml += badgeStatus;

    if (os.tipo_servico === 'INSTALACAO') badgesHtml += `<span class="asana-badge badge-instalacao">Instalação</span>`;
    else badgesHtml += `<span class="asana-badge badge-suporte">Suporte</span>`;

    if (os.aceita_encaixe) badgesHtml += `<span class="asana-badge badge-encaixe"><i class="bi bi-lightning-fill"></i> Encaixe</span>`;

    if (os.nome_setor && os.nome_setor !== 'Não Informado') {
        badgesHtml += `<span class="asana-badge" style="background-color: #f1f3f4; color: #3c4043;"><i class="bi bi-briefcase-fill me-1"></i>${os.nome_setor}</span>`;
    }
    
    if (os.is_rede_neutra) {
        badgesHtml += `<span class="asana-badge" style="background-color: #e2e3e5; color: #383d41;"><i class="bi bi-diagram-3-fill me-1"></i>Rede Neutra</span>`;
    }

    const sintoma = os.sintoma_relatado || 'Agendado via intranet.';
    const sintomaTruncado = sintoma.length > 50 ? sintoma.substring(0, 50) + '...' : sintoma;

    const condNome = os.nome_condominio || 'S/C';
    let turnoLabel = 'Manhã';
    if (os.turno === 'VESPERTINO') turnoLabel = 'Tarde';
    else if (os.turno === 'NOTURNO') turnoLabel = 'Noite';
    
    const tituloExibicao = `${os.ixc_cliente_id} - ${condNome} - ${turnoLabel} - ${os.tipo_imovel}`;

    card.innerHTML = `
        <div class="mb-2">${badgesHtml}</div>
        <div class="os-title" style="font-size:0.85rem; line-height: 1.4; font-weight: bold; color: #212529;">
            ${tituloExibicao}
        </div>
        <div class="text-muted small mb-3 mt-2 border-top pt-2" title="${sintoma}">${sintomaTruncado}</div>
        <div class="os-meta d-flex justify-content-between align-items-center">
            <span class="text-truncate" style="max-width: 70%;"><i class="bi bi-geo-alt me-1 text-danger"></i>${os.municipio_base}</span>
            <span class="text-muted small">#${os.ixc_os_id}</span>
        </div>
    `;

    if (usuarioPodeEditar) {
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    }
    return card;
}

let draggedCard = null;

function dragStart(e) { draggedCard = this; setTimeout(() => this.style.opacity = '0.5', 0); }
function dragEnd() { this.style.opacity = '1'; draggedCard = null; }
function allowDrop(e) { e.preventDefault(); }

async function drop(e) {
    e.preventDefault();
    if (!draggedCard || !usuarioPodeEditar) return;

    let column = e.target.closest('.column-body');
    if (column) {
        column.appendChild(draggedCard);
        
        const idAgenda = draggedCard.dataset.id;
        const ixcOsId = draggedCard.dataset.osIxc;
        const tecnicoId = column.dataset.tecnicoId || null;
        const status = tecnicoId ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';

        try {
            await fetch('/api/v5/painel-logistica/atribuir-tecnico', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_agenda: idAgenda, ixc_tecnico_id: tecnicoId, status: status, ixc_os_id: ixcOsId })
            });
            carregarAgenda(); 
        } catch (error) {
            alert("Erro ao atribuir: " + error.message);
        }
    }
}

async function abrirModalEscala() {
    $('#modalEscala').modal('show');
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

            containerIndiv.innerHTML += `
                <div class="col-md-6 mb-2">
                    <div class="p-2 border rounded bg-light d-flex align-items-center justify-content-between">
                        <div class="form-check text-truncate me-2" style="max-width: 60%;" title="${tec.nome}">
                            <input class="form-check-input chk-escala" type="checkbox" value="${tec.id}" id="chk-tec-${tec.id}" ${isChecked}>
                            <label class="form-check-label fw-bold text-dark" for="chk-tec-${tec.id}" style="font-size: 0.85rem;">${getPrimeiroUltimoNome(tec.nome)}</label>
                        </div>
                        <select class="form-select form-select-sm w-auto sel-equipe" id="equipe-${tec.id}">
                            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manut</option>
                            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instal</option>
                        </select>
                    </div>
                </div>`;
        });
    } catch (e) {
        containerIndiv.innerHTML = '<div class="text-danger mt-3">Erro ao carregar técnicos.</div>';
    }
}

function adicionarLinhaDupla(tec1 = '', tec2 = '', equipe = 'MANUTENCAO') {
    duplaCounter++;
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center gap-2 mb-2 p-2 border rounded bg-light dupla-row shadow-sm';
    div.dataset.id = duplaCounter;

    let options = `<option value="">Selecione...</option>`;
    allTechsGlobal.forEach(t => {
        options += `<option value="${t.id}">${getPrimeiroUltimoNome(t.nome)}</option>`;
    });

    div.innerHTML = `
        <select class="form-select form-select-sm sel-equipe-dupla border-primary fw-bold" style="width: 130px; color: #0d6efd;">
            <option value="MANUTENCAO" ${equipe === 'MANUTENCAO' ? 'selected' : ''}>Manutenção</option>
            <option value="INSTALACAO" ${equipe === 'INSTALACAO' ? 'selected' : ''}>Instalação</option>
        </select>
        <select class="form-select form-select-sm sel-tec1-dupla flex-grow-1 border-secondary">${options}</select>
        <span class="text-muted fw-bold">|</span>
        <select class="form-select form-select-sm sel-tec2-dupla flex-grow-1 border-secondary">${options}</select>
        <button type="button" class="btn btn-sm btn-outline-danger btn-rm-dupla" title="Remover Dupla"><i class="bi bi-trash"></i></button>
    `;

    div.querySelector('.sel-tec1-dupla').value = tec1;
    div.querySelector('.sel-tec2-dupla').value = tec2;
    div.querySelector('.btn-rm-dupla').addEventListener('click', () => div.remove());

    document.getElementById('container-duplas').appendChild(div);
}

async function salvarEscala() {
    const data = document.getElementById('filtro-data').value;
    const tecnicosArr = [];
    const idsUsados = new Set();

    document.querySelectorAll('.dupla-row').forEach((row, index) => {
        const equipe = row.querySelector('.sel-equipe-dupla').value;
        const t1 = row.querySelector('.sel-tec1-dupla').value;
        const t2 = row.querySelector('.sel-tec2-dupla').value;
        const duplaId = `D_DYN_${index + 1}`;

        if (t1) {
            tecnicosArr.push({ id: t1, equipe, dupla_id: duplaId });
            idsUsados.add(t1);
        }
        if (t2 && t2 !== t1) {
            tecnicosArr.push({ id: t2, equipe, dupla_id: duplaId });
            idsUsados.add(t2);
        }
    });

    document.querySelectorAll('.chk-escala:checked').forEach(chk => {
        const id = chk.value;
        if (!idsUsados.has(id)) {
            const equipe = document.getElementById(`equipe-${id}`).value;
            tecnicosArr.push({ id, equipe, dupla_id: null });
        }
    });

    const btn = document.getElementById('btn-salvar-escala');
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/salvar-escala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data, tecnicos: tecnicosArr })
        });
        $('#modalEscala').modal('hide');
        carregarAgenda();
    } catch (e) {
        alert("Erro ao salvar escala.");
    } finally {
        btn.innerHTML = 'Salvar Escala';
        btn.disabled = false;
    }
}

async function abrirModalDetalhes(os) {
    document.getElementById('action-os-id').value = os.ixc_os_id;
    document.getElementById('action-agenda-local-id').value = os.id; 
    document.getElementById('action-nova-data').value = document.getElementById('filtro-data').value;
    document.getElementById('action-msg-fechar').value = '';
    document.getElementById('detalhe-os-titulo').textContent = `Buscando OS #${os.ixc_os_id}...`;

    const areaAcoes = document.getElementById('area-acoes-os');
    if (areaAcoes) areaAcoes.style.display = usuarioPodeEditar ? 'block' : 'none';

    document.getElementById('loading-detalhes-os').style.display = 'flex';
    document.getElementById('conteudo-detalhes-os').style.display = 'none';

    $('#modalDetalhesOS').modal('show');

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
        document.getElementById('det-sintoma').innerHTML = msgSintoma.replace(/\n/g, "<br>");

        document.getElementById('loading-detalhes-os').style.display = 'none';
        document.getElementById('conteudo-detalhes-os').style.display = 'flex';

    } catch (e) {
        alert("Não foi possível carregar os detalhes do IXC.");
        $('#modalDetalhesOS').modal('hide');
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

    $('#modalDetalhesONU').modal('show');
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
        
        $('#modalDetalhesOS').modal('hide');
        carregarAgenda(); 
    } catch (e) {
        alert("Erro ao reagendar: " + e.message);
    } finally {
        btn.innerHTML = 'Reagendar Visita';
        btn.disabled = false;
    }
}

async function enviarFechamentoOS() {
    const ixc_os_id = document.getElementById('action-os-id').value;
    const mensagem_resposta = document.getElementById('action-msg-fechar').value;

    if (!mensagem_resposta) return alert("Digite a mensagem de fechamento!");

    const btn = document.getElementById('btn-action-fechar');
    btn.innerHTML = 'Fechando...';
    btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/fechar-os', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ixc_os_id, mensagem_resposta })
        });
        
        $('#modalDetalhesOS').modal('hide');
        carregarAgenda(); 
    } catch (e) {
        alert("Erro ao fechar: " + e.message);
    } finally {
        btn.innerHTML = 'Finalizar OS';
        btn.disabled = false;
    }
}

async function autoRefreshSilencioso() {
    const modalDetalhes = document.getElementById('modalDetalhesOS');
    const modalEscala = document.getElementById('modalEscala');
    
    if (draggedCard || (modalDetalhes && modalDetalhes.classList.contains('show')) || (modalEscala && modalEscala.classList.contains('show'))) {
        return; 
    }

    const data = document.getElementById('filtro-data').value;
    const municipio = document.getElementById('filtro-municipio').value;
    if (!data) return;

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=TODOS`);
        todosAgendamentosGlobais = await response.json();
        renderizarQuadro();
    } catch (e) {
        console.error("Erro no auto-refresh:", e);
    }
}

function atualizarTimers() {
    document.querySelectorAll('.timer-execucao').forEach(el => {
        const inicioStr = el.dataset.inicio;
        if (!inicioStr) return;
        
        const p = inicioStr.split(/[- :]/);
        if (p.length < 6) return;
        
        const dataInicio = new Date(p[0], p[1]-1, p[2], p[3], p[4], p[5]);
        const diffSegundos = Math.floor((new Date() - dataInicio) / 1000);
        
        if (diffSegundos < 0) return;

        const horas = Math.floor(diffSegundos / 3600);
        const mins = Math.floor((diffSegundos % 3600) / 60);
        const secs = diffSegundos % 60;

        el.textContent = `⏱️ ${String(horas).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

        if (diffSegundos > 5400) {
            el.className = 'timer-execucao ms-2 badge bg-roxo text-white';
            el.title = "Atenção: Atendimento longo!";
        } else {
            el.className = 'timer-execucao ms-2 badge bg-info text-dark';
        }
    });
}

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