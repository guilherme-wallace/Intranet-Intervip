// javascripts/agendamento.js

document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeAndUserInfo()

    const urlParams = new URLSearchParams(window.location.search);
    const osId = urlParams.get('os');
    const origem = urlParams.get('origem');

    if (!osId) {
        alert("Nenhuma OS informada na URL.");
        document.getElementById('loading-os').style.display = 'none';
        return;
    }

    document.getElementById('btn-prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('btn-next-week').addEventListener('click', () => changeWeek(1));

    await carregarDadosOS(osId, origem);

    document.getElementById('form-agendamento').addEventListener('submit', confirmarAgendamento);
});

async function carregarDadosOS(id_ticket, origem) {
    try {
        const response = await fetch(`/api/v5/agendamento/detalhes-os/${id_ticket}?origem=${origem}`);
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
        document.getElementById('hidden-municipio').value = municipioBase;
        document.getElementById('hidden-tipo-servico').value = data.tipo_servico;
        
        document.getElementById('form-agendamento').dataset.clienteId = data.cliente_id;
        document.getElementById('form-agendamento').dataset.tipoImovel = data.tipo_imovel;

        document.getElementById('badge-tipo-os').textContent = data.tipo_imovel;
        initCalendar();

    } catch (error) {
        alert("Erro ao buscar OS: " + error.message);
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

document.addEventListener('click', function(e) {
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
    const aceitaEncaixe = document.getElementById('chk-encaixe') ? document.getElementById('chk-encaixe').checked : false;
    const solicitaPrioridade = document.getElementById('chk-prioridade') ? document.getElementById('chk-prioridade').checked : false;

    if (!dataEscolhida || !turnoEscolhido) {
        return alert("Por favor, selecione um dia e turno disponível clicando no calendário!");
    }

    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    const originalText = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
    btnConfirmar.disabled = true;

    const payload = {
        id_ticket: document.getElementById('hidden-os-id').value,
        cliente_id: document.getElementById('form-agendamento').dataset.clienteId,
        contrato_id: document.getElementById('form-agendamento').dataset.contratoId,
        municipio: document.getElementById('hidden-municipio').value,
        tipo_servico: document.getElementById('hidden-tipo-servico').value,
        tipo_imovel: document.getElementById('form-agendamento').dataset.tipoImovel,
        data_agendamento: dataEscolhida,
        turno: turnoEscolhido,
        aceita_encaixe: aceitaEncaixe,
        solicita_prioridade: solicitaPrioridade
    };

    //console.log("[DEBUG FRONTEND] Preparando envio. Payload completo:", payload);

    try {
        const response = await fetch('/api/v5/agendamento/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        document.getElementById('form-agendamento').innerHTML = `
            <div class="alert alert-success text-center p-4 border-success">
                <i class="bi bi-check-circle-fill display-4 d-block mb-3"></i>
                <h4 class="alert-heading fw-bold">Agendamento Realizado!</h4>
                <p class="mb-0">A OS foi enviada para o painel da Logística.</p>
                <a href="/painel-logistica" class="btn btn-outline-success mt-3">Ir para a agenda!</a>
            </div>
        `;

    } catch (error) {
        alert("Erro ao confirmar: " + error.message);
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