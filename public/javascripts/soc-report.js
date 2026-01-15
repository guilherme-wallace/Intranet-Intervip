let eventosAtuais = [];
let paginaAtual = 1;
const itensPorPagina = 15;
let statusSelecionados = ['Pendente', 'Em Análise', 'Sem acesso remoto'];

document.addEventListener('DOMContentLoaded', function() {
    carregarEventos();
    initializeThemeAndUserInfo();
    carregarListaEquipamentos();
    configurarFiltros();

    const btnSalvar = document.getElementById('btn-salvar-modal');
    if (btnSalvar) {
        btnSalvar.replaceWith(btnSalvar.cloneNode(true));
        document.getElementById('btn-salvar-modal').addEventListener('click', salvarAlteracoes);
    }

    const btnExcluir = document.getElementById('btn-excluir-registro');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', excluirRegistro);
    }

    const btnNovo = document.getElementById('btn-novo-evento');
    if(btnNovo) {
        btnNovo.addEventListener('click', function() {
            const form = document.getElementById('form-analise-soc');
            if(form) form.reset();
            
            const elId = document.getElementById('m-id');
            if(elId) elId.value = "";
            
            const btnExc = document.getElementById('btn-excluir-registro');
            if(btnExc) btnExc.style.display = 'none';

            const btnRel = document.getElementById('btn-relatorio-conexao');
            if(btnRel) btnRel.style.display = 'none';

            if(typeof alternarBloqueioCampos === 'function') alternarBloqueioCampos(false);
            
            abrirModal();
        });
    }

    const inputIpModal = document.getElementById('m-ip');
    if (inputIpModal) {
        inputIpModal.addEventListener('blur', async function() {
            const ip = this.value;
            const elId = document.getElementById('m-id');
            if (ip.length > 7 && (!elId || !elId.value)) {
                try {
                    const response = await fetch(`/api/v5/soc/buscar-cliente-ip/${ip}`);
                    if (response.ok) {
                        const data = await response.json();
                        setVal('m-cliente-id', data.cliente_id);
                        setVal('m-cliente-nome', data.cliente_nome);
                        setVal('m-login', data.login);
                    }
                } catch (err) { console.error("Erro busca cliente:", err); }
            }
        });
    }

    const statusSelect = document.getElementById('m-status');
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            atualizarCorSelect();
            if (this.value === 'Sem acesso remoto') {
                const modalAvisoEl = document.getElementById('modalAvisoTecnico');
                if(modalAvisoEl) {
                    const modalAviso = new bootstrap.Modal(modalAvisoEl);
                    modalAviso.show();
                }
            }
        });
    }

    const btnRelatorio = document.getElementById('btn-relatorio-conexao');
    if (btnRelatorio) {
        btnRelatorio.addEventListener('click', abrirRelatorioConexao);
    }
});
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = (val === null || val === undefined) ? '' : val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function abrirModal() {
    const modalEl = document.getElementById('modalAnalise');
    if(modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function fecharModal() {
    const modalEl = document.getElementById('modalAnalise');
    if(modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.hide();
        
        setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style = '';
        }, 500);
    }
}

async function salvarAlteracoes() {
    //console.log("Iniciando salvamento...");

    const idVal = getVal('m-id');
    
    const dados = {
        id: idVal ? parseInt(idVal) : null,
        data_evento: getVal('m-data') || new Date().toISOString().slice(0, 19).replace('T', ' '),
        ip_interno: getVal('m-ip'),
        cliente_nome: getVal('m-cliente-nome'),
        cliente_id_ixc: getVal('m-cliente-id'),
        login: getVal('m-login'),
        equipamento: getVal('m-equipamento'),
        analise: getVal('m-analise'),
        acao_tomada: getVal('m-acao'),
        observacoes: getVal('m-obs'),
        status: getVal('m-status'),
        trafego_upload: getVal('m-upload') || '0 Mbps',
        trafego_download: getVal('m-download') || '0 Mbps',
        usuario_responsavel: 'Técnico' 
    };

    //console.log("Dados a enviar:", dados);

    try {
        const response = await fetch('/api/v5/soc/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            //console.log("Salvo com sucesso!");
            fecharModal();
            carregarEventos();
        } else {
            const erroTxt = await response.text();
            //console.error("Erro API:", erroTxt);
            alert('Erro ao salvar no servidor. Verifique o console.');
        }
    } catch (error) { 
        console.error('Erro de conexão/JS:', error); 
        alert("Erro ao tentar salvar: " + error.message);
    }
}

function editarEvento(id) {
    const evento = eventosAtuais.find(e => e.id === id);
    if (!evento) return;

    setVal('m-id', evento.id);
    setVal('m-data', evento.data_evento);
    setVal('m-ip', evento.ip_interno);
    setVal('m-cliente-id', evento.cliente_id_ixc);
    setVal('m-cliente-nome', evento.cliente_nome);
    setVal('m-login', evento.login);
    setVal('m-qtd', (evento.qtd_anomalias || 1) + 'x');
    setVal('m-upload', evento.trafego_upload);
    setVal('m-download', evento.trafego_download);
    setVal('m-equipamento', evento.equipamento);
    setVal('m-analise', evento.analise_preliminar);
    setVal('m-acao', evento.acao_tomada);
    setVal('m-obs', evento.observacoes);
    
    const statusSelect = document.getElementById('m-status');
    if (statusSelect) {
        statusSelect.value = evento.status;
        atualizarCorSelect();
    }

    alternarBloqueioCampos(true);
    
    const btnExc = document.getElementById('btn-excluir-registro');
    if(btnExc) btnExc.style.display = 'block';

    const btnRelatorio = document.getElementById('btn-relatorio-conexao');
    if (btnRelatorio) {
        if (evento.login && evento.login.length > 1) {
            btnRelatorio.style.display = 'block';
        } else {
            btnRelatorio.style.display = 'none';
        }
    }

    abrirModal();
}

async function abrirRelatorioConexao() {
    const login = document.getElementById('m-login').value;
    if (!login) {
        alert("Necessário ter um Login PPPoE preenchido para gerar o relatório.");
        return;
    }

    const modalRelatorio = new bootstrap.Modal(document.getElementById('modalRelatorioConexao'));
    modalRelatorio.show();

    document.getElementById('loading-relatorio').style.display = 'block';
    document.getElementById('conteudo-relatorio').style.display = 'none';
    const tbody = document.getElementById('tbody-relatorio');
    tbody.innerHTML = '';

    try {
        const response = await fetch(`/api/v5/soc/relatorio-consumo/${login}`);
        if (!response.ok) throw new Error("Erro na busca");

        const data = await response.json();
        
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 GB';
            const gb = bytes / (1024 * 1024 * 1024);
            return gb.toFixed(2) + ' GB';
        };

        tbody.innerHTML = data.historico.map(item => {
            const dataObj = new Date(item.data);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            
            return `
            <tr>
                <td>${dataFormatada}</td>
                <td class="text-success fw-bold">${formatBytes(item.download_bytes)}</td>
                <td class="text-danger fw-bold">${formatBytes(item.upload_bytes)}</td>
                <td class="fw-bold">${formatBytes(item.download_bytes + item.upload_bytes)}</td>
            </tr>
            `;
        }).join('');

        document.getElementById('total-down-val').textContent = formatBytes(data.total_download);
        document.getElementById('total-up-val').textContent = formatBytes(data.total_upload);
        document.getElementById('total-geral-val').textContent = formatBytes(data.total_download + data.total_upload);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Erro ao buscar dados do cliente. Verifique se o login existe no IXC.</td></tr>`;
    } finally {
        document.getElementById('loading-relatorio').style.display = 'none';
        document.getElementById('conteudo-relatorio').style.display = 'block';
    }
}

function configurarFiltros() {
    const filtroGeral = document.getElementById('filtro-geral');
    if (filtroGeral) {
        filtroGeral.addEventListener('keyup', function() {
            paginaAtual = 1; 
            aplicarFiltrosRenderizar();
        });
    }

    const checkboxes = document.querySelectorAll('.filtro-status-chk');
    checkboxes.forEach(chk => {
        chk.addEventListener('change', function() {
            statusSelecionados = Array.from(checkboxes)
                .filter(c => c.checked)
                .map(c => c.value);
            paginaAtual = 1;
            aplicarFiltrosRenderizar();
        });
    });
}

function aplicarFiltrosRenderizar() {
    const filtroGeral = document.getElementById('filtro-geral');
    const termo = filtroGeral ? filtroGeral.value.toLowerCase() : '';

    const dadosFiltrados = eventosAtuais.filter(item => {
        if (!statusSelecionados.includes(item.status)) return false;

        const textoRow = `
            ${item.ip_interno || ''} 
            ${item.cliente_nome || ''} 
            ${item.cliente_id_ixc || ''} 
            ${item.equipamento || ''}
        `.toLowerCase();
        
        return textoRow.includes(termo);
    });

    const totalItens = dadosFiltrados.length;
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    
    if (paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const dadosPagina = dadosFiltrados.slice(inicio, fim);

    renderizarTabela(dadosPagina);
    renderizarControlesPaginacao(totalPaginas, totalItens);
}

function renderizarTabela(dados) {
    const tbody = document.querySelector('#tabela-soc tbody');
    if (!tbody) return;
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Nenhum registro encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = dados.map(item => `
        <tr>
            <td class="small text-nowrap">${item.data_evento}</td> 
            <td>
                <span class="fw-bold text-primary">${item.ip_interno}</span>
                <span class="badge bg-secondary ms-1" title="Reincidências">${item.qtd_anomalias || 1}x</span>
            </td> 
            <td>
                <div class="small fw-bold">${item.cliente_id_ixc || '-'}</div>
                <div class="small text-muted text-truncate" style="max-width: 150px;">${item.cliente_nome || 'Não ident.'}</div>
            </td>
            <td class="text-danger small"><i class="bi bi-arrow-up"></i> ${item.trafego_upload || '0'}</td>
            <td class="text-success small"><i class="bi bi-arrow-down"></i> ${item.trafego_download || '0'}</td>
            <td><span class="badge bg-light text-dark border">${item.equipamento || '-'}</span></td>
            <td class="small text-truncate" style="max-width: 150px;">${item.acao_tomada || ''}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${item.id}">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            editarEvento(parseInt(this.dataset.id));
        });
    });
}

function renderizarControlesPaginacao(totalPaginas, totalItens) {
    const container = document.getElementById('paginacao-container');
    const contador = document.getElementById('contador-registros');
    if(!container || !contador) return;
    
    container.innerHTML = '';
    
    if (totalPaginas <= 1) {
        contador.innerText = `Total: ${totalItens} registros`;
        return; 
    }

    const criarBotao = (texto, page, disabled, active) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${texto}</a>`;
        if (!disabled) {
            li.addEventListener('click', (e) => {
                e.preventDefault();
                paginaAtual = page;
                aplicarFiltrosRenderizar();
            });
        }
        return li;
    };

    container.appendChild(criarBotao('Anterior', paginaAtual - 1, paginaAtual === 1));

    let startPage = Math.max(1, paginaAtual - 2);
    let endPage = Math.min(totalPaginas, paginaAtual + 2);
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(criarBotao(i, i, false, i === paginaAtual));
    }

    container.appendChild(criarBotao('Próximo', paginaAtual + 1, paginaAtual === totalPaginas));

    const inicioExibido = (paginaAtual - 1) * itensPorPagina + 1;
    const fimExibido = Math.min(paginaAtual * itensPorPagina, totalItens);
    contador.innerText = `Exibindo ${inicioExibido} a ${fimExibido} de ${totalItens} registros`;
}

async function carregarEventos() {
    try {
        const response = await fetch('/api/v5/soc/eventos');
        const dados = await response.json();
        eventosAtuais = dados;
        aplicarFiltrosRenderizar();
    } catch (error) { console.error('Erro carregar eventos:', error); }
}

async function carregarListaEquipamentos() {
    try {
        const response = await fetch('/api/v5/soc/equipamentos-lista');
        if (response.ok) {
            const equipamentos = await response.json();
            const select = document.getElementById('m-equipamento');
            if(select) {
                select.innerHTML = '<option value="">Selecione...</option>';
                equipamentos.forEach(eq => {
                    const nome = `${eq.marca} ${eq.modelo}`;
                    const opt = document.createElement('option');
                    opt.value = nome; opt.textContent = nome;
                    select.appendChild(opt);
                });
            }
        }
    } catch (error) { console.error("Erro equipamentos:", error); }
}

async function excluirRegistro() {
    const idVal = getVal('m-id');
    if (!idVal || !confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
        await fetch(`/api/v5/soc/excluir/${idVal}`, { method: 'DELETE' });
        fecharModal();
        carregarEventos();
    } catch (error) { console.error('Erro excluir:', error); }
}

function getStatusBadge(status) {
    switch (status) {
        case 'Pendente': return '<span class="badge bg-danger">Pendente</span>';
        case 'Em Análise': return '<span class="badge bg-primary text-dark">Em Análise</span>';
        case 'Concluído': return '<span class="badge bg-success">Concluído</span>';
        case 'Sem acesso remoto': return '<span class="badge bg-warning text-dark">Sem Acesso</span>';
        default: return `<span class="badge bg-light text-dark border">${status || '-'}</span>`;
    }
}

function atualizarCorSelect() {
    const s = document.getElementById('m-status');
    if(!s) return;
    s.classList.remove('text-danger', 'text-warning', 'text-success', 'text-secondary', 'border-danger', 'border-warning', 'border-success', 'border-secondary');
    switch(s.value) {
        case 'Pendente': s.classList.add('text-danger', 'border-danger'); break;
        case 'Em Análise': s.classList.add('text-primary', 'border-primary'); break;
        case 'Concluído': s.classList.add('text-success', 'border-success'); break;
        case 'Sem acesso remoto': s.classList.add('text-warning', 'border-warning'); break;
    }
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