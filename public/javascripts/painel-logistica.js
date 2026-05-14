// public/javascripts/painel-logistica.js

document.addEventListener('DOMContentLoaded', () => {
    initializeThemeAndUserInfo()

    document.getElementById('filtro-data').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('btn-carregar-agenda').addEventListener('click', carregarAgenda);

    carregarAgenda();
});

async function carregarAgenda() {
    const data = document.getElementById('filtro-data').value;
    const municipio = document.getElementById('filtro-municipio').value;

    if (!data) return alert("Selecione uma data.");

    document.getElementById('col-aguardando').innerHTML = '<div class="text-center text-muted mt-5"><div class="spinner-border spinner-border-sm"></div> Buscando...</div>';
    document.getElementById('col-tec-1').innerHTML = '';
    document.getElementById('col-tec-2').innerHTML = '';

    try {
        const response = await fetch(`/api/v5/painel-logistica/agendamentos?data=${data}&municipio=${municipio}`);
        const agendamentos = await response.json();

        document.getElementById('col-aguardando').innerHTML = '';

        let countAguardando = 0, countTec1 = 0, countTec2 = 0;

        agendamentos.forEach(os => {
            const card = criarCardOS(os);
            
            if (!os.ixc_tecnico_id || os.status_interno === 'AGUARDANDO_LOGISTICA') {
                document.getElementById('col-aguardando').appendChild(card);
                countAguardando++;
            } else if (os.ixc_tecnico_id === 1) {
                document.getElementById('col-tec-1').appendChild(card);
                countTec1++;
            } else if (os.ixc_tecnico_id === 2) {
                document.getElementById('col-tec-2').appendChild(card);
                countTec2++;
            }
        });

        document.getElementById('count-aguardando').textContent = countAguardando;
        document.getElementById('count-tec-1').textContent = countTec1;
        document.getElementById('count-tec-2').textContent = countTec2;

    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
    }
}

function criarCardOS(os) {
    const card = document.createElement('div');
    card.className = `os-card bg-white p-3 mb-3 rounded shadow-sm border`;
    card.draggable = true;
    card.id = `os-${os.id}`;
    card.dataset.id = os.id;
    card.dataset.osIxc = os.ixc_os_id;

    if (os.turno === 'MATUTINO') card.classList.add('border-left-matutino');
    if (os.turno === 'VESPERTINO') card.classList.add('border-left-vespertino');

    // Badges
    let badges = '';
    if (os.tipo_servico === 'INSTALACAO') badges += `<span class="badge bg-success me-1">Instalação</span>`;
    else badges += `<span class="badge bg-primary me-1">Suporte</span>`;

    if (os.aceita_encaixe) badges += `<span class="badge bg-danger encaixe-badge"><i class="bi bi-lightning-charge-fill"></i> Aceita Encaixe</span>`;

    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <small class="text-muted fw-bold">OS: #${os.ixc_os_id}</small>
            <div>${badges}</div>
        </div>
        <div class="fw-bold text-dark mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${os.municipio_base} - ${os.tipo_imovel}</div>
        <div class="small text-muted mb-2"><i class="bi bi-clock me-1"></i>Turno: <strong>${os.turno}</strong></div>
        <div class="small text-secondary bg-light p-1 rounded border text-truncate" title="${os.sintoma_relatado || 'Sem observação'}">
            ${os.sintoma_relatado || 'OS Agendada via Intranet'}
        </div>
    `;

    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);

    return card;
}

let draggedCard = null;

function dragStart(e) {
    draggedCard = this;
    setTimeout(() => this.style.opacity = '0.5', 0);
}

function dragEnd() {
    this.style.opacity = '1';
    draggedCard = null;
}

function allowDrop(e) {
    e.preventDefault();
}

async function drop(e) {
    e.preventDefault();
    if (!draggedCard) return;

    let column = e.target.closest('.kanban-col');
    if (column) {
        column.appendChild(draggedCard);
        
        const idAgenda = draggedCard.dataset.id;
        const tecnicoId = column.dataset.tecnicoId || null;
        const status = tecnicoId ? 'ATRIBUIDO' : 'AGUARDANDO_LOGISTICA';

        try {
            await fetch('/api/v5/painel-logistica/atribuir-tecnico', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_agenda: idAgenda, ixc_tecnico_id: tecnicoId, status: status })
            });
            carregarAgenda(); 
        } catch (error) {
            alert("Erro ao atribuir técnico: " + error.message);
        }
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