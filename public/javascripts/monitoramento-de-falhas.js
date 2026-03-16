let incidentesAtuais = [];
let refreshInterval;

document.addEventListener('DOMContentLoaded', function() {
    carregarFalhas();
    initializeThemeAndUserInfo();
    
    refreshInterval = setInterval(carregarFalhas, 30000);

    document.getElementById('btn-atualizar').addEventListener('click', () => {
        carregarFalhas();
    });
    
});

async function carregarFalhas() {
    try {
        const response = await fetch('/api/v5/monitoramento-de-falhas/falhas-ativas');
        if (response.ok) {
            incidentesAtuais = await response.json();
            renderizarTabela();
        }
    } catch (error) {
        console.error("Erro ao buscar falhas:", error);
    }
}

function renderizarTabela() {
    const tbody = document.getElementById('tbody-monitoramento-de-falhas');
    const badgeTotal = document.getElementById('badge-total-falhas');
    
    if (!tbody) return;
    
    if (incidentesAtuais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-check-circle fs-4 d-block mb-2 text-success"></i>Nenhuma falha massiva ou alerta ativo no momento.</td></tr>';
        badgeTotal.innerText = '0';
        return;
    }

    let html = '';
    let totalAlertas = 0;

    incidentesAtuais.forEach(incidente => {
        const groupId = `incidente-${incidente.id}`;
        const filhos = incidente.alertas || [];
        totalAlertas += filhos.length;
        
        const todosResolvidos = filhos.every(f => f.status === 'UP');
        const statusIndicator = todosResolvidos ? '<span class="status-ok"></span> Resolvido (Aguardando limpeza)' : '<span class="status-pulse-down"></span> Incidente Ativo';
        const rowColorClass = todosResolvidos ? 'table-success opacity-75' : '';

        html += `
        <tr class="row-incidente-pai ${rowColorClass}" onclick="toggleGrupo('${groupId}', this)">
            <td class="text-center">
                <i class="bi bi-chevron-right btn-toggle-group"></i>
            </td>
            <td>${formatarData(incidente.data_inicio)}</td>
            <td>
                <span class="text-primary">${incidente.regiao_afetada || 'Múltiplos Equipamentos'}</span>
            </td> 
            <td>
                <span class="badge bg-secondary">${filhos.length} equipamentos afetados</span>
            </td>
            <td>${statusIndicator}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-dark btn-gerar-relatorio" data-id="${incidente.id}" onclick="event.stopPropagation(); gerarRelatorio(${incidente.id})">
                    <i class="bi bi-clipboard"></i> Copiar Relatório
                </button>
            </td>
        </tr>
        `;

        filhos.forEach(filho => {
            const isUp = filho.status === 'UP';
            const statusIcon = isUp ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>';
            const corTexto = isUp ? 'text-success' : 'text-danger';
            
            let tipoBadge = '';
            if(filho.tipo_alerta === 'CORP') tipoBadge = '<span class="badge bg-primary badge-tipo">CORP</span>';
            if(filho.tipo_alerta === 'FTTB') tipoBadge = '<span class="badge bg-info text-dark badge-tipo">FTTB</span>';
            if(filho.tipo_alerta === 'HTSP') tipoBadge = '<span class="badge bg-warning badge-tipo">HTSP</span>';
            if(filho.tipo_alerta === 'WIFI') tipoBadge = '<span class="badge bg-secondary badge-tipo">WIFI</span>';
            if(filho.tipo_alerta === 'PON') tipoBadge = '<span class="badge bg-danger badge-tipo">PON</span>';
            if(filho.tipo_alerta === 'BACKBONE') tipoBadge = '<span class="badge bg-dark badge-tipo">BACKBONE</span>';

            html += `
            <tr class="row-filho ${groupId}" style="display: none;">
                <td></td> 
                <td class="ps-4 border-start border-3 ${isUp ? 'border-success' : 'border-danger'} text-muted">
                    <i class="bi bi-arrow-return-right me-1"></i> ${formatarData(filho.data_falha)}
                </td>
                <td>
                    <div class="fw-bold">${filho.host_zabbix}</div>
                    <div class="small text-muted">Zabbix</div>
                </td>
                <td>
                    ${tipoBadge} <span class="fw-medium">${filho.nome_identificado || filho.identificador}</span>
                    <div class="small text-muted mt-1"><i class="bi bi-info-circle"></i> Motivo: ${filho.motivo_falha || '-'}</div>
                </td>
                <td colspan="2" class="${corTexto} fw-medium">
                    ${statusIcon} ${isUp ? `Normalizado (${formatarData(filho.data_retorno)})` : 'OFFLINE'}
                    ${filho.sinal_rx_retorno ? `<br><small class="text-muted">Sinal Retorno: ${filho.sinal_rx_retorno}</small>` : ''}
                </td>
            </tr>
            `;
        });
    });

    tbody.innerHTML = html;
    badgeTotal.innerText = totalAlertas;
}

function toggleGrupo(groupId, rowElement) {
    const icon = rowElement.querySelector('.btn-toggle-group');
    const linhas = document.querySelectorAll(`.${groupId}`);
    
    if(linhas.length === 0) return;

    const isHidden = linhas[0].style.display === 'none';
    
    linhas.forEach(tr => {
        tr.style.display = isHidden ? 'table-row' : 'none';
    });

    if(isHidden) {
        icon.classList.add('expanded');
        icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
    } else {
        icon.classList.remove('expanded');
        icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
    }
}

function gerarRelatorio(incidenteId) {
    const incidente = incidentesAtuais.find(i => i.id === incidenteId);
    if(!incidente || !incidente.alertas) return;

    let textoRelatorio = `*Massiva:* ${incidente.regiao_afetada || 'Região não identificada'}\n\n`;

    const corporativos = incidente.alertas.filter(a => a.tipo_alerta === 'CORP');
    const publicos = incidente.alertas.filter(a => ['FTTB', 'PON', 'HTSP', 'WIFI'].includes(a.tipo_alerta));

    if (corporativos.length > 0) {
        textoRelatorio += `*Corporativos Afetados:*\n`;
        corporativos.forEach(c => {
            textoRelatorio += `${c.nome_identificado} - (${c.motivo_falha})\n`;
        });
        textoRelatorio += `\n`;
    }

    if (publicos.length > 0) {
        textoRelatorio += `*Condomínios / Varejo Afetados:*\n`;
        publicos.forEach(p => {
            textoRelatorio += `${p.nome_identificado} - (${p.motivo_falha})\n`;
        });
    }

    navigator.clipboard.writeText(textoRelatorio).then(() => {
        const toastEl = document.getElementById('toastCopiado');
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }).catch(err => {
        console.error('Erro ao copiar', err);
        alert('Erro ao copiar o relatório.');
    });
}

function formatarData(dataString) {
    if(!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + data.toLocaleDateString('pt-BR');
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