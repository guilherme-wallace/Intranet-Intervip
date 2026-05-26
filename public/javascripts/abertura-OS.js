// javascripts/abertura-OS.js
let clienteAtual = null;
let ultimoTicketGerado = null;

document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeAndUserInfo();
    
    await carregarAssuntosIXC();

    const btnBuscar = document.getElementById('btn-buscar-cliente');
    const inputBusca = document.getElementById('input-busca-cliente');

    btnBuscar.addEventListener('click', () => realizarBusca(inputBusca.value));
    inputBusca.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusca(inputBusca.value);
    });

    document.getElementById('select-assunto').addEventListener('change', atualizarChecklist);

    document.getElementById('select-contrato').addEventListener('change', (e) => {
        if (window.renderizarDetalhesContrato) window.renderizarDetalhesContrato(e.target.value);
    });

    document.getElementById('btn-gerar-os').addEventListener('click', gerarOS);
    
    document.getElementById('btn-confirmar-tarefa').addEventListener('click', processarAvancoTarefa);
});

async function carregarAssuntosIXC() {
    try {
        const response = await fetch('/api/v5/abertura-OS/assuntos');
        const assuntos = await response.json();
        const select = document.getElementById('select-assunto');
        
        select.innerHTML = '<option value="">Selecione o Assunto...</option>';

        assuntos.forEach(a => {
            const nomeStr = (a.assunto || '').toUpperCase();
            const processoVinculado = a.id_wfl_processo || a.id_processo || '';
            
            if (processoVinculado && processoVinculado !== '0' && processoVinculado.trim() !== '') {
                if (!nomeStr.includes('INSTALA') && !nomeStr.includes('TITULARIDADE')) {
                    const option = document.createElement('option');
                    option.value = a.id;
                    option.dataset.departamento = a.id_departamento || a.id_setor || '1'; 
                    option.dataset.processo = processoVinculado; 
                    option.textContent = a.assunto;
                    select.appendChild(option);
                }
            }
        });
    } catch (e) {
        document.getElementById('select-assunto').innerHTML = '<option value="">Erro ao carregar assuntos</option>';
    }
}

async function realizarBusca(termo) {
    if (!termo) return;
    termo = termo.trim();

    if (/[a-zA-Z]/.test(termo)) {
        alert("Busca inválida! Digite apenas o Código do cliente, CPF ou CNPJ.");
        document.getElementById('input-busca-cliente').value = '';
        return;
    }
    
    const btn = document.getElementById('btn-buscar-cliente');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;
    document.getElementById('painel-detalhes-tecnicos').style.display = 'none';

    try {
        const response = await fetch(`/api/v5/abertura-OS/busca-cliente/${encodeURIComponent(termo)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Cliente não encontrado.");

        clienteAtual = data;
        buscarAtendimentosAbertos(data.id);

        document.getElementById('display-nome-cliente').textContent = data.nome || 'N/A';
        const elTelefone = document.getElementById('display-telefone-cliente');
        if (elTelefone) elTelefone.innerHTML = `<i class="bi bi-telephone-fill me-1"></i>${data.telefones}`;

        const formTriagem = document.getElementById('form-triagem');
        const alertaInativo = document.getElementById('alerta-cliente-inativo');
        const selectContrato = document.getElementById('select-contrato');
        selectContrato.innerHTML = '';
        
        if (data.contratos && data.contratos.length > 0) {
            alertaInativo.classList.add('d-none');
            formTriagem.style.display = 'block';
            selectContrato.disabled = false;

            data.contratos.forEach(c => {
                selectContrato.add(new Option(`Contrato ${c.id} - ${c.plano.nome}`, c.id));
            });
            document.getElementById('painel-detalhes-tecnicos').style.display = 'flex';
            window.renderizarDetalhesContrato(data.contratos[0].id);
        } else {
            selectContrato.add(new Option('Nenhum contrato ativo/bloqueado localizado', ''));
            selectContrato.disabled = true;
            document.getElementById('display-tipo-imovel').textContent = '---';
            document.getElementById('display-tipo-imovel').className = 'badge bg-secondary';
            document.getElementById('badge-rede-neutra').classList.add('d-none');
            
            document.getElementById('painel-detalhes-tecnicos').style.display = 'none';
            formTriagem.style.display = 'none';
            alertaInativo.classList.remove('d-none');
        }

        const card = document.getElementById('card-diagnostico');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';

    } catch (error) {
        alert(error.message);
        const card = document.getElementById('card-diagnostico');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        clienteAtual = null;
    } finally {
        btn.innerHTML = '<i class="bi bi-search"></i>';
        btn.disabled = false;
    }
}

window.renderizarDetalhesContrato = function(contratoId) {
    if (!clienteAtual || !clienteAtual.contratos) return;
    const c = clienteAtual.contratos.find(x => String(x.id) === String(contratoId));
    if (!c) return;

    const badge = document.getElementById('display-tipo-imovel');
    if (c.is_corp) {
        badge.textContent = 'CORPORATIVO / PROVEDOR';
        badge.className = 'badge bg-dark text-white';
    } else {
        badge.textContent = c.is_predio ? 'PRÉDIO / CONDOMÍNIO' : 'CASA';
        badge.className = c.is_predio ? 'badge bg-info text-dark' : 'badge bg-primary';
    }

    const badgeRN = document.getElementById('badge-rede-neutra');
    if (c.is_rede_neutra) {
        badgeRN.classList.remove('d-none');
    } else {
        badgeRN.classList.add('d-none');
    }

    const elEnderecoHeader = document.getElementById('display-endereco-cliente');
    if (elEnderecoHeader) elEnderecoHeader.textContent = c.endereco_completo;
    
    const elEnderecoDetalhe = document.getElementById('det-endereco-completo');
    if (elEnderecoDetalhe) elEnderecoDetalhe.textContent = c.endereco_completo;

    const elCondominio = document.getElementById('det-condominio');
    if (elCondominio) {
        if (c.condominio) {
            elCondominio.innerHTML = `<i class="bi bi-buildings-fill me-1"></i>Condomínio: ${c.condominio}`;
            elCondominio.style.display = 'block';
        } else {
            elCondominio.style.display = 'none';
        }
    }

    document.getElementById('det-plano-nome').textContent = c.plano.nome;
    document.getElementById('det-plano-valor').textContent = parseFloat(c.plano.valor || 0).toFixed(2).replace('.', ',');
    
    let statusBadge = '';
    if (c.plano.status === 'A') statusBadge = '<span class="badge bg-success">Ativo</span>';
    else if (c.plano.status === 'CM') statusBadge = '<span class="badge bg-danger">Cancelado</span>';
    else if (c.plano.status === 'B' || c.plano.status === 'F') statusBadge = '<span class="badge bg-warning text-dark">Bloqueado Financeiro</span>';
    else statusBadge = `<span class="badge bg-secondary">${c.plano.status}</span>`;
    document.getElementById('det-plano-status').innerHTML = statusBadge;

    const pppoeArea = document.getElementById('area-pppoe-onu');
    if (c.login) {
        const tempoHrs = Math.floor(c.login.uptime / 3600);
        const tempoUptime = tempoHrs > 0 ? `${tempoHrs} horas` : `${Math.floor(c.login.uptime / 60)} min`;
        
        pppoeArea.innerHTML = `
            <div class="row mb-3">
                <div class="col-6">
                    <p class="mb-1"><strong>Login:</strong> <span class="text-primary fw-bold">${c.login.user}</span></p>
                    <p class="mb-1"><strong>Senha:</strong> ${c.login.senha}</p>
                </div>
                <div class="col-6">
                    <p class="mb-1"><strong>Sessão:</strong> ${c.login.status === 'Online' ? `<span class="text-success fw-bold">Online (${tempoUptime})</span>` : '<span class="text-danger fw-bold">Offline</span>'}</p>
                    <p class="mb-1 text-truncate"><strong>PPP:</strong> ${c.login.ultima_queda !== '---' ? c.login.ultima_queda : 'Sessão Ativa'}</p>
                </div>
            </div>
            
            <div class="d-flex flex-wrap gap-2 mb-2">
                <button class="btn btn-sm btn-outline-primary fw-bold" id="btn-relatorio-pppoe" data-user="${c.login.user}"><i class="bi bi-file-earmark-bar-graph"></i> Relatório de Conexão</button>
                <button class="btn btn-sm btn-outline-warning fw-bold text-dark" id="btn-limpar-mac" data-loginid="${c.login.id}"><i class="bi bi-eraser"></i> Limpar MAC</button>
                <button class="btn btn-sm btn-outline-danger fw-bold" id="btn-desconectar" data-loginid="${c.login.id}"><i class="bi bi-plug"></i> Desconectar</button>
            </div>

            <div id="onu-realtime-container" class="mt-3 pt-3 border-top">
                <p class="text-muted small mb-0"><span class="spinner-border spinner-border-sm me-2"></span>Sincronizando diagnóstico da OLT em tempo real...</p>
            </div>
        `;

        document.getElementById('btn-relatorio-pppoe').addEventListener('click', function() { verHistoricoPppoe(this.dataset.user); });
        document.getElementById('btn-limpar-mac').addEventListener('click', function() { limparMacPppoe(this.dataset.loginid); });
        document.getElementById('btn-desconectar').addEventListener('click', function() { desconectarPppoe(this.dataset.loginid); });

        if (c.onu && c.onu.id) {
            buscarOnuRealtime(c.onu.id);
        } else {
            document.getElementById('onu-realtime-container').innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Equipamento ONU de Fibra não localizado no IXC.</p>';
        }

    } else {
        pppoeArea.innerHTML = '<p class="text-muted fst-italic">Nenhum login PPPoE localizado para este contrato.</p>';
    }
};

function atualizarChecklist(e) {
    const select = e.target;
    const assuntoTexto = select.options[select.selectedIndex]?.text.toUpperCase() || '';
    
    const area = document.getElementById('area-checklist');
    const container = document.getElementById('checklist-items');
    
    area.classList.remove('d-none');
    container.innerHTML = '';

    let checks = [];
    if (assuntoTexto.includes('LOS') || assuntoTexto.includes('SEM ACESSO')) {
        checks = ['Cliente verificou se a ONU está ligada na tomada?', 'Cabo de fibra ótica está conectado e sem dobras visíveis?'];
    } else if (assuntoTexto.includes('LENTIDA') || assuntoTexto.includes('LENTIDÃO')) {
        checks = ['Teste de velocidade realizado via Cabo de Rede?', 'Equipamentos (ONU e Roteador) foram reiniciados?'];
    } else {
        area.classList.add('d-none');
        return;
    }

    checks.forEach((texto, index) => {
        container.innerHTML += `
            <div class="form-check mb-1">
                <input class="form-check-input" type="checkbox" id="check-${index}" required>
                <label class="form-check-label text-dark" for="check-${index}">${texto}</label>
            </div>
        `;
    });
}

async function gerarOS() {
    if (!clienteAtual) return alert("Busque e selecione um cliente primeiro.");

    const selectAssunto = document.getElementById('select-assunto');
    const id_assunto = selectAssunto.value;
    const assuntoTexto = selectAssunto.options[selectAssunto.selectedIndex]?.text; 
    const id_departamento = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.departamento;
    
    const id_processo = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.processo;
    
    const id_contrato = document.getElementById('select-contrato').value;
    const observacao = document.getElementById('obs-triagem').value;

    if (!id_assunto) return alert("Selecione um Processo/Assunto.");
    
    if (!id_processo) {
        return alert("ERRO DE CONFIGURAÇÃO NO IXC: Este assunto não possui um Processo (Workflow) vinculado a ele no IXC. Peça ao gestor para vincular!");
    }
    
    if (!observacao) return alert("Preencha as observações da triagem.");

    const checkboxes = document.querySelectorAll('#checklist-items input[type="checkbox"]');
    for (let chk of checkboxes) {
        if (!chk.checked) return alert("Por favor, confirme todos os itens do checklist obrigatório.");
    }

    const btn = document.getElementById('btn-gerar-os');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando Atendimento...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/v5/abertura-OS/criar-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: clienteAtual.id,
                contrato_id: id_contrato || null,
                id_assunto: id_assunto,
                id_departamento: id_departamento,
                id_processo: id_processo,
                observacao: observacao,
                titulo: assuntoTexto
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        ultimoTicketGerado = data.ticket_id;
        document.getElementById('sucesso-ticket-id').textContent = ultimoTicketGerado;
        
        carregarTarefasProcesso(id_processo);
        
        const modalElement = document.getElementById('modalDecisaoAgendamento');
        const modalDecisao = new bootstrap.Modal(modalElement);
        modalDecisao.show();

    } catch (error) {
        alert("Erro ao criar chamado: " + error.message);
    } finally {
        btn.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Continuar';
        btn.disabled = false;
    }
}

async function carregarTarefasProcesso(id_processo) {
    const container = document.getElementById('lista-tarefas-processo');
    container.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando tarefas do fluxo...</div>';
    
    try {
        const response = await fetch(`/api/v5/abertura-OS/tarefas/${id_processo}`);
        const tarefas = await response.json();
        
        if (tarefas.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Nenhuma tarefa da Sequência 2 encontrada para este processo. O IXC seguirá o fluxo padrão.</div>';
            return;
        }
        
        container.innerHTML = '';
        tarefas.forEach((t, index) => {
            const isVisita = t.descricao.toUpperCase().includes('VISITA');
            const icon = isVisita ? 'bi-calendar2-event text-primary' : 'bi-diagram-3 text-success';
            const checked = index === 0 ? 'checked' : '';
            
            container.innerHTML += `
                <div class="form-check border rounded p-3 bg-white shadow-sm d-flex align-items-center" style="cursor: pointer; transition: 0.2s;" onclick="document.getElementById('tarefa-${t.id}').checked = true" onmouseover="this.classList.add('bg-light')" onmouseout="this.classList.remove('bg-light')">
                    <input class="form-check-input ms-1 me-3 fs-5" type="radio" name="radio-tarefa" id="tarefa-${t.id}" value="${t.id}" data-setor="${t.id_setor}" data-nome="${t.descricao}" ${checked}>
                    <label class="form-check-label w-100 fw-bold text-dark d-flex align-items-center m-0" for="tarefa-${t.id}" style="cursor: pointer;">
                        <i class="bi ${icon} fs-4 me-3"></i> 
                        <span style="font-size: 0.95rem;">${t.descricao}</span>
                    </label>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = '<div class="text-danger p-2 border rounded border-danger">Erro ao carregar tarefas do IXC.</div>';
    }
}

async function processarAvancoTarefa() {
    const radioSelecionado = document.querySelector('input[name="radio-tarefa"]:checked');
    if (!radioSelecionado) return alert('Selecione uma tarefa para avançar.');
    
    const btn = document.getElementById('btn-confirmar-tarefa');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Movendo Chamado...';
    
    const id_tarefa = radioSelecionado.value;
    const id_setor = radioSelecionado.dataset.setor;
    const nome_tarefa = radioSelecionado.dataset.nome.toUpperCase();
    
    try {
        await fetch('/api/v5/abertura-OS/avancar-tarefa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: ultimoTicketGerado,
                id_tarefa: id_tarefa,
                id_setor: id_setor,
                usuario_intranet: window.usuarioLogado
            })
        });
        
        if (nome_tarefa.includes('VISITA')) {
            window.location.href = `/agendamento?os=${ultimoTicketGerado}&origem=intranet`;
        } else {
            alert(`Sucesso! Chamado encaminhado para a etapa: ${nome_tarefa}`);
            window.location.reload(); 
        }
    } catch (error) {
        alert('Erro ao mover a tarefa no IXC. Tente novamente.');
        btn.disabled = false;
        btn.innerHTML = 'Confirmar e Avançar <i class="bi bi-arrow-right-circle ms-1"></i>';
    }
}

async function buscarOnuRealtime(id_fibra) {
    const container = document.getElementById('onu-realtime-container');
    try {
        const res = await fetch('/api/v5/abertura-OS/onu-realtime', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_fibra })
        });
        const onu = await res.json();
        if(!onu) throw new Error("ONU não retornada.");
        
        const rx = parseFloat(onu.sinal_rx) || 0;
        let corRx = (rx < -26 || rx > -10) ? 'text-danger fw-bold' : 'text-success fw-bold';
        if (rx === 0) corRx = 'text-dark';
        
        const motivoQueda = onu.causa_ultima_queda || onu.causa_queda || onu.motivo_queda || onu.status_potencia || 'Desconhecido';
        const isOnline = (rx < 0 && rx > -40) || onu.status === 'A' || onu.status === 'O';
        
        container.innerHTML = `
            <h6 class="fw-bold text-success mb-2"><i class="bi bi-activity"></i> Diagnóstico da ONU</h6>
            <div class="row small">
                <div class="col-6 border-end">
                    <p class="mb-1"><strong>MAC ONU:</strong> ${onu.mac || 'N/A'}</p>
                    <p class="mb-1"><strong>Distância:</strong> ${onu.distancia ? onu.distancia + 'm' : 'N/A'}</p>
                    <p class="mb-1"><strong>Temperatura:</strong> ${onu.temperatura ? onu.temperatura + ' °C' : 'N/A'}</p>
                    <p class="mb-1"><strong>Voltagem:</strong> ${onu.voltagem ? onu.voltagem + ' V' : 'N/A'}</p>
                </div>
                <div class="col-6">
                    <p class="mb-1"><strong>Sinal RX:</strong> <span class="${corRx}">${onu.sinal_rx ? onu.sinal_rx + ' dBm' : 'N/A'}</span></p>
                    <p class="mb-1"><strong>Sinal TX:</strong> <span class="text-success fw-bold">${onu.sinal_tx ? onu.sinal_tx + ' dBm' : 'N/A'}</span></p>
                    <p class="mb-1"><strong>Status OLT:</strong> ${isOnline ? '<span class="text-success fw-bold">Online</span>' : '<span class="text-danger fw-bold">Offline / LOS</span>'}</p>
                    <p class="mb-0 text-danger" title="Status de potência ou Causa de Queda"><strong>Últ. Queda:</strong> ${motivoQueda}</p>
                </div>
            </div>
        `;
    } catch(e) {
        container.innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Falha ao sincronizar porta da OLT.</p>';
    }
}

async function verHistoricoPppoe(username) {
    const tbody = document.getElementById('tbody-historico-pppoe');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="spinner-border spinner-border-sm me-2"></span>Buscando relatório no IXC...</td></tr>';
    
    const modal = new bootstrap.Modal(document.getElementById('modalHistoricoPPPOE'));
    modal.show();

    try {
        const res = await fetch(`/api/v5/abertura-OS/historico-conexao/${encodeURIComponent(username)}`);
        const history = await res.json();
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Nenhum registro de conexão encontrado.</td></tr>';
            return;
        }

        let html = '';
        history.forEach(h => {
            const up = h.acctinputoctets ? formatBytes(h.acctinputoctets) : '0 B';
            const down = h.acctoutputoctets ? formatBytes(h.acctoutputoctets) : '0 B';
            const tempo = formatarTempoSessao(h.acctsessiontime);

            html += `<tr>
                <td class="fw-bold">${h.framedipaddress || 'N/A'}</td>
                <td>${h.callingstationid || 'N/A'}</td>
                <td>${h.acctstarttime || 'N/A'}</td>
                <td>${h.acctstoptime || '<span class="text-success fw-bold">Sessão Ativa</span>'}</td>
                <td>${tempo}</td>
                <td><i class="bi bi-arrow-up-short text-primary"></i> ${up} <br> <i class="bi bi-arrow-down-short text-success"></i> ${down}</td>
                <td class="${h.acctterminatecause ? 'text-danger' : ''}">${h.acctterminatecause || '---'}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar histórico.</td></tr>';
    }
}

async function limparMacPppoe(id_login) {
    if(!confirm('Deseja realmente limpar o MAC e derrubar o bloqueio deste PPPoE?')) return;
    try {
        await fetch('/api/v5/abertura-OS/limpar-mac', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id_login})
        });
        alert('MAC limpo com sucesso! Peça para o cliente reiniciar o roteador.');
    } catch(e) { alert('Erro ao limpar MAC.'); }
}

async function desconectarPppoe(id_login) {
    if(!confirm('Atenção: Isso forçará a queda da conexão do cliente. Continuar?')) return;
    try {
        await fetch('/api/v5/abertura-OS/desconectar', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id_login})
        });
        alert('Comando de desconexão (Kick) enviado à NAS com sucesso!');
    } catch(e) { alert('Erro ao desconectar cliente.'); }
}

function formatBytes(bytes) {
    if (!+bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatarTempoSessao(segundos) {
    if (!segundos || segundos == 0) return '0s';
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    let res = [];
    if(d > 0) res.push(`${d}d`);
    if(h > 0) res.push(`${h}h`);
    if(m > 0) res.push(`${m}m`);
    return res.join(' ') || `${segundos}s`;
}

async function buscarAtendimentosAbertos(id_cliente) {
    const card = document.getElementById('card-atendimentos-abertos');
    const lista = document.getElementById('lista-atendimentos-abertos');
    
    card.classList.add('d-none');
    lista.innerHTML = '<div class="text-center small text-muted my-3"><span class="spinner-border spinner-border-sm me-2"></span>Buscando chamados abertos...</div>';

    try {
        const res = await fetch(`/api/v5/abertura-OS/atendimentos-abertos/${id_cliente}`);
        const atendimentos = await res.json();

        if (atendimentos.length > 0) {
            card.classList.remove('d-none');
            lista.innerHTML = '';
            
            atendimentos.forEach(t => {
                const dataAbertura = t.data_criacao || 'N/A';
                const titulo = t.titulo || 'Atendimento Sem Título';
                let statusBadge = `<span class="badge bg-warning text-dark">${t.status || 'Aberto'}</span>`;
                
                const div = document.createElement('div');
                div.className = 'p-3 bg-white border border-warning rounded shadow-sm';
                div.style.cursor = 'pointer';
                div.dataset.ticket = JSON.stringify(t);
                
                div.onclick = function() {
                    abrirModalTicket(JSON.parse(this.dataset.ticket));
                };

                div.innerHTML = `
                    <div class="d-flex justify-content-between mb-2">
                        <span class="fw-bold text-dark small">#${t.id}</span>
                        ${statusBadge}
                    </div>
                    <p class="mb-2 text-primary fw-bold small text-truncate" title="${titulo}">${titulo}</p>
                    <div class="d-flex justify-content-between align-items-center border-top pt-2">
                        <span class="text-muted" style="font-size: 0.70rem;"><i class="bi bi-calendar me-1"></i>${dataAbertura}</span>
                        <span class="text-secondary small fw-bold" style="font-size: 0.75rem;">Ver O.S. <i class="bi bi-arrow-right"></i></span>
                    </div>
                `;
                lista.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Erro ao buscar atendimentos abertos:", e);
    }
}

async function abrirModalTicket(ticket) {
    document.getElementById('modal-ticket-id').textContent = ticket.id;
    document.getElementById('modal-ticket-assunto').textContent = ticket.titulo || 'N/A';
    document.getElementById('modal-ticket-data').textContent = ticket.data_criacao || 'N/A';
    
    let msg = ticket.menssagem || ticket.mensagem || 'Sem mensagem descritiva.';
    msg = msg.replace(/(<([^>]+)>)/gi, " ");
    document.getElementById('modal-ticket-mensagem').textContent = msg;

    const tbody = document.getElementById('tbody-ticket-oss');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Buscando O.S. vinculadas...</td></tr>';

    const modal = new bootstrap.Modal(document.getElementById('modalDetalhesTicket'));
    modal.show();

    try {
        const res = await fetch(`/api/v5/abertura-OS/atendimento-oss/${ticket.id}`);
        const oss = await res.json();

        if (oss.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted fst-italic py-4">Nenhuma Ordem de Serviço (O.S.) foi criada para este atendimento.</td></tr>';
            return;
        }

        let html = '';
        oss.forEach(os => {
            let statusBadge = `<span class="badge bg-secondary">${os.status}</span>`;
            if (os.status === 'F') statusBadge = '<span class="badge bg-success">Finalizado</span>';
            else if (os.status === 'RAG') statusBadge = '<span class="badge bg-danger">Reagendar</span>';
            else if (os.status === 'A' || os.status === 'EN' || os.status === 'AG') statusBadge = '<span class="badge bg-warning text-dark">Em Andamento</span>';
            
            let resposta = os.mensagem_resposta || os.mensagem || '---';
            resposta = resposta.replace(/(<([^>]+)>)/gi, " ");
            const respostaTruncada = resposta.length > 80 ? resposta.substring(0, 80) + '...' : resposta;

            const dataAgendada = os.data_agenda ? os.data_agenda.substring(0, 16) : 'N/A';
            const dataFechamento = os.data_fechamento ? os.data_fechamento.substring(0, 16) : 'N/A';

            html += `<tr>
                <td class="fw-bold text-primary">#${os.id}</td>
                <td>${statusBadge}</td>
                <td>${dataAgendada}</td>
                <td class="${os.status === 'F' ? 'text-success fw-bold' : ''}">${os.status === 'F' ? dataFechamento : '---'}</td>
                <td title="${resposta}"><span class="d-inline-block text-truncate" style="max-width: 300px;">${respostaTruncada}</span></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar o histórico de O.S. do IXC.</td></tr>';
    }
}

function redirecionarAgendamento() {
    if (!ultimoTicketGerado) return;
    window.location.href = `/agendamento?os=${ultimoTicketGerado}&origem=intranet`;
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