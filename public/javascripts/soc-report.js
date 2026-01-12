document.addEventListener('DOMContentLoaded', function() {
    carregarEventos();
    initializeThemeAndUserInfo();

    const btnSalvar = document.getElementById('btn-salvar-modal');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarAlteracoes);
    }

    const btnExcluir = document.getElementById('btn-excluir-registro');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', excluirRegistro);
    }

    const btnNovo = document.getElementById('btn-novo-evento');
    if(btnNovo) {
        btnNovo.addEventListener('click', function() {
            document.getElementById('form-analise-soc').reset();
            document.getElementById('m-id').value = "";
            document.getElementById('btn-excluir-registro').style.display = 'none';

            alternarBloqueioCampos(false);
            
            const modal = new bootstrap.Modal(document.getElementById('modalAnalise'));
            modal.show();
        });
    }

    document.getElementById('m-ip').addEventListener('blur', async function() {
        const ip = this.value;
        if (ip.length > 7 && !document.getElementById('m-id').value) {
            try {
                const response = await fetch(`/api/v5/soc/buscar-cliente-ip/${ip}`);
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('m-cliente-id').value = data.cliente_id;
                    document.getElementById('m-cliente-nome').value = data.cliente_nome;
                    document.getElementById('m-login').value = data.login || '';
                }
            } catch (err) { console.error("Erro na busca de cliente"); }
        }
    });

    document.getElementById('filtro-ip').addEventListener('keyup', function() {
        const termo = this.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-soc tbody tr');
        
        linhas.forEach(linha => {
            const ip = linha.querySelector('td:nth-child(2)').textContent.toLowerCase();
            linha.style.display = ip.includes(termo) ? '' : 'none';
        });
    });
});


let eventosAtuais = [];

async function carregarEventos() {
    try {
        const response = await fetch('/api/v5/soc/eventos');
        eventosAtuais = await response.json();
        renderizarTabela(eventosAtuais);
    } catch (error) {
        console.error("Erro ao carregar eventos:", error);
    }
}

function renderizarTabela(dados) {
    const tbody = document.querySelector('#tabela-soc tbody');
    if (!tbody) return;

    tbody.innerHTML = dados.map(item => {
        const clienteExibicao = (item.cliente_id_ixc && item.cliente_nome) 
            ? `${item.cliente_id_ixc} - ${item.cliente_nome}` 
            : (item.cliente_nome || 'Não identificado');

        return `
            <tr>
                <td class="small">${item.data_evento}</td> 
                <td class="fw-bold text-primary">${item.ip_interno}</td>
                <td>
                    <span class="fw-bold text-primary">${clienteExibicao}</span>
                    <span class="badge bg-secondary ms-1" title="Quantidade de ocorrências">${item.qtd_anomalias}x</span>
                </td>
                <td><span class="badge bg-light text-dark border">${item.equipamento || '-'}</span></td>
                <td class="text-truncate" style="max-width: 200px;">${item.analise_preliminar || ''}</td> 
                <td>${item.acao_tomada || ''}</td>
                <td>${getStatusBadge(item.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${item.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editarEvento(id);
        });
    });
}

function alternarBloqueioCampos(isReadonly) {
    const campos = ['m-data', 'm-ip', 'm-cliente-id', 'm-cliente-nome', 'm-upload', 'm-download'];
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.readOnly = isReadonly;
            if (isReadonly) {
                elemento.classList.add('bg-light');
            } else {
                elemento.classList.remove('bg-light');
            }
        }
    });
}

function getStatusBadge(status) {
    const classes = {
        'Pendente': 'bg-warning text-dark',
        'Em Análise': 'bg-info text-dark',
        'Concluído': 'bg-success text-white'
    };
    return `<span class="status-badge ${classes[status] || 'bg-secondary'}">${status}</span>`;
}

function editarEvento(id) {
    const evento = eventosAtuais.find(e => e.id === id);
    if (!evento) return;

    alternarBloqueioCampos(true);

    let dataFormatada = "";
    if (evento.data_evento) {
        dataFormatada = evento.data_evento.replace(" ", "T").substring(0, 16);
    }

    document.getElementById('m-id').value = evento.id;
    document.getElementById('m-data').value = dataFormatada;
    document.getElementById('m-qtd').value = (evento.qtd_anomalias || 1) + 'x';
    document.getElementById('m-ip').value = evento.ip_interno;
    document.getElementById('m-cliente-id').value = evento.cliente_id_ixc || '';
    document.getElementById('m-login').value = evento.login || '';
    document.getElementById('m-cliente-nome').value = evento.cliente_nome || '';
    document.getElementById('m-upload').value = evento.trafego_upload || '';
    document.getElementById('m-download').value = evento.trafego_download || '';
    
    // Campos Editáveis
    document.getElementById('m-equipamento').value = evento.equipamento || '';
    document.getElementById('m-status').value = evento.status || 'Pendente';
    document.getElementById('m-analise').value = evento.analise_preliminar || '';
    document.getElementById('m-acao').value = evento.acao_tomada || '';
    document.getElementById('m-observacoes').value = evento.observacoes || '';

    document.getElementById('btn-excluir-registro').style.display = 'block';

    const modal = new bootstrap.Modal(document.getElementById('modalAnalise'));
    modal.show();
}

async function salvarAlteracoes() {
    const id = document.getElementById('m-id').value;
    const dataInput = document.getElementById('m-data').value;
    
    let dataFinal;
    if (!dataInput) {
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const segundo = String(agora.getSeconds()).padStart(2, '0');
        
        dataFinal = `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
    } else {
        dataFinal = dataInput.replace("T", " ");
    }

    const clienteIdIxc = document.getElementById('m-cliente-id').value;
    const clienteNome = document.getElementById('m-cliente-nome').value;

    const dadosParaEnviar = {
        id: id || null,
        data_evento: dataFinal,
        ip_interno: document.getElementById('m-ip').value,
        cliente_id_ixc: document.getElementById('m-cliente-id').value,
        cliente_nome: document.getElementById('m-cliente-nome').value,
        trafego_upload: document.getElementById('m-upload').value,
        trafego_download: document.getElementById('m-download').value,
        equipamento: document.getElementById('m-equipamento').value,
        status: document.getElementById('m-status').value,
        analise: document.getElementById('m-analise').value,
        acao_tomada: document.getElementById('m-acao').value,
        observacoes: document.getElementById('m-observacoes').value,
        usuario_responsavel: document.querySelector('.user-info span').textContent.trim()
    };

    try {
        const response = await fetch('/api/v5/soc/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaEnviar)
        });

        if (response.ok) {
            alert("Dados salvos com sucesso!");
            const modalElement = document.getElementById('modalAnalise');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
            
            carregarEventos();
        } else {
            const errorData = await response.json();
            alert("Erro ao salvar: " + (errorData.error || "Erro desconhecido"));
        }
    } catch (error) {
        alert("Erro de conexão ao salvar no banco de dados.");
        console.error(error);
    }
}

async function excluirRegistro() {
    const id = document.getElementById('m-id').value;
    if (!id) return;

    if (confirm("Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.")) {
        try {
            const response = await fetch(`/api/v5/soc/excluir/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert("Registro excluído com sucesso!");
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAnalise'));
                if (modalInstance) modalInstance.hide();
                carregarEventos();
            } else {
                alert("Erro ao tentar excluir o registro.");
            }
        } catch (error) {
            console.error("Erro de conexão:", error);
            alert("Não foi possível comunicar com o servidor.");
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
            else if (group !== 'NOC') {
                console.log("Acesso negado para o grupo:", group);
                document.getElementById('modalAlerta').style.display = 'flex';
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
        document.getElementById('closeModalBtn').addEventListener('click', function() {
            document.getElementById('modalAlerta').style.display = 'none';
            window.location = "/main";
        });
}