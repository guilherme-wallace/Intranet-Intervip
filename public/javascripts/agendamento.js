// javascripts/agendamento.js

document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeAndUserInfo()

    const urlParams = new URLSearchParams(window.location.search);
    const osId = urlParams.get('os');
    const origem = urlParams.get('origem');
    const tipo = urlParams.get('tipo') || '';

    if (!osId) {
        await showInfoModal("Nenhuma OS informada na URL.", "Agendamento", "warning");
        document.getElementById('loading-os').style.display = 'none';
        return;
    }

    document.getElementById('btn-prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('btn-next-week').addEventListener('click', () => changeWeek(1));
    prepararPreferenciaHorario();

    carregarTagsAgendamento();
    await carregarDadosOS(osId, origem, tipo);

    document.getElementById('form-agendamento').addEventListener('submit', confirmarAgendamento);
});

function prepararPreferenciaHorario() {
    const selectTipo = document.getElementById('preferencia-horario-tipo');
    if (!selectTipo) return;

    const detalhesRow = selectTipo.closest('.row');
    if (!detalhesRow) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-2';
    wrapper.innerHTML = `
        <label class="form-label small fw-bold">Preferência de horário?</label>
        <select class="form-select form-select-sm" id="preferencia-horario-habilitada">
            <option value="NAO">Sem preferência</option>
            <option value="SIM">Informar preferência</option>
        </select>
    `;
    detalhesRow.parentElement.insertBefore(wrapper, detalhesRow);

    selectTipo.innerHTML = `
        <option value="A_PARTIR">A partir de</option>
        <option value="ATE">Até</option>
        <option value="INTERVALO">Entre horários</option>
        <option value="OBSERVACAO">Observação livre</option>
    `;

    document.getElementById('preferencia-horario-habilitada').addEventListener('change', atualizarPreferenciaHorarioUi);
    selectTipo.addEventListener('change', atualizarPreferenciaHorarioUi);
    atualizarPreferenciaHorarioUi();
}

function atualizarPreferenciaHorarioUi() {
    const habilitada = document.getElementById('preferencia-horario-habilitada')?.value === 'SIM';
    const selectTipo = document.getElementById('preferencia-horario-tipo');
    const detalhesRow = selectTipo?.closest('.row');
    if (!detalhesRow) return;

    detalhesRow.classList.toggle('d-none', !habilitada);
    const tipo = String(selectTipo.value || 'A_PARTIR').toUpperCase();
    const inicioGroup = document.getElementById('preferencia-horario-inicio')?.closest('.col-md-2');
    const fimGroup = document.getElementById('preferencia-horario-fim')?.closest('.col-md-2');
    const obsGroup = document.getElementById('preferencia-horario-obs')?.closest('.col-md-4');

    if (inicioGroup) inicioGroup.classList.toggle('d-none', !habilitada || !['A_PARTIR', 'INTERVALO'].includes(tipo));
    if (fimGroup) fimGroup.classList.toggle('d-none', !habilitada || !['ATE', 'INTERVALO'].includes(tipo));
    if (obsGroup) obsGroup.classList.toggle('d-none', !habilitada || tipo !== 'OBSERVACAO');

    if (!habilitada) {
        document.getElementById('preferencia-horario-inicio').value = '';
        document.getElementById('preferencia-horario-fim').value = '';
        document.getElementById('preferencia-horario-obs').value = '';
    }
}

async function obterPreferenciaHorarioPayload() {
    const habilitada = document.getElementById('preferencia-horario-habilitada')?.value === 'SIM';
    if (!habilitada) {
        return {
            preferencia_horario_tipo: 'SEM_PREFERENCIA',
            preferencia_horario_inicio: '',
            preferencia_horario_fim: '',
            preferencia_horario_obs: ''
        };
    }

    const tipo = String(document.getElementById('preferencia-horario-tipo')?.value || '').toUpperCase();
    const inicio = document.getElementById('preferencia-horario-inicio')?.value || '';
    const fim = document.getElementById('preferencia-horario-fim')?.value || '';
    const obs = document.getElementById('preferencia-horario-obs')?.value.trim() || '';

    if (tipo === 'A_PARTIR' && !inicio) throw new Error('Informe o horário inicial da preferência.');
    if (tipo === 'ATE' && !fim) throw new Error('Informe o horário final da preferência.');
    if (tipo === 'INTERVALO' && (!inicio || !fim)) throw new Error('Informe o horário inicial e final da preferência.');
    if (tipo === 'OBSERVACAO' && !obs) throw new Error('Informe a observação da preferência de horário.');

    return {
        preferencia_horario_tipo: tipo,
        preferencia_horario_inicio: inicio,
        preferencia_horario_fim: fim,
        preferencia_horario_obs: obs
    };
}

async function carregarTagsAgendamento() {
    const container = document.getElementById('area-tags-agendamento');
    if (!container) return;

    try {
        const response = await fetch('/api/v5/painel-logistica/tags');
        const tags = await response.json();
        const ativas = Array.isArray(tags) ? tags.filter(tag => Number(tag.ativo) === 1) : [];

        if (ativas.length === 0) {
            container.innerHTML = '<span class="text-muted small">Nenhuma tag ativa configurada.</span>';
            return;
        }

        container.innerHTML = ativas.map(tag => `
            <label class="form-check-label border rounded-pill px-3 py-2 bg-white small fw-bold" style="cursor:pointer;">
                <input class="form-check-input me-1 chk-tag-agendamento" type="checkbox" value="${tag.id}">
                <span style="background:${tag.cor_fundo || '#0d6efd'};color:${tag.cor_texto || '#fff'};" class="badge">${tag.nome}</span>
            </label>
        `).join('');
    } catch (error) {
        container.innerHTML = '<span class="text-danger small">Não foi possível carregar as tags.</span>';
    }
}

async function carregarDadosOS(id_ticket, origem, tipo) {
    try {
        const params = new URLSearchParams({
            origem: origem || '',
            tipo: tipo || ''
        });
        const response = await fetch(`/api/v5/agendamento/detalhes-os/${id_ticket}?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        document.getElementById('loading-os').style.display = 'none';
        document.getElementById('conteudo-agendamento').style.display = 'block';

        document.getElementById('badge-tipo-os').textContent = data.tipo_servico;
        document.getElementById('form-agendamento').dataset.contratoId = data.contrato_id;
        document.getElementById('os-cliente-nome').textContent = data.nome;
        document.getElementById('os-ticket-id').textContent = `Ticket IXC: #${data.id_ticket}`;
        document.getElementById('os-endereco').textContent = data.endereco;
        document.getElementById('os-mensagem').textContent = data.mensagem;
        
        let municipioBase = "DESCONHECIDO";
        if (data.cidade) {
            const cidadeUpper = data.cidade.toUpperCase();
            if (cidadeUpper.includes("SERRA")) municipioBase = "SERRA";
            else if (cidadeUpper.includes("VILA VELHA")) municipioBase = "VILA VELHA";
            else if (cidadeUpper.includes("VITORIA") || cidadeUpper.includes("VITÓRIA")) municipioBase = "VITORIA";
        }
        
        document.getElementById('os-municipio').textContent = municipioBase;
        document.getElementById('os-tipo-imovel').textContent = data.tipo_imovel;

        document.getElementById('hidden-os-id').value = data.id_ticket;
        document.getElementById('form-agendamento').dataset.osId = data.id_os || data.id_ticket;
        document.getElementById('form-agendamento').dataset.ticketId = data.id_atendimento || data.id_ticket;
        document.getElementById('form-agendamento').dataset.modo = data.ja_agendada ? 'REAGENDAMENTO' : 'NOVO';
        document.getElementById('hidden-municipio').value = municipioBase;
        document.getElementById('hidden-tipo-servico').value = data.tipo_servico;
        
        document.getElementById('form-agendamento').dataset.clienteId = data.cliente_id;
        document.getElementById('form-agendamento').dataset.tipoImovel = data.tipo_imovel;

        document.getElementById('badge-tipo-os').textContent = data.tipo_servico;
        initCalendar();

    } catch (error) {
        await showInfoModal("Erro ao buscar OS: " + error.message, "Erro", "danger");
    }
}

let currentWeekStart = new Date();
let selectedData = '';
let selectedTurno = '';

function initCalendar() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart = new Date(today.setDate(diff));
    currentWeekStart.setHours(0,0,0,0);
    loadWeekData();
}

function changeWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    loadWeekData();
}

async function loadWeekData() {
    const municipio = document.getElementById('hidden-municipio').value;
    const tipoServico = document.getElementById('hidden-tipo-servico').value;
    const tipoImovel = document.getElementById('form-agendamento').dataset.tipoImovel;

    if (!municipio) return;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '<div class="w-100 text-center py-5"><span class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></span><p class="mt-2 text-muted fw-bold">Carregando semana...</p></div>';

    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const startStr = formatDate(currentWeekStart);
    const endStr = formatDate(endDate);

    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    let mesAnoText = `${meses[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;
    if (currentWeekStart.getMonth() !== endDate.getMonth()) {
        mesAnoText = `${meses[currentWeekStart.getMonth()]} / ${meses[endDate.getMonth()]} ${endDate.getFullYear()}`;
    }
    document.getElementById('calendar-month-year').textContent = mesAnoText;

    try {
        const response = await fetch(`/api/v5/agendamento/vagas-semana?data_inicio=${startStr}&data_fim=${endStr}&municipio=${municipio}&tipo_servico=${tipoServico}&tipo_imovel=${tipoImovel}`);
        const weekData = await response.json();
        renderCalendarGrid(weekData);
    } catch (error) {
        grid.innerHTML = '<div class="alert alert-danger w-100 text-center fw-bold">Erro ao carregar a disponibilidade de horários.</div>';
    }
}

function renderCalendarGrid(weekData) {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const todayStr = formatDate(new Date());

    let curr = new Date(currentWeekStart);

    for (let i = 0; i < 7; i++) {
        const dateStr = formatDate(curr);
        const dayName = daysOfWeek[i];
        const dayNum = String(curr.getDate()).padStart(2, '0');
        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        
        const currentHour = new Date().getHours();

        const matutinoPassado = isPast || (isToday && currentHour >= 12);
        const vespertinoPassado = isPast || (isToday && currentHour >= 18);

        const dayData = weekData[dateStr] || { matutino: { disponivel: false, msg: 'Fechada'}, vespertino: { disponivel: false, msg: 'Fechada'} };

        let matHtml = renderSlot(dateStr, 'MATUTINO', dayData.matutino, matutinoPassado);
        let vespHtml = renderSlot(dateStr, 'VESPERTINO', dayData.vespertino, vespertinoPassado);

        const col = document.createElement('div');
        col.className = 'border rounded d-flex flex-column bg-white shadow-sm flex-grow-1';
        col.style.minWidth = '135px';
        col.style.opacity = isPast ? '0.5' : '1';

        if (isPast) {
            col.classList.add('d-none');
        }

        col.innerHTML = `
            <div class="text-center bg-light border-bottom py-2 ${isToday ? 'text-primary' : 'text-secondary'}">
                <span class="fw-bold small text-uppercase">${dayName}</span><br>
                <span class="fs-4 fw-bolder">${dayNum}</span>
            </div>
            <div class="p-2 d-flex flex-column gap-2 flex-grow-1">
                ${matHtml}
                ${vespHtml}
            </div>
        `;
        grid.appendChild(col);
        curr.setDate(curr.getDate() + 1);
    }
}

function renderSlot(dateStr, turno, slotData, isPast) {
    const isSelected = selectedData === dateStr && selectedTurno === turno;
    const btnClass = isSelected ? 'btn-success text-white border-success' : 'btn-outline-primary bg-white';
    const labelTurno = turno === 'MATUTINO' ? 'Manhã' : 'Tarde';
    const icone = turno === 'MATUTINO' ? 'bi-sunrise' : 'bi-sun';

    if (isPast || !slotData.disponivel) {
        const msg = isPast ? 'Passado' : (slotData.msg || 'Esgotado');
        return `<div class="p-2 text-center border rounded bg-light text-muted h-100 d-flex flex-column justify-content-center shadow-sm" style="min-height: 70px;">
                    <span class="fw-bold small"><i class="bi ${icone} me-1"></i>${labelTurno}</span>
                    <span style="font-size: 0.7rem;">${msg}</span>
                </div>`;
    }

    return `<button type="button" class="btn ${btnClass} w-100 h-100 p-2 d-flex flex-column align-items-center justify-content-center shadow-sm btn-slot-agenda" style="min-height: 70px; transition: 0.2s;" data-date="${dateStr}" data-turno="${turno}">
                <span class="fw-bold small mb-1" style="pointer-events:none;"><i class="bi ${icone} me-1"></i>${labelTurno}</span>
                <span class="badge ${isSelected ? 'bg-white text-success' : 'bg-primary'} rounded-pill" style="font-size: 0.75rem; pointer-events:none;">${slotData.vagas} Vagas</span>
            </button>`;
}

document.addEventListener('click', async function(e) {
    const btnSlot = e.target.closest('.btn-slot-agenda');
    if (btnSlot) {
        const dateStr = btnSlot.getAttribute('data-date');
        const turno = btnSlot.getAttribute('data-turno');
        
        selectedData = dateStr;
        selectedTurno = turno;
        loadWeekData();

        document.getElementById('selected-data').value = dateStr;
        document.getElementById('selected-turno').value = turno;
        document.getElementById('btn-confirmar-agendamento').disabled = false;

        const formatBR = dateStr.split('-').reverse().join('/');
        const labelTurno = turno === 'MATUTINO' ? 'Manhã' : 'Tarde';
        document.getElementById('feedback-text').textContent = `${formatBR} no turno da ${labelTurno}`;
        document.getElementById('selection-feedback').classList.remove('d-none');
    }
});

function formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

async function confirmarAgendamento(event) {
    event.preventDefault();

    const dataEscolhida = document.getElementById('selected-data').value;
    const turnoEscolhido = document.getElementById('selected-turno').value;
    const encaixeSelecionado = document.querySelector('input[name="aceita-encaixe"]:checked');
    const solicitaPrioridade = false;

    if (!dataEscolhida || !turnoEscolhido) {
        await showInfoModal('Por favor, selecione um dia e turno disponível clicando no calendário.', 'Selecione um horário', 'warning');
        return;
    }

    if (!encaixeSelecionado) {
        await showInfoModal('Informe se o cliente aceita encaixe antes de confirmar.', 'Aceita encaixe?', 'warning');
        return;
    }

    let preferenciaPayload;
    try {
        preferenciaPayload = await obterPreferenciaHorarioPayload();
    } catch (error) {
        await showInfoModal(error.message, 'Preferência de horário', 'warning');
        return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    const originalText = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
    btnConfirmar.disabled = true;

    const payload = {
        id_ticket: document.getElementById('hidden-os-id').value,
        id_os: document.getElementById('form-agendamento').dataset.osId || '',
        os_id: document.getElementById('form-agendamento').dataset.osId || '',
        id_chamado: document.getElementById('form-agendamento').dataset.osId || '',
        modo: document.getElementById('form-agendamento').dataset.modo || 'NOVO',
        cliente_id: document.getElementById('form-agendamento').dataset.clienteId,
        contrato_id: document.getElementById('form-agendamento').dataset.contratoId,
        municipio: document.getElementById('hidden-municipio').value,
        tipo_servico: document.getElementById('hidden-tipo-servico').value,
        tipo_imovel: document.getElementById('form-agendamento').dataset.tipoImovel,
        data_agendamento: dataEscolhida,
        turno: turnoEscolhido,
        aceita_encaixe: encaixeSelecionado.value === 'SIM',
        solicita_prioridade: solicitaPrioridade,
        ...preferenciaPayload,
        tag_ids: Array.from(document.querySelectorAll('.chk-tag-agendamento:checked')).map(chk => chk.value),
        usuario_logado: window.usuarioLogado
    };

    try {
        let response = await fetch('/api/v5/agendamento/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let result = await response.json();

        if (!response.ok && result.code === 'OS_JA_AGENDADA' && result.can_reagendar) {
            const confirmar = await showConfirmModal(result.error, 'OS já agendada', 'warning', 'Reagendar', 'Cancelar');
            if (!confirmar) throw new Error('Reagendamento cancelado pelo usuário.');
            const abrirChamadoDuvida = await showConfirmModal(
                'Deseja abrir um chamado de dúvida para gerar novo protocolo e relacionar ao reagendamento?',
                'Novo protocolo',
                'question',
                'Sim, abrir',
                'Não'
            );
            response = await fetch('/api/v5/agendamento/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    reagendar_existente: true,
                    abrir_chamado_duvida: abrirChamadoDuvida,
                    modo_reagendamento: abrirChamadoDuvida ? 'COM_CHAMADO_DUVIDA' : 'APENAS_REAGENDAR'
                })
            });
            result = await response.json();
        }

        if (!response.ok && result.code === 'CLIENTE_JA_AGENDADO') {
            const detalhes = result.agendamento
                ? `<br><br><strong>OS existente:</strong> #${result.agendamento.ixc_os_id || 'N/A'}<br><strong>Data:</strong> ${result.agendamento.data || 'N/A'}<br><strong>Turno:</strong> ${result.agendamento.turno || 'N/A'}`
                : '';
            await showInfoModal(`${result.error || 'Foi encontrada outra OS agendada para este cliente.'}${detalhes}`, 'Duplicidade real de agendamento', 'warning');
            btnConfirmar.innerHTML = originalText;
            btnConfirmar.disabled = false;
            return;
        }

        if (!response.ok) throw new Error(result.error);

        document.getElementById('form-agendamento').innerHTML = '<div class="alert alert-success text-center p-4 border-success"><i class="bi bi-check-circle-fill display-4 d-block mb-3"></i><h4 class="alert-heading fw-bold">Agendamento Realizado!</h4><p class="mb-0">A OS foi enviada para o painel da Logística.</p><div class="d-flex flex-wrap justify-content-center gap-2 mt-3"><a href="/painel-logistica" class="btn btn-outline-success">Ir para a agenda!</a><a href="/abertura-OS" class="btn btn-outline-primary">Voltar para Abertura de OS</a></div></div>';
    } catch (error) {
        await showInfoModal('Erro ao confirmar: ' + error.message, 'Erro no agendamento', 'danger');
        btnConfirmar.innerHTML = originalText;
        btnConfirmar.disabled = false;
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
            window.usuarioLogado = username;
            const rawGroup = data.group || '';
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                showInfoModal('Será necessário refazer o login!', 'Sessão expirada', 'warning');
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
             showInfoModal('Não foi possível verificar seu usuário. Por favor, faça o login novamente.', 'Erro de autenticação', 'danger');
             setTimeout(() => { window.location = "/"; }, 300);
        });
}
