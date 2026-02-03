/* javascripts/cadastro-redeNeutra.js */

let modalCadastro = null;
let modalONU = null;
let modalEditar = null;
let modalSuporte = null;
let parceiroIdSelecionado = null;
let loginAtualId = null;
let nomeAtual = null;

document.addEventListener('DOMContentLoaded', function() {
    modalCadastro = new bootstrap.Modal(document.getElementById('modalCadastroCliente'));
    modalONU = new bootstrap.Modal(document.getElementById('modalGerenciarONU'));
    modalEditar = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
    modalSuporte = new bootstrap.Modal(document.getElementById('suporteModal'));

    $('#rn-cpf').inputmask('999.999.999-99');
    $('#rn-telefone').inputmask('(99) 99999-9999');
    $('#rn-cep').inputmask('99999-999');
    $('#edit-cep').inputmask('99999-999');
    
    $('#onu-mac').on('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    setupListeners();
    carregarParceiros();
    carregarPlanosRedeNeutra();
    initializeThemeAndUserInfo();
});

function setupListeners() {
    document.getElementById('select-parceiro').addEventListener('change', function(e) {
        parceiroIdSelecionado = e.target.value;
        const btnNovo = document.getElementById('btn-novo-cliente');
        
        const optionParceiro = e.target.options[e.target.selectedIndex];
        const valorFixo = parseFloat(optionParceiro.dataset.valorFixo);
        
        const displayValor = (valorFixo && valorFixo > 0) 
            ? `R$ ${valorFixo.toFixed(2)}` 
            : 'N/A';
        document.getElementById('stats-valor-fixo').textContent = displayValor;

        const selectPlanos = document.getElementById('rn-plano');
        const opcoesPlanos = selectPlanos.querySelectorAll('option');

        opcoesPlanos.forEach(opt => {
            if (opt.value === "") return;

            const precoOriginal = parseFloat(opt.dataset.precoOriginal);
            const nomeExibicao = opt.dataset.nome;
            let precoFinal = 0;

            if (valorFixo && valorFixo > 0) {
                precoFinal = valorFixo;
            } else {
                precoFinal = precoOriginal;
            }

            opt.textContent = `${nomeExibicao} (R$ ${precoFinal.toFixed(2)})`;
            opt.dataset.valor = precoFinal; 
        });
        if (parceiroIdSelecionado) {
            btnNovo.disabled = false;
            carregarCarteiraClientes(parceiroIdSelecionado);
        } else {
            btnNovo.disabled = true;
            document.getElementById('painel-clientes').style.display = 'none';
        }
    });

    document.getElementById('btn-novo-cliente').addEventListener('click', () => {
        resetFormCadastro();
        modalCadastro.show();
    });

    document.getElementById('btn-salvar-sem-onu').addEventListener('click', () => salvarNovoCliente(false));
    document.getElementById('btn-salvar-com-onu').addEventListener('click', () => salvarNovoCliente(true));

    document.getElementById('btn-salvar-edicao').addEventListener('click', salvarEdicaoCliente);
    
    document.getElementById('btn-abrir-gerenciar-onu').addEventListener('click', function() {
        if(!loginAtualId) { alert("Sem Login vinculado para gerenciar ONU."); return; }
        abrirModalONU(loginAtualId, nomeAtual, "Edição", document.getElementById('edit-mac-atual').value);
    });

    document.getElementById('btn-autorizar-onu').addEventListener('click', autorizarONU);
    document.getElementById('btn-desautorizar-onu').addEventListener('click', desautorizarONU);
    
    $('#rn-cep').on('blur', () => buscarEnderecoPorCEP('rn'));
    $('#edit-cep').on('blur', () => buscarEnderecoPorCEP('edit'));
}

async function carregarParceiros() {
    const select = document.getElementById('select-parceiro');
    select.innerHTML = '<option value="" selected disabled>Carregando...</option>';

    try {
        const response = await fetch('/api/v5/rede_neutra/parceiros');
        const parceiros = await response.json();

        select.innerHTML = '<option value="" selected disabled>Selecione o Parceiro / Provedor</option>';
        
        if (parceiros.length === 0) {
            select.add(new Option("Nenhum parceiro Rede Neutra ativo encontrado.", ""));
            return;
        }

        parceiros.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id; 
            option.textContent = `${p.nome} (Contrato: ${p.ixc_contrato_id})`;
            option.dataset.valorFixo = p.valor_fixo; 
            select.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Erro ao carregar parceiros</option>';
    }
}

async function carregarCarteiraClientes(parceiroId) {
    const painel = document.getElementById('painel-clientes');
    const loading = document.getElementById('loading-clientes');
    const tbody = document.getElementById('tabela-clientes-body');
    const empty = document.getElementById('empty-clientes');
    const tableContainer = document.querySelector('.table-responsive');
    const statsTotal = document.getElementById('stats-total-clientes');

    painel.style.display = 'block';
    loading.style.display = 'block';
    tableContainer.style.display = 'none';
    empty.style.display = 'none';
    tbody.innerHTML = '';
    statsTotal.textContent = '0';

    try {
        const response = await fetch(`/api/v5/rede_neutra/clientes/${parceiroId}`);
        const carteira = await response.json();

        loading.style.display = 'none';

        if (!carteira || carteira.length === 0) {
            empty.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        statsTotal.textContent = carteira.length;
        
        carteira.forEach(item => {
            let statusBadge = '';
            
            if (!item.ixc_login_id) {
                statusBadge = `<span class="badge bg-secondary">Sem Login</span>`;
            } else if (item.onu_mac && item.onu_mac.length > 5) {
                statusBadge = `<span class="badge bg-success" title="MAC: ${item.onu_mac}"><i class="bi bi-check-circle"></i> Online</span>`;
            } else {
                statusBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> Aguardando ONU</span>`;
            }

            let descricaoVisual = item.descricao_produto || '---';
            if (item.token) {
                descricaoVisual = descricaoVisual.replace(new RegExp('^' + item.token + '-?'), '');
            } else {
                descricaoVisual = descricaoVisual.replace(/^[A-Z0-9]{5}-/, '');
            }

            const valor = item.valor ? parseFloat(item.valor).toFixed(2) : '0.00';
            
            const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-';

            const tr = document.createElement('tr');
            
            const dadosJson = JSON.stringify(item).replace(/"/g, '&quot;');

            tr.innerHTML = `
                <td>
                    <div class="fw-bold text-primary">${descricaoVisual}</div>
                    <small class="text-muted">${item.login_pppoe || ''}</small>
                </td>
                <td>${dataCriacao}</td>
                <td>R$ ${valor}</td>
                <td>${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1 btn-editar-cliente" 
                        data-cliente="${dadosJson}">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-editar-cliente').forEach(btn => {
            btn.addEventListener('click', function() {
                const dados = JSON.parse(this.dataset.cliente);
                abrirModalEditar(dados);
            });
        });

    } catch (error) {
        console.error(error);
        loading.style.display = 'none';
        alert('Erro ao carregar carteira de clientes.');
    }
}

function abrirModalEditar(cliente) {
    document.getElementById('edit-id').value = cliente.id;
    document.getElementById('edit-token').value = cliente.token;
    document.getElementById('edit-login-id-ixc').value = cliente.ixc_login_id || '';
    document.getElementById('edit-mac-atual').value = cliente.onu_mac || '';
    
    loginAtualId = cliente.ixc_login_id;
    nomeAtual = cliente.descricao_produto;

    let tokenVisual = cliente.token;
    let descSemToken = cliente.descricao_produto || "";

    const matchToken = descSemToken.match(/^([A-Z0-9]{5})-(.*)/);
    
    if (matchToken) {
        tokenVisual = matchToken[1];
        descSemToken = matchToken[2];
    } else if (tokenVisual) {
        descSemToken = descSemToken.replace(new RegExp('^' + tokenVisual + '-?'), '');
    }
    
    document.getElementById('edit-prefixo-token').textContent = tokenVisual + '-';
    document.getElementById('edit-descricao').value = descSemToken;
    
    document.getElementById('edit-login').value = cliente.login_pppoe;
    document.getElementById('edit-status').value = cliente.ativo;
    document.getElementById('edit-obs').value = cliente.obs || '';
    document.getElementById('edit-cep').value = cliente.cep || '';
    document.getElementById('edit-endereco').value = cliente.endereco || '';
    document.getElementById('edit-numero').value = cliente.numero || '';
    document.getElementById('edit-bairro').value = cliente.bairro || '';

    const displayOnu = document.getElementById('display-status-onu');
    displayOnu.innerHTML = `<div class="d-flex align-items-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Carregando...</div>`;

    modalEditar.show();

    if (cliente.ixc_login_id) {
        carregarDetalhesONU(cliente.ixc_login_id);
    } else {
        displayOnu.innerHTML = `<div class="alert alert-secondary py-2 small mb-0">Sem Login IXC.</div>`;
    }
}

async function carregarDetalhesONU(loginId) {
    const displayOnu = document.getElementById('display-status-onu');
    if (!displayOnu.querySelector('.card')) {
        displayOnu.innerHTML = `
            <div class="d-flex justify-content-center align-items-center text-muted" style="min-height: 100px;">
                <div class="spinner-border spinner-border-sm me-2"></div> Buscando informações...
            </div>
        `;
    }

    try {
        const response = await fetch(`/api/v5/rede_neutra/onu-detalhes/${loginId}`);
        const dados = await response.json();

        let html = '';
        
        if (dados.mac && dados.mac.length > 5) {
            html += `<div class="mb-2 text-center"><span class="badge bg-success w-100 py-2 fs-6"><i class="bi bi-check-circle me-2"></i>AUTORIZADA</span></div>`;
        } else {
            html += `<div class="mb-2 text-center"><span class="badge bg-warning text-dark w-100 py-2 fs-6"><i class="bi bi-exclamation-triangle me-2"></i>PENDENTE</span></div>`;
        }

        const onlineBadge = dados.online === 'S' 
            ? `<span class="badge bg-success rounded-pill">Online</span>` 
            : `<span class="badge bg-danger rounded-pill">Offline</span>`;

        let corSinalRx = 'text-muted';
        const rx = parseFloat(dados.sinal_rx);
        if(!isNaN(rx)) {
            if(rx >= -25 && rx <= -15) corSinalRx = 'text-success fw-bold';
            else if(rx < -27) corSinalRx = 'text-danger fw-bold';
            else corSinalRx = 'text-warning fw-bold';
        }

        const refreshBtn = `<button type="button" class="btn btn-sm btn-link text-decoration-none p-0 ms-auto" id="btn-refresh-onu" title="Atualizar informações"><i class="bi bi-arrow-clockwise fs-5"></i></button>`;

        html += `
        <div class="card mb-3 border-light bg-light">
            <div class="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-1">
                <span class="small fw-bold text-muted">Diagnóstico</span>
                ${refreshBtn}
            </div>
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                    <strong>Status:</strong> ${onlineBadge}
                </div>
                <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                    <span>Sinal RX:</span> <span class="${corSinalRx}">${dados.sinal_rx} dBm</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span>Sinal TX:</span> <span>${dados.sinal_tx} dBm</span>
                </div>
                <div class="text-end mt-1"><small class="text-muted" style="font-size: 0.7em">Leitura: ${dados.data_sinal}</small></div>
            </div>
        </div>`;

        html += `
        <h6 class="text-uppercase text-muted fw-bold mb-2 small">Informações Técnicas</h6>
        <div class="table-responsive">
            <table class="table table-sm table-borderless small mb-0">
                <tbody>
                    <tr><td class="text-muted">MAC:</td> <td class="font-monospace text-end select-all">${dados.mac || '-'}</td></tr>
                    <tr><td class="text-muted">Transmissor:</td> <td class="text-end fw-bold text-primary text-truncate" style="max-width: 140px;" title="${dados.id_transmissor}">${dados.id_transmissor}</td></tr>
                    <tr><td class="text-muted">Modelo:</td> <td class="text-end">${dados.onu_tipo}</td></tr>
                    <tr><td class="text-muted">User VLAN:</td> <td class="text-end fw-bold text-primary">${dados.user_vlan}</td></tr>
                    <tr><td class="text-muted">PON ID:</td> <td class="text-end">${dados.ponid}</td></tr>
                    <tr><td class="text-muted">ONU Nº:</td> <td class="text-end">${dados.onu_numero}</td></tr>
                    <tr><td class="text-muted">Temp/Volt:</td> <td class="text-end">${dados.temperatura} °C / ${dados.voltagem} V</td></tr>
                    <tr><td class="text-muted">Caixa FTTH:</td> <td class="text-end">${dados.id_caixa_ftth} (Porta ${dados.porta_ftth})</td></tr>
                </tbody>
            </table>
        </div>`;

        displayOnu.innerHTML = html;

        document.getElementById('btn-refresh-onu').addEventListener('click', function(e) {
            e.preventDefault();
            carregarDetalhesONU(loginId);
        });

        document.getElementById('edit-mac-atual').value = dados.mac || '';

    } catch (e) {
        console.error(e);
        displayOnu.innerHTML = `<div class="alert alert-danger small p-2">Erro ao carregar dados da ONU. <button class="btn btn-sm btn-link" onclick="carregarDetalhesONU(${loginId})">Tentar novamente</button></div>`;
    }
}

function atualizarInterfaceONU(dados, loginId) {
    const displayOnu = document.getElementById('display-status-onu');
    let html = '';
    
    if (dados.mac && dados.mac.length > 5) {
        html += `<div class="mb-2 text-center"><span class="badge bg-success w-100 py-2 fs-6"><i class="bi bi-check-circle me-2"></i>AUTORIZADA</span></div>`;
    } else {
        html += `<div class="mb-2 text-center"><span class="badge bg-warning text-dark w-100 py-2 fs-6"><i class="bi bi-exclamation-triangle me-2"></i>PENDENTE</span></div>`;
    }

    const onlineBadge = dados.online === 'S' 
        ? `<span class="badge bg-success rounded-pill">Online</span>` 
        : `<span class="badge bg-danger rounded-pill">Offline</span>`;

    let corSinalRx = 'text-muted';
    const rx = parseFloat(dados.sinal_rx);
    if(!isNaN(rx)) {
        if(rx >= -25 && rx <= -15) corSinalRx = 'text-success fw-bold';
        else if(rx < -27) corSinalRx = 'text-danger fw-bold';
        else corSinalRx = 'text-warning fw-bold';
    }

    const refreshBtn = `<button type="button" class="btn btn-sm btn-link text-decoration-none p-0 ms-auto" id="btn-refresh-onu" title="Atualizar em Tempo Real"><i class="bi bi-arrow-clockwise fs-5"></i></button>`;

    html += `
    <div class="card mb-3 border-light bg-light">
        <div class="card-header bg-transparent border-bottom d-flex justify-content-between align-items-center py-1">
            <span class="small fw-bold text-muted">Diagnóstico</span>
            ${refreshBtn}
        </div>
        <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                <strong>Status:</strong> ${onlineBadge}
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                <span>Sinal RX:</span> <span class="${corSinalRx}" id="val-rx">${dados.sinal_rx} dBm</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span>Sinal TX:</span> <span id="val-tx">${dados.sinal_tx} dBm</span>
            </div>
            <div class="text-end mt-1"><small class="text-muted" style="font-size: 0.7em">Ref: ${dados.data_sinal || 'Agora'}</small></div>
        </div>
    </div>`;

    html += `
    <h6 class="text-uppercase text-muted fw-bold mb-2 small">Informações Técnicas</h6>
    <div class="table-responsive">
        <table class="table table-sm table-borderless small mb-0">
            <tbody>
                <tr><td class="text-muted">MAC:</td> <td class="font-monospace text-end select-all">${dados.mac || '-'}</td></tr>
                <tr><td class="text-muted">Transmissor:</td> <td class="text-end fw-bold text-primary text-truncate" style="max-width: 140px;" title="${dados.id_transmissor}">${dados.id_transmissor || '-'}</td></tr>
                <tr><td class="text-muted">Modelo:</td> <td class="text-end">${dados.onu_tipo || '-'}</td></tr>
                <tr><td class="text-muted">User VLAN:</td> <td class="text-end fw-bold text-primary">${dados.user_vlan || '-'}</td></tr>
                <tr><td class="text-muted">PON ID:</td> <td class="text-end">${dados.ponid || '-'}</td></tr>
                <tr><td class="text-muted">ONU Nº:</td> <td class="text-end">${dados.onu_numero || '-'}</td></tr>
                <tr><td class="text-muted">Temp/Volt:</td> <td class="text-end"><span id="val-temp">${dados.temperatura || '-'}</span> °C / <span id="val-volt">${dados.voltagem || '-'}</span> V</td></tr>
            </tbody>
        </table>
    </div>`;

    displayOnu.innerHTML = html;

    document.getElementById('btn-refresh-onu').addEventListener('click', async function(e) {
        e.preventDefault();
        const btn = this;
        const icon = btn.querySelector('i');
        
        icon.classList.add('spinner-border', 'spinner-border-sm');
        icon.classList.remove('bi', 'bi-arrow-clockwise');
        btn.disabled = true;

        try {
            const res = await fetch('/api/v5/rede_neutra/refresh-onu', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id_login: loginId })
            });
            const newData = await res.json();
            
            if(newData.success) {
                const dadosMesclados = { ...dados, ...newData };
                atualizarInterfaceONU(dadosMesclados, loginId);
            } else {
                alert('Falha ao atualizar dados da OLT.');
            }
        } catch(err) {
            console.error(err);
            alert('Erro de comunicação.');
        } finally {
            if(document.contains(btn)) {
                icon.classList.remove('spinner-border', 'spinner-border-sm');
                icon.classList.add('bi', 'bi-arrow-clockwise');
                btn.disabled = false;
            }
        }
    });
}

async function salvarEdicaoCliente() {
    const btn = document.getElementById('btn-salvar-edicao');
    const originalText = btn.innerHTML;
    
    const id = document.getElementById('edit-id').value;
    const token = document.getElementById('edit-token').value;
    const descSemToken = document.getElementById('edit-descricao').value.trim();
    const login = document.getElementById('edit-login').value.trim();
    const status = document.getElementById('edit-status').value;
    const obs = document.getElementById('edit-obs').value;
    const cep = document.getElementById('edit-cep').value;
    const endereco = document.getElementById('edit-endereco').value;
    const numero = document.getElementById('edit-numero').value;
    const bairro = document.getElementById('edit-bairro').value;

    if (!descSemToken || !login) {
        alert("Descrição e Login são obrigatórios.");
        return;
    }

    const descricaoCompleta = `${token}-${descSemToken}`;

    btn.disabled = true;
    btn.innerHTML = 'Salvando...';

    try {
        const response = await fetch(`/api/v5/rede_neutra/cliente/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descricao_produto: descricaoCompleta,
                login_pppoe: login,
                status_ativo: status,
                obs: obs,
                cep: cep,
                endereco: endereco,
                numero: numero,
                bairro: bairro
            })
        });

        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Erro ao atualizar');

        modalEditar.hide();
        carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function salvarNovoCliente(autorizarOnu = false) {
    const form = document.getElementById('form-cadastro-rn');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const btnId = autorizarOnu ? 'btn-salvar-com-onu' : 'btn-salvar-sem-onu';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    
    document.getElementById('btn-salvar-sem-onu').disabled = true;
    document.getElementById('btn-salvar-com-onu').disabled = true;
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

    const selectPlano = document.getElementById('rn-plano');
    const planoOption = selectPlano.options[selectPlano.selectedIndex];

    const payload = {
        parceiro_id: document.getElementById('select-parceiro').value,
        cod_cliente_parceiro: document.getElementById('rn-cod-cliente-parceiro').value.trim(),
        caixa_atendimento: document.getElementById('rn-caixa-atendimento').value.trim(),
        porta: document.getElementById('rn-porta').value.trim(),
        cep: document.getElementById('rn-cep').value,
        endereco: document.getElementById('rn-endereco').value,
        numero: document.getElementById('rn-numero').value,
        bairro: document.getElementById('rn-bairro').value,
        plano_id: selectPlano.value,
        plano_nome: planoOption.dataset.nome,
        plano_nome_original: planoOption.dataset.originalName,
        plano_valor: planoOption.dataset.valor
    };

    try {
        const response = await fetch('/api/v5/rede_neutra/cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Erro ao salvar');

        modalCadastro.hide();
        carregarCarteiraClientes(payload.parceiro_id);

        if (autorizarOnu && result.ixc_login_id) {
            abrirModalONU(result.ixc_login_id, result.login, "Novo Contrato", "");
        } else {
            alert(`Cliente Cadastrado com Sucesso!\nLogin: ${result.login}`);
        }

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        document.getElementById('btn-salvar-sem-onu').disabled = false;
        document.getElementById('btn-salvar-com-onu').disabled = false;
        btn.innerHTML = originalText;
    }
}

function abrirModalONU(idLoginIxc, nome, infoExtra, macAtual) {
    if (!idLoginIxc) {
        alert("Erro: Produto sem ID de login vinculado.");
        return;
    }

    loginAtualId = idLoginIxc;
    nomeAtual = nome;

    document.getElementById('onu-cliente-nome').textContent = nome;
    document.getElementById('onu-contrato-id').textContent = infoExtra;
    
    const inputMac = document.getElementById('onu-mac');
    const statusDiv = document.getElementById('onu-status-display');
    const btnAutorizar = document.getElementById('btn-autorizar-onu');
    const btnDesautorizar = document.getElementById('btn-desautorizar-onu');

    inputMac.value = macAtual || '';
    
    if (macAtual && macAtual.length > 5) {
        statusDiv.className = 'p-2 border rounded bg-success text-white fw-bold';
        statusDiv.innerHTML = `<i class="bi bi-check-circle-fill"></i> AUTORIZADA`;
        inputMac.disabled = true;
        btnAutorizar.style.display = 'none';
        btnDesautorizar.style.display = 'block';
    } else {
        statusDiv.className = 'p-2 border rounded bg-warning text-dark fw-bold';
        statusDiv.innerHTML = 'PENDENTE';
        inputMac.disabled = false;
        btnAutorizar.style.display = 'block';
        btnDesautorizar.style.display = 'none';
    }

    modalONU.show();
}

async function autorizarONU() {
    const mac = document.getElementById('onu-mac').value.trim();
    if (mac.length < 6) {
        alert('Informe um Serial ou MAC válido.');
        return;
    }

    const btn = document.getElementById('btn-autorizar-onu');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Processando...';

    try {
        const response = await fetch('/api/v5/rede_neutra/autorizar-onu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ixc_login_id: loginAtualId, mac: mac })
        });
        
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Erro ao autorizar');

        alert('ONU Autorizada com sucesso!');
        
        document.getElementById('edit-mac-atual').value = mac;
        carregarDetalhesONU(loginAtualId); 
        const displayOnu = document.getElementById('display-status-onu');
        if(displayOnu) {
             displayOnu.innerHTML = `<span class="badge bg-success p-2 w-100"><i class="bi bi-check-circle me-1"></i> Autorizada</span><div class="small text-center mt-1 font-monospace">${mac}</div>`;
        }

        modalONU.hide();
        carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function desautorizarONU() {
    if (!confirm(`Tem certeza que deseja remover a ONU? O cliente ficará offline.`)) return;

    const btn = document.getElementById('btn-desautorizar-onu');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Processando...';

    try {
        const response = await fetch('/api/v5/rede_neutra/desautorizar-onu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ixc_login_id: loginAtualId })
        });

        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Erro ao desvincular');

        alert('ONU removida com sucesso.');
        
        document.getElementById('edit-mac-atual').value = "";
        carregarDetalhesONU(loginAtualId);
        const displayOnu = document.getElementById('display-status-onu');
        if(displayOnu) {
             displayOnu.innerHTML = `<span class="badge bg-warning text-dark p-2 w-100"><i class="bi bi-exclamation-triangle me-1"></i> Pendente</span>`;
        }

        modalONU.hide();
        carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function carregarPlanosRedeNeutra() {
    const select = document.getElementById('rn-plano');
    select.innerHTML = '<option value="" selected disabled>Carregando planos...</option>';

    try {
        const response = await fetch('/api/v5/rede_neutra/produtos');
        const planos = await response.json();

        select.innerHTML = '<option value="" selected disabled>Selecione o plano...</option>';
        
        if (planos.length === 0) {
            select.add(new Option("Nenhum plano Rede Neutra encontrado no IXC.", ""));
            return;
        }

        planos.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            
            option.dataset.precoOriginal = p.preco; 
            option.dataset.nome = p.nome_exibicao;
            option.dataset.originalName = p.nome_original;
            
            option.dataset.valor = p.preco; 
            
            option.textContent = `${p.nome_exibicao} (R$ ${parseFloat(p.preco).toFixed(2)})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Erro ao carregar planos</option>';
    }
}

function resetFormCadastro() {
    const form = document.getElementById('form-cadastro-rn');
    form.reset();
    form.classList.remove('was-validated');
    
    document.getElementById('rn-endereco').readOnly = true;
    document.getElementById('rn-bairro').readOnly = true;
    
    document.getElementById('rn-cod-cliente-parceiro').readOnly = false;
    document.getElementById('rn-cod-cliente-parceiro').disabled = false;
    
    document.getElementById('rn-caixa-atendimento').readOnly = false;
    document.getElementById('rn-caixa-atendimento').disabled = false;
    
    document.getElementById('rn-porta').readOnly = false;
    document.getElementById('rn-porta').disabled = false;
}

async function buscarEnderecoPorCEP(prefixoId = 'rn') {
    const cepInput = document.getElementById(`${prefixoId}-cep`);
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) return;

    const elEndereco = document.getElementById(`${prefixoId}-endereco`);
    const elBairro = document.getElementById(`${prefixoId}-bairro`);
    const elNumero = document.getElementById(`${prefixoId}-numero`);

    elEndereco.value = "Buscando...";
    elBairro.value = "Buscando...";
    elEndereco.readOnly = true;
    elBairro.readOnly = true;

    try {
        const response = await fetch(`/api/v5/geo/cep-lookup?cep=${cep}`);
        if (response.ok) {
            const data = await response.json();
            if (data.rua && data.bairro) {
                preencherCamposEndereco(prefixoId, data.rua, data.bairro);
                return;
            }
        }
    } catch (e) { console.warn("API Interna falhou, tentando externa..."); }

    try {
        const responseVia = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dataVia = await responseVia.json();
        if (!dataVia.erro) {
            preencherCamposEndereco(prefixoId, dataVia.logradouro, dataVia.bairro);
            return;
        }
    } catch (e) { console.warn("ViaCEP falhou."); }

    elEndereco.value = "";
    elBairro.value = "";
    elEndereco.readOnly = false;
    elBairro.readOnly = false;
    elEndereco.focus();
    alert("CEP não encontrado. Por favor, preencha o endereço manualmente.");
}

function preencherCamposEndereco(prefixoId, rua, bairro) {
    const elEndereco = document.getElementById(`${prefixoId}-endereco`);
    const elBairro = document.getElementById(`${prefixoId}-bairro`);
    const elNumero = document.getElementById(`${prefixoId}-numero`);

    elEndereco.value = rua || '';
    elBairro.value = bairro || '';

    elEndereco.readOnly = (rua && rua.trim() !== '');
    elBairro.readOnly = (bairro && bairro.trim() !== '');

    if (elNumero) {
        elNumero.readOnly = false;
        elNumero.focus();
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