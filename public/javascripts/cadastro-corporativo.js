let bsInfoModal = null;
let bsConfirmModal = null;
let complementoModal = null;
let currentBlocks = [];
let selectedBlock = null;
let bsPlanosModal = null;
let allActivePlans = [];
let tipoConsulta = 'cnpj';
let clienteConsultado = null;
let bsSuporteModal = null;

document.addEventListener('DOMContentLoaded', function() {
    
    const infoModalElement = document.getElementById('infoModal');
    if (infoModalElement) bsInfoModal = new bootstrap.Modal(infoModalElement);
    const confirmModalElement = document.getElementById('confirmModal');
    if (confirmModalElement) bsConfirmModal = new bootstrap.Modal(confirmModalElement);
    const complementoModalElement = document.getElementById('complementoModal');
    if (complementoModalElement) complementoModal = new bootstrap.Modal(complementoModalElement);
    const planosModalElement = document.getElementById('planosModal');
    if (planosModalElement) bsPlanosModal = new bootstrap.Modal(planosModalElement);
    const suporteModalElement = document.getElementById('suporteModal');
    if (suporteModalElement) bsSuporteModal = new bootstrap.Modal(suporteModalElement);

    initializeThemeAndUserInfo();
    loadSellers();
    loadAllActivePlans();
    setupFormValidation();
    setupFieldValidation();
    
    $('#input-documento').inputmask('99.999.999/9999-99');
    
    $('#btn-abrir-modal-suporte').on('click', function() {
        $('#descricao-problema').val('');
        bsSuporteModal.show();
    });

    $('#btn-enviar-suporte').on('click', enviarChamadoSuporte);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_nascimento').setAttribute('max', today);
    $('#whatsapp').inputmask('(99) 99999-9999');
    $('#telefone_celular').inputmask('(99) 99999-9999');
    $('#cep').inputmask('99999-999');
    $('#cep_cliente').inputmask('99999-999');
    $('#input-cep-consulta').inputmask('99999-999');
    
    $('#valor_acordado').inputmask('currency', {
        radixPoint: ",",
        groupSeparator: ".",
        allowMinus: false,
        prefix: 'R$ ',
        digits: 2,
        autoGroup: true,
        rightAlign: false
    });
    $('#numero').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    $('#numero_cliente').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    $('#btn-sem-numero').on('click', function() {
        const input = $('#numero');
        if (input.val() === 'SN') {
            input.val('').prop('readonly', false).focus();
            $(this).removeClass('btn-secondary text-white').addClass('btn-outline-secondary');
        } else {
            input.val('SN').prop('readonly', true).removeClass('is-invalid').addClass('is-valid');
            $(this).removeClass('btn-outline-secondary').addClass('btn-secondary text-white');
        }
        checkFormValidity();
    });

    setupPlanosModalListeners();
    setupModalListeners();
    setupTela1Listeners();

    $('#btn-voltar-consulta').on('click', () => irParaTela('consulta'));
});

function setupPlanosModalListeners() {
    const filtroInput = $('#filtro-planos');
    const displayButton = $('#plano-display-btn');

    displayButton.on('click', function(e) {
        e.preventDefault();
        filtroInput.val('');
        renderPlanosList(allActivePlans);
        bsPlanosModal.show();
    });

    filtroInput.on('keyup', function() {
        const termo = $(this).val().toString().toLowerCase();
        const planosFiltrados = allActivePlans.filter(plano => 
            plano.nome.toLowerCase().includes(termo) || 
            (plano.valor_contrato && plano.valor_contrato.toString().includes(termo))
        );
        renderPlanosList(planosFiltrados);
    });
}

async function loadAllActivePlans() {
    const loadingDiv = $('#loading-planos');
    loadingDiv.show();
    try {
        const response = await fetch('/api/v5/ixc/planos-ativos');
        if (!response.ok) throw new Error('Falha ao buscar planos');
        const allPlans = await response.json();
        allActivePlans = allPlans.filter(plano => 
            plano.nome.toUpperCase().includes("IVP_CORP") ||
            plano.nome.toUpperCase().includes("IVP_ITX") ||
            plano.nome.toUpperCase().includes("IVP_ISP")
        );
        renderPlanosList(allActivePlans);
    } catch (error) {
        console.error("Erro:", error);
    } finally {
        loadingDiv.hide();
    }
}

function renderPlanosList(planos) {
    const lista = $('#lista-planos-modal');
    const planoVazio = $('#plano-vazio');
    lista.empty();
    
    if (!planos || planos.length === 0) {
        planoVazio.show();
        return;
    }
    planoVazio.hide();
    
    planos.forEach(plano => {
        const valor = parseFloat(plano.valor_contrato || 0);
        
        const item = $(`
            <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
               data-id="${plano.id}" data-nome="${plano.nome}" data-valor="${valor}">
                <div class="fw-semibold">${plano.nome}</div>
                <span class="badge bg-primary rounded-pill">R$ ${valor.toFixed(2).replace('.', ',')}</span>
            </a>
        `);
        
        item.on('click', function(e) {
            e.preventDefault();
            selecionarPlano($(this).data('id'), $(this).data('nome'), $(this).data('valor'));
        });
        
        lista.append(item);
    });
}

function selecionarPlano(id, nome, valor) {
    const planoHidden = document.getElementById('plano');
    const planoDisplayBtn = document.getElementById('plano-display-btn');
    const valorContratoInput = $('#valor_contrato');
    
    planoHidden.value = id;
    planoDisplayBtn.textContent = `${nome} (R$ ${parseFloat(valor).toFixed(2).replace('.', ',')})`;
    valorContratoInput.val('').trigger('input');
    
    validateField(planoHidden);
    validateField(planoDisplayBtn);

    bsPlanosModal.hide();
    checkFormValidity();
}

function setupTela1Listeners() {
    $('#btn-toggle-documento').on('click', function() {
        const btn = $(this);
        const input = $('#input-documento');
        
        if (tipoConsulta === 'cnpj') {
            tipoConsulta = 'cpf';
            btn.text('CPF');
            input.attr('placeholder', 'Digite o CPF...').inputmask('999.999.999-99');
        } else {
            tipoConsulta = 'cnpj';
            btn.text('CNPJ');
            input.attr('placeholder', 'Digite o CNPJ...').inputmask('99.999.999/9999-99');
        }
    });
    
    $('#btn-consultar-documento').on('click', consultarClientePorDocumento);
    $('#btn-consultar-endereco').on('click', consultarClientePorEndereco);
    $('#btn-ir-para-cadastro').on('click', function() {
        irParaTela('cadastro');
    });
}

function setupModalListeners() {
    const confirmModalElement = document.getElementById('confirmModal');
    if (confirmModalElement) {
        const closeElements = confirmModalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const submitButton = document.getElementById('btn-finalizar-venda');
                if (submitButton) submitButton.disabled = false;
                checkFormValidity();
                bsConfirmModal.hide();
            });
        });
    }

    const infoModalElement = document.getElementById('infoModal');
    if (infoModalElement) {
        const closeElements = infoModalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                bsInfoModal.hide();
            });
        });

        infoModalElement.addEventListener('hidden.bs.modal', () => {
            if (infoModalElement.dataset.reloadOnClose === 'true') {
                infoModalElement.dataset.reloadOnClose = 'false';
                irParaTela('consulta');
                resetFormularioCompleto();
            }
        });
    }

    const complementoModalElement = document.getElementById('complementoModal');
    if (complementoModalElement) {
        const closeElements = complementoModalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                complementoModal.hide();
            });
        });
    }

    const suporteModalElement = document.getElementById('suporteModal');
    if (suporteModalElement) {
        const closeElements = suporteModalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                bsSuporteModal.hide();
            });
        });
    }

    const planosModalElement = document.getElementById('planosModal');
    if (planosModalElement) {
        const closeElements = planosModalElement.querySelectorAll('.btn-close, [data-bs-dismiss="modal"]');
        closeElements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                bsPlanosModal.hide();
            });
        });
    }
}

async function consultarClientePorDocumento() {
    const documento = $('#input-documento').val();
    if (!$('#input-documento').inputmask('isComplete')) {
        showModal('Atenção', 'Por favor, preencha o documento corretamente.', 'warning');
        return;
    }

    const cleanDoc = documento.replace(/\D/g, '');
    let isValid = false;

    if (tipoConsulta === 'cpf') {
        isValid = validarCPF(cleanDoc);
    } else {
        isValid = validarCNPJ(cleanDoc);
    }

    if (!isValid) {
        showModal('Atenção', `O ${tipoConsulta.toUpperCase()} informado é inválido. Verifique os dígitos e tente novamente.`, 'warning');
        return;
    }

    const loadingDiv = $('#loading-consulta');
    const resultadoDiv = $('#resultado-consulta');
    const btnAcao = $('#bloco-acao-proximo');
    const alertaFinanceiro = $('#alerta-financeiro');
    
    loadingDiv.show();
    resultadoDiv.hide();
    btnAcao.hide();
    alertaFinanceiro.hide();
    clienteConsultado = null;
    
    try {
        const response = await fetch('/api/v5/ixc/consultar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj_cpf: documento })
        });

        if (!response.ok) {
            throw new Error('Falha ao consultar o cliente.');
        }

        const data = await response.json();
        
        loadingDiv.hide();
        resultadoDiv.show();
        btnAcao.show();

        if (data.cliente) {
            clienteConsultado = data.cliente;
            $('#cliente-encontrado').show();
            $('#cliente-nao-encontrado').hide();
            
            $('#cliente-nome').text(data.cliente.razao);
            $('#cliente-documento').text(data.cliente.cnpj_cpf);
            $('#cliente-id').text(data.cliente.id);
            
            if (data.contratosComAtraso && data.contratosComAtraso.length > 0) {
                alertaFinanceiro.html('<i class="bi bi-exclamation-triangle-fill me-2"></i><strong>Atenção:</strong> Este cliente possui faturas em atraso.');
                alertaFinanceiro.show();
            }

            const listaContratos = $('#lista-contratos');
            listaContratos.empty();
            if (data.contratos.length > 0) {
                data.contratos.forEach(contrato => {
                    const statusClass = getStatusClass(contrato.status_internet);
                    const statusText = getStatusText(contrato.status_internet);
                    const temAtraso = data.contratosComAtraso.includes(contrato.id);
                    const classeAtraso = temAtraso ? 'list-group-item-atraso' : '';
                    
                    let enderecoContrato = 'Endereço não especificado no contrato';
                    if (contrato.endereco) {
                        enderecoContrato = [contrato.endereco, contrato.numero, contrato.bairro, contrato.complemento].filter(Boolean).join(', ');
                    }
                    else if (contrato.endereco_padrao_cliente === 'S' && clienteConsultado) {
                        enderecoContrato = [clienteConsultado.endereco, clienteConsultado.numero, clienteConsultado.bairro, clienteConsultado.complemento].filter(Boolean).join(', ');
                    }
                    
                    listaContratos.append(`
                        <li class="list-group-item d-flex justify-content-between align-items-center ${classeAtraso}">
                            <div>
                                <strong>Contrato:</strong> ${contrato.contrato} (ID: ${contrato.id})<br>
                                <small>Ativado em: ${contrato.data_ativacao}</small><br>
                                <small class="text-muted"><i class="bi bi-geo-alt-fill me-1"></i>${enderecoContrato}</small>
                            </div>
                            <div>
                                <span class="badge ${statusClass} rounded-pill">${statusText}</span>
                                ${temAtraso ? '<span class="badge bg-danger rounded-pill ms-1" title="Possui faturas em atraso"><i class="bi bi-cash-coin"></i> Atraso</span>' : ''}
                            </div>
                        </li>
                    `);
                });
            } else {
                listaContratos.append('<li class="list-group-item">Nenhum contrato encontrado.</li>');
            }
            
            $('#btn-ir-para-cadastro').text('Cadastrar Novo Contrato').removeClass('btn-success').addClass('btn-primary');
            
        } else {
            $('#cliente-encontrado').hide();
            $('#cliente-nao-encontrado').show();
            
            $('#btn-ir-para-cadastro').text('Cadastrar Novo Cliente').removeClass('btn-primary').addClass('btn-success');
        }
        
    } catch (error) {
        console.error("Erro na consulta:", error);
        loadingDiv.hide();
        showModal('Erro', `Não foi possível realizar a consulta. ${error.message}`, 'danger');
    }
}

async function buscarEnderecoPorCEP(suffix = '') {
    const idCep = suffix ? `cep${suffix}` : 'cep';
    const cepField = document.getElementById(idCep); 
    
    if (!cepField || !$(cepField).inputmask('isComplete')) {
        return; 
    }

    const cep = cepField.value;
    cepField.disabled = true;
    
    try {
        const response = await fetch(`/api/v5/geo/cep-lookup?cep=${cep}`);
        if (!response.ok) throw new Error('CEP não encontrado');
        
        const data = await response.json();

        const rua = data.rua || '';
        $(`#endereco${suffix}`).val(rua).prop('readonly', rua.length > 0);

        const bairro = data.bairro || '';
        $(`#bairro${suffix}`).val(bairro).prop('readonly', bairro.length > 0);

        const cidade = data.cidade || '';
        $(`#cidade${suffix}`).val(cidade).prop('readonly', cidade.length > 0);

        const uf = data.uf || '';
        $(`#uf${suffix}`).val(uf).prop('readonly', uf.length > 0);
        
        const cidadeId = getCidadeIdPorNome(data.cidade);
        
        if (suffix === '_cliente') {
            $('#hidden-cidade-id-cliente').val(cidadeId);
        } else {
            $('#hidden-cidade-id').val(cidadeId);
        }

        validateField(document.getElementById(`endereco${suffix}`));
        validateField(document.getElementById(`bairro${suffix}`));
        validateField(document.getElementById(`cidade${suffix}`));
        validateField(document.getElementById(`uf${suffix}`));

        $(`#numero${suffix}`).focus();

    } catch (error) {
        console.error("Erro CEP:", error);
        showModal('Erro de CEP', error.message, 'warning');
        $(`#endereco${suffix}, #bairro${suffix}, #cidade${suffix}, #uf${suffix}`).val('').prop('readonly', false);
    } finally {
        cepField.disabled = false;
        validateField(cepField);
        checkFormValidity();
    }
}

async function consultarClientePorEndereco() {
    const cep = $('#input-cep-consulta').val();
    const numero = $('#input-numero-consulta').val();

    if (!$('#input-cep-consulta').inputmask('isComplete')) {
        showModal('Atenção', 'Digite um CEP válido para a consulta.', 'warning');
        return;
    }

    const loadingDiv = $('#loading-endereco');
    const resultadoDiv = $('#resultado-endereco');
    const lista = $('#lista-clientes-endereco');
    
    loadingDiv.show();
    resultadoDiv.hide();
    lista.empty();

    try {
        const response = await fetch('/api/v5/ixc/consultar-endereco', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cep: cep, numero: numero })
        });
        
        if (!response.ok) throw new Error('Falha ao consultar endereço.');

        const data = await response.json();
        
        loadingDiv.hide();
        resultadoDiv.show();
        
        if (data.length > 0) {
            data.forEach(cliente => {
                const classeAtraso = cliente.tem_atraso ? 'list-group-item-atraso' : '';
                lista.append(`
                    <li class="list-group-item d-flex justify-content-between align-items-center ${classeAtraso}">
                        <div>
                            <strong>${cliente.razao}</strong> (ID: ${cliente.id})<br>
                            <small class="text-muted">${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}</small>
                        </div>
                        <div>
                             ${cliente.tem_atraso ? '<span class="badge bg-danger rounded-pill" title="Possui faturas em atraso"><i class="bi bi-cash-coin"></i> Atraso</span>' : ''}
                        </div>
                    </li>
                `);
            });
        } else {
            lista.append('<li class="list-group-item">Nenhum cliente encontrado para este CEP e Número.</li>');
        }

    } catch (error) {
        console.error("Erro na consulta de endereço:", error);
        loadingDiv.hide();
        showModal('Erro', `Não foi possível consultar o endereço. ${error.message}`, 'danger');
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'A': return 'bg-success';
        case 'AA': return 'bg-primary';
        case 'B': return 'bg-warning text-dark';
        case 'D': case 'C': case 'CA': case 'CM': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getStatusText(status) {
    const map = { 'A': 'Ativo', 'AA': 'Aguardando assinatura', 'D': 'Cancelado / Desativado' ,'B': 'Bloqueado', 'BO': 'Bloqueado', 'C': 'Cancelado', 'CA': 'Bloqueado Automático', 'CM': 'Bloqueado Manual', 'P': 'Pendente' };
    return map[status] || status || 'Desconhecido';
}

function irParaTela(tela) {
    if (tela === 'cadastro') {
        preencherFormularioComCliente();
        $('#tela-1-consulta').hide();
        $('#tela-2-cadastro').show();
        window.scrollTo(0, 0);
    } else {
        $('#tela-1-consulta').show();
        $('#tela-2-cadastro').hide();
    }
}

function preencherFormularioComCliente() {
    const form = $('#venda-form');
    const btnFinalizar = $('#btn-finalizar-venda');
    const tituloForm = $('#titulo-form-cadastro');
    const sectionEnderecoCliente = $('#section-endereco-cliente');

    resetFormularioCompleto();

    if (clienteConsultado) {
        tituloForm.text('2. Cadastrar Novo Contrato Corporativo');
        btnFinalizar.text('Finalizar Novo Contrato');
        sectionEnderecoCliente.hide();
        toggleRequiredEnderecoCliente(false);
        
        $('#nome').val(clienteConsultado.razao).prop('disabled', true);
        $('#cpf').val(clienteConsultado.cnpj_cpf).prop('disabled', true);
        $('#data_nascimento').val(clienteConsultado.data_nascimento);
        $('#whatsapp').val(clienteConsultado.whatsapp);
        $('#telefone_celular').val(clienteConsultado.telefone_celular);
        $('#email').val(clienteConsultado.email);
        
        $('#cep, #endereco, #numero, #bairro, #cidade, #uf, #hidden-cidade-id, #referencia, #complemento').val('');

        form.find('input, select, button').each(function() {
            if ($(this).prop('disabled')) {
                validateField(this);
            }
        });

    } else {
        tituloForm.text('2. Cadastrar Novo Cliente Corporativo');
        btnFinalizar.text('Finalizar Cadastro');
        sectionEnderecoCliente.show();
        toggleRequiredEnderecoCliente(true);
        
        form.find('input, select').prop('disabled', false);
        
        const documentoConsultado = $('#input-documento').val();
        $('#cpf').val(documentoConsultado);
        $('#plano-display-btn').text('Selecionar Plano...').removeClass('is-valid is-invalid');
        $('#plano').val('');
    }
    
    checkFormValidity();
}
function toggleRequiredEnderecoCliente(isRequired) {
    const fields = ['#cep_cliente', '#numero_cliente'];
    fields.forEach(selector => {
        $(selector).prop('required', isRequired);
        $(selector).removeClass('is-valid is-invalid'); 
    });
}

function resetFormularioCompleto() {
    const form = $('#venda-form');
    form.trigger('reset');
    form.find('input, select').prop('disabled', false);
    form.removeClass('was-validated');
    form.find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
    
    // Habilita campos de endereço que podem ter ficado como readonly
    $('#endereco').prop('readonly', false);
    $('#bairro').prop('readonly', false);
    $('#cidade').prop('readonly', false);
    $('#uf').prop('readonly', false);

    document.getElementById('btn-finalizar-venda').innerHTML = 'Finalizar Cadastro';

    $('#input-condominio-venda').val('Corporativo');
    $('#hidden-condominio-id').val('10010');
    
    $('#plano').val('');
    $('#plano-display-btn').text('Selecionar Plano...').removeClass('is-valid is-invalid');
    
    currentBlocks = [];
    selectedBlock = null;
}

function setupFormValidation() {
    const form = document.getElementById('venda-form');
    form.addEventListener('submit', event => {
        event.preventDefault();
        event.stopPropagation();

        let isFormFullyValid = true;
        form.querySelectorAll('input[required]:not(:disabled), select[required]:not(:disabled)').forEach(field => {
            if (!validateField(field)) {
                isFormFullyValid = false;
            }
        });
        
        if (!validateField(document.getElementById('plano-display-btn'))) {
            isFormFullyValid = false;
        }

        checkFormValidity();

        if (isFormFullyValid) {
            const clientData = {
                nome: document.getElementById('nome').value.trim(),
                cnpj_cpf: document.getElementById('cpf').value,
                ie_identidade: "",
                data_nascimento: document.getElementById('data_nascimento').value,
                telefone_celular: document.getElementById('telefone_celular').value.replace(/\D/g,''),
                whatsapp: document.getElementById('whatsapp').value.replace(/\D/g,''),
                email: document.getElementById('email').value.trim(),
                
                // Endereço de instalação
                cep: document.getElementById('cep').value.trim(),
                endereco: document.getElementById('endereco').value.trim(),
                numero: document.getElementById('numero').value.trim(),
                bairro: document.getElementById('bairro').value.trim(),
                cidade: document.getElementById('hidden-cidade-id').value,
                uf: document.getElementById('uf').value,
                bloco: document.getElementById('hidden-bloco').value,
                apartamento: document.getElementById('hidden-apartamento').value,
                complemento: document.getElementById('complemento').value.trim(),
                referencia: document.getElementById('referencia').value.trim(),
                id_condominio: document.getElementById('hidden-condominio-id').value,

                // endereço da matriz (cliente)
                cep_cliente: document.getElementById('cep_cliente').value.trim(),
                endereco_cliente: document.getElementById('endereco_cliente').value.trim(),
                numero_cliente: document.getElementById('numero_cliente').value.trim(),
                bairro_cliente: document.getElementById('bairro_cliente').value.trim(),
                cidade_cliente: document.getElementById('hidden-cidade-id-cliente').value,
                uf_cliente: document.getElementById('uf_cliente').value,
                complemento_cliente: document.getElementById('complemento_cliente').value.trim(),
                
                id_vendedor: document.getElementById('vendedor').value,
                nome_vendedor: document.getElementById('vendedor').options[document.getElementById('vendedor').selectedIndex].text,
                id_plano_ixc: document.getElementById('plano').value, 
                valor_acordado: document.getElementById('valor_acordado').value,
                data_vencimento: document.getElementById('data_vencimento').value,
                obs: `VALOR ACORDADO: ${document.getElementById('valor_acordado').value}\n` + document.getElementById('observacoes_venda').value.trim(),
                
                // Campos fixos Corporativo
                ativo: "S", tipo_pessoa: "J", contribuinte_icms: "S", tipo_cliente_scm: "01", id_tipo_cliente: "7", id_filial: "1", bloqueio_automatico: "N",
                tipo_assinante: "1", tipo_localidade: "U", iss_classificacao_padrao: "99", id_carteira_cobranca: "10",

                // Capos atendimento
                assunto_ticket: "35", id_assunto: "35", id_wfl_processo: "21", titulo_atendimento: "INSTALAR CLIENTE CORPORATIVO"
            };
            
            let existingId = null;
            if (clienteConsultado && clienteConsultado.id) {
                existingId = clienteConsultado.id;
            }
            
            cadastrarClienteNoIXC(clientData, existingId);
            
        } else {
            showModal('Atenção', 'Por favor, corrija os campos marcados em vermelho.', 'warning');
        }

        form.classList.add('was-validated'); 
    }, false);
}

async function cadastrarClienteNoIXC(clientData, existingClientId = null) {
    const submitButton = document.getElementById('btn-finalizar-venda');
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cadastrando...';

    const payload = { ...clientData };
    if (existingClientId) {
        payload.existingClientId = existingClientId;
    }

    let success = false;

    try {
        console.log("Enviando dados para a API:", payload);
        
        const response = await fetch('/api/v5/ixc/cliente-corporativo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro desconhecido no servidor.');
        }
        
        success = true;
        showModal('Sucesso!', 
            `Venda finalizada com sucesso!
             <br><strong>Cliente ID:</strong> ${result.clienteId}
             <br><strong>Contrato ID:</strong> ${result.contratoId}
             <br><strong>Login ID:</strong> ${result.loginId}
             <br><strong>Atendimento ID:</strong> ${result.ticketId}`,
            'success'
        );
        
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);

        const cpfErrorMessage = "Este CNPJ/CPF já está Cadastrado!";
        if (error.message && error.message.includes(cpfErrorMessage)) {
            const match = error.message.match(/ID: (\d+) - \((.*?)\)/);
            
            if (match && match[1] && match[2] && !existingClientId) {
                const extractedId = match[1];
                const extractedName = match[2];
                
                showConfirmModal(
                    'Cliente já Cadastrado',
                    `Este CPF já está cadastrado para o cliente: <strong>${extractedName} (ID: ${extractedId})</strong>.<br><br>Deseja criar um novo contrato para este cliente?`,
                    () => {
                        clienteConsultado = { id: extractedId };
                        cadastrarClienteNoIXC(clientData, extractedId);
                    }
                );
            } else {
                showModal('Erro ao Cadastrar', `Não foi possível finalizar o cadastro.<br><strong>Motivo:</strong> ${error.message}`, 'danger');
            }
        } else {
            showModal('Erro ao Cadastrar', `Não foi possível finalizar o cadastro.<br><strong>Motivo:</strong> ${error.message}`, 'danger');
        }

    } finally {
        if (!bsConfirmModal || !bsConfirmModal._isShown) {
            submitButton.disabled = false;

            if (success) {
                submitButton.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Cliente Cadastrado!';
                submitButton.classList.remove('btn-primary', 'ivp-btn');
                submitButton.classList.add('btn', 'btn-success');
                submitButton.type = 'button';
                const newBtn = submitButton.cloneNode(true);
                submitButton.parentNode.replaceChild(newBtn, submitButton);
                
                newBtn.addEventListener('click', () => {
                    window.location.reload();
                });

            } else {
                if (clienteConsultado) {
                     submitButton.innerHTML = 'Finalizar Novo Contrato';
                } else {
                     submitButton.innerHTML = 'Finalizar Cadastro';
                }
                checkFormValidity(); 
            }
        }
    }
}

function showModal(title, message, type = 'info') {
    if (!bsInfoModal) { alert(message); return; }
    const modalTitle = document.getElementById('modalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalDialog = bsInfoModal._element.querySelector('.modal-dialog'); 
    modalTitle.textContent = title;
    modalBody.innerHTML = message;
    modalDialog.classList.remove('modal-success', 'modal-danger', 'modal-warning');
    if (type === 'success') modalDialog.classList.add('modal-success');
    if (type === 'danger') modalDialog.classList.add('modal-danger');
    if (type === 'warning') modalDialog.classList.add('modal-warning');
    
    const infoModalElement = document.getElementById('infoModal');
    if (type === 'success') {
        infoModalElement.dataset.reloadOnClose = 'true';
    } else {
        infoModalElement.dataset.reloadOnClose = 'false';
    }
    bsInfoModal.show();
}

async function loadSellers() {
    const sellerSelect = document.getElementById('vendedor');
    try {
        const response = await fetch('/api/v5/ixc/vendedores');
        if (!response.ok) throw new Error('Falha ao buscar vendedores');
        const sellers = await response.json();
        sellerSelect.innerHTML = '<option selected disabled value="">Selecione...</option>';
        sellers.forEach(seller => {
            sellerSelect.add(new Option(seller.nome, seller.id));
        });
    } catch (error) {
        console.error(error);
    }
}

async function enviarChamadoSuporte() {
    const textarea = document.getElementById('descricao-problema');
    const mensagem = textarea.value.trim();
    const btnEnviar = document.getElementById('btn-enviar-suporte');

    if (!mensagem) {
        alert("Por favor, descreva o problema antes de enviar.");
        textarea.focus();
        return;
    }

    const textoOriginal = btnEnviar.innerHTML;
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';

    try {
        const usuarioLogado = document.querySelector('.user-info span')?.textContent || 'Usuário Desconhecido';
        const mensagemFinal = `Usuário Solicitante: ${usuarioLogado}\n\nDescrição do Problema:\n${mensagem}`;

        const response = await fetch('/api/v5/ixc/abrir-chamado-suporte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagem: mensagemFinal })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao comunicar com o servidor.');
        }

        bsSuporteModal.hide();
        showModal('Chamado Aberto', `Seu chamado foi aberto com sucesso!<br><strong>ID do Ticket:</strong> ${result.id_ticket}`, 'success');

    } catch (error) {
        console.error("Erro ao enviar suporte:", error);
        alert(`Erro ao abrir chamado: ${error.message}`);
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = textoOriginal;
    }
}

function getTechnologyString(technologyId) {
    const map = { 1: 'FTTH', 2: 'AIRMAX', 3: null, 4: 'FTTH', 5: 'FTTH' };
    return map[technologyId] || null;
}

function setupFieldValidation() {
    const form = document.getElementById('venda-form');
    const fieldsToValidate = form.querySelectorAll('input[required], select[required]');
    fieldsToValidate.forEach(field => {
        field.addEventListener('blur', () => {
            if (!field.disabled) {
                validateField(field);
                checkFormValidity();
            }
        });
        if (field.tagName === 'SELECT' || field.type === 'date') {
             field.addEventListener('change', () => {
                if (!field.disabled) {
                    validateField(field);
                    checkFormValidity();
                }
            });
        }
    });
    
    $('#cep').on('blur', function() { buscarEnderecoPorCEP(''); });
    $('#cep_cliente').on('blur', function() { buscarEnderecoPorCEP('_cliente'); });
    
    $('#btn-cartao-cpf').on('click', function() {
        const doc = document.getElementById('cpf').value.replace(/\D/g, '');
        if (doc.length > 11) {
            window.open(`https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp`, '_blank');
        } else {
             window.open(`https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/ConsultaPublica.asp`, '_blank');
        }
    });
}

function validateField(field) {
    if (!field) return false;
    
    if (field.id === 'plano-display-btn') {
        const isValid = document.getElementById('plano').value.trim() !== '';
        field.classList.toggle('is-valid', isValid);
        field.classList.toggle('is-invalid', !isValid);
        return isValid;
    }

    if (field.disabled || field.readOnly) {
        if (field.value.trim() !== '') {
             field.classList.remove('is-invalid');
             field.classList.add('is-valid');
             return true;
        }
    }
    
    let isValid = false;
    let value = field.value.trim();
    
    if (field.id === 'complemento') {
         isValid = value !== '';
    } else if (field.id === 'whatsapp' || field.id === 'cep') {
        isValid = $(field).inputmask('isComplete');
    } else if (field.id === 'cpf') {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length === 11) {
            isValid = validarCPF(cleanValue);
        } else if (cleanValue.length === 14) {
            isValid = validarCNPJ(cleanValue);
        } else {
            isValid = false;
        }
        if (!isValid && value !== '') {
        }
    } else if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = value !== '' && emailRegex.test(value);
    } else if (field.id === 'valor_acordado') {
        const numericValue = parseFloat(value.replace('R$ ', '').replace('.', '').replace(',', '.'));
        isValid = !isNaN(numericValue) && numericValue > 0;
    } else {
        isValid = value !== '';
    }
    
    if (field.id === 'input-condominio-venda' && value !== '') isValid = true;

    const fieldToStyle = field;
    
    if (isValid) {
        fieldToStyle.classList.add('is-valid');
        fieldToStyle.classList.remove('is-invalid');
    } else {
        fieldToStyle.classList.add('is-invalid');
        fieldToStyle.classList.remove('is-valid');
    }
    return isValid;
}

function checkFormValidity() {
    const form = document.getElementById('venda-form');
    const fieldsToCheck = form.querySelectorAll('input[required]:not(:disabled), select[required]:not(:disabled), #plano-display-btn');
    const submitButton = document.getElementById('btn-finalizar-venda');
    const validityMessage = document.getElementById('form-validity-message');
    let isFormValid = true;

    fieldsToCheck.forEach(field => {
        if (field.id === 'plano-display-btn') {
             if (document.getElementById('plano').value === '') isFormValid = false;
        } else {
             if (!validateField(field)) isFormValid = false;
        }
    });

    submitButton.disabled = !isFormValid;
    if (isFormValid) {
        validityMessage.style.display = 'none';
    } else {
        validityMessage.style.display = 'block';
    }
}
function getCidadeNome(cidadeId) {
    const cidades = {"3173": "Vitória", "3172": "Vila Velha", "3169": "Viana", "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica"};
    return cidades[cidadeId] || '';
}
function getCidadeIdPorNome(nomeCidade) {
    if (!nomeCidade) return '';
    const nome = nomeCidade.toString().toUpperCase().trim();
    const mapaCidades = {
        "VITÓRIA": "3173",
        "VITORIA": "3173",
        "VILA VELHA": "3172",
        "VIANA": "3169",
        "SERRA": "3165",
        "SANTA TERESA": "3159",
        "CARIACICA": "3112",
        "GUARAPARI": "3124",
    };
    return mapaCidades[nome] || ''; 
}

function getUfFromCidadeId(cidadeId) {
    if (cidadeId) return 'ES';
    return '';
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '') return false;
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
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
            else if (group !== 'NOC' && group !== 'Corporativo') {
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