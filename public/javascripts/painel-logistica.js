let listaTecnicos = [];
let usuarioPodeEditar = false; 
let todosAgendamentosGlobais = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof initializeThemeAndUserInfo === 'function') {
            initializeThemeAndUserInfo(); 
        }
    } catch (e) { console.warn("initializeTheme ignorado"); }

    await verificarPermissoes();

    document.getElementById('filtro-data').value = new Date().toISOString().split('T')[0];
    
    // Adicionando eventos com segurança (verificando se o botão existe)
    const btnCarregar = document.getElementById('btn-carregar-agenda');
    if (btnCarregar) btnCarregar.addEventListener('click', carregarAgenda);

    const btnSalvarEscala = document.getElementById('btn-salvar-escala');
    if (btnSalvarEscala) btnSalvarEscala.addEventListener('click', salvarEscala);

    const btnAbrirEscala = document.getElementById('btn-abrir-escala');
    if (btnAbrirEscala) btnAbrirEscala.addEventListener('click', abrirModalEscala);

    const filtroStatus = document.getElementById('filtro-status');
    if (filtroStatus) filtroStatus.addEventListener('change', renderizarQuadro);

    const btnReagendar = document.getElementById('btn-action-reagendar');
    if (btnReagendar) btnReagendar.addEventListener('click', enviarReagendamento);

    const btnFechar = document.getElementById('btn-action-fechar');
    if (btnFechar) btnFechar.addEventListener('click', enviarFechamentoOS);

    // DELEGAÇÃO DE EVENTOS DE DRAG & DROP PARA O QUADRO KANBAN
    const kanbanBoard = document.getElementById('kanban-board');
    if (kanbanBoard) {
        kanbanBoard.addEventListener('dragover', allowDrop);
        kanbanBoard.addEventListener('drop', drop);
    }

    carregarAgenda();
});

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
        
        renderizarQuadro();

    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
    }
}

function renderizarQuadro() {
    document.getElementById('col-aguardando').innerHTML = '';
    listaTecnicos.forEach(t => {
        const col = document.getElementById(`col-tec-${t.id}`);
        if(col) col.innerHTML = '';
    });

    const statusFiltro = document.getElementById('filtro-status').value;
    let countAguardando = 0;
    let contadoresTecnicos = {};

    todosAgendamentosGlobais.forEach(os => {
        const statusIxc = os.ixc_status || 'A';
        const isConcluido = (statusIxc === 'F');
        const isFalha = (statusIxc === 'RAG');

        if (statusFiltro === 'OCULTAR_CONCLUIDOS' && isConcluido) return; 
        if (statusFiltro === 'PENDENTES' && (isConcluido || isFalha)) return;
        if (statusFiltro === 'FALHAS' && !isFalha) return;

        const card = criarCardOS(os);
        card.addEventListener('click', () => abrirModalDetalhes(os));
        
        if (!os.ixc_tecnico_id || os.status_interno === 'AGUARDANDO_LOGISTICA') {
            document.getElementById('col-aguardando').appendChild(card);
            countAguardando++;
        } else {
            let colTecnico = document.getElementById(`col-tec-${os.ixc_tecnico_id}`);
            
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
                        <div class="column-body" id="col-tec-${os.ixc_tecnico_id}" data-tecnico-id="${os.ixc_tecnico_id}"></div>
                    </div>`;
                board.insertAdjacentHTML('beforeend', colHTML);
                colTecnico = document.getElementById(`col-tec-${os.ixc_tecnico_id}`);
            }

            colTecnico.appendChild(card);
            contadoresTecnicos[os.ixc_tecnico_id] = (contadoresTecnicos[os.ixc_tecnico_id] || 0) + 1;
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

        const board = document.getElementById('kanban-board');
        while (board.children.length > 1) {
            board.removeChild(board.lastChild);
        }

        if (listaTecnicos.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'text-muted p-4 fst-italic';
            msg.innerHTML = '<i class="bi bi-info-circle me-2"></i>Nenhum técnico escalado para este dia.';
            board.appendChild(msg);
            return;
        }

        listaTecnicos.forEach(tec => {
            const nomeCompleto = (tec.nome || 'Técnico').trim();
            const partesNome = nomeCompleto.split(' ');
            const nomeExibicao = partesNome.length > 1 ? `${partesNome[0]} ${partesNome[partesNome.length - 1]}` : partesNome[0];

            // Sem os eventos ondrop/ondragover aqui (Resolvido pela delegação de eventos no topo)
            const colHTML = `
                <div class="kanban-column">
                    <div class="column-header">
                        <div class="column-title">
                            <i class="bi bi-person-circle me-2 text-primary"></i> ${nomeExibicao} 
                            <span class="task-count" id="count-tec-${tec.id}">0</span>
                        </div>
                    </div>
                    <div class="column-body" id="col-tec-${tec.id}" data-tecnico-id="${tec.id}">
                    </div>
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

    let badgesHtml = badgeStatus;
    if (os.tipo_servico === 'INSTALACAO') badgesHtml += `<span class="asana-badge badge-instalacao">Instalação</span>`;
    else badgesHtml += `<span class="asana-badge badge-suporte">Suporte</span>`;

    if (os.aceita_encaixe) badgesHtml += `<span class="asana-badge badge-encaixe"><i class="bi bi-lightning-fill"></i> Encaixe</span>`;

    const sintoma = os.sintoma_relatado || 'Agendado via intranet.';
    const sintomaTruncado = sintoma.length > 50 ? sintoma.substring(0, 50) + '...' : sintoma;

    card.innerHTML = `
        <div class="mb-2">${badgesHtml}</div>
        <div class="os-title">OS #${os.ixc_os_id} - ${os.tipo_imovel}</div>
        <div class="text-muted small mb-3" title="${sintoma}">${sintomaTruncado}</div>
        <div class="os-meta d-flex justify-content-between">
            <span><i class="bi bi-geo-alt me-1 text-danger"></i>${os.municipio_base}</span>
            <span class="fw-bold"><i class="bi bi-clock me-1"></i>${os.turno === 'MATUTINO' ? 'Manhã' : 'Tarde'}</span>
        </div>
    `;

    if (usuarioPodeEditar) {
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    }
    return card;
}

// --- DRAG AND DROP (AGORA VIA DELEGAÇÃO DE EVENTOS) ---
let draggedCard = null;

function dragStart(e) { draggedCard = this; setTimeout(() => this.style.opacity = '0.5', 0); }
function dragEnd() { this.style.opacity = '1'; draggedCard = null; }
function allowDrop(e) { e.preventDefault(); }

async function drop(e) {
    e.preventDefault();
    if (!draggedCard || !usuarioPodeEditar) return;

    // Busca a coluna mais próxima onde o cartão foi solto
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

// --- FUNÇÕES DOS MODAIS ---
async function abrirModalEscala() {
    $('#modalEscala').modal('show');
    const data = document.getElementById('filtro-data').value;
    const dataFormatada = data.split('-').reverse().join('/');
    document.getElementById('display-data-escala').textContent = dataFormatada;

    const container = document.getElementById('lista-checkbox-tecnicos');
    container.innerHTML = '<div class="text-center mt-3"><div class="spinner-border text-primary"></div><p>Buscando técnicos...</p></div>';

    try {
        const response = await fetch('/api/v5/painel-logistica/todos-tecnicos');
        const todos = await response.json();
        container.innerHTML = '';
        todos.forEach(tec => {
            const estaEscalado = listaTecnicos.some(t => t.id === tec.id) ? 'checked' : '';
            container.innerHTML += `
                <div class="col-md-6">
                    <div class="form-check border rounded p-2 bg-light">
                        <input class="form-check-input ms-1 me-2 chk-escala" type="checkbox" value="${tec.id}" id="chk-tec-${tec.id}" ${estaEscalado}>
                        <label class="form-check-label text-dark fw-medium" style="cursor:pointer;" for="chk-tec-${tec.id}">${tec.nome}</label>
                    </div>
                </div>`;
        });
    } catch (e) {
        container.innerHTML = '<div class="text-danger mt-3">Erro ao carregar técnicos.</div>';
    }
}

async function salvarEscala() {
    const data = document.getElementById('filtro-data').value;
    const checkboxes = document.querySelectorAll('.chk-escala:checked');
    const tecnicosIds = Array.from(checkboxes).map(c => c.value);

    const btn = document.getElementById('btn-salvar-escala');
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await fetch('/api/v5/painel-logistica/salvar-escala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data, tecnicos_ids: tecnicosIds })
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

        document.getElementById('detalhe-os-titulo').textContent = `OS #${os.ixc_os_id} - ${os.turno} (${os.tipo_imovel})`;
        
        document.getElementById('det-cliente-nome').textContent = data.cliente.nome || 'Cliente não encontrado';
        document.getElementById('det-cliente-fone').textContent = data.cliente.telefones || 'Sem telefone';
        
        document.getElementById('det-contrato').textContent = data.contrato.descricao || 'Sem contrato vinculado';
        document.getElementById('det-login').textContent = data.login.usuario || 'Sem login PPPoE';

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