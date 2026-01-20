let eventosAtuais = [];
let paginaAtual = 1;
const itensPorPagina = 20;
let statusSelecionados = ['Pendente', 'Em Análise', 'Sem acesso remoto'];

let currentSort = { column: 'data_evento', direction: 'desc' };

const cacheConsumo = {}; 

document.addEventListener('DOMContentLoaded', function() {
    carregarEventos();
    initializeThemeAndUserInfo();
    carregarListaEquipamentos();
    configurarFiltros();
    configurarOrdenacao();

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
            
            setVal('m-id', '');
            setVal('m-upload', '');
            setVal('m-download', '');
            
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
                        
                        if(data.login) buscarConsumoParaCampo(data.login);
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


function configurarOrdenacao() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }

            atualizarIconesOrdenacao();
            aplicarFiltrosRenderizar();
        });
    });
}

function atualizarIconesOrdenacao() {
    document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'bi bi-arrow-down-up small ms-1 text-muted'; // Reseta
    });

    const activeTh = document.querySelector(`th[data-sort="${currentSort.column}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        if (currentSort.direction === 'asc') {
            icon.className = 'bi bi-sort-up ms-1 text-primary';
        } else {
            icon.className = 'bi bi-sort-down ms-1 text-primary';
        }
    }
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

    const grupos = {};
    dadosFiltrados.forEach(item => {
        const key = item.cliente_id_ixc ? `CLI-${item.cliente_id_ixc}` : `IP-${item.ip_interno}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(item);
    });

    let listaGrupos = Object.values(grupos);

    listaGrupos.sort((grupoA, grupoB) => {
        grupoA.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));
        grupoB.sort((a, b) => new Date(b.data_evento) - new Date(a.data_evento));

        const principalA = grupoA[0];
        const principalB = grupoB[0];

        let valA, valB;

        if (currentSort.column === 'qtd_anomalias') {
            valA = grupoA.reduce((acc, curr) => acc + (parseInt(curr.qtd_anomalias) || 1), 0);
            valB = grupoB.reduce((acc, curr) => acc + (parseInt(curr.qtd_anomalias) || 1), 0);
        } 
        else if (currentSort.column === 'data_evento') {
            valA = new Date(principalA.data_evento);
            valB = new Date(principalB.data_evento);
        } 
        else {
            valA = (principalA[currentSort.column] || '').toString().toLowerCase();
            valB = (principalB[currentSort.column] || '').toString().toLowerCase();
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalGrupos = listaGrupos.length;
    const totalPaginas = Math.ceil(totalGrupos / itensPorPagina);
    
    if (paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const gruposPagina = listaGrupos.slice(inicio, fim);

    renderizarTabelaAgrupada(gruposPagina);
    renderizarControlesPaginacao(totalPaginas, totalGrupos);
    buscarConsumosDaPagina(gruposPagina);
}

function renderizarTabelaAgrupada(grupos) {
    const tbody = document.querySelector('#tabela-soc tbody');
    if (!tbody) return;
    
    if (grupos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">Nenhum registro encontrado.</td></tr>';
        return;
    }

    let html = '';

    grupos.forEach(grupo => {
        
        const principal = grupo[0]; // Pai
        const qtdTotalRegistros = grupo.length;
        const temFilhos = qtdTotalRegistros > 1;
        const groupId = `group-${principal.id}`;

        const totalAnomaliasMae = grupo.reduce((acc, curr) => acc + (parseInt(curr.qtd_anomalias) || 1), 0);

        const registroComEquip = grupo.find(g => g.equipamento && g.equipamento.trim().length > 0);
        const equipParaExibir = registroComEquip ? registroComEquip.equipamento : (principal.equipamento || '-');

        html += `
        <tr class="align-middle ${temFilhos ? 'fw-bold table-light' : ''}">
            <td class="text-center">
                ${temFilhos ? 
                    `<button class="btn btn-sm btn-link text-decoration-none btn-toggle-group" 
                        data-group-id="${groupId}">
                        <i class="bi bi-chevron-right"></i>
                     </button>` : 
                    `<span class="text-muted small">●</span>`
                }
            </td>
            <td class="small text-nowrap">
                ${principal.data_evento}
            </td>
            <td>
                <span class="text-primary">${principal.ip_interno}</span>
                <span class="badge bg-secondary ms-1" title="Soma total de anomalias do grupo">${totalAnomaliasMae}x</span>
            </td> 
            <td>
                <div class="small fw-bold">
                    ${principal.cliente_id_ixc || '-'}
                    ${temFilhos ? `<span class="badge bg-primary rounded-pill ms-1" style="font-size: 0.7em;" title="Ver todos os ${qtdTotalRegistros} registros">+${qtdTotalRegistros}</span>` : ''}
                </div>
                <div class="small text-muted text-truncate" style="max-width: 150px;">${principal.cliente_nome || 'Não ident.'}</div>
            </td>
            
            <td class="small text-danger" id="consumo-up-${principal.login || 'nologin'}-${principal.id}">
                <div class="spinner-border spinner-border-sm text-secondary" style="width: 0.8rem; height: 0.8rem;" role="status"></div>
            </td>
            <td class="small text-success" id="consumo-down-${principal.login || 'nologin'}-${principal.id}">
                <div class="spinner-border spinner-border-sm text-secondary" style="width: 0.8rem; height: 0.8rem;" role="status"></div>
            </td>

            <td><span class="badge bg-light text-dark border">${equipParaExibir}</span></td>
            
            <td class="small text-truncate" style="max-width: 150px;" title="${principal.acao_tomada || ''}">
                ${principal.acao_tomada || ''}
            </td>

            <td>${getStatusBadge(principal.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${principal.id}">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        </tr>
        `;

        if (temFilhos) {
            for (let i = 0; i < grupo.length; i++) {
                const filho = grupo[i];
                html += `
                <tr class="row-filha ${groupId}" style="display: none;">
                    <td></td> 
                    <td class="small ps-4 border-start border-3 border-primary text-muted">
                        <i class="bi bi-arrow-return-right me-1"></i> ${filho.data_evento}
                    </td>
                    <td>
                        <span class="small">${filho.ip_interno}</span>
                        <span class="badge bg-secondary ms-1" style="zoom: 0.8;">${filho.qtd_anomalias || 1}x</span>
                    </td>
                    
                    <td class="small text-muted text-truncate" style="max-width: 150px;">
                        ${filho.cliente_nome || '-'}
                    </td>
                    
                    <td class="small text-muted"><i class="bi bi-speedometer2"></i> ${filho.trafego_upload || '-'}</td>
                    <td class="small text-muted"><i class="bi bi-speedometer2"></i> ${filho.trafego_download || '-'}</td>
                    
                    <td class="small text-muted">${filho.equipamento || '-'}</td>
                    
                    <td class="small text-muted text-truncate" style="max-width: 150px;">${filho.acao_tomada || '-'}</td>

                    <td class="small">${getStatusBadge(filho.status)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary btn-editar" style="zoom: 0.8;" data-id="${filho.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
                `;
            }
        }
    });

    tbody.innerHTML = html;

    document.querySelectorAll('.btn-toggle-group').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupId = this.getAttribute('data-group-id');
            toggleGrupo(groupId, this);
        });
    });

    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editarEvento(id);
        });
    });
}


function toggleGrupo(groupId, btn) {
    const linhas = document.querySelectorAll(`.${groupId}`);
    if(linhas.length === 0) return;

    const isHidden = linhas[0].style.display === 'none';
    
    linhas.forEach(tr => {
        tr.style.display = isHidden ? 'table-row' : 'none';
    });

    if(btn) {
        const icon = btn.querySelector('i');
        if(isHidden) {
            btn.classList.add('expanded');
            if(icon) icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
        } else {
            btn.classList.remove('expanded');
            if(icon) icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
        }
    }
};

async function buscarConsumosDaPagina(grupos) {
    const loginsProcessados = new Set();

    for (const grupo of grupos) {
        const principal = grupo[0];
        const login = principal.login;
        const idRow = `-${login || 'nologin'}-${principal.id}`;

        if (!login) {
            atualizarCelulasConsumo(idRow, '-', '-');
            continue;
        }

        if (cacheConsumo[login]) {
            const c = cacheConsumo[login];
            atualizarCelulasConsumo(idRow, c.up, c.down);
            continue;
        }

        if (!loginsProcessados.has(login)) {
            loginsProcessados.add(login);
            
            try {
                const res = await fetch(`/api/v5/soc/relatorio-consumo/${login}`);
                if (res.ok) {
                    const data = await responseToJson(res);
                    const upGB = formatBytesToGB(data.total_upload);
                    const downGB = formatBytesToGB(data.total_download);
                    
                    cacheConsumo[login] = { up: upGB, down: downGB };
                    atualizarCelulasConsumo(idRow, upGB, downGB);
                } else {
                    atualizarCelulasConsumo(idRow, 'Erro', 'Erro');
                }
            } catch (e) {
                console.error(e);
                atualizarCelulasConsumo(idRow, 'Falha', 'Falha');
            }
        }
    }
}

function atualizarCelulasConsumo(suffixId, up, down) {
    const elUp = document.getElementById(`consumo-up${suffixId}`);
    const elDown = document.getElementById(`consumo-down${suffixId}`);
    
    if (elUp) elUp.innerHTML = `<span class="fw-bold">${up}</span>`;
    if (elDown) elDown.innerHTML = `<span class="fw-bold">${down}</span>`;
}

async function buscarConsumoParaCampo(login) {
    if(!login) return;
    
    const elUp = document.getElementById('m-upload');
    const elDown = document.getElementById('m-download');
    
    if(elUp) elUp.value = "Carregando...";
    if(elDown) elDown.value = "Carregando...";

    if (cacheConsumo[login]) {
        if(elUp) elUp.value = cacheConsumo[login].up;
        if(elDown) elDown.value = cacheConsumo[login].down;
        return;
    }

    try {
        const res = await fetch(`/api/v5/soc/relatorio-consumo/${login}`);
        if(res.ok) {
            const data = await res.json();
            const upGB = formatBytesToGB(data.total_upload);
            const downGB = formatBytesToGB(data.total_download);
            
            cacheConsumo[login] = { up: upGB, down: downGB };
            
            if(elUp) elUp.value = upGB;
            if(elDown) elDown.value = downGB;
        }
    } catch(e) {
        if(elUp) elUp.value = "Erro ao buscar";
        if(elDown) elDown.value = "Erro ao buscar";
    }
}

async function responseToJson(res) {
    return await res.json();
}
function formatBytesToGB(bytes) {
    if (!bytes || bytes === 0) return '0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
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
    
    setVal('m-equipamento', evento.equipamento);
    setVal('m-analise', evento.analise_preliminar);
    setVal('m-acao', evento.acao_tomada);
    setVal('m-obs', evento.observacoes);
    
    if (evento.login) {
        buscarConsumoParaCampo(evento.login);
    } else {
        setVal('m-upload', evento.trafego_upload || '0');
        setVal('m-download', evento.trafego_download || '0');
    }

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

async function salvarAlteracoes() {
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
        usuario_responsavel: 'Técnico' 
    };

    try {
        const response = await fetch('/api/v5/soc/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            fecharModal();
            carregarEventos();
        } else {
            alert('Erro ao salvar.');
        }
    } catch (error) { 
        console.error('Erro:', error); 
    }
}

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
        if (!modalInstance) modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.hide();
        setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style = '';
        }, 500);
    }
}

async function abrirRelatorioConexao() {
    const login = document.getElementById('m-login').value;
    if (!login) {
        alert("Necessário ter um Login PPPoE.");
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
        if (!response.ok) throw new Error("Erro");

        const data = await response.json();
        
        tbody.innerHTML = data.historico.map(item => {
            const dataF = new Date(item.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            return `<tr>
                <td>${dataF}</td>
                <td class="text-success">${formatBytesToGB(item.download_bytes)}</td>
                <td class="text-danger">${formatBytesToGB(item.upload_bytes)}</td>
                <td class="fw-bold">${formatBytesToGB(item.download_bytes + item.upload_bytes)}</td>
            </tr>`;
        }).join('');

        document.getElementById('total-down-val').textContent = formatBytesToGB(data.total_download);
        document.getElementById('total-up-val').textContent = formatBytesToGB(data.total_upload);
        document.getElementById('total-geral-val').textContent = formatBytesToGB(data.total_download + data.total_upload);

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Erro ao buscar dados.</td></tr>`;
    } finally {
        document.getElementById('loading-relatorio').style.display = 'none';
        document.getElementById('conteudo-relatorio').style.display = 'block';
    }
}

function configurarFiltros() {
    const filtroGeral = document.getElementById('filtro-geral');
    if (filtroGeral) {
        filtroGeral.addEventListener('keyup', () => { paginaAtual = 1; aplicarFiltrosRenderizar(); });
    }
    document.querySelectorAll('.filtro-status-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            statusSelecionados = Array.from(document.querySelectorAll('.filtro-status-chk'))
                .filter(c => c.checked).map(c => c.value);
            paginaAtual = 1; 
            aplicarFiltrosRenderizar();
        });
    });
}

function renderizarControlesPaginacao(totalPaginas, totalGrupos) {
    const container = document.getElementById('paginacao-container');
    const contador = document.getElementById('contador-registros');
    if(!container || !contador) return;
    
    container.innerHTML = '';
    
    const inicioExibido = (paginaAtual - 1) * itensPorPagina + 1;
    const fimExibido = Math.min(paginaAtual * itensPorPagina, totalGrupos);
    contador.innerText = `Exibindo ${totalGrupos > 0 ? inicioExibido : 0} a ${fimExibido} de ${totalGrupos} clientes`;

    if (totalPaginas <= 1) return;

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
        container.appendChild(li);
    };

    criarBotao('Anterior', paginaAtual - 1, paginaAtual === 1);
    
    let startPage = Math.max(1, paginaAtual - 2);
    let endPage = Math.min(totalPaginas, paginaAtual + 2);
    for (let i = startPage; i <= endPage; i++) criarBotao(i, i, false, i === paginaAtual);
    
    criarBotao('Próximo', paginaAtual + 1, paginaAtual === totalPaginas);
}

async function carregarEventos() {
    try {
        const response = await fetch('/api/v5/soc/eventos');
        eventosAtuais = await response.json();
        aplicarFiltrosRenderizar();
    } catch (error) { console.error(error); }
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
    } catch (error) { console.error(error); }
}

async function excluirRegistro() {
    const idVal = getVal('m-id');
    if (!idVal || !confirm('Confirmar exclusão?')) return;
    try {
        await fetch(`/api/v5/soc/excluir/${idVal}`, { method: 'DELETE' });
        fecharModal();
        carregarEventos();
    } catch (error) { console.error(error); }
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
        const el = document.getElementById(id);
        if (el) el.readOnly = isReadonly;
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