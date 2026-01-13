let bsInfoModal = null;
let bsConfirmModal = null;
let complementoModal = null;
let currentBlocks = [];
let selectedBlock = null;
let bsSuporteModal = null;

let tipoConsulta = 'cpf';
let clienteConsultado = null;

document.addEventListener('DOMContentLoaded', function() {
    
    const infoModalElement = document.getElementById('infoModal');
    if (infoModalElement) bsInfoModal = new bootstrap.Modal(infoModalElement);
    const confirmModalElement = document.getElementById('confirmModal');
    if (confirmModalElement) bsConfirmModal = new bootstrap.Modal(confirmModalElement);
    const complementoModalElement = document.getElementById('complementoModal');
    if (complementoModalElement) complementoModal = new bootstrap.Modal(complementoModalElement);
    const suporteModalElement = document.getElementById('suporteModal');
    if (suporteModalElement) bsSuporteModal = new bootstrap.Modal(suporteModalElement);

    initializeThemeAndUserInfo();
    loadSellers();
    loadPlans(null);
    setupCondoSearchVenda();
    setupFormValidation();
    setupFieldValidation();
    
    $('#input-documento').inputmask('999.999.999-99');
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_nascimento').setAttribute('max', today);
    $('#whatsapp').inputmask('(99) 99999-9999');
    $('#telefone_celular').inputmask('(99) 9999[9]-9999');
    $('#cep').inputmask('99999-999');
    $('#input-cep-consulta').inputmask('99999-999');
    $('#numero').on('input', function() {
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
        checkFormValidity(); // Revalida o formulário
    });
    //$('#input-numero-consulta').inputmask('regex', { regex: "^[0-9a-zA-Z -]*$" });

    $('#input-complemento-livre').on('input', function() {
        $('#complemento').val($(this).val());
        validateField(this);
        checkFormValidity();
    });

$('#chk-sem-condominio').on('change', function() {
        const isChecked = $(this).is(':checked');
        const inputCondo = $('#input-condominio-venda');
        const hiddenCondo = $('#hidden-condominio-id');        
        const btnComplemento = $('#btn-complemento');
        const inputComplemento = $('#input-complemento-livre');

        if (isChecked) {
            inputCondo.prop('disabled', false)
                      .val('')
                      .attr('placeholder', 'Digite o nome do Bairro / Condomínio')
                      .removeClass('is-invalid is-valid')
                      .focus();
            
            hiddenCondo.val(''); 
            
            currentBlocks = [];
            btnComplemento.hide();
            inputComplemento.show().prop('disabled', false).val('');
            
            loadPlans('ALL');
            
        } else {
            inputCondo.prop('disabled', false)
                      .val('')
                      .attr('placeholder', 'Digite o nome para buscar...')
                      .removeClass('is-invalid is-valid');
            
            inputComplemento.hide().prop('disabled', true).val('');
            btnComplemento.show().text('Selecione o complemento...').removeClass('is-valid is-invalid');

            loadPlans(null);
        }
        $('#complemento').val('');
        checkFormValidity();
    });
    
    setupModalListeners();
    
    setupTela1Listeners();

    $('#btn-abrir-modal-suporte').on('click', function() {
        $('#descricao-problema').val('');
        bsSuporteModal.show();
    });

    $('#btn-enviar-suporte').on('click', enviarChamadoSuporte);

    $('#btn-complemento').on('click', openComplementoModal);
    $('#btn-confirmar-complemento').on('click', () => confirmComplemento(null));
    $('#btn-voltar-consulta').on('click', () => irParaTela('consulta'));
});

function setupTela1Listeners() {
    $('#btn-toggle-documento').on('click', function() {
        const btn = $(this);
        const input = $('#input-documento');
        
        if (tipoConsulta === 'cpf') {
            tipoConsulta = 'cnpj';
            btn.text('CNPJ');
            input.attr('placeholder', 'Digite o CNPJ...').inputmask('99.999.999/9999-99');
        } else {
            tipoConsulta = 'cpf';
            btn.text('CPF');
            input.attr('placeholder', 'Digite o CPF...').inputmask('999.999.999-99');
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
                    //console.log("Endereço do contrato:", enderecoContrato);
                    listaContratos.append(`
                        <li class="list-group-item d-flex justify-content-between align-items-center ${classeAtraso}">
                            <div>
                                <strong>Contrato:</strong> ${contrato.contrato} (ID: ${contrato.id})<br>
                                <small>Ativado em: ${contrato.data_ativacao}</small><br>
                                <small class="text-muted"><i class="bi bi-geo-alt-fill me-1"></i>${enderecoContrato}</small>
                            </div>
                            <div>
                                <span class="badge ${statusClass} rounded-pill">${statusText}</span>
                                ${temAtraso ? '<span class="badge bg-danger rounded-pill ms-1" title="Possui faturas em atraso"><i class="bi bi-cash-coin"></i> Contrato com financeiro em atraso</span>' : ''}
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

async function buscarEnderecoPorCEP() {
    const cepField = document.getElementById('cep'); 
    
    if (!cepField || !$(cepField).inputmask('isComplete')) {
        return; 
    }

    const cep = cepField.value;
    cepField.disabled = true;
    
    try {
        const response = await fetch(`/api/v5/geo/cep-lookup?cep=${cep}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'CEP não encontrado';
            try {
                const err = JSON.parse(errorText);
                errorMessage = err.error || 'CEP não encontrado';
            } catch (e) {
                console.error("A resposta do servidor não foi JSON:", errorText);
                errorMessage = `Erro no servidor. A rota de CEP foi encontrada? (${response.status})`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();

        $('#endereco').val(data.rua || '');
        $('#bairro').val(data.bairro || '');
        $('#cidade').val(data.cidade || '');
        $('#uf').val(data.uf || '');
        const cidadeId = getCidadeIdPorNome(data.cidade);
        $('#hidden-cidade-id').val(cidadeId);

        validateField(document.getElementById('endereco'));
        validateField(document.getElementById('bairro'));
        validateField(document.getElementById('cidade'));
        validateField(document.getElementById('uf'));

        $('#numero').focus();

    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        showModal('Erro de CEP', error.message, 'warning');
        $('#endereco').val('');
        $('#bairro').val('');
        $('#cidade').val('');
        $('#uf').val('');
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
                            <!-- Adiciona o badge se 'tem_atraso' for true -->
                            ${cliente.tem_atraso ? '<span class="badge bg-danger rounded-pill" title="Possui faturas em atraso"><i class="bi bi-cash-coin"></i> Cliente possui financeiro em atraso </span>' : ''}
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
        case 'A': // Ativo
            return 'bg-success';
        case 'AA': // Ativo
            return 'bg-primary';
        case 'B': // Bloqueado
        case 'BO': // Bloqueado
            return 'bg-warning text-dark';
        case 'D': // Desativado
        case 'C': // Cancelado
        case 'CA': // Bloqueado Automático
        case 'CM': // Bloqueado Manual
            return 'bg-danger';
        default:
            return 'bg-secondary';
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

    resetFormularioCompleto();

    if (clienteConsultado) {
        tituloForm.text('2. Cadastrar Novo Contrato');
        btnFinalizar.text('Finalizar Novo Contrato');
        
        $('#nome').val(clienteConsultado.razao).prop('disabled', true);
        $('#cpf').val(clienteConsultado.cnpj_cpf).prop('disabled', true);
        $('#rg').val(clienteConsultado.ie_identidade);
        $('#data_nascimento').val(clienteConsultado.data_nascimento);
        $('#whatsapp').val(clienteConsultado.whatsapp);
        $('#telefone_celular').val(clienteConsultado.telefone_celular);
        $('#email').val(clienteConsultado.email);
        $('#input-condominio-venda').val('');
        $('#cep').val(clienteConsultado.cep);
        $('#endereco').val(clienteConsultado.endereco);
        $('#numero').val(clienteConsultado.numero);
        $('#bairro').val(clienteConsultado.bairro);
        $('#cidade').val(getCidadeNome(clienteConsultado.cidade));
        $('#uf').val(getUfFromCidadeId(clienteConsultado.cidade));
        $('#hidden-cidade-id').val(clienteConsultado.cidade);
        $('#referencia').val(clienteConsultado.referencia);
        
        form.find('input, select, button').each(function() {
            if ($(this).prop('disabled')) {
                validateField(this);
            }
        });

    } else {
        tituloForm.text('2. Cadastrar Novo Cliente');
        btnFinalizar.text('Finalizar Cadastro');
        
        form.find('input, select').prop('disabled', false);
        
        const documentoConsultado = $('#input-documento').val();
        $('#cpf').val(documentoConsultado);
        
        $('#btn-complemento').prop('disabled', false);
        $('#btn-cartao-cpf').prop('disabled', false);

        $('#plano').prop('disabled', true).html('<option selected disabled value="">Selecione o complemento primeiro...</option>');
    }
    
    checkFormValidity();
}

function resetFormularioCompleto() {
    const form = $('#venda-form');
    form.trigger('reset');
    form.find('input, select').prop('disabled', false);
    form.removeClass('was-validated');
    form.find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
    
    document.getElementById('btn-finalizar-venda').innerHTML = 'Finalizar Cadastro';

    resetComplementoAndPlano(); 
    
    currentBlocks = [];
    selectedBlock = null;
    
    $('#plano').prop('disabled', true).html('<option selected disabled value="">Selecione o complemento primeiro...</option>');
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

        const semCondominio = $('#chk-sem-condominio').is(':checked');
        
        if (semCondominio) {
            if (!validateField(document.getElementById('input-complemento-livre'))) {
                isFormFullyValid = false;
            }
            document.getElementById('btn-complemento').classList.remove('is-invalid');
        } else {
            if (!validateField(document.getElementById('btn-complemento'))) {
                isFormFullyValid = false;
            }
        }

        checkFormValidity();

        if (isFormFullyValid) {
            const semCondominio = $('#chk-sem-condominio').is(':checked');
            const clientData = {
                // Dados Pessoais
                nome: document.getElementById('nome').value.trim(),
                cnpj_cpf: document.getElementById('cpf').value,
                ie_identidade: document.getElementById('rg').value.trim(),
                data_nascimento: document.getElementById('data_nascimento').value,
                // Contato
                telefone_celular: document.getElementById('telefone_celular').value.replace(/\D/g,''),
                whatsapp: document.getElementById('whatsapp').value.replace(/\D/g,''),
                email: document.getElementById('email').value.trim(),
                // Endereço
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
                condominio_novo_nome: semCondominio ? document.getElementById('input-condominio-venda').value.trim() : '',
                id_condominio: document.getElementById('hidden-condominio-id').value,
                // Venda
                id_vendedor: document.getElementById('vendedor').value,
                nome_vendedor: document.getElementById('vendedor').options[document.getElementById('vendedor').selectedIndex].text,
                id_plano_ixc: document.getElementById('plano').value, 
                data_vencimento: document.getElementById('data_vencimento').value,
                // Observações
                obs: document.getElementById('observacoes_venda').value.trim(),
                // Campos fixos
                ativo: "S", tipo_pessoa: "F", contribuinte_icms: "N", tipo_cliente_scm: "03", id_tipo_cliente: "6", id_filial: "3", bloqueio_automatico: "S",
                tipo_assinante: "3", tipo_localidade: "U", iss_classificacao_padrao: "99", id_carteira_cobranca: "11",

                // Campos atendimento
                assunto_ticket: "1", id_assunto: "1", id_wfl_processo: "3", titulo_atendimento: "INSTALAÇÃO - BANDA LARGA"
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
    const textoOriginal = submitButton.textContent || (clienteConsultado ? 'Finalizar Novo Contrato' : 'Finalizar Cadastro');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cadastrando...';

    const payload = { ...clientData };
    if (existingClientId) {
        payload.existingClientId = existingClientId;
    }

    let success = false;

    try {
        console.log("Enviando dados para a API:", payload);
        
        const response = await fetch('/api/v5/ixc/cliente', {
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
    if (!bsInfoModal) {
        console.error("Modal não inicializado!");
        alert(title + "\n" + message);
        return; 
    }
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
        console.error("Erro ao carregar vendedores:", error);
        sellerSelect.innerHTML = '<option selected disabled value="">Erro ao carregar</option>';
        showModal('Erro', 'Não foi possível carregar a lista de vendedores.', 'danger');
    }
}

async function loadPlans(technologyId) {
    const planSelect = document.getElementById('plano');
    const planoHelper = document.getElementById('plano-helper');
    planSelect.innerHTML = '';
    
    if (technologyId === null) {
        planSelect.innerHTML = '<option selected disabled value="">Selecione o complemento primeiro...</option>';
        planoHelper.textContent = 'Preencha o endereço e complemento para ver os planos.';
        planSelect.disabled = true;
        return;
    }

    planSelect.innerHTML = '<option value="">Carregando...</option>';
    planSelect.disabled = true;

    try {
        const response = await fetch('/api/v5/ixc/planos-home');
        if (!response.ok) throw new Error('Falha ao buscar planos');
        const allPlans = await response.json();
        
        let filteredPlans = [];
        if (technologyId === 'ALL') {
            filteredPlans = allPlans;
            planoHelper.textContent = 'Todos os planos disponíveis (Modo Manual).';
        } else {
            const techString = getTechnologyString(technologyId);
            if (!techString) {
                planSelect.innerHTML = '<option selected disabled value="">Tecnologia não suportada</option>';
                planoHelper.textContent = 'A tecnologia deste bloco não possui planos de venda associados.';
                planSelect.disabled = true;
                return;
            }
            filteredPlans = allPlans.filter(p => p.nome.toUpperCase().includes(techString));
            planoHelper.textContent = `Planos ${techString} disponíveis.`;
        }

        planSelect.innerHTML = '<option selected disabled value="">Selecione...</option>';
        
        if (filteredPlans.length === 0) {
            planSelect.innerHTML = '<option selected disabled value="">Nenhum plano encontrado</option>';
            if (technologyId !== 'ALL') planoHelper.textContent = `Nenhum plano encontrado.`;
        } else {
            filteredPlans.forEach(plan => {
                const option = document.createElement('option');
                option.value = plan.id;
                const normalizedCheckName = plan.nome.toUpperCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
                const cleanDisplayName = plan.nome.replace(/_/g, ' ');
                if (normalizedCheckName === "IVP HOME 50M FIBER FTTH") {
                    option.textContent = `${cleanDisplayName} (Verificar com a Gestão)`;
                    option.style.color = 'red';
                    option.style.fontWeight = '700';
                } else {
                    option.textContent = cleanDisplayName;
                }
                planSelect.add(option);
            });
            planSelect.disabled = false;
        }
    } catch (error) {
        console.error("Erro ao carregar planos:", error);
        planSelect.innerHTML = '<option selected disabled value="">Erro ao carregar</option>';
        planoHelper.textContent = 'Erro ao carregar lista de planos.';
        showModal('Erro', 'Não foi possível carregar a lista de planos.', 'danger');
    }
}

function getTechnologyString(technologyId) {
    const map = { 1: 'FTTH', 2: 'AIRMAX', 3: null, 4: 'FTTH', 5: 'FTTH' };
    return map[technologyId] || null;
}

function setupCondoSearchVenda() {
    $('#input-condominio-venda').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json()).then(data => callback(data))
                    .catch(err => console.error("Erro busca condomínios:", err));
            }
        }
    });
    $('#input-condominio-venda').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#hidden-condominio-id").val(item.value);
        resetComplementoAndPlano();
        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                $("#cep").val(condo.cep || '');
                $('#numero').val(condo.numero || ''); 
                $("#endereco").val(condo.endereco || '');
                $("#bairro").val(condo.bairro || '');
                $("#cidade").val(getCidadeNome(condo.cidadeId) || '');
                $("#uf").val(getUfFromCidadeId(condo.cidadeId) || '');
                $("#hidden-cidade-id").val(condo.cidadeId || '');
                $('#cep').inputmask('99999-999'); 
                ['input-condominio-venda', 'cep', 'numero', 'endereco', 'bairro', 'cidade', 'uf'].forEach(id => validateField(document.getElementById(id)));
                checkFormValidity();
                return fetch(`api/v1/block/${item.value}`);
            })
            .then(response => response.ok ? response.json() : [])
            .then(blocks => { currentBlocks = blocks; })
            .catch(err => {
                console.error("Erro detalhes condomínio/blocos:", err);
                showModal('Erro', 'Não foi possível carregar os detalhes do condomínio.', 'danger');
                $('input[id^="hidden-"]').val('');
                ['cep', 'numero', 'endereco', 'bairro', 'cidade', 'uf'].forEach(id => document.getElementById(id).value = '');
                currentBlocks = [];
            });
    });
}

function openComplementoModal() {
    if (!currentBlocks || currentBlocks.length === 0) {
        showModal('Atenção', 'Selecione um Condomínio / Localidade válido antes de definir o complemento.', 'warning');
        return;
    }
    const blocosLista = document.getElementById('blocos-lista-modal');
    const complementoDetails = document.getElementById('complemento-details');
    blocosLista.innerHTML = '';
    complementoDetails.innerHTML = '';
    complementoDetails.style.display = 'none';
    document.getElementById('btn-confirmar-complemento').style.display = 'none';
    currentBlocks.forEach(block => {
        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'list-group-item list-group-item-action';
        if (block.type === 'Casa' && block.name === 'Unico') {
            btn.textContent = 'Casas';
        } else {
            btn.textContent = block.name;
        }
        btn.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('#blocos-lista-modal a').forEach(a => a.classList.remove('active'));
            btn.classList.add('active');
            selectBlockInModal(block);
        };
        blocosLista.appendChild(btn);
    });
    complementoModal.show();
}

function selectBlockInModal(block) {
    selectedBlock = block;
    const complementoDetails = document.getElementById('complemento-details');
    complementoDetails.style.display = 'block';
    if (block.type === 'Casa' || block.floors === null) { 
        complementoDetails.innerHTML = `<h6>2. Informe o Complemento da Casa/Lote</h6><label for="casa-complemento-input" class="form-label">Complemento</label><input type="text" class="form-control" id="casa-complemento-input" placeholder="Ex: Casa 05, Fundos..."><div class="form-text">Este texto será usado como complemento no cadastro.</div>`;
        document.getElementById('btn-confirmar-complemento').style.display = 'block';
    } else {
        complementoDetails.innerHTML = `<h6>2. Selecione o Apartamento / Unidade</h6><div id="apto-list" class="list-group"></div>`;
        document.getElementById('btn-confirmar-complemento').style.display = 'none';
        const aptoList = document.getElementById('apto-list');
        aptoList.innerHTML = '';
        for (let j = 0; j <= (block.floors - block.initialFloor); j++) {
            for (let k = 1; k <= block.units; k++) {
                const apt = `${parseInt(block.initialFloor) + j}${k.toString().padStart(2, '0')}`;
                const aptoButton = document.createElement('a');
                aptoButton.href = '#';
                aptoButton.className = 'btn btn-outline-primary btn-apto';
                aptoButton.textContent = apt;
                aptoButton.onclick = (e) => {
                    e.preventDefault();
                    let complementString = `${block.name} - Apto ${apt}`;
                    if (block.name === 'Unico') {
                        complementString = `Apto ${apt}`;
                    }
                    confirmComplemento(complementString);
                };
                aptoList.appendChild(aptoButton);
            }
        }
    }
}

function confirmComplemento(complementString) {
    let finalComplement;
    let bloco = "";
    let apto = "";
    if (complementString) {
        finalComplement = complementString;
        bloco = (selectedBlock.name === 'Unico') ? '' : selectedBlock.name;
        apto = complementString.split('Apto ')[1] || ''; 
    } else {
        finalComplement = document.getElementById('casa-complemento-input').value.trim();
        if (!finalComplement) {
            showModal('Atenção', 'Por favor, informe o complemento da casa.', 'warning');
            return;
        }
    }
    document.getElementById('complemento').value = finalComplement;
    document.getElementById('btn-complemento').textContent = finalComplement;
    document.getElementById('hidden-bloco').value = bloco;
    document.getElementById('hidden-apartamento').value = apto;
    validateField(document.getElementById('btn-complemento'));
    const techString = selectedBlock.technology;
    const techId = getTechnologyIdFromString(techString);
    loadPlans(techId);
    complementoModal.hide();
    checkFormValidity();
}

function resetComplementoAndPlano() {
    $('#complemento').val('').removeClass('is-valid is-invalid');
    $('#btn-complemento').text('Selecione o complemento...').removeClass('is-valid is-invalid');
    $('#plano').prop('disabled', true).html('<option selected disabled value="">Preencha o complemento...</option>').removeClass('is-valid is-invalid');
    $('#plano-helper').text('Preencha o endereço e complemento para ver os planos.');
    $('#hidden-bloco').val('');
    $('#hidden-apartamento').val('');
    selectedBlock = null;
    currentBlocks = [];
    checkFormValidity();
}

function setupFieldValidation() {
    const form = document.getElementById('venda-form');
    const fieldsToValidate = form.querySelectorAll('input[required], select[required], button[required]');
    fieldsToValidate.forEach(field => {
        if(field.id === 'btn-complemento') return; 
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
    $('#cep').on('blur', buscarEnderecoPorCEP);
    $('#btn-cartao-cpf').on('click', function() {
        const cpfField = document.getElementById('cpf');
        const nascField = document.getElementById('data_nascimento');
        const cpf = cpfField.value;
        const dataNascimento = nascField.value;
        if (!dataNascimento) {
            showModal('Atenção', 'Por favor, preencha a Data de Nascimento para consultar o Cartão CPF.', 'warning');
            nascField.focus();
            return;
        }
        if (!$(cpfField).inputmask('isComplete') || tipoConsulta !== 'cpf') {
             showModal('Atenção', 'Por favor, preencha um CPF válido para consultar.', 'warning');
             cpfField.focus();
             return;
        }
        const [year, month, day] = dataNascimento.split('-');
        const dataFormatada = `${day}/${month}/${year}`;
        const url = `https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/ConsultaPublica.asp?${cpf}&NASCIMENTO=${dataFormatada}`;
        window.open(url, '_blank');
    });
}

function validateField(field) {
    if (!field) return false;
    
    if (field.disabled) {
        field.classList.remove('is-invalid');
        return true;
    }
    
    let isValid = false;
    let value = field.value.trim();

    if (field.id === 'input-condominio-venda') {
        isValid = value !== '';
    }
    else if (field.id === 'btn-complemento') {
        if ($('#chk-sem-condominio').is(':checked')) {
            isValid = true;
        } else {
            isValid = document.getElementById('complemento').value.trim() !== '';
        }
    }
    else if (field.id === 'input-complemento-livre') {
        isValid = value !== '';
    }
    else if (field.id === 'whatsapp' || field.id === 'cep') {
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
    } else if (field.id === 'telefone_celular') {
        isValid = (value === '' || $(field).inputmask('isComplete'));
    } else if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = value !== '' && emailRegex.test(value);
    } else if (field.type === 'date') {
        const today = new Date().toISOString().split('T')[0];
        isValid = value !== '' && value <= today;
    } else {
        isValid = value !== '';
    }

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
    const fieldsToValidate = form.querySelectorAll('input[required]:not(:disabled), select[required]:not(:disabled), button[required]:not(:disabled)');
    const submitButton = document.getElementById('btn-finalizar-venda');
    const validityMessage = document.getElementById('form-validity-message');
    let isFormValid = true;

    fieldsToValidate.forEach(field => {
        let fieldIsValid = false;

        if (field.id === 'input-condominio-venda') {
            const semCondominio = $('#chk-sem-condominio').is(':checked');
            fieldIsValid = semCondominio ? true : field.value.trim() !== '';
        }
        else if (field.id === 'btn-complemento') {
             if (!$('#chk-sem-condominio').is(':checked')) {
                 fieldIsValid = document.getElementById('complemento').value.trim() !== '';
             } else {
                 fieldIsValid = true;
             }
        }
        else if (field.id === 'input-complemento-livre') {
             fieldIsValid = field.value.trim() !== '';
        }
        else if (field.id === 'whatsapp' || field.id === 'cep') {
            fieldIsValid = $(field).inputmask('isComplete');
        } else if (field.id === 'cpf') {
            const cleanValue = field.value.replace(/\D/g, '');
            fieldIsValid = (cleanValue.length === 11 || cleanValue.length === 14) && (cleanValue.length === 11 ? validarCPF(cleanValue) : validarCNPJ(cleanValue));
        } else {
             fieldIsValid = field.value.trim() !== '';
        }

        if (!fieldIsValid) {
            isFormValid = false;
        }
    });

    submitButton.disabled = !isFormValid;
    if (isFormValid) {
        validityMessage.style.display = 'none';
    } else {
        validityMessage.style.display = 'block';
    }
}

function showConfirmModal(title, message, yesCallback) {
    if (!bsConfirmModal) {
        console.error("Modal de confirmação não inicializado!");
        if (confirm(title + "\n" + message)) yesCallback();
        return;
    }
    document.getElementById('confirmModalLabel').textContent = title;
    document.getElementById('confirmModalBody').innerHTML = message;
    const yesButton = document.getElementById('btn-confirm-yes');
    const newYesButton = yesButton.cloneNode(true);
    yesButton.parentNode.replaceChild(newYesButton, yesButton);
    newYesButton.addEventListener('click', () => {
        bsConfirmModal.hide();
        yesCallback();
    });
    bsConfirmModal.show();
}

function getTechnologyIdFromString(technologyString) {
    const map = { 'Fibra': 1, 'Rádio': 2, 'Sem estrutura': 3, 'FTTH': 4, 'FTTB': 5 };
    return map[technologyString] || null;
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
        "CARIACICA": "3112"
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
             showModal('Erro de Autenticação', 'Não foi possível verificar seu usuário. Por favor, faça o login novamente.', 'danger');
             setTimeout(() => { window.location = "/"; }, 300);
        });
}