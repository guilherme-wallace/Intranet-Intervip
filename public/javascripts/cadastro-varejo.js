let bsInfoModal = null;
let bsConfirmModal = null;
let complementoModal = null;
let currentBlocks = [];
let selectedBlock = null;

document.addEventListener('DOMContentLoaded', function() {
    
    const infoModalElement = document.getElementById('infoModal');
    if (infoModalElement) bsInfoModal = new bootstrap.Modal(infoModalElement);
    
    const confirmModalElement = document.getElementById('confirmModal');
    if (confirmModalElement) bsConfirmModal = new bootstrap.Modal(confirmModalElement);

    const complementoModalElement = document.getElementById('complementoModal');
    if (complementoModalElement) complementoModal = new bootstrap.Modal(complementoModalElement);

    initializeThemeAndUserInfo();
    loadSellers();
    loadPlans(null);
    setupCondoSearchVenda();
    setupFormValidation();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_nascimento').setAttribute('max', today);

    //$('#cpf').inputmask('999.999.999-99');
    $('#whatsapp').inputmask('(99) 99999-9999');
    $('#telefone_celular').inputmask('(99) 9999[9]-9999');
    $('#cep').inputmask('99999-999');

    const confirmNoButton = confirmModalElement.querySelector('.btn-secondary[data-bs-dismiss="modal"]');
    if (confirmNoButton) {
        confirmNoButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            const submitButton = document.getElementById('btn-finalizar-venda');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Finalizar Cadastro <i class="bi bi-check-circle-fill ms-2"></i>';
            checkFormValidity();
            
            bsConfirmModal.hide();
            location.reload();
        });
    }

    const infoCloseButton = infoModalElement.querySelector('.btn-secondary[data-bs-dismiss="modal"]');
    if (infoCloseButton) {
        infoCloseButton.addEventListener('click', (e) => {
            e.preventDefault();
            bsInfoModal.hide();
        });
    }

    infoModalElement.addEventListener('hidden.bs.modal', () => {
        if (infoModalElement.dataset.reloadOnClose === 'true') {
            infoModalElement.dataset.reloadOnClose = 'false';
            location.reload();
        }
    });
    
const btnCartaoCpf = document.getElementById('btn-cartao-cpf');
    if (btnCartaoCpf) {
        btnCartaoCpf.addEventListener('click', function() {
            const cpfField = document.getElementById('cpf');
            const nascField = document.getElementById('data_nascimento');
            
            const cpf = cpfField.value;
            const dataNascimento = nascField.value;

            const [year, month, day] = dataNascimento.split('-');
            const dataFormatada = `${day}/${month}/${year}`;

            const url = `https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/ConsultaPublica.asp?${cpf}&NASCIMENTO=${dataFormatada}`;

            window.open(url, '_blank');
        });
    }

    setupFieldValidation();
    checkFormValidity();

    $('#btn-complemento').on('click', openComplementoModal);
    $('#btn-confirmar-complemento').on('click', () => confirmComplemento(null));
});

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

    const techString = getTechnologyString(technologyId);
    
    if (!techString) {
        planSelect.innerHTML = '<option selected disabled value="">Tecnologia não suportada</option>';
        planoHelper.textContent = 'A tecnologia deste bloco não possui planos de venda associados.';
        planSelect.disabled = true;
        return;
    }

    planSelect.innerHTML = '<option value="">Carregando...</option>';
    planSelect.disabled = true;

    try {
        const response = await fetch('/api/v5/ixc/planos-home');
        if (!response.ok) throw new Error('Falha ao buscar planos');
        const allPlans = await response.json();
        
        const filteredPlans = allPlans.filter(p => p.nome.toUpperCase().includes(techString));
        
        planSelect.innerHTML = '<option selected disabled value="">Selecione...</option>';
        if (filteredPlans.length === 0) {
            planSelect.innerHTML = '<option selected disabled value="">Nenhum plano encontrado</option>';
            planoHelper.textContent = `Nenhum plano "${techString}" encontrado.`;
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
            planoHelper.textContent = `Planos ${techString} disponíveis.`;
        }
        
    } catch (error) {
        console.error("Erro ao carregar planos:", error);
        planSelect.innerHTML = '<option selected disabled value="">Erro ao carregar</option>';
        planoHelper.textContent = 'Erro ao carregar lista de planos.';
        showModal('Erro', 'Não foi possível carregar a lista de planos.', 'danger');
    }
}

function getTechnologyString(technologyId) {
    //console.log("getTechnologyString chamado com technologyId:", technologyId);
    const map = {
        1: 'FTTH',
        2: 'AIRMAX',
        3: null,
        4: 'FTTH',
        5: 'FTTH'
    };
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
            .then(blocks => {
                currentBlocks = blocks;
            })
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
        complementoDetails.innerHTML = `
            <h6>2. Informe o Complemento da Casa/Lote</h6>
            <label for="casa-complemento-input" class="form-label">Complemento</label>
            <input type="text" class="form-control" id="casa-complemento-input" placeholder="Ex: Casa 05, Fundos...">
            <div class="form-text">Este texto será usado como complemento no cadastro.</div>
        `;
        document.getElementById('btn-confirmar-complemento').style.display = 'block';
    } else {
        complementoDetails.innerHTML = `
            <h6>2. Selecione o Apartamento / Unidade</h6>
            <div id="apto-list" class="list-group">
                </div>
        `;
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
            validateField(field);
            checkFormValidity();
        });
        if (field.tagName === 'SELECT' || field.type === 'date') {
             field.addEventListener('change', () => {
                validateField(field);
                checkFormValidity();
            });
        }
    });
}

function validateField(field) {
    let isValid = false;
    let value = '';

    if (field.id === 'btn-complemento') {
        value = document.getElementById('complemento').value.trim();
    } else {
        value = field.value.trim();
    }
    
    if (field.id === 'whatsapp' || field.id === 'cep') {
        isValid = $(field).inputmask('isComplete');
    } else if (field.id === 'cpf') {
        const cleanValue = value.replace(/\D/g, '');
        isValid = (cleanValue.length === 11 || cleanValue.length === 14);
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

    if (field.id === 'input-condominio-venda' && value !== '') {
        isValid = true;
    }

    const fieldToStyle = (field.id === 'complemento') ? document.getElementById('btn-complemento') : field;

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
    const fieldsToValidate = form.querySelectorAll('input[required], select[required], button[required]');
    const submitButton = document.getElementById('btn-finalizar-venda');
    const validityMessage = document.getElementById('form-validity-message');
    let isFormValid = true;

    fieldsToValidate.forEach(field => {
        let fieldIsValid = false;
        
        if (field.id === 'btn-complemento') {
            fieldIsValid = document.getElementById('complemento').value.trim() !== '';
        } else if (field.id === 'whatsapp' || field.id === 'cep') {
            fieldIsValid = $(field).inputmask('isComplete');
        } else if (field.id === 'cpf') {
            const cleanValue = field.value.replace(/\D/g, '');
            fieldIsValid = (cleanValue.length === 11 || cleanValue.length === 14);
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

function setupFormValidation() {
    const form = document.getElementById('venda-form');
    form.addEventListener('submit', event => {
        event.preventDefault();
        event.stopPropagation();

        let isFormFullyValid = true;
        form.querySelectorAll('input[required], select[required]').forEach(field => {
            if (!validateField(field)) {
                isFormFullyValid = false;
            }
        });
        if (!validateField(document.getElementById('btn-complemento'))) {
            isFormFullyValid = false;
        }

        checkFormValidity();

        if (isFormFullyValid) {
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
                id_condominio: document.getElementById('hidden-condominio-id').value,
                // Venda
                id_vendedor: document.getElementById('vendedor').value,
                id_plano_ixc: document.getElementById('plano').value, 
                data_vencimento: document.getElementById('data_vencimento').value,
                // Observações
                obs: document.getElementById('observacoes_venda').value.trim(),
                
                // Campos fixos
                ativo: "S", tipo_pessoa: "F", contribuinte_icms: "N",
                tipo_assinante: "3", tipo_localidade: "U", iss_classificacao_padrao: "99"
            };
            
            cadastrarClienteNoIXC(clientData);
            
        } else {
            showModal('Atenção', 'Por favor, corrija os campos marcados em vermelho.', 'warning');
        }

        form.classList.add('was-validated'); 
    }, false);
}

function showConfirmModal(title, message, yesCallback) {
    if (!bsConfirmModal) {
        console.error("Modal de confirmação não inicializado!");
        if (confirm(title + "\n" + message)) {
            yesCallback();
        }
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

async function cadastrarClienteNoIXC(clientData, existingClientId = null) {
    const submitButton = document.getElementById('btn-finalizar-venda');
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Cadastrando...';

    const payload = { ...clientData };
    if (existingClientId) {
        payload.existingClientId = existingClientId;
    }

    try {
        console.log("Enviando dados para a API:", payload);
        
        const response = await fetch('/api/v5/ixc/cliente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro desconhecido no servidor.');
        }
        
        showModal('Sucesso!', 
            `Venda finalizada com sucesso!
             <br><strong>Cliente ID:</strong> ${result.clienteId}
             <br><strong>Contrato ID:</strong> ${result.contratoId}
             <br><strong>Login ID:</strong> ${result.loginId}
             <br><strong>Atendimento ID:</strong> ${result.ticketId}`,
            'success'
        );
        
        document.getElementById('venda-form').reset();
        document.getElementById('venda-form').classList.remove('was-validated');
        document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
            el.classList.remove('is-valid', 'is-invalid');
        });
        resetComplementoAndPlano();
        
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);

        const cpfErrorMessage = "Este CNPJ/CPF já está Cadastrado!";
        if (error.message && error.message.includes(cpfErrorMessage)) {
            const match = error.message.match(/ID: (\d+) - \((.*?)\)/);
            
            if (match && match[1] && match[2]) {
                const extractedId = match[1];
                const extractedName = match[2];
                
                showConfirmModal(
                    'Cliente já Cadastrado',
                    `Este CPF já está cadastrado para o cliente: <strong>${extractedName} (ID: ${extractedId})</strong>.<br><br>Deseja criar um novo contrato para este cliente?`,
                    () => {
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
             submitButton.innerHTML = 'Finalizar Cadastro <i class="bi bi-check-circle-fill ms-2"></i>';
             checkFormValidity();
        }
    }
}

function getTechnologyIdFromString(technologyString) {
    const map = {
        'Fibra': 1,
        'Rádio': 2,
        'Sem estrutura': 3,
        'FTTH': 4,
        'FTTB': 5
    };
    return map[technologyString] || null;
}

function getCidadeNome(cidadeId) {
    const cidades = {"3173": "Vitória", "3172": "Vila Velha", "3169": "Viana", "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica"};
    return cidades[cidadeId] || '';
}

function getUfFromCidadeId(cidadeId) {
    if (cidadeId) return 'ES';
    return '';
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