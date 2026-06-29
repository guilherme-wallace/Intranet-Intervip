// javascripts/abertura-OS.js
let clienteAtual = null;
let ultimoTicketGerado = null;
let contratoAtual = null;
let ticketAtualDetalhes = null;
let anexoPendente = null;
let anexoOrigemModalTicket = false;
let dadosEdicaoOriginais = null;
let criandoAtendimento = false;

const TERMOS_ASSUNTOS_OCULTOS_ABERTURA = [
    'INSTALACAO',
    'ATIVACAO',
    'MUDANCA DE ENDERECO',
    'ALTERACAO DE TITULARIDADE',
    'RAZAO SOCIAL',
    'NAO USAR'
];

function normalizarTextoAbertura(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function deveOcultarAssuntoAbertura(assunto) {
    const nome = normalizarTextoAbertura(assunto?.titulo || assunto?.assunto || assunto?.descricao || assunto?.nome || '');
    return TERMOS_ASSUNTOS_OCULTOS_ABERTURA.some(termo => nome.includes(termo));
}

function traduzirStatusContrato(status) {
    const mapa = { P: 'Pré-contrato', A: 'Ativo', I: 'Inativo', N: 'Negativado', D: 'Desistiu' };
    const s = String(status || '').toUpperCase();
    return mapa[s] ? `${mapa[s]} (${s})` : (s ? `Desconhecido (${s})` : 'Não informado');
}

function traduzirStatusAcesso(status) {
    const mapa = { A: 'Ativo', D: 'Desativado', CM: 'Bloqueio Manual', CA: 'Bloqueio Automático', FA: 'Financeiro em atraso', AA: 'Aguardando Assinatura' };
    const s = String(status || '').toUpperCase();
    return mapa[s] ? `${mapa[s]} (${s})` : (s ? `Desconhecido (${s})` : 'Não informado');
}

function simNao(valor) {
    const v = String(valor || '').toUpperCase();
    if (v === 'S') return 'Sim';
    if (v === 'N') return 'Não';
    return 'Não informado';
}

function montarContatosCliente(cliente) {
    const contatos = cliente?.contatos || {};
    return [
        ['Telefone residencial', contatos.fone],
        ['Telefone comercial', contatos.telefone_comercial],
        ['Telefone celular', contatos.telefone_celular],
        ['WhatsApp', contatos.whatsapp],
        ['E-mail', contatos.email],
        ['Contato', contatos.contato]
    ].filter(([, valor]) => valor).map(([label, valor]) => `${label}: ${valor}`).join(' | ') || 'Nenhum contato cadastrado';
}

function traduzirMotivoOnu(motivo) {
    const raw = String(motivo || '').trim();
    const normalizado = raw.toUpperCase();
    if (!raw) return '---';
    if (normalizado.includes('DYING-GASP') || normalizado.includes('DYING GASP')) return 'Falha elétrica';
    if (normalizado === 'LOS' || normalizado.includes('LOS') || normalizado.includes('LOBI')) return 'Perda do Sinal Óptico';
    return raw;
}

function classeSinalOnu(valor) {
    const numero = Math.abs(parseFloat(String(valor || '').replace(',', '.')));
    if (!Number.isFinite(numero) || numero === 0) return 'text-muted';
    if (numero > 30) return 'text-danger fw-bold';
    if (numero >= 28) return 'text-warning fw-bold';
    return 'text-success fw-bold';
}

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
    document.getElementById('select-login-atendimento')?.addEventListener('change', atualizarStatusLoginAtendimento);

    document.getElementById('btn-gerar-os').addEventListener('click', gerarOS);
    
    document.getElementById('btn-confirmar-tarefa').addEventListener('click', processarAvancoTarefa);
    document.getElementById('btn-editar-cliente-contrato')?.addEventListener('click', abrirModalEditarClienteContrato);
    document.getElementById('btn-salvar-edicao-cliente')?.addEventListener('click', salvarEdicaoClienteContrato);
    document.getElementById('btn-anexar-arquivo')?.addEventListener('click', abrirModalAnexo);
    document.getElementById('btn-anexar-arquivo-ticket')?.addEventListener('click', abrirModalAnexo);
    document.getElementById('btn-enviar-anexo')?.addEventListener('click', enviarAnexoAtendimento);
    document.getElementById('area-boletos-contrato')?.addEventListener('click', tratarCliqueBoletos);
});

async function carregarAssuntosIXC() {
    try {
        const response = await fetch('/api/v5/abertura-OS/assuntos');
        const assuntos = await response.json();
        if (!response.ok) throw new Error(assuntos.error || 'Falha ao carregar assuntos.');
        const select = document.getElementById('select-assunto');
        
        select.innerHTML = '<option value="">Selecione o assunto...</option>';

        assuntos.filter(a => !deveOcultarAssuntoAbertura(a)).forEach(a => {
            const nome = a.titulo || a.assunto || a.descricao || a.nome || `Assunto #${a.id}`;
            const option = document.createElement('option');
            option.value = a.id;
            option.dataset.assunto = a.id;
            option.dataset.processo = a.id_wfl_processo || '';
            option.dataset.processoDescricao = a.processo || '';
            option.dataset.departamento = a.id_setor || a.id_departamento || '4';
            option.textContent = a.id_wfl_processo ? nome : `${nome} (sem processo vinculado)`;
            select.appendChild(option);
        });
    } catch (e) {
        document.getElementById('select-assunto').innerHTML = '<option value="">Erro ao carregar assuntos</option>';
    }
}

async function realizarBusca(termo) {
    if (!termo) return;
    termo = termo.trim();

    if (/[a-zA-Z]/.test(termo)) {
        showInfoModal("Busca inválida! Digite apenas o Código do cliente, CPF ou CNPJ.");
        document.getElementById('input-busca-cliente').value = '';
        return;
    }
    
    const btn = document.getElementById('btn-buscar-cliente');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;
    document.getElementById('painel-detalhes-tecnicos').style.display = 'none';
    contratoAtual = null;
    atualizarSeletorLoginAtendimento(null);

    try {
        const response = await fetch(`/api/v5/abertura-OS/busca-cliente/${encodeURIComponent(termo)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Cliente não encontrado.");

        clienteAtual = data;
        buscarAtendimentosAbertos(data.id);

        document.getElementById('display-nome-cliente').textContent = data.nome || 'N/A';
        const elTelefone = document.getElementById('display-telefone-cliente');
        if (elTelefone) elTelefone.innerHTML = `<i class="bi bi-telephone-fill me-1"></i>${montarContatosCliente(data)}`;

        const formTriagem = document.getElementById('form-triagem');
        const alertaInativo = document.getElementById('alerta-cliente-inativo');
        const selectContrato = document.getElementById('select-contrato');
        const cardsContratos = document.getElementById('cards-contratos-cliente');
        selectContrato.innerHTML = '';
        if (cardsContratos) cardsContratos.innerHTML = '';
        contratoAtual = null;
        atualizarSeletorLoginAtendimento(null);
        
        if (data.contratos && data.contratos.length > 0) {
            alertaInativo.classList.add('d-none');
            formTriagem.style.display = 'block';
            selectContrato.disabled = false;

            data.contratos.forEach(c => {
                selectContrato.add(new Option(`Contrato ${c.id} - ${c.plano.nome} - ${traduzirStatusContrato(c.status)}`, c.id));
            });
            if (data.contratos.length > 1) {
                selectContrato.selectedIndex = -1;
                document.getElementById('painel-detalhes-tecnicos').style.display = 'none';
                renderizarCardsContratos(data.contratos);
            } else {
                selectContrato.value = data.contratos[0].id;
                if (cardsContratos) cardsContratos.innerHTML = '';
                window.renderizarDetalhesContrato(data.contratos[0].id);
            }
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
        showInfoModal(error.message);
        const card = document.getElementById('card-diagnostico');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        clienteAtual = null;
    } finally {
        btn.innerHTML = '<i class="bi bi-search"></i>';
        btn.disabled = false;
    }
}

function obterLoginsContrato(contrato) {
    if (Array.isArray(contrato?.logins) && contrato.logins.length > 0) return contrato.logins;
    if (contrato?.login?.id) {
        return [{
            id: contrato.login.id,
            login: contrato.login.user || '',
            ativo: true
        }];
    }
    return [];
}

function atualizarSeletorLoginAtendimento(contrato) {
    const area = document.getElementById('area-login-atendimento');
    const select = document.getElementById('select-login-atendimento');
    const status = document.getElementById('status-login-atendimento');
    if (!area || !select || !status) return;

    select.innerHTML = '';
    const logins = obterLoginsContrato(contrato).filter(login => login.ativo !== false && login.id);
    area.classList.remove('d-none');

    if (!contrato) {
        select.add(new Option('Selecione um contrato primeiro', ''));
        select.disabled = true;
        status.textContent = 'O login será carregado após a seleção do contrato.';
        status.className = 'form-text text-muted';
        return;
    }

    if (logins.length === 0) {
        select.add(new Option('Nenhum login vinculado localizado', ''));
        select.disabled = true;
        status.textContent = 'Não foi encontrado login vinculado ao contrato selecionado.';
        status.className = 'form-text text-danger fw-bold';
        return;
    }

    select.disabled = false;
    if (logins.length > 1) select.add(new Option('Selecione o login correto...', ''));
    logins.forEach(login => {
        const option = new Option(login.login || `Login IXC #${login.id}`, login.id);
        option.dataset.login = login.login || '';
        select.add(option);
    });
    if (logins.length === 1) select.value = String(logins[0].id);
    atualizarStatusLoginAtendimento();
}

function atualizarStatusLoginAtendimento() {
    const select = document.getElementById('select-login-atendimento');
    const status = document.getElementById('status-login-atendimento');
    if (!select || !status || !select.value) {
        if (status && !select?.disabled) {
            status.textContent = 'Selecione o login vinculado a este atendimento.';
            status.className = 'form-text text-warning fw-bold';
        }
        return;
    }
    const login = select.options[select.selectedIndex]?.dataset.login || select.options[select.selectedIndex]?.text || '';
    status.textContent = `Login vinculado: ${login}`;
    status.className = 'form-text text-success fw-bold';
}

window.renderizarDetalhesContrato = function(contratoId) {
    if (!clienteAtual || !clienteAtual.contratos) return;
    const c = clienteAtual.contratos.find(x => String(x.id) === String(contratoId));
    if (!c) return;
    contratoAtual = c;
    atualizarSeletorLoginAtendimento(c);
    document.getElementById('painel-detalhes-tecnicos').style.display = 'flex';
    document.querySelectorAll('.card-contrato-opcao').forEach(card => {
        card.classList.toggle('border-primary', String(card.dataset.contratoId) === String(contratoId));
        card.classList.toggle('shadow', String(card.dataset.contratoId) === String(contratoId));
    });

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
    
    document.getElementById('det-plano-status').innerHTML = `
        <span class="badge bg-success">${traduzirStatusContrato(c.status || c.plano.status)}</span>
        <span class="badge bg-primary ms-1">Acesso: ${traduzirStatusAcesso(c.status_internet)}</span>
        <span class="badge bg-secondary ms-1">Bloqueio automático: ${simNao(c.bloqueio_automatico)}</span>
    `;

    carregarBoletosContrato(c.id);

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
                <button class="btn btn-sm btn-outline-success fw-bold" id="btn-desbloqueio-confianca" data-contratoid="${c.id}"><i class="bi bi-unlock"></i> Desbloqueio de Confiança</button>
                <button class="btn btn-sm btn-outline-warning fw-bold text-dark" id="btn-limpar-mac" data-loginid="${c.login.id}"><i class="bi bi-eraser"></i> Limpar MAC</button>
                <button class="btn btn-sm btn-outline-danger fw-bold" id="btn-desconectar" data-loginid="${c.login.id}"><i class="bi bi-plug"></i> Desconectar</button>
                ${c.onu && c.onu.id ? `<button class="btn btn-sm btn-outline-info fw-bold" id="btn-reiniciar-onu" data-onuid="${c.onu.id}"><i class="bi bi-arrow-clockwise"></i> Reiniciar ONU</button>
                <button class="btn btn-sm btn-outline-dark fw-bold" id="btn-liberar-web-onu" data-onuid="${c.onu.id}"><i class="bi bi-globe"></i> Liberar web ONU</button>` : ''}
            </div>

            <div id="onu-realtime-container" class="mt-3 pt-3 border-top">
                <p class="text-muted small mb-0"><span class="spinner-border spinner-border-sm me-2"></span>Sincronizando diagnóstico da OLT em tempo real...</p>
            </div>
        `;

        document.getElementById('btn-relatorio-pppoe').addEventListener('click', function() { verHistoricoPppoe(this.dataset.user); });
        document.getElementById('btn-desbloqueio-confianca').addEventListener('click', function() { desbloqueioConfianca(this.dataset.contratoid); });
        document.getElementById('btn-limpar-mac').addEventListener('click', function() { limparMacPppoe(this.dataset.loginid); });
        document.getElementById('btn-desconectar').addEventListener('click', function() { desconectarPppoe(this.dataset.loginid); });
        document.getElementById('btn-reiniciar-onu')?.addEventListener('click', function() { reiniciarOnu(this.dataset.onuid); });
        document.getElementById('btn-liberar-web-onu')?.addEventListener('click', function() { liberarWebOnu(this.dataset.onuid); });

        if (c.onu && c.onu.id) {
            buscarOnuRealtime(c.onu.id);
        } else {
            document.getElementById('onu-realtime-container').innerHTML = '<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Equipamento ONU de Fibra não localizado no IXC.</p>';
        }

    } else {
        pppoeArea.innerHTML = '<p class="text-muted fst-italic">Nenhum login PPPoE localizado para este contrato.</p>';
    }
};

function renderizarCardsContratos(contratos) {
    const container = document.getElementById('cards-contratos-cliente');
    if (!container) return;
    container.innerHTML = contratos.map(c => {
        const contatoBasico = montarContatosCliente(clienteAtual);
        return `
            <div class="col-md-6">
                <button type="button" class="card-contrato-opcao btn text-start w-100 h-100 border rounded bg-white p-3" data-contrato-id="${c.id}">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div class="fw-bold text-primary">Contrato #${c.id}</div>
                        <span class="badge bg-light text-dark border">${traduzirStatusContrato(c.status)}</span>
                    </div>
                    <div class="small mt-2"><strong>Plano:</strong> ${c.plano?.nome || 'Não informado'}</div>
                    <div class="small"><strong>Acesso:</strong> ${traduzirStatusAcesso(c.status_internet)}</div>
                    <div class="small"><strong>Bloqueio automático:</strong> ${simNao(c.bloqueio_automatico)}</div>
                    <div class="small text-muted mt-2">${c.endereco_completo || 'Endereço não informado'}</div>
                    <div class="small text-muted text-truncate mt-1">${contatoBasico}</div>
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.card-contrato-opcao').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.contratoId;
            document.getElementById('select-contrato').value = id;
            window.renderizarDetalhesContrato(id);
        });
    });
}

async function abrirModalEditarClienteContrato() {
    if (!clienteAtual || !contratoAtual) {
        return showInfoModal('Busque um cliente e selecione um contrato antes de editar.', 'Contrato obrigatório', 'warning');
    }

    try {
        const res = await fetch(`/api/v5/abertura-OS/dados-edicao/${clienteAtual.id}/${contratoAtual.id}`);
        const dados = await res.json();
        if (!res.ok) throw new Error(dados.error || 'Não foi possível buscar dados atuais.');

        const cliente = dados.cliente || {};
        const contrato = dados.contrato || {};
        const endereco = dados.endereco || contrato;
        document.getElementById('edit-cliente-id').value = clienteAtual.id;
        document.getElementById('edit-contrato-id').value = contratoAtual.id;
        document.getElementById('edit-fone').value = cliente.fone || '';
        document.getElementById('edit-telefone-comercial').value = cliente.telefone_comercial || '';
        document.getElementById('edit-telefone-celular').value = cliente.telefone_celular || '';
        document.getElementById('edit-whatsapp').value = cliente.whatsapp || '';
        document.getElementById('edit-email').value = cliente.email || '';
        document.getElementById('edit-contato').value = cliente.contato || '';
        document.getElementById('edit-endereco').value = endereco.endereco || '';
        document.getElementById('edit-numero').value = endereco.numero || '';
        document.getElementById('edit-bairro').value = endereco.bairro || '';
        document.getElementById('edit-cidade').value = endereco.cidade || '';
        document.getElementById('edit-cep').value = endereco.cep || '';
        document.getElementById('edit-complemento').value = endereco.complemento || '';
        document.getElementById('edit-referencia').value = endereco.referencia || '';
        dadosEdicaoOriginais = coletarDadosEdicao();
        dadosEdicaoOriginais.endereco_origem = dados.endereco_origem || 'contrato';

        new bootstrap.Modal(document.getElementById('modalEditarClienteContrato')).show();
    } catch (e) {
        showInfoModal('Erro ao abrir edição: ' + e.message, 'Erro', 'danger');
    }
}

async function salvarEdicaoClienteContrato() {
    const atual = coletarDadosEdicao();
    const erroValidacao = validarDadosEdicao(atual);
    if (erroValidacao) return showInfoModal(erroValidacao, 'Campos inválidos', 'warning');
    const alteracoesCliente = montarAlteracoes(atual, dadosEdicaoOriginais, ['fone', 'telefone_comercial', 'telefone_celular', 'whatsapp', 'email', 'contato']);
    const alteracoesEndereco = montarAlteracoes(atual, dadosEdicaoOriginais, ['endereco', 'numero', 'bairro', 'cidade', 'cep', 'complemento', 'referencia']);
    const camposLimpados = Object.entries({ ...alteracoesCliente, ...alteracoesEndereco })
        .filter(([campo, valor]) => valor === '' && String(dadosEdicaoOriginais?.[campo] || '').trim() !== '')
        .map(([campo]) => campo);
    // Mantem a validação antiga inativa; o fluxo atual salva apenas campos alterados.
    const endereco = 'alteracao-parcial';
    const bairro = 'alteracao-parcial';
    if (!endereco || !bairro) return showInfoModal('Endereço e bairro são obrigatórios.', 'Campos obrigatórios', 'warning');

    if (!Object.keys(alteracoesCliente).length && !Object.keys(alteracoesEndereco).length) {
        return showInfoModal('Nenhuma alteração encontrada para salvar.', 'Sem alterações', 'info');
    }

    if (camposLimpados.length) {
        const confirmarLimpeza = await showConfirmModal(
            `Você limpou ${camposLimpados.length} campo(s). Confirma salvar esses campos vazios?`,
            'Confirmar campos vazios',
            'warning',
            'Salvar mesmo assim',
            'Revisar'
        );
        if (!confirmarLimpeza) return;
    }

    const btn = document.getElementById('btn-salvar-edicao-cliente');
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';
    btn.disabled = true;

    try {
        const payload = {
            cliente_id: document.getElementById('edit-cliente-id').value,
            contrato_id: document.getElementById('edit-contrato-id').value,
            cliente: alteracoesCliente,
            endereco: alteracoesEndereco,
            endereco_origem: dadosEdicaoOriginais?.endereco_origem || 'contrato',
            usuario_logado: window.usuarioLogado
        };
        payload.numero = atual.numero;
        const res = await fetch('/api/v5/abertura-OS/cliente-contrato', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || 'Falha ao salvar dados.');

        clienteAtual.contatos = { ...(clienteAtual.contatos || {}), ...alteracoesCliente };
        contratoAtual.endereco_completo = [
            atual.endereco,
            payload.numero ? `Nº ${payload.numero}` : '',
            atual.bairro ? `Bairro: ${atual.bairro}` : '',
            atual.complemento ? `Comp: ${atual.complemento}` : '',
            atual.referencia ? `Ref: ${atual.referencia}` : ''
        ].filter(Boolean).join(' | ');

        document.getElementById('display-telefone-cliente').innerHTML = `<i class="bi bi-telephone-fill me-1"></i>${montarContatosCliente(clienteAtual)}`;
        window.renderizarDetalhesContrato(contratoAtual.id);
        bootstrap.Modal.getInstance(document.getElementById('modalEditarClienteContrato'))?.hide();
        showInfoModal('Dados atualizados com sucesso.', 'Sucesso', 'success');
    } catch (e) {
        showInfoModal('Erro ao salvar edição: ' + e.message, 'Erro', 'danger');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

function coletarDadosEdicao() {
    return {
        fone: document.getElementById('edit-fone').value.trim(),
        telefone_comercial: document.getElementById('edit-telefone-comercial').value.trim(),
        telefone_celular: document.getElementById('edit-telefone-celular').value.trim(),
        whatsapp: document.getElementById('edit-whatsapp').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        contato: document.getElementById('edit-contato').value.trim(),
        endereco: document.getElementById('edit-endereco').value.trim(),
        numero: document.getElementById('edit-numero').value.trim(),
        bairro: document.getElementById('edit-bairro').value.trim(),
        cidade: document.getElementById('edit-cidade').value.trim(),
        cep: document.getElementById('edit-cep').value.trim(),
        complemento: document.getElementById('edit-complemento').value.trim(),
        referencia: document.getElementById('edit-referencia').value.trim()
    };
}

function montarAlteracoes(atual, original, campos) {
    return campos.reduce((acc, campo) => {
        if (String(atual[campo] || '') !== String(original?.[campo] || '')) acc[campo] = atual[campo] || '';
        return acc;
    }, {});
}

function validarDadosEdicao(dados) {
    const telefoneOk = /^[\d\s()+.-]*$/;
    const cepOk = /^[\d.-]*$/;
    const numeroOk = /^[\w\s./-]*$/;
    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return 'Informe um e-mail válido.';
    for (const campo of ['fone', 'telefone_comercial', 'telefone_celular', 'whatsapp']) {
        if (dados[campo] && !telefoneOk.test(dados[campo])) return 'Telefones devem conter apenas números e sinais comuns.';
    }
    if (dados.cep && !cepOk.test(dados.cep)) return 'CEP deve conter apenas números, ponto ou hífen.';
    if (dados.numero && !numeroOk.test(dados.numero)) return 'Numero deve conter apenas letras, numeros e sinais comuns.';
    return '';
}

function montarContextoInternoAbertura(assuntoTexto, observacao, idProcesso, idAssunto, loginSelecionado) {
    const contatos = clienteAtual?.contatos || {};
    return {
        usuario_logado: window.usuarioLogado || '',
        processo: {
            id: idProcesso,
            descricao: document.getElementById('select-assunto')?.selectedOptions?.[0]?.dataset.processoDescricao || ''
        },
        assunto: {
            id: idAssunto,
            titulo: assuntoTexto || ''
        },
        cliente: {
            id: clienteAtual?.id || '',
            nome: clienteAtual?.nome || '',
            contatos: {
                fone: contatos.fone || '',
                telefone_comercial: contatos.telefone_comercial || '',
                telefone_celular: contatos.telefone_celular || '',
                whatsapp: contatos.whatsapp || '',
                email: contatos.email || '',
                contato: contatos.contato || ''
            }
        },
        contrato: contratoAtual ? {
            id: contratoAtual.id || '',
            endereco_completo: contratoAtual.endereco_completo || '',
            condominio: contratoAtual.condominio || '',
            plano_nome: contratoAtual.plano?.nome || '',
            status: traduzirStatusContrato(contratoAtual.status || contratoAtual.plano?.status),
            status_acesso: traduzirStatusAcesso(contratoAtual.status_internet),
            bloqueio_automatico: simNao(contratoAtual.bloqueio_automatico)
        } : {},
        tecnico: contratoAtual ? {
            login: loginSelecionado?.nome || contratoAtual.login?.user || '',
            id_login: loginSelecionado?.id || '',
            status: contratoAtual.login?.status || '',
            ultima_queda: contratoAtual.login?.ultima_queda || '',
            motivo_queda: contratoAtual.login?.motivo_queda || '',
            onu_id: contratoAtual.onu?.id || '',
            onu_mac: contratoAtual.onu?.mac || '',
            onu_status: contratoAtual.onu?.status || '',
            sinal_rx: contratoAtual.onu?.sinal_rx || '',
            sinal_tx: contratoAtual.onu?.sinal_tx || ''
        } : {},
        observacao_triagem: observacao || ''
    };
}

async function carregarBoletosContrato(idContrato) {
    const area = document.getElementById('area-boletos-contrato');
    if (!area || !idContrato) return;
    area.innerHTML = '<p class="text-muted mb-0"><span class="spinner-border spinner-border-sm me-1"></span>Consultando boletos...</p>';
    try {
        const res = await fetch(`/api/v5/abertura-OS/boletos/${idContrato}`);
        const boletos = await res.json();
        if (!res.ok) throw new Error(boletos.error || 'Falha ao consultar boletos.');
        if (!Array.isArray(boletos) || boletos.length === 0) {
            area.innerHTML = '<p class="text-success fw-bold mb-0"><i class="bi bi-check-circle me-1"></i>Nenhum boleto em aberto localizado.</p>';
            return;
        }
        area.innerHTML = boletos.map(b => `
            <div class="border rounded bg-white p-2 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                    <span class="fw-bold text-primary">Boleto #${b.id}</span>
                    <span class="text-muted ms-2">Venc.: ${formatarDataBoleto(b.vencimento)}</span>
                    <span class="fw-bold ms-2">R$ ${formatarValorBoleto(b.valor)}</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold btn-enviar-boleto" data-boleto-id="${b.id}">
                    <i class="bi bi-envelope me-1"></i>Enviar segunda via por e-mail
                </button>
            </div>
        `).join('');
    } catch (e) {
        area.innerHTML = `<p class="text-danger mb-0">Erro ao consultar boletos: ${e.message}</p>`;
    }
}

function tratarCliqueBoletos(e) {
    const btn = e.target.closest('.btn-enviar-boleto');
    if (btn) enviarSegundaViaBoleto(btn.dataset.boletoId);
}

async function enviarSegundaViaBoleto(boletoId) {
    if (!(await showConfirmModal('Enviar segunda via deste boleto por e-mail?', 'Segunda via', 'question'))) return;
    try {
        const res = await fetch('/api/v5/abertura-OS/boletos/enviar-segunda-via', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boleto_id: boletoId, usuario_logado: window.usuarioLogado })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || 'Falha ao enviar segunda via.');
        showInfoModal('Segunda via solicitada por e-mail com sucesso.', 'Sucesso', 'success');
    } catch (e) {
        showInfoModal('Erro ao enviar segunda via: ' + e.message, 'Erro', 'danger');
    }
}

async function reiniciarOnu(idOnu) {
    if (!idOnu) return showInfoModal('ONU não localizada para este contrato.', 'ONU', 'warning');
    if (!(await showConfirmModal('Reiniciar a ONU deste cliente agora?', 'Reiniciar ONU', 'warning'))) return;
    await executarAcaoOnu('/api/v5/abertura-OS/onu/reiniciar', idOnu, 'Comando de reinício enviado com sucesso.');
}

async function liberarWebOnu(idOnu) {
    if (!idOnu) return showInfoModal('ONU não localizada para este contrato.', 'ONU', 'warning');
    if (!(await showConfirmModal('Liberar acesso web da ONU deste cliente?', 'Acesso web ONU', 'warning'))) return;
    await executarAcaoOnu('/api/v5/abertura-OS/onu/liberar-web', idOnu, 'Acesso web da ONU liberado com sucesso.');
}

async function executarAcaoOnu(url, idOnu, msgSucesso) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_onu: idOnu, usuario_logado: window.usuarioLogado })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || 'Falha ao executar ação na ONU.');
        showInfoModal(msgSucesso, 'Sucesso', 'success');
    } catch (e) {
        showInfoModal('Erro na ação da ONU: ' + e.message, 'Erro', 'danger');
    }
}

function abrirModalAnexo() {
    anexoOrigemModalTicket = Boolean(ticketAtualDetalhes?.id && !ultimoTicketGerado);
    if (anexoOrigemModalTicket) bootstrap.Modal.getInstance(document.getElementById('modalDetalhesTicket'))?.hide();
    document.getElementById('anexo-descricao').value = '';
    document.getElementById('anexo-arquivo').value = '';
    new bootstrap.Modal(document.getElementById('modalAnexarArquivo')).show();
}

async function enviarAnexoAtendimento() {
    const ticketId = ultimoTicketGerado || ticketAtualDetalhes?.id || '';
    const descricao = document.getElementById('anexo-descricao').value.trim();
    const arquivo = document.getElementById('anexo-arquivo').files[0];
    if (!ticketId && arquivo) {
        if (arquivo.size > 8 * 1024 * 1024) return showInfoModal('Arquivo acima de 8 MB.', 'Arquivo muito grande', 'warning');
        anexoPendente = { descricao: descricao || arquivo.name, arquivo };
        bootstrap.Modal.getInstance(document.getElementById('modalAnexarArquivo'))?.hide();
        return showInfoModal('Arquivo guardado. Ele será anexado automaticamente após o IXC criar o atendimento.', 'Anexo pendente', 'info');
    }
    if (!ticketId && !arquivo) return showInfoModal('Selecione um arquivo para deixar pendente até o atendimento ser criado.', 'Arquivo obrigatório', 'warning');
    if (!ticketId) return showInfoModal('Informe o ID do atendimento.', 'Atendimento obrigatório', 'warning');
    if (!arquivo) return showInfoModal('Selecione um arquivo para anexar.', 'Arquivo obrigatório', 'warning');
    if (arquivo.size > 8 * 1024 * 1024) return showInfoModal('Arquivo acima de 8 MB.', 'Arquivo muito grande', 'warning');

    const form = new FormData();
    form.append('id_ticket', ticketId);
    form.append('descricao', descricao || arquivo.name);
    form.append('usuario_logado', window.usuarioLogado || '');
    form.append('local_arquivo', arquivo);

    const btn = document.getElementById('btn-enviar-anexo');
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/v5/abertura-OS/anexar-arquivo', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || 'Falha ao enviar anexo.');
        bootstrap.Modal.getInstance(document.getElementById('modalAnexarArquivo'))?.hide();
        showInfoModal('Arquivo anexado com sucesso.', 'Sucesso', 'success');
    } catch (e) {
        showInfoModal('Erro ao anexar arquivo: ' + e.message, 'Erro', 'danger');
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

async function enviarAnexoParaTicket(ticketId, descricao, arquivo) {
    const form = new FormData();
    form.append('id_ticket', ticketId);
    form.append('descricao', descricao || arquivo.name);
    form.append('usuario_logado', window.usuarioLogado || '');
    form.append('local_arquivo', arquivo);

    const res = await fetch('/api/v5/abertura-OS/anexar-arquivo', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || 'Falha ao enviar anexo.');
    return data;
}

function formatarDataBoleto(valor) {
    if (!valor) return '---';
    const str = String(valor).substring(0, 10);
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : str;
}

function formatarValorBoleto(valor) {
    const n = Number(String(valor || '0').replace(',', '.'));
    return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0,00';
}

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
    if (criandoAtendimento) return;
    if (!clienteAtual) return showInfoModal("Busque e selecione um cliente primeiro.");

    const selectAssunto = document.getElementById('select-assunto');
    const assuntoTexto = selectAssunto.options[selectAssunto.selectedIndex]?.text; 
    const id_departamento = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.departamento;
    const id_assunto = selectAssunto.value;
    const id_processo = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.processo;
    const selectLogin = document.getElementById('select-login-atendimento');
    const id_login = selectLogin?.value || '';
    const loginNome = selectLogin?.options[selectLogin.selectedIndex]?.dataset.login
        || selectLogin?.options[selectLogin.selectedIndex]?.text
        || '';
    const id_contrato = document.getElementById('select-contrato').value;
    const observacao = document.getElementById('obs-triagem').value;

    if (clienteAtual.contratos && clienteAtual.contratos.length > 1 && !id_contrato) {
        return showInfoModal('Selecione o contrato correto antes de continuar.', 'Contrato obrigatório', 'warning');
    }

    if (!id_assunto) return showInfoModal('Selecione o assunto do atendimento.', 'Assunto obrigatório', 'warning');
    if (!id_processo) {
        return showInfoModal('O assunto selecionado não possui processo vinculado. Verifique a configuração no IXC.', 'Processo não configurado', 'warning');
    }
    if (!id_login) {
        const mensagemLogin = selectLogin?.disabled
            ? 'Não foi encontrado login vinculado ao contrato selecionado.'
            : 'Selecione ou confirme o login vinculado ao contrato antes de abrir o atendimento.';
        return showInfoModal(mensagemLogin, 'Login obrigatório', 'warning');
    }
    
    if (!observacao) return showInfoModal("Preencha as observações da triagem.");

    const checkboxes = document.querySelectorAll('#checklist-items input[type="checkbox"]');
    for (let chk of checkboxes) {
        if (!chk.checked) return showInfoModal("Por favor, confirme todos os itens do checklist obrigatório.");
    }

    const btn = document.getElementById('btn-gerar-os');
    criandoAtendimento = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando Atendimento...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/v5/abertura-OS/criar-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: clienteAtual.id,
                contrato_id: id_contrato || null,
                id_departamento: id_departamento,
                id_assunto: id_assunto,
                id_wfl_processo: id_processo,
                id_processo: id_processo,
                id_login: id_login,
                login_nome: loginNome,
                observacao: observacao,
                titulo: assuntoTexto,
                usuario_logado: window.usuarioLogado || '',
                contexto_interno: montarContextoInternoAbertura(
                    assuntoTexto,
                    observacao,
                    id_processo,
                    id_assunto,
                    { id: id_login, nome: loginNome }
                )
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        ultimoTicketGerado = data.ticket_id;
        
        const spanTicket = document.getElementById('sucesso-ticket-id');
        if (spanTicket) {
            spanTicket.textContent = ultimoTicketGerado;
        }
        const spanProtocolo = document.getElementById('sucesso-ticket-protocolo');
        if (spanProtocolo) {
            spanProtocolo.textContent = data.protocolo || '';
        }
        const avisoInterno = document.getElementById('aviso-mensagem-interna-abertura');
        if (avisoInterno) {
            avisoInterno.textContent = data.aviso_mensagem_interna || '';
            avisoInterno.classList.toggle('d-none', !data.aviso_mensagem_interna);
        }
        if (anexoPendente) {
            try {
                await enviarAnexoParaTicket(ultimoTicketGerado, anexoPendente.descricao, anexoPendente.arquivo);
                anexoPendente = null;
            } catch (erroAnexo) {
                showInfoModal('Chamado criado, mas o anexo não foi enviado: ' + erroAnexo.message, 'Anexo pendente', 'warning');
            }
        }
        
        carregarTarefasProcesso(id_processo);
        
        const modalElement = document.getElementById('modalDecisaoAgendamento');
        const modalDecisao = new bootstrap.Modal(modalElement);
        modalDecisao.show();

    } catch (error) {
        showInfoModal("Erro ao criar chamado: " + error.message);
    } finally {
        criandoAtendimento = false;
        btn.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Continuar';
        btn.disabled = false;
    }
}

async function carregarTarefasProcesso(id_processo) {
    const container = document.getElementById('lista-tarefas-processo');
    container.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando tarefas do fluxo...</div>';
    
    try {
        const response = await fetch('/api/v5/abertura-OS/tarefas/' + id_processo + '/undefined');
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
                <div class="form-check border rounded p-3 bg-white shadow-sm d-flex align-items-center mb-2 card-tarefa-wfl" style="cursor: pointer; transition: 0.2s;">
                    <input class="form-check-input ms-1 me-3 fs-5" type="radio" name="tarefa_wfl" id="tarefa-${t.id}" value="${t.id}" data-setor="${t.id_setor}" data-nome="${t.descricao}" ${checked}>
                    <label class="form-check-label w-100 fw-bold text-dark d-flex align-items-center m-0" for="tarefa-${t.id}" style="cursor: pointer; pointer-events: none;">
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
    const selectedTarefa = document.querySelector('input[name="tarefa_wfl"]:checked');
    if (!selectedTarefa) return showInfoModal('Selecione uma etapa para avançar!');

    const nomeTarefa = selectedTarefa.getAttribute('data-nome') || '';

    const btn = document.getElementById('btn-confirmar-tarefa');
    const conteudoOriginal = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
    btn.disabled = true;

    let payload = {};

    if (window.osParaTramitar) {
        let msg = await showPromptModal("Digite uma mensagem de encaminhamento/resolução:", "Encaminhado para setor responsável via Intranet");
        if (msg === null) {
            btn.innerHTML = conteudoOriginal;
            btn.disabled = false;
            return;
        }
        
        payload = {
            os_id: window.osParaTramitar.id,
            id_tarefa: selectedTarefa.value,
            mensagem: msg,
            usuario_logado: window.usuarioLogado
        };
    }
    else {
        const obsElement = document.getElementById('obs-triagem');
        const relatoOriginal = obsElement ? obsElement.value : '';
        
        const msgEncaminhamento = relatoOriginal 
            ? `Informações do chamado: ${relatoOriginal}\n---\nEncaminhado para a etapa: ${nomeTarefa}` 
            : `Atendimento triado e encaminhado para a etapa: ${nomeTarefa}`;

        payload = {
            ticket_id: ultimoTicketGerado,
            id_tarefa: selectedTarefa.value,
            mensagem: msgEncaminhamento,
            usuario_logado: window.usuarioLogado
        };
    }

    try {
        const response = await fetch('/api/v5/abertura-OS/avancar-tarefa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        window.osParaTramitar = null;
        
        const isVisita = nomeTarefa.toUpperCase().includes('VISITA');
        //console.log('Tarefa avançada com sucesso. Verificando próxima ação para etapa:', nomeTarefa);

        if (isVisita) {
            const idReferencia = payload.ticket_id || data.ticket_id_retornado;
            window.location.href = `/agendamento?os=${idReferencia}&origem=suporte`;
        } else {
            showInfoModal(`O.S. encaminhada com sucesso para a etapa: ${nomeTarefa}`);
            window.location.reload();
            
            const modalDecisaoEl = document.getElementById('modalDecisaoAgendamento');
            if (modalDecisaoEl) bootstrap.Modal.getInstance(modalDecisaoEl).hide();
            
            if (clienteAtual && clienteAtual.id) {
                buscarAtendimentosAbertos(clienteAtual.id);
            }
            
            btn.innerHTML = conteudoOriginal;
            btn.disabled = false;
        }
        
    } catch (error) {
        showInfoModal("Erro ao avançar etapa: " + error.message);
        btn.innerHTML = conteudoOriginal;
        btn.disabled = false;
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
        const corRx = classeSinalOnu(onu.sinal_rx);
        const corTx = classeSinalOnu(onu.sinal_tx);
        
        const motivoQueda = traduzirMotivoOnu(onu.causa_ultima_queda || onu.causa_queda || onu.motivo_queda || onu.status_potencia || 'Desconhecido');
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
                    <p class="mb-1"><strong>Sinal TX:</strong> <span class="${corTx}">${onu.sinal_tx ? onu.sinal_tx + ' dBm' : 'N/A'}</span></p>
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
                <td class="${h.acctterminatecause ? 'text-danger' : ''}">${traduzirMotivoOnu(h.acctterminatecause)}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar histórico.</td></tr>';
    }
}

async function limparMacPppoe(id_login) {
    if (!(await showConfirmModal('Deseja realmente limpar o MAC e derrubar o bloqueio deste PPPoE?'))) return;
    try {
        const response = await fetch('/api/v5/abertura-OS/limpar-mac', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_login, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Falha ao limpar MAC.');
        showInfoModal('MAC limpo com sucesso! Peça para o cliente reiniciar o roteador.', 'Sucesso', 'success');
    } catch(e) { showInfoModal('Erro ao limpar MAC: ' + e.message, 'Erro', 'danger'); }
}

async function desconectarPppoe(id_login) {
    if (!(await showConfirmModal('Atenção: isso forçará a queda da conexão do cliente. Continuar?', 'Desconectar login', 'warning'))) return;
    try {
        const response = await fetch('/api/v5/abertura-OS/desconectar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id_login, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Falha ao desconectar login.');
        showInfoModal('Comando de desconexão enviado com sucesso.', 'Sucesso', 'success');
    } catch(e) { showInfoModal('Erro ao desconectar cliente: ' + e.message, 'Erro', 'danger'); }
}

async function desbloqueioConfianca(contrato_id) {
    if (!contrato_id) return showInfoModal('Selecione um contrato antes de solicitar desbloqueio.', 'Contrato obrigatório', 'warning');
    if (!(await showConfirmModal('Executar desbloqueio de confiança para este contrato?', 'Desbloqueio de confiança', 'warning'))) return;
    try {
        const response = await fetch('/api/v5/abertura-OS/desbloqueio-confianca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contrato_id, usuario_logado: window.usuarioLogado })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) throw new Error(data.error || 'Falha ao executar desbloqueio.');
        showInfoModal('Desbloqueio de confiança enviado com sucesso.', 'Sucesso', 'success');
    } catch (e) {
        showInfoModal('Erro no desbloqueio de confiança: ' + e.message, 'Erro', 'danger');
    }
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
                
                div.addEventListener('click', function() {
                    abrirModalTicket(JSON.parse(this.dataset.ticket));
                });

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
    ticketAtualDetalhes = ticket;
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
            const statusLabel = os.status_label || os.status || 'Não informado';
            let statusBadge = `<span class="badge bg-secondary">${statusLabel}</span>`;
            if (os.status === 'F') statusBadge = '<span class="badge bg-success">Finalizada</span>';
            else if (os.status === 'C') statusBadge = '<span class="badge bg-secondary">Cancelada</span>';
            else if (os.status === 'RAG') statusBadge = '<span class="badge bg-danger">Reagendar</span>';
            else if (os.status === 'AG' || os.ja_agendada) statusBadge = '<span class="badge bg-primary">Agendada</span>';
            else if (os.status === 'DS') statusBadge = '<span class="badge bg-info text-dark">A caminho</span>';
            else if (os.status === 'EX') statusBadge = '<span class="badge bg-warning text-dark">Em execução</span>';
            else if (os.status === 'A' || os.status === 'EN') statusBadge = '<span class="badge bg-warning text-dark">Aberta</span>';
            if (os.data_agenda_formatada) {
                statusBadge += `<br><span class="badge bg-light text-dark border mt-1"><i class="bi bi-calendar-check me-1"></i>${os.data_agenda_formatada}</span>`;
            }
            
            let resposta = os.mensagem_resposta || os.mensagem || '---';
            resposta = resposta.replace(/(<([^>]+)>)/gi, " ");
            const respostaTruncada = resposta.length > 60 ? resposta.substring(0, 60) + '...' : resposta;

            const nomeSetor = os.nome_setor || '---';

            let acoesHtml = '';
            if (os.status === 'F' || os.status === 'C') {
                acoesHtml = `<span class="text-muted small fw-bold">Finalizada</span>`;
            } else {
                const setoresAgendaveis = ['LOGÍSTICA', 'LOGISTICA', 'MANUTENÇÃO', 'MANUTENCAO', 'INSTALAÇÃO', 'INSTALACAO', 'RECOLHIMENTO'];
                const upperSetor = nomeSetor.toUpperCase();
                const podeAgendar = setoresAgendaveis.some(s => upperSetor.includes(s));

                if (os.ja_agendada) {
                    acoesHtml = `<button class="btn btn-sm btn-outline-primary fw-bold w-100 shadow-sm btn-ver-agendamento" data-agenda="${os.data_agenda_formatada || ''}"><i class="bi bi-calendar-check me-1"></i>Ver agendamento</button>
                    <button class="btn btn-sm btn-warning fw-bold w-100 shadow-sm mt-1 btn-agendar-direto" data-os-id="${os.id}" data-ja-agendada="1" data-agenda="${os.data_agenda_formatada || ''}"><i class="bi bi-calendar2-week me-1"></i>Reagendar</button>`;
                } else if (podeAgendar) {
                    acoesHtml = `<button class="btn btn-sm btn-success fw-bold w-100 shadow-sm btn-agendar-direto" data-os-id="${os.id}"><i class="bi bi-calendar-check me-1"></i>Agendar</button>`;
                } else {
                    acoesHtml = `<button class="btn btn-sm btn-primary fw-bold w-100 shadow-sm btn-tramitar-agendar" data-os='${JSON.stringify(os).replace(/'/g, "&#39;")}'><i class="bi bi-arrow-right-circle me-1"></i>Tramitar / Agendar</button>`;
                }
            }

            html += `<tr>
                <td class="align-middle fw-bold text-primary">#${os.id}<br><small class="text-muted fw-normal">${nomeSetor}</small></td>
                <td class="align-middle">${statusBadge}</td>
                <td class="align-middle small text-truncate" style="max-width: 200px;" title="${resposta}">${respostaTruncada}</td>
                <td class="align-middle text-center" style="min-width: 160px;">${acoesHtml}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Erro ao carregar o histórico de O.S. do IXC.</td></tr>';
    }
}

window.abrirTramiteOS = async function(os) {
    //console.log("[DEBUG TRAMITE] Dados brutos da OS clicada:", os);

    const idProcesso = os.id_wfl_param_os || os.id_wfl_processo || os.id_processo || '0';
    const idTarefaAtual = os.id_wfl_tarefa || os.id_tarefa_atual || os.id_tarefa || '0';

    if (!idProcesso || idProcesso === '0') {
        showInfoModal('Esta O.S. não possui um fluxo de trabalho (Workflow) configurado no IXC. Não é possível tramitar automaticamente.');
        return;
    }

    window.osParaTramitar = {
        ...os,
        wfl_processo_real: idProcesso,
        wfl_tarefa_real: idTarefaAtual
    };

    const spanTicket = document.getElementById('sucesso-ticket-id');
        if (spanTicket) {
            spanTicket.textContent = os.id;
        }
    const tituloModal = document.querySelector('#modalDecisaoAgendamento .modal-body p.fs-5');
    if (tituloModal) tituloModal.innerHTML = `O.S. <strong>#${os.id}</strong> selecionada!`;
    
    const listaWfl = document.getElementById('lista-tarefas-processo');
    listaWfl.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando fluxo...</div>';

    const modalDetalhesEl = document.getElementById('modalDetalhesTicket');
    if (modalDetalhesEl) bootstrap.Modal.getInstance(modalDetalhesEl).hide();
    
    const modalDecisao = new bootstrap.Modal(document.getElementById('modalDecisaoAgendamento'));
    modalDecisao.show();

    try {
        const r = await fetch(`/api/v5/abertura-OS/tarefas/${window.osParaTramitar.wfl_processo_real}/${window.osParaTramitar.wfl_tarefa_real}`);
        const tarefas = await r.json();

        if (tarefas.length > 0) {
            let html = '';
            tarefas.forEach((t, index) => {
                html += `
                    <div class="form-check p-2 border rounded mb-1 bg-white shadow-sm">
                        <input class="form-check-input ms-1" type="radio" name="tarefa_wfl" id="tarefa_${t.id}" value="${t.id}" data-nome="${t.descricao}" ${index === 0 ? 'checked' : ''}>
                        <label class="form-check-label fw-bold ms-2 w-100" style="cursor:pointer;" for="tarefa_${t.id}">
                            ${t.descricao}
                        </label>
                    </div>`;
            });
            listaWfl.innerHTML = html;
        } else {
            listaWfl.innerHTML = '<span class="text-muted small">Nenhuma etapa subsequente localizada.</span>';
        }
    } catch (e) {
        listaWfl.innerHTML = '<span class="text-danger small">Erro ao carregar etapas.</span>';
    }
};

document.addEventListener('click', async function(e) {
    const btnAgendar = e.target.closest('.btn-agendar-direto');
    if (btnAgendar) {
        const osId = btnAgendar.getAttribute('data-os-id');
        if (btnAgendar.getAttribute('data-ja-agendada') === '1') {
            const agenda = btnAgendar.getAttribute('data-agenda') || 'data já preenchida no IXC';
            if (!(await showConfirmModal(`Esta OS já possui agendamento para ${agenda}. Deseja reagendar?`))) return;
        }
        window.location.href = `/agendamento?os=${osId}&origem=suporte`;
        return;
    }

    const btnVerAgenda = e.target.closest('.btn-ver-agendamento');
    if (btnVerAgenda) {
        showInfoModal(`Agendamento atual: ${btnVerAgenda.getAttribute('data-agenda') || 'não localizado'}`);
        return;
    }

    const btnTramitar = e.target.closest('.btn-tramitar-agendar');
    if (btnTramitar) {
        const osDataStr = btnTramitar.getAttribute('data-os');
        if (osDataStr) {
            const osData = JSON.parse(osDataStr);
            if (typeof window.abrirTramiteOS === 'function') {
                window.abrirTramiteOS(osData);
            }
        }
        return;
    }

    const cardTarefa = e.target.closest('.card-tarefa-wfl');
    if (cardTarefa) {
        const radio = cardTarefa.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        return;
    }
});

document.addEventListener('mouseover', function(e) {
    const cardTarefa = e.target.closest('.card-tarefa-wfl');
    if (cardTarefa) cardTarefa.classList.add('bg-light');
});

document.addEventListener('mouseout', function(e) {
    const cardTarefa = e.target.closest('.card-tarefa-wfl');
    if (cardTarefa) cardTarefa.classList.remove('bg-light');
});

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
                showInfoModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
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
