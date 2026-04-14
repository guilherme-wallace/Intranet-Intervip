let incidentesAtuais = [];
let refreshInterval;
let gruposExpandidos = new Set();

document.addEventListener('DOMContentLoaded', function() {
    carregarFalhas();
    initializeThemeAndUserInfo();
    
    refreshInterval = setInterval(carregarFalhas, 30000);

    document.getElementById('btn-atualizar').addEventListener('click', () => {
        carregarFalhas();
    });

    const btnNovoAlerta = document.getElementById('btn-novo-alerta');
    if (btnNovoAlerta) {
        btnNovoAlerta.addEventListener('click', () => {
            document.getElementById('form-falha-manual').reset();
            document.getElementById('nome-cliente-corp').textContent = '';
            document.getElementById('lista-contratos-corp').innerHTML = '';
            document.getElementById('lista-contratos-corp').classList.add('d-none');
            document.getElementById('lista-condominios').style.display = 'none';
            document.getElementById('btn-abrir-modal-blocos').classList.add('d-none');
            document.getElementById('texto-blocos-selecionados').classList.add('d-none');
            
            selectedCondoManual = null;
            selectedContratoCorp = null;

            const datalist = document.getElementById('lista-massivas-ativas');
            if (datalist) {
                datalist.innerHTML = '';
                const ativos = incidentesAtuais.filter(inc => inc.status === 'Ativo' && inc.regiao_afetada);
                const unicos = [...new Set(ativos.map(inc => inc.regiao_afetada))];
                unicos.forEach(host => {
                    const opt = document.createElement('option');
                    opt.value = host;
                    datalist.appendChild(opt);
                });
            }

            const modal = new bootstrap.Modal(document.getElementById('modalNovaFalha'));
            modal.show();
        });
    }
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-check-circle fs-4 d-block mb-2 text-success"></i>Nenhuma falha massiva ou alerta ativo no momento.</td></tr>';
        badgeTotal.innerText = '0';
        verificarAcoesLote();
        return;
    }

    let html = '';
    let totalAlertas = 0;

    incidentesAtuais.forEach(incidente => {
        const groupId = `incidente-${incidente.id}`;
        const filhos = incidente.alertas || [];
        totalAlertas += filhos.length;
        
        const todosResolvidos = filhos.every(f => f.status === 'UP' || f.status === 'IGNORADO');
        const statusIndicator = todosResolvidos ? '<span class="status-ok"></span> Resolvido' : '<span class="status-pulse-down"></span> Incidente Ativo';
        const rowColorClass = todosResolvidos ? 'table-success opacity-75' : '';

        const hostsUnicos = [...new Set(filhos.map(f => f.host_zabbix))];
        const listaHostsStr = hostsUnicos.join(', ');

        html += `
        <tr class="row-incidente-pai ${rowColorClass}" data-group-id="${groupId}">
            <td class="text-center">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    ${!todosResolvidos ? `<input class="form-check-input chk-incidente-lote m-0" type="checkbox" value="${incidente.id}">` : ''}
                    <i class="bi bi-chevron-right btn-toggle-group cursor-pointer"></i>
                </div>
            </td>
            <td>${formatarData(incidente.data_inicio)}</td>
            <td>
                <span class="text-primary fw-bold">${listaHostsStr}</span>
            </td> 
            <td><span class="badge bg-secondary">${filhos.length} afetados</span></td>
            <td>${statusIndicator}</td>
            <td class="text-muted text-center">-</td> 
            <td class="text-end">
                <button class="btn btn-sm btn-secondary btn-gerar-relatorio" data-id="${incidente.id}">
                    <i class="bi bi-clipboard"></i> Copiar Relatório
                </button>
            </td>
        </tr>`;

        filhos.forEach(filho => {
            const isUp = filho.status === 'UP';
            const isIgnorado = filho.status === 'IGNORADO';
            
            let rowClass = 'row-filho-down';
            let statusIcon = '<i class="bi bi-x-circle-fill text-danger"></i>';
            let corTexto = 'text-danger';
            let textoStatus = 'OFFLINE';

            if (isUp) {
                rowClass = 'row-filho-up';
                statusIcon = '<i class="bi bi-check-circle-fill text-success"></i>';
                corTexto = 'text-success';
                textoStatus = `Normalizado (${formatarData(filho.data_retorno)})`;
            } else if (isIgnorado) {
                rowClass = 'row-filho-ignorado';
                statusIcon = '<i class="bi bi-eye-slash-fill text-secondary"></i>';
                corTexto = 'text-secondary';
                textoStatus = `Ignorado (${formatarData(filho.data_retorno)})`;
            }
            
            let tipoBadge = '';
            if(filho.tipo_alerta === 'CORP') tipoBadge = '<span class="badge bg-primary badge-tipo">CORP</span>';
            else if(filho.tipo_alerta === 'FTTB') tipoBadge = '<span class="badge bg-info text-dark badge-tipo">FTTB</span>';
            else if(filho.tipo_alerta === 'PON') tipoBadge = '<span class="badge bg-danger badge-tipo">PON</span>';
            else if(filho.tipo_alerta === 'ITX') tipoBadge = '<span class="badge bg-warning text-dark badge-tipo">ITX</span>';
            else tipoBadge = `<span class="badge bg-secondary badge-tipo">${filho.tipo_alerta}</span>`;

            const dropdownAcoes = `
            <div class="dropdown d-inline-block">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" style="zoom: 0.85;">Ação</button>
                <ul class="dropdown-menu shadow">
                    <li><a class="dropdown-item text-success btn-mudar-status-ind" href="#" data-id="${filho.id}" data-status="UP"><i class="bi bi-check-circle me-1"></i> Normalizado (UP)</a></li>
                    <li><a class="dropdown-item text-danger btn-mudar-status-ind" href="#" data-id="${filho.id}" data-status="DOWN"><i class="bi bi-arrow-down-circle me-1"></i> Marcar DOWN</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-secondary btn-mudar-status-ind" href="#" data-id="${filho.id}" data-status="IGNORADO"><i class="bi bi-eye-slash me-1"></i> Ignorar</a></li>
                </ul>
            </div>`;

            html += `
            <tr class="row-filho ${groupId} ${rowClass}" style="display: none;">
                <td class="text-center">
                    ${(!isUp && !isIgnorado) ? `<input class="form-check-input chk-alerta-lote" type="checkbox" value="${filho.id}">` : ''}
                </td> 
                <td class="ps-4 border-start border-3 ${isUp ? 'border-success' : (isIgnorado ? 'border-secondary' : 'border-danger')} text-muted">
                    <i class="bi bi-arrow-return-right me-1"></i> ${formatarData(filho.data_falha)}
                </td>
                <td>
                    <div class="fw-bold">${filho.host_zabbix}</div>
                    <div class="small text-muted">Zabbix</div>
                </td>
                <td>
                    ${tipoBadge} <span class="fw-medium">${filho.nome_identificado || filho.identificador}</span>
                </td>
                <td class="${corTexto} fw-medium">
                    ${statusIcon} ${textoStatus}
                </td>
                <td class="text-muted fw-medium small">
                    ${filho.motivo_falha || 'Desconhecido'}
                </td>
                <td class="text-end">
                    ${dropdownAcoes}
                </td>
            </tr>`;
        });
    });

    tbody.innerHTML = html;
    badgeTotal.innerText = totalAlertas;

    gruposExpandidos.forEach(groupId => {
        const row = document.querySelector(`.row-incidente-pai[data-group-id="${groupId}"]`);
        if (row) {
            const icon = row.querySelector('.btn-toggle-group');
            const linhas = document.querySelectorAll(`.${groupId}`);
            linhas.forEach(tr => tr.style.display = 'table-row');
            if (icon) {
                icon.classList.add('expanded');
                icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
            }
        }
    });

    document.querySelectorAll('.row-incidente-pai').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('.btn-gerar-relatorio') || e.target.closest('input')) return; 
            toggleGrupo(this.getAttribute('data-group-id'), this);
        });
    });

    document.querySelectorAll('.btn-gerar-relatorio').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            gerarRelatorio(parseInt(this.getAttribute('data-id')));
        });
    });

    document.querySelectorAll('.chk-alerta-lote, .chk-incidente-lote').forEach(chk => {
        chk.addEventListener('change', verificarAcoesLote);
    });
    
    document.querySelectorAll('.btn-mudar-status-ind').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            dispararAcaoLote(this.getAttribute('data-status'), [parseInt(this.getAttribute('data-id'))]);
        });
    });

    verificarAcoesLote();
}

function verificarAcoesLote() {
    const alertasSelecionados = document.querySelectorAll('.chk-alerta-lote:checked');
    const incidentesSelecionados = document.querySelectorAll('.chk-incidente-lote:checked');
    const barra = document.getElementById('barra-acoes-lote');
    
    const btnNormalizar = document.getElementById('btn-lote-normalizar');
    const btnDown = document.getElementById('btn-lote-down');
    const btnIgnorar = document.getElementById('btn-lote-ignorar');
    const btnDesmembrar = document.getElementById('btn-lote-desmembrar');
    const btnUnificar = document.getElementById('btn-lote-unificar');

    let total = alertasSelecionados.length + incidentesSelecionados.length;

    if (total > 0) {
        document.getElementById('qtd-selecionados').innerText = total;
        barra.classList.remove('d-none');
        barra.classList.add('d-flex');

        if (incidentesSelecionados.length > 1 && alertasSelecionados.length === 0) {
            if(btnNormalizar) btnNormalizar.classList.add('d-none');
            if(btnDown) btnDown.classList.add('d-none');
            if(btnIgnorar) btnIgnorar.classList.add('d-none');
            if(btnDesmembrar) btnDesmembrar.classList.add('d-none');
            if(btnUnificar) btnUnificar.classList.remove('d-none');
        } else if (alertasSelecionados.length > 0 && incidentesSelecionados.length === 0) {
            if(btnNormalizar) btnNormalizar.classList.remove('d-none');
            if(btnDown) btnDown.classList.remove('d-none');
            if(btnIgnorar) btnIgnorar.classList.remove('d-none');
            if(btnDesmembrar) btnDesmembrar.classList.remove('d-none');
            if(btnUnificar) btnUnificar.classList.add('d-none');
        } else {
            if(btnNormalizar) btnNormalizar.classList.add('d-none');
            if(btnDown) btnDown.classList.add('d-none');
            if(btnIgnorar) btnIgnorar.classList.add('d-none');
            if(btnDesmembrar) btnDesmembrar.classList.add('d-none');
            if(btnUnificar) btnUnificar.classList.add('d-none');
            document.getElementById('qtd-selecionados').innerText = "Selecione mais de uma massiva. Apenas 1";
        }
    } else {
        barra.classList.add('d-none');
        barra.classList.remove('d-flex');
    }
}

async function dispararAcaoLote(acaoStr, preIds = null) {
    const ids = preIds || Array.from(document.querySelectorAll('.chk-alerta-lote:checked')).map(chk => parseInt(chk.value));
    if (!ids.length) return;

    if (!confirm(`Tem certeza que deseja aplicar o status [${acaoStr}] para ${ids.length} alerta(s)?`)) return;

    try {
        const response = await fetch('/api/v5/monitoramento-de-falhas/acao-lote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: ids, acao: acaoStr })
        });
        if (response.ok) carregarFalhas();
        else alert("Erro ao processar ação em lote.");
    } catch(e) { console.error(e); }
}

async function dispararDesmembrarLote() {
    const ids = Array.from(document.querySelectorAll('.chk-alerta-lote:checked')).map(chk => parseInt(chk.value));
    if (!ids.length) return;
    if (!confirm(`Tem certeza que deseja separar ${ids.length} alerta(s) em uma NOVA massiva pai?`)) return;

    try {
        const response = await fetch('/api/v5/monitoramento-de-falhas/acao-desmembrar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertas_ids: ids })
        });
        if (response.ok) carregarFalhas(); else alert("Erro ao desmembrar alertas.");
    } catch(e) { console.error(e); }
}

async function dispararUnificarLote() {
    const ids = Array.from(document.querySelectorAll('.chk-incidente-lote:checked')).map(chk => parseInt(chk.value));
    if (ids.length < 2) return alert("Selecione pelo menos 2 massivas para unificar.");
    if (!confirm(`Tem certeza que deseja unificar as ${ids.length} massivas em UMA SÓ?`)) return;

    try {
        const response = await fetch('/api/v5/monitoramento-de-falhas/acao-unificar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ incidentes_ids: ids })
        });
        if (response.ok) carregarFalhas(); else alert("Erro ao unificar massivas.");
    } catch(e) { console.error(e); }
}

document.getElementById('btn-lote-normalizar')?.addEventListener('click', () => dispararAcaoLote('UP'));
document.getElementById('btn-lote-down')?.addEventListener('click', () => dispararAcaoLote('DOWN'));
document.getElementById('btn-lote-ignorar')?.addEventListener('click', () => dispararAcaoLote('IGNORADO'));
document.getElementById('btn-lote-desmembrar')?.addEventListener('click', dispararDesmembrarLote);
document.getElementById('btn-lote-unificar')?.addEventListener('click', dispararUnificarLote);

let selectedCondoManual = null;
let selectedContratoCorp = null;

document.getElementById('man-tipo')?.addEventListener('change', function() {
    const v = this.value;
    document.getElementById('sessao-fttb').classList.toggle('d-none', v !== 'FTTB');
    document.getElementById('sessao-corp').classList.toggle('d-none', v !== 'CORP');
    document.getElementById('sessao-backbone').classList.toggle('d-none', v !== 'BACKBONE');
});

const inputBuscaCondo = document.getElementById('busca-condominio');
if (inputBuscaCondo) {
    inputBuscaCondo.addEventListener('input', async function() {
        const val = this.value;
        const lista = document.getElementById('lista-condominios');
        if(val.length < 3) { lista.style.display = 'none'; return; }

        try {
            const res = await fetch(`/api/v4/condominio?query=${val}`);
            const data = await res.json();
            lista.innerHTML = '';
            if(data.length > 0) {
                data.forEach(c => {
                    const a = document.createElement('a');
                    a.className = 'list-group-item list-group-item-action cursor-pointer';
                    a.textContent = c.text || c.name || c.value; 
                    a.onclick = async () => {
                        inputBuscaCondo.value = a.textContent;
                        selectedCondoManual = { id: c.value || c.id, nome: a.textContent };
                        lista.style.display = 'none';
                        
                        const resBlocos = await fetch(`/api/v1/block/${selectedCondoManual.id}`);
                        const blocos = await resBlocos.json();
                        const container = document.getElementById('container-blocos');
                        container.innerHTML = '';
                        
                        blocos.forEach(b => {
                            container.innerHTML += `<div class="form-check form-switch border rounded p-2 d-flex align-items-center"><input class="form-check-input ms-0 me-3 chk-bloco-manual" type="checkbox" role="switch" value="${b.name}" checked><label class="form-check-label flex-grow-1">${b.name}</label></div>`;
                        });
                        
                        document.getElementById('btn-abrir-modal-blocos').classList.remove('d-none');
                        document.getElementById('texto-blocos-selecionados').classList.remove('d-none');
                        atualizarTextoBlocosSelecionados();
                    };
                    lista.appendChild(a);
                });
                lista.style.display = 'block';
            }
        } catch(e) { console.error(e); }
    });
}

document.getElementById('btn-abrir-modal-blocos')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('modalSelecaoBlocos')).show());
document.getElementById('btn-marcar-todos-blocos')?.addEventListener('click', () => document.querySelectorAll('.chk-bloco-manual').forEach(chk => chk.checked = true));
document.getElementById('btn-desmarcar-todos-blocos')?.addEventListener('click', () => document.querySelectorAll('.chk-bloco-manual').forEach(chk => chk.checked = false));
document.getElementById('btn-confirmar-blocos')?.addEventListener('click', () => { atualizarTextoBlocosSelecionados(); bootstrap.Modal.getInstance(document.getElementById('modalSelecaoBlocos')).hide(); });

function atualizarTextoBlocosSelecionados() {
    document.getElementById('texto-blocos-selecionados').innerText = `${document.querySelectorAll('.chk-bloco-manual:checked').length} de ${document.querySelectorAll('.chk-bloco-manual').length} blocos afetados.`;
}

document.getElementById('btn-buscar-corp')?.addEventListener('click', async () => {
    const id = document.getElementById('busca-cliente-corp').value;
    if(!id) return;
    document.getElementById('btn-buscar-corp').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    try {
        const res = await fetch(`/api/v5/monitoramento-de-falhas/busca-contratos/${id}`);
        const data = await res.json();
        document.getElementById('nome-cliente-corp').textContent = data.nome;
        const sel = document.getElementById('lista-contratos-corp');
        sel.innerHTML = '';
        selectedContratoCorp = null;

        if (data.contratos.length === 0) sel.innerHTML = '<div class="alert alert-warning">Nenhum contrato ativo.</div>';
        else {
            data.contratos.forEach(c => {
                const statusBadgeClass = ['A','AA'].includes(c.status) ? 'bg-success' : 'bg-warning text-dark';
                sel.innerHTML += `<a href="#" class="list-group-item list-group-item-action item-contrato-corp" data-id="${c.id_contrato}" data-name="${c.plano}" data-endereco="${c.endereco}"><div class="d-flex w-100 justify-content-between mb-1"><h6 class="mb-1 fw-bold text-primary">ID ${c.id_contrato} - ${c.plano}</h6><span class="badge ${statusBadgeClass}">${c.status}</span></div><p class="mb-1 small text-muted"><i class="bi bi-geo-alt-fill"></i> ${c.endereco}</p></a>`;
            });
        }
        sel.classList.remove('d-none');

        document.querySelectorAll('.item-contrato-corp').forEach(el => {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.item-contrato-corp').forEach(i => i.classList.remove('active', 'bg-primary-subtle'));
                this.classList.add('active', 'bg-primary-subtle');
                selectedContratoCorp = { id: this.getAttribute('data-id'), nome: this.getAttribute('data-name'), endereco: this.getAttribute('data-endereco') };
            });
        });
    } catch(e) { alert("Erro ao buscar no IXC."); } finally { document.getElementById('btn-buscar-corp').innerHTML = 'Buscar Contratos'; }
});

const btnSalvarManual = document.getElementById('btn-salvar-manual');
if (btnSalvarManual) {
    btnSalvarManual.addEventListener('click', async () => {
        const tipo = document.getElementById('man-tipo').value;
        const host = document.getElementById('man-host').value;
        const obs = document.getElementById('man-obs').value || 'Reportado Manualmente';
        let identificadorStr = '', nomeVisual = '';

        if (tipo === 'FTTB') {
            if(!selectedCondoManual) return alert("Selecione o condomínio.");
            const blocosMarcados = Array.from(document.querySelectorAll('.chk-bloco-manual:checked')).map(chk => chk.value);
            identificadorStr = selectedCondoManual.id.toString();
            nomeVisual = selectedCondoManual.nome;
            if (blocosMarcados.length < document.querySelectorAll('.chk-bloco-manual').length && blocosMarcados.length > 0) nomeVisual += ` (Blocos: ${blocosMarcados.join(', ')})`;
            else if (blocosMarcados.length === 0) return alert("Pelo menos um bloco.");
        } else if (tipo === 'CORP') {
            const idCli = document.getElementById('busca-cliente-corp').value;
            if(!idCli || !selectedContratoCorp) return alert("Selecione o contrato.");
            identificadorStr = `${idCli}|${selectedContratoCorp.id}`;
            nomeVisual = `${document.getElementById('nome-cliente-corp').textContent} | ${selectedContratoCorp.nome} - ${selectedContratoCorp.endereco}`;
        } else {
            identificadorStr = document.getElementById('identificador-backbone').value;
            nomeVisual = identificadorStr;
        }

        if (!host || !identificadorStr) return alert('Preencha os campos obrigatórios!');

        const date = new Date();
        date.setMinutes(date.getMinutes() - 6); 
        const tzoffset = date.getTimezoneOffset() * 60000;
        const dataLocal = new Date(date.getTime() - tzoffset).toISOString().slice(0, 19).replace('T', ' ');

        try {
            const response = await fetch('/api/v5/monitoramento-de-falhas/webhook/n8n', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_zabbix: host, tipo_alerta: tipo, identificador: identificadorStr, nome_identificado: nomeVisual, motivo_falha: obs, status: 'DOWN', data_evento: dataLocal }) });
            if (response.ok) { bootstrap.Modal.getInstance(document.getElementById('modalNovaFalha')).hide(); carregarFalhas(); } else alert('Erro ao salvar falha manual.');
        } catch (error) { console.error(error); }
    });
}

function toggleGrupo(groupId, rowElement) {
    const icon = rowElement.querySelector('.btn-toggle-group');
    const linhas = document.querySelectorAll(`.${groupId}`);
    if(linhas.length === 0) return;

    const isHidden = linhas[0].style.display === 'none';
    linhas.forEach(tr => tr.style.display = isHidden ? 'table-row' : 'none');

    if(isHidden) {
        gruposExpandidos.add(groupId);
        if (icon) { icon.classList.add('expanded'); icon.classList.replace('bi-chevron-right', 'bi-chevron-down'); }
    } else {
        gruposExpandidos.delete(groupId);
        if (icon) { icon.classList.remove('expanded'); icon.classList.replace('bi-chevron-down', 'bi-chevron-right'); }
    }
}

function formatarData(dataString) {
    if(!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + data.toLocaleDateString('pt-BR');
}

function gerarRelatorio(incidenteId) {
    const incidente = incidentesAtuais.find(i => i.id === incidenteId);
    if(!incidente || !incidente.alertas) return;

    const alertasAtivos = incidente.alertas.filter(a => a.status === 'DOWN');
    const hostsRelatorio = [...new Set(alertasAtivos.map(a => a.host_zabbix))].join(', ');

    const dataFormatada = formatarData(incidente.data_inicio);
    let textoRelatorio = `*Massiva - ${dataFormatada}:* ${hostsRelatorio || incidente.regiao_afetada}\n\n`;

    const corporativos = alertasAtivos.filter(a => a.tipo_alerta === 'CORP');
    const publicos = alertasAtivos.filter(a => ['FTTB', 'PON', 'HTSP', 'WIFI'].includes(a.tipo_alerta));
    const interconexoes = alertasAtivos.filter(a => ['ITX', 'BACKBONE'].includes(a.tipo_alerta));

    const limparNome = (nome) => {
        let limpo = nome || '';
        let partes = limpo.split('|');
        if (partes.length > 1) {
            let endereco = partes[1].trim();
            if (/^[\s,\-]*$/.test(endereco) || endereco.toLowerCase() === 'endereço não especificado') {
                limpo = partes[0].trim();
            }
        }
        limpo = limpo.replace(/(^|PON Afetada:\s*|,\s*)\d+\s*-\s*/g, '$1');
        limpo = limpo.replace(/link down/gi, 'Offline');
        return limpo;
    };

    if (corporativos.length > 0) {
        textoRelatorio += `*Corporativos Afetados:*\n`;
        corporativos.forEach(c => textoRelatorio += `${limparNome(c.nome_identificado)}\n`);
        textoRelatorio += `\n`;
    }

    if (publicos.length > 0) {
        textoRelatorio += `*Condomínios / Varejo Afetados:*\n`;
        publicos.forEach(p => textoRelatorio += `${limparNome(p.nome_identificado)}\n`);
        textoRelatorio += `\n`;
    }

    if (interconexoes.length > 0) {
        textoRelatorio += `*Interconexões / Backbone Afetados:*\n`;
        interconexoes.forEach(i => {
            if (i.tipo_alerta === 'BACKBONE') {
                let nomeRaw = i.nome_identificado || '';
                const match = nomeRaw.match(/([^(]+)\(([^)]+)\)/);
                if (match) {
                    textoRelatorio += `${i.host_zabbix} - ${match[1].trim()} *->* ${match[2].trim()}\n`;
                } else {
                    textoRelatorio += `${i.host_zabbix} - ${limparNome(nomeRaw)}\n`;
                }
            } else {
                textoRelatorio += `${limparNome(i.nome_identificado)}\n`;
            }
        });
        textoRelatorio += `\n`;
    }

    navigator.clipboard.writeText(textoRelatorio.trim()).then(() => {
        new bootstrap.Toast(document.getElementById('toastCopiado')).show();
    }).catch(err => { alert('Erro ao copiar o relatório.'); });
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
        });
}