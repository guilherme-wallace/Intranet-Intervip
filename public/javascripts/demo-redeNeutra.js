/* javascripts/cadastro-redeNeutra.js */

const MAPA_PARCEIROS = {
    'villaggionet': { nome: 'RODRIGO GONCALVES DENICOLO', perfil: 'RN - VILLAGGIONET' },
    'ultracom': { nome: 'ULTRACOM TELECOMUNICACOES LTDA', perfil: 'RN - ULTRACOM' },
    'seliga': { nome: 'SELIGA TELECOMUNICACOES DO BRASIL EIRELI', perfil: 'RN - Seliga' },
    'nv7': { nome: 'NV7 TELECOM LTDA', perfil: 'RN - NV7' },
    'netplanety': { nome: 'NETPLANETY INFOTELECOM LTDA ME', perfil: 'RN - Net Planety' },
    'infinity': { nome: 'MARCOS VIEIRA KRUGER', perfil: 'RN - MARCOS KRUGER - PF' },
    'inova.telecom': { nome: 'MAICON DE FRANCA CHAVES', perfil: 'RN - MAICON DE FRANCA' },
    'conectmais': { nome: 'CONECTMAIS COMUNICACOES LTDA', perfil: 'RN - CONECTMAIS' },
    'conectja': { nome: 'CONECTJA TELECOMUNICACOES LTDA', perfil: 'RN - Conectja' }
};

let modalCadastro = null;
let modalONU = null;
let modalListaONUs = null; 
let modalEditar = null;
let complementoModal = null;
let parceiroIdSelecionado = null;
let loginAtualId = null;
let nomeAtual = null;
let listaTransmissoresCache = [];
let currentBlocks = [];
let selectedBlock = null;
let contextComplemento = 'rn';
let todosClientesCache = [];
let listaOnusCache = [];
let paginaAtual = 1;
const itensPorPagina = 15;
let currentSort = { column: 'created_at', direction: 'desc' };
let planosCache = []; 
let userGroupGlobal = '';
let usernameGlobal = '';

document.addEventListener('DOMContentLoaded', function() {
    modalCadastro = new bootstrap.Modal(document.getElementById('modalCadastroCliente'));
    modalONU = new bootstrap.Modal(document.getElementById('modalGerenciarONU'));
    modalListaONUs = new bootstrap.Modal(document.getElementById('modalListaONUs'));
    modalEditar = new bootstrap.Modal(document.getElementById('modalEditarCliente'));

    const suporteModalEl = document.getElementById('modalSuporte');
    if (suporteModalEl) modalSuporte = new bootstrap.Modal(suporteModalEl);
    
    const complementoModalEl = document.getElementById('complementoModal');
    if(complementoModalEl) complementoModal = new bootstrap.Modal(complementoModalEl);

    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const modalEl = btn.closest('.modal');
            if (modalEl) {
                if (modalEl.id === 'modalCadastroCliente' && modalCadastro) modalCadastro.hide();
                else if (modalEl.id === 'modalGerenciarONU' && modalONU) modalONU.hide();
                else if (modalEl.id === 'modalListaONUs' && modalListaONUs) modalListaONUs.hide();
                else if (modalEl.id === 'modalEditarCliente' && modalEditar) modalEditar.hide();
                else if (modalEl.id === 'modalSuporte' && modalSuporte) modalSuporte.hide();
                else if (modalEl.id === 'complementoModal' && complementoModal) complementoModal.hide();
                else {
                    try {
                        const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        instance.hide();
                    } catch(e) { console.error("Erro ao fechar modal:", e); }
                }
            }
        });
    });

    $('#rn-cep').inputmask('99999-999');
    $('#edit-cep').inputmask('99999-999');
    $('#onu-mac').on('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    $('#rn-cod-cliente-parceiro').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    $('#rn-numero').on('input', function() {
        if (this.value !== 'SN') {
            this.value = this.value.replace(/[^0-9]/g, '');
        }
    });

    $('#btn-rn-sem-numero').on('click', function() {
        const input = $('#rn-numero');
        if (input.val() === 'SN') {
            input.val('').prop('readonly', false).focus();
            $(this).removeClass('btn-secondary text-white').addClass('btn-outline-secondary');
        } else {
            input.val('SN').prop('readonly', true).removeClass('is-invalid').addClass('is-valid');
            $(this).removeClass('btn-outline-secondary').addClass('btn-secondary text-white');
        }
    });

    document.getElementById('btn-edit-complemento').addEventListener('click', function() {
        contextComplemento = 'edit';
        openComplementoModal();
    });

    document.getElementById('btn-complemento').addEventListener('click', function() {
        contextComplemento = 'rn';
        openComplementoModal();
    });

    document.getElementById('modalEditarCliente').addEventListener('hidden.bs.modal', function () {
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);
    });

    setupListeners();
    setupCondoSearch();
    setupCondoSearchEdit(); 
    carregarParceiros();
    carregarPlanosRedeNeutra();
    initializeThemeAndUserInfo();
    configurarTabelaCliente();
    carregarLocalidades();

    $('#rn-uf, #edit-uf').on('change blur input', function() {
        const valorCorrigido = corrigirUfParaSigla(this.value);
        if (this.value !== valorCorrigido) {
            this.value = valorCorrigido;
        }
    });
});

function setupListeners() {
    document.getElementById('select-parceiro').addEventListener('change', function(e) {
        parceiroIdSelecionado = e.target.value;
        const btnNovo = document.getElementById('btn-novo-cliente');
        const option = e.target.options[e.target.selectedIndex];
        
        const valorFixo = parseFloat(option.dataset.valorFixo);
        const spanValorFixo = document.getElementById('stats-valor-fixo');
        
        if (valorFixo > 0 && usernameGlobal !== 'NOC-netplanety') {
            spanValorFixo.textContent = `R$ ${valorFixo.toFixed(2)}`;
            spanValorFixo.parentElement.style.display = 'block'; 
        } else {
            spanValorFixo.textContent = 'N/A';
            spanValorFixo.parentElement.style.display = 'none'; 
        }

        const selectPlanos = document.getElementById('rn-plano');
        selectPlanos.innerHTML = '<option value="" selected disabled>Selecione o plano...</option>';

        if (valorFixo > 0) {
            const planoFixo = planosCache.find(p => p.id == "9091");
            if (planoFixo) {
                selectPlanos.innerHTML = '';
                const opt = document.createElement('option');
                opt.value = planoFixo.id;
                opt.textContent = `${planoFixo.nome_exibicao} (R$ ${valorFixo.toFixed(2)})`;
                opt.dataset.precoOriginal = planoFixo.preco;
                opt.dataset.nome = planoFixo.nome_exibicao;
                opt.dataset.originalName = planoFixo.nome_original;
                opt.dataset.valor = valorFixo;
                opt.setAttribute('selected', 'selected');
                selectPlanos.appendChild(opt);
                selectPlanos.style.pointerEvents = 'none';
                selectPlanos.classList.add('bg-light');
            }
        } else {
            planosCache.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.nome_exibicao} (R$ ${parseFloat(p.preco).toFixed(2)})`;
                opt.dataset.precoOriginal = p.preco;
                opt.dataset.nome = p.nome_exibicao;
                opt.dataset.originalName = p.nome_original;
                opt.dataset.valor = p.preco;
                selectPlanos.appendChild(opt);
            });
            selectPlanos.style.pointerEvents = 'auto';
            selectPlanos.classList.remove('bg-light');
        }

        if (parceiroIdSelecionado) {
            btnNovo.disabled = false;
            carregarCarteiraClientes(parceiroIdSelecionado);
        }
    });

    document.getElementById('btn-refresh-carteira').addEventListener('click', () => {
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);
    });

    document.getElementById('btn-novo-cliente').addEventListener('click', () => {
        resetFormCadastro();
        modalCadastro.show();
    });
    
    document.getElementById('btn-salvar-sem-onu').addEventListener('click', () => salvarNovoCliente(false));
    document.getElementById('btn-salvar-com-onu').addEventListener('click', () => salvarNovoCliente(true));

    $('#rn-cep').on('blur', () => buscarEnderecoPorCEP('rn'));
    $('#edit-cep').on('blur', () => buscarEnderecoPorCEP('edit'));
    
    $('#chk-sem-condominio').on('change', function() {
        if ($(this).is(':checked')) {
            $('#input-condominio-venda').val('').attr('placeholder', 'Digite o nome do Bairro / Condomínio');
            $('#hidden-condominio-id').val('');
            currentBlocks = [];
        } else {
            $('#input-condominio-venda').attr('placeholder', 'Digite o nome para buscar...');
        }
    });

    $('#btn-complemento').on('click', openComplementoModal);
    $('#btn-confirmar-complemento').on('click', () => confirmComplemento(null));

    document.getElementById('btn-salvar-edicao').addEventListener('click', salvarEdicaoCliente);
    document.getElementById('btn-cancelar-cliente').addEventListener('click', cancelarCliente);

    document.getElementById('btn-abrir-gerenciar-onu').addEventListener('click', function() {
        const loginId = document.getElementById('edit-login-id-ixc').value;
        const mac = document.getElementById('edit-mac-atual').value;
        const nomeDesc = document.getElementById('edit-descricao').value;
        
        if (loginId) {
            abrirModalONU(loginId, nomeDesc, mac);
        } else {
            alert("Este cliente não possui um Login IXC vinculado para gerenciar a ONU.");
        }
    });
    
    const btnAbrirSuporte = document.getElementById('btn-abrir-modal-suporte');
    if (btnAbrirSuporte) {
        btnAbrirSuporte.addEventListener('click', function() {
            if (modalSuporte) {
                document.getElementById('msgSuporteManual').value = '';
                modalSuporte.show();
            } else {
                alert("Erro ao inicializar modal de suporte. Recarregue a página.");
            }
        });
    }
    
    const btnEnviarSuporte = document.getElementById('btnEnviarSuporteManual');
    if (btnEnviarSuporte) {
        btnEnviarSuporte.addEventListener('click', async function() {
            const msg = document.getElementById('msgSuporteManual').value.trim();
            if (!msg) {
                alert("Por favor, descreva o problema.");
                return;
            }

            const btn = this;
            const textoOriginal = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = 'Enviando...';

            await abrirChamadoSuporte(msg, 'Solicitação Manual do Usuário');

            btn.disabled = false;
            btn.innerHTML = textoOriginal;

            if (modalSuporte) {
                modalSuporte.hide();
            }
            
            alert("Sua solicitação foi enviada ao NOC!");
        });
    }

    document.getElementById('btn-abrir-lista-onus').addEventListener('click', abrirListaONUs);
    document.getElementById('btn-autorizar-onu').addEventListener('click', autorizarONU);
    document.getElementById('btn-desautorizar-onu').addEventListener('click', desautorizarONU);

    document.getElementById('btn-sync-onus-pendentes').addEventListener('click', async function() {
        const btn = this;
        const originalHtml = btn.innerHTML;
        const inputBusca = document.getElementById('input-busca-onu-lista');
        const tbody = document.getElementById('lista-onus-body');
        const loading = document.getElementById('loading-onus');

        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sincronizando...';
        btn.disabled = true;
        inputBusca.value = "";
        tbody.innerHTML = '';
        loading.style.display = 'block';

        setTimeout(() => {
            listaOnusCache = [
                { id: 1, mac: "F4:8C:50:AA:BB:CC", modelo: "ZTE-F670L", pon_id: "0/1/1", data_leitura: new Date().toLocaleString() },
                { id: 2, mac: "A1:B2:C3:D4:E5:F6", modelo: "HUAWEI-EG8145", pon_id: "0/2/3", data_leitura: new Date().toLocaleString() }
            ];
            
            loading.style.display = 'none';
            renderizarLinhasONU(listaOnusCache);
            
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }, 1200);
    });

    document.getElementById('btn-reiniciar-onu').addEventListener('click', async function() {
        const idFibra = document.getElementById('hidden-id-fibra-atual').value;
        if (!idFibra) return alert('ID do Cliente Fibra não encontrado. Atualize a página e tente novamente.');
        if (!confirm('Deseja realmente enviar o comando para REINICIAR a ONU deste cliente?')) return;

        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

        setTimeout(() => {
            alert('Comando enviado com sucesso!');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 800);
    });

    document.getElementById('btn-liberar-web').addEventListener('click', async function() {
        const idFibra = document.getElementById('hidden-id-fibra-atual').value;
        if (!confirm('Deseja tentar LIBERAR O ACESSO WEB remoto desta ONU?')) return;

        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

        setTimeout(() => {
            alert('Comando de Liberação WEB enviado com sucesso!');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 800);
    });

    document.getElementById('input-busca-onu-lista').addEventListener('keyup', function() {
        const termo = this.value.toLowerCase();
        const filtradas = listaOnusCache.filter(onu => 
            (onu.mac && onu.mac.toLowerCase().includes(termo)) ||
            (onu.model && onu.model.toLowerCase().includes(termo))
        );
        renderizarLinhasONU(filtradas);
    });

    const selectOnu = document.getElementById('select-onu-pendente');
    if (selectOnu) {
        selectOnu.addEventListener('change', function() {
            const opt = this.options[this.selectedIndex];
            const detailsDiv = document.getElementById('detalhes-onu-selecionada');
            
            if (opt.value) {
                document.getElementById('det-mac').textContent = opt.dataset.mac || '-';
                document.getElementById('det-modelo').textContent = opt.dataset.modelo || '-';
                document.getElementById('det-olt').textContent = opt.dataset.olt || '-';
                detailsDiv.style.display = 'block';
            } else {
                detailsDiv.style.display = 'none';
            }
        });
    }

    const btnRefreshList = document.getElementById('btn-refresh-lista-onus');
    if (btnRefreshList) {
        btnRefreshList.addEventListener('click', carregarListasONU);
    }
}

function configurarTabelaCliente() {
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
            renderizarTabela();
        });
    });

    document.getElementById('input-busca-cliente').addEventListener('keyup', () => { paginaAtual = 1; renderizarTabela(); });
    document.getElementById('chk-mostrar-cancelados').addEventListener('change', () => { paginaAtual = 1; renderizarTabela(); });
}

function atualizarIconesOrdenacao() {
    document.querySelectorAll('th.sortable i').forEach(icon => {
        icon.className = 'bi bi-arrow-down-up small ms-1 text-muted';
    });
    const activeTh = document.querySelector(`th[data-sort="${currentSort.column}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        icon.className = currentSort.direction === 'asc' ? 'bi bi-sort-up ms-1 text-primary' : 'bi bi-sort-down ms-1 text-primary';
    }
}

let bancoDeDadosFalso = [
    //parceiro_id 1 - Comercial Telecom
    {
        id: 101, parceiro_id: 1, token: "DMO01", descricao_produto: "DMO01-Supermercado Silva", login_pppoe: "silva.demo",
        valor: "89.90", created_at: "2023-10-15T10:00:00Z", endereco: "Avenida Central", numero: "100", bairro: "Centro",
        is_autorizado: true, is_online: true, sinal_rx: "-19.50", sinal_tx: "2.10", ixc_login_id: 1001, onu_mac: "A1:B2:C3:D4:E5:F1"
    },
    {
        id: 102, parceiro_id: 1, token: "DMO02", descricao_produto: "DMO02-Clinica Saude", login_pppoe: "saude.demo",
        valor: "99.90", created_at: "2023-11-20T14:30:00Z", endereco: "Rua das Flores", numero: "45", bairro: "Jardim Botanico",
        is_autorizado: true, is_online: true, sinal_rx: "-21.20", sinal_tx: "1.80", ixc_login_id: 1002, onu_mac: "A1:B2:C3:D4:E5:F2"
    },
    {
        id: 103, parceiro_id: 1, token: "DMO03", descricao_produto: "DMO03-Tech Solutions", login_pppoe: "tech.demo",
        valor: "150.00", created_at: "2024-01-05T09:15:00Z", endereco: "Rua da Tecnologia", numero: "999", bairro: "Polo Industrial",
        is_autorizado: true, is_online: true, sinal_rx: "-23.10", sinal_tx: "2.50", ixc_login_id: 1003, onu_mac: "A1:B2:C3:D4:E5:F3"
    },
    {
        id: 104, parceiro_id: 1, token: "DMO04", descricao_produto: "DMO04-Padaria Pao Quente", login_pppoe: "padaria.demo",
        valor: "79.90", created_at: "2024-02-10T08:00:00Z", endereco: "Praça da Matriz", numero: "12", bairro: "Centro",
        is_autorizado: true, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: 1004, onu_mac: "A1:B2:C3:D4:E5:F4"
    },
    {
        id: 105, parceiro_id: 1, token: "DMO05", descricao_produto: "DMO05-Escola Aprender", login_pppoe: "escola.demo",
        valor: "199.90", created_at: "2024-03-12T13:45:00Z", endereco: "Avenida da Educação", numero: "300", bairro: "Bairro Universitário",
        is_autorizado: true, is_online: true, sinal_rx: "-20.00", sinal_tx: "2.00", ixc_login_id: 1005, onu_mac: "A1:B2:C3:D4:E5:F5"
    },
    {
        id: 106, parceiro_id: 1, token: "DMO06", descricao_produto: "DMO06-Oficina do Joao", login_pppoe: "oficina.demo",
        valor: "89.90", created_at: "2024-04-22T16:20:00Z", endereco: "Rua dos Mecânicos", numero: "77", bairro: "Vila Operária",
        is_autorizado: false, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: null, onu_mac: null
    },
    {
        id: 107, parceiro_id: 1, token: "DMO07", descricao_produto: "DMO07-Restaurante Bom Gosto", login_pppoe: "bomgosto.demo",
        valor: "120.00", created_at: "2024-05-18T11:10:00Z", endereco: "Rua Gastronômica", numero: "50", bairro: "Orla",
        is_autorizado: true, is_online: true, sinal_rx: "-24.80", sinal_tx: "2.80", ixc_login_id: 1007, onu_mac: "A1:B2:C3:D4:E5:F7"
    },
    {
        id: 108, parceiro_id: 1, token: "DMO08", descricao_produto: "(C) DMO08-Cliente Cancelado", login_pppoe: "cancelado.demo",
        valor: "0.00", created_at: "2023-08-01T09:00:00Z", endereco: "Rua Antiga", numero: "10", bairro: "Centro Histórico",
        is_autorizado: false, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: 1008, onu_mac: null
    },
    {
        id: 109, parceiro_id: 1, token: "DMO09", descricao_produto: "DMO09-Farmacia Saude Total", login_pppoe: "farmacia.demo",
        valor: "99.90", created_at: "2024-06-05T15:30:00Z", endereco: "Avenida Principal", numero: "SN", bairro: "Centro",
        is_autorizado: true, is_online: true, sinal_rx: "-18.50", sinal_tx: "1.90", ixc_login_id: 1009, onu_mac: "A1:B2:C3:D4:E5:F9"
    },
    {
        id: 110, parceiro_id: 1, token: "DMO10", descricao_produto: "DMO10-Conexão ITX-PTP", login_pppoe: "ptp.demo",
        valor: "500.00", created_at: "2024-07-10T10:00:00Z", endereco: "Torre de Transmissão", numero: "1", bairro: "Morro Alto",
        is_autorizado: true, is_online: true, sinal_rx: "-16.00", sinal_tx: "1.50", ixc_login_id: 1010, onu_mac: "A1:B2:C3:D4:E5:10"
    },

    //parceiro_id 2 - parceiro exemplo 2
    {
        id: 101, parceiro_id: 2, token: "DMO01", descricao_produto: "DMO01-Supermercado Silva", login_pppoe: "silva.demo",
        valor: "30.90", created_at: "2023-10-15T10:00:00Z", endereco: "Avenida Central", numero: "100", bairro: "Centro",
        is_autorizado: true, is_online: true, sinal_rx: "-19.50", sinal_tx: "2.10", ixc_login_id: 1001, onu_mac: "A1:B2:C3:D4:E5:F1"
    },
    {
        id: 102, parceiro_id: 2, token: "DMO02", descricao_produto: "DMO02-Clinica Saude", login_pppoe: "saude.demo",
        valor: "30.90", created_at: "2023-11-20T14:30:00Z", endereco: "Rua das Flores", numero: "45", bairro: "Jardim Botanico",
        is_autorizado: true, is_online: true, sinal_rx: "-21.20", sinal_tx: "1.80", ixc_login_id: 1002, onu_mac: "A1:B2:C3:D4:E5:F2"
    },
    {
        id: 103, parceiro_id: 2, token: "DMO03", descricao_produto: "DMO03-Tech Solutions", login_pppoe: "tech.demo",
        valor: "30.00", created_at: "2024-01-05T09:15:00Z", endereco: "Rua da Tecnologia", numero: "999", bairro: "Polo Industrial",
        is_autorizado: true, is_online: true, sinal_rx: "-23.10", sinal_tx: "2.50", ixc_login_id: 1003, onu_mac: "A1:B2:C3:D4:E5:F3"
    },
    {
        id: 104, parceiro_id: 2, token: "DMO04", descricao_produto: "DMO04-Padaria Pao Quente", login_pppoe: "padaria.demo",
        valor: "30.90", created_at: "2024-02-10T08:00:00Z", endereco: "Praça da Matriz", numero: "12", bairro: "Centro",
        is_autorizado: true, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: 1004, onu_mac: "A1:B2:C3:D4:E5:F4"
    },
    {
        id: 105, parceiro_id: 2, token: "DMO05", descricao_produto: "DMO05-Escola Aprender", login_pppoe: "escola.demo",
        valor: "30.90", created_at: "2024-03-12T13:45:00Z", endereco: "Avenida da Educação", numero: "300", bairro: "Bairro Universitário",
        is_autorizado: true, is_online: true, sinal_rx: "-20.00", sinal_tx: "2.00", ixc_login_id: 1005, onu_mac: "A1:B2:C3:D4:E5:F5"
    },
    {
        id: 106, parceiro_id: 2, token: "DMO06", descricao_produto: "DMO06-Oficina do Joao", login_pppoe: "oficina.demo",
        valor: "30.90", created_at: "2024-04-22T16:20:00Z", endereco: "Rua dos Mecânicos", numero: "77", bairro: "Vila Operária",
        is_autorizado: false, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: null, onu_mac: null
    },
    {
        id: 107, parceiro_id: 2, token: "DMO07", descricao_produto: "DMO07-Restaurante Bom Gosto", login_pppoe: "bomgosto.demo",
        valor: "30.90", created_at: "2024-05-18T11:10:00Z", endereco: "Rua Gastronômica", numero: "50", bairro: "Orla",
        is_autorizado: true, is_online: true, sinal_rx: "-24.80", sinal_tx: "2.80", ixc_login_id: 1007, onu_mac: "A1:B2:C3:D4:E5:F7"
    },
    {
        id: 108, parceiro_id: 2, token: "DMO08", descricao_produto: "(C) DMO08-Cliente Cancelado", login_pppoe: "cancelado.demo",
        valor: "0.00", created_at: "2023-08-01T09:00:00Z", endereco: "Rua Antiga", numero: "10", bairro: "Centro Histórico",
        is_autorizado: false, is_online: false, sinal_rx: "-", sinal_tx: "-", ixc_login_id: 1008, onu_mac: null
    },
    {
        id: 109, parceiro_id: 2, token: "DMO09", descricao_produto: "DMO09-Farmacia Saude Total", login_pppoe: "farmacia.demo",
        valor: "30.90", created_at: "2024-06-05T15:30:00Z", endereco: "Avenida Principal", numero: "SN", bairro: "Centro",
        is_autorizado: true, is_online: true, sinal_rx: "-18.50", sinal_tx: "1.90", ixc_login_id: 1009, onu_mac: "A1:B2:C3:D4:E5:F9"
    },
    {
        id: 110, parceiro_id: 2, token: "DMO10", descricao_produto: "DMO10-Conexão ITX-PTP", login_pppoe: "ptp.demo",
        valor: "30.90", created_at: "2024-07-10T10:00:00Z", endereco: "Torre de Transmissão", numero: "1", bairro: "Morro Alto",
        is_autorizado: true, is_online: true, sinal_rx: "-16.00", sinal_tx: "1.50", ixc_login_id: 1010, onu_mac: "A1:B2:C3:D4:E5:10"
    }

];

async function carregarCarteiraClientes(parceiroId) {
    const painel = document.getElementById('painel-clientes');
    const loading = document.getElementById('loading-clientes');
    const tableContainer = document.querySelector('.table-responsive');
    const empty = document.getElementById('empty-clientes');

    painel.style.display = 'block';
    loading.style.display = 'block';
    tableContainer.style.display = 'none';
    empty.style.display = 'none';
    
    setTimeout(() => {
        loading.style.display = 'none';
        
        todosClientesCache = bancoDeDadosFalso.filter(c => c.parceiro_id == parceiroId);
        
        if (todosClientesCache.length === 0) {
            empty.style.display = 'block';
        } else {
            tableContainer.style.display = 'block';
            paginaAtual = 1;
            renderizarTabela(); 
        }
    }, 600);
}

function renderizarTabela() {
    const tbody = document.getElementById('tabela-clientes-body');
    const termo = document.getElementById('input-busca-cliente').value.toLowerCase();
    const mostrarCancelados = document.getElementById('chk-mostrar-cancelados').checked;
    
    let filtrados = todosClientesCache.filter(item => {
        const isCancelado = item.descricao_produto && item.descricao_produto.includes('(C)');
        if (!mostrarCancelados && isCancelado) return false;

        const textoBusca = `${item.descricao_produto} ${item.login_pppoe} ${item.token} ${item.endereco} ${item.bairro}`.toLowerCase();
        return textoBusca.includes(termo);
    });

    filtrados.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];

        if (currentSort.column === 'valor') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        } else if (currentSort.column === 'created_at') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalRegistros = filtrados.length;
    const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);
    if (paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const dadosPagina = filtrados.slice(inicio, fim);

    const thValor = document.getElementById('th-valor');
    if (thValor) {
        thValor.style.display = usernameGlobal === 'NOC-netplanety' ? 'none' : '';
    }

    tbody.innerHTML = '';
    
    document.getElementById('stats-total-clientes').textContent = totalRegistros;
    document.getElementById('contador-registros').textContent = `Exibindo ${totalRegistros > 0 ? inicio + 1 : 0} a ${Math.min(fim, totalRegistros)} de ${totalRegistros} registros`;

dadosPagina.forEach(item => {
        const tr = document.createElement('tr');
        
        let descricaoVisual = item.descricao_produto || '---';
        const isCancelado = descricaoVisual.includes('(C)');
        
        if (item.token) {
            descricaoVisual = descricaoVisual.replace(new RegExp('^\\(C\\)\\s*'), '').replace(new RegExp('^' + item.token + '-?'), '');
        } else {
            descricaoVisual = descricaoVisual.replace(new RegExp('^\\(C\\)\\s*'), '').replace(/^[A-Z0-9]{5}-/, '');
        }

        let enderecoVisual = item.endereco || '';
        if (item.numero) enderecoVisual += `, ${item.numero}`;
        let extraInfo = item.bairro || '';
        if(item.complemento) extraInfo += ` - ${item.complemento}`;

        const valor = item.valor ? parseFloat(item.valor).toFixed(2) : '0.00';
        const dataCriacao = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-';
        const dadosJson = JSON.stringify(item).replace(/"/g, '&quot;');

        let authBadge = '';
        let onlineBadge = '';

        if (isCancelado) {
            authBadge = `<span class="badge badge-purple me-1"><i class="bi bi-x-circle"></i> Cancelado</span>`;
            onlineBadge = `<span class="badge bg-secondary">Inativo</span>`;
            tr.classList.add('row-cancelled');
        } else {
            if (item.is_autorizado) {
                authBadge = `<span class="badge bg-primary me-1" title="ONU Vinculada"><i class="bi bi-router"></i> Autorizada</span>`;
            } else {
                authBadge = `<span class="badge bg-warning text-dark me-1"><i class="bi bi-exclamation-triangle"></i> Pendente</span>`;
            }

            if (!item.ixc_login_id) {
                onlineBadge = `<span class="badge bg-secondary">Sem Login</span>`;
            } else if (item.is_online) {
                onlineBadge = `<span class="badge bg-success"><i class="bi bi-wifi"></i> Online</span>`;
            } else {
                onlineBadge = `<span class="badge bg-danger"><i class="bi bi-wifi-off"></i> Offline</span>`;
            }
        }

        let sinalDisplay = '<small class="text-muted">-</small>';
        if (item.sinal_rx && item.sinal_rx !== '-') {
            const getStyleSinal = (val) => {
                const v = parseFloat(val);
                if (isNaN(v) || v === 0) return 'style="color: #6f42c1; font-weight: bold;"'; 
                if (v > -26) return 'class="text-success fw-bold"'; 
                if (v >= -29) return 'class="text-warning fw-bold"'; 
                return 'class="text-danger fw-bold"'; 
            };

            const attrRx = getStyleSinal(item.sinal_rx);
            const attrTx = getStyleSinal(item.sinal_tx);
            
            sinalDisplay = `<div style="font-size: 0.85rem;">
                <span ${attrRx}>RX: ${item.sinal_rx}</span><br>
                <span ${attrTx}>TX: ${item.sinal_tx}</span>
            </div>`;
        }

        let actionBtnHtml = `
            <button class="btn btn-sm btn-outline-secondary me-1 btn-editar-cliente" data-cliente="${dadosJson}">
                <i class="bi bi-eye-fill"></i> Ver
            </button>
        `;

        if (descricaoVisual.includes('ITX-PTP')) {
            authBadge = `<span class="badge" style="background-color: #add8e6; color: #000;"><i class="bi bi-info-circle me-1"></i>Informativo</span>`;
            onlineBadge = '';
            sinalDisplay = `<small class="text-muted">-</small>`;
            actionBtnHtml = ``;
        }

        const valorHtml = usernameGlobal === 'NOC-netplanety' 
            ? '' 
            : `<td class="text-align-center">R$ ${valor}</td>`;

        tr.innerHTML = `
            <td>
                <div class="fw-bold text-primary">${descricaoVisual}</div>
                <div class="small text-muted text-truncate" style="max-width: 250px;">
                    <i class="bi bi-geo-alt-fill me-1"></i>${enderecoVisual}<br>
                    <span class="text-secondary" style="font-size: 0.75em;">${extraInfo}</span>
                </div>
            </td>
            <td class="text-align-center">${dataCriacao}</td>
            
            ${valorHtml}
            
            <td class="text-align-center">
                <div class="d-flex flex-column gap-1">
                    ${authBadge}
                    ${onlineBadge}
                </div>
            </td>
            <td class="text-align-center">${sinalDisplay}</td>
            <td class="text-end text-align-center">
                ${actionBtnHtml}
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

    renderizarControlesPaginacao(totalPaginas);
}

function renderizarControlesPaginacao(totalPaginas) {
    const container = document.getElementById('paginacao-container');
    container.innerHTML = '';
    
    if (totalPaginas <= 1) return;

    const criarBotao = (texto, page, disabled, active) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${texto}</a>`;
        if (!disabled) {
            li.addEventListener('click', (e) => {
                e.preventDefault();
                paginaAtual = page;
                renderizarTabela();
            });
        }
        container.appendChild(li);
    };

    criarBotao('Anterior', paginaAtual - 1, paginaAtual === 1);
    
    let startPage = Math.max(1, paginaAtual - 2);
    let endPage = Math.min(totalPaginas, paginaAtual + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        criarBotao(i, i, false, i === paginaAtual);
    }
    
    criarBotao('Próximo', paginaAtual + 1, paginaAtual === totalPaginas);
}

function showLoading(texto) {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function setupCondoSearch() {
    $('#input-condominio-venda').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                const falsos = [
                    { value: 1, text: "SEA - Condominio das Arvores" },
                    { value: 2, text: "VTA - Edificio Comercial Teste" }
                ];
                callback(falsos);
            }
        }
    });

    $('#input-condominio-venda').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#hidden-condominio-id").val(item.value);
        
        setTimeout(() => {
            $('#input-condominio-venda').val(formatCondoName(item.text));

            $("#rn-cep").val('29000-000');
            $('#rn-numero').val('100'); 
            $("#rn-endereco").val('Avenida Principal Demonstrativa');
            $("#rn-bairro").val('Bairro Teste');
            $("#rn-cidade").val('Vitória');
            $("#rn-uf").val('ES');
            $("#hidden-cidade-id").val('1');
            
            currentBlocks = [
                { id: 1, name: 'Bloco A', type: 'Apartamento', floors: 5, initialFloor: 1, units: 4 },
                { id: 2, name: 'Unico', type: 'Casa', floors: null }
            ];
            $('#btn-complemento').text('Selecione o complemento...').prop('disabled', false);
        }, 300);
    });
}

function setupCondoSearchEdit() {
    $('#edit-condominio').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                const falsos = [
                    { value: 1, text: "SEA - Condominio das Arvores" },
                    { value: 2, text: "VTA - Edificio Comercial Teste" }
                ];
                callback(falsos);
            }
        }
    });

    $('#edit-condominio').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#edit-hidden-condominio-id").val(item.value);
        
        setTimeout(() => {
            $('#edit-condominio').val(formatCondoName(item.text));

            $("#edit-cep").val('29000-000');
            $('#edit-numero').val('100'); 
            $("#edit-endereco").val('Avenida Principal Demonstrativa');
            $("#edit-bairro").val('Bairro Teste');
            $("#edit-cidade").val('Vitória');
            $("#edit-uf").val('ES');
            $("#edit-hidden-cidade-id").val('1');
            
            currentBlocks = [
                { id: 1, name: 'Bloco A', type: 'Apartamento', floors: 5, initialFloor: 1, units: 4 },
                { id: 2, name: 'Unico', type: 'Casa', floors: null }
            ];
            $('#btn-edit-complemento').prop('disabled', false).text('Selecionar...');
            $('#edit-complemento-text').val('');
        }, 300);
    });

    $('#edit-sem-condominio').on('change', function() {
        const checked = $(this).is(':checked');
        const inputCondo = $('#edit-condominio');
        const btnComp = $('#btn-edit-complemento');
        
        if (checked) {
            inputCondo.val('').attr('placeholder', 'Nome do local manual...');
            $('#edit-hidden-condominio-id').val('');
            btnComp.prop('disabled', true);
        } else {
            inputCondo.attr('placeholder', 'Buscar condomínio...');
        }
    });
}

function openComplementoModal() {
    if(contextComplemento === 'rn') {
        if ($('#chk-sem-condominio').is(':checked')) return;
    } else {
        if ($('#edit-sem-condominio').is(':checked')) return;
    }
    
    if (!currentBlocks || currentBlocks.length === 0) {
        alert('Selecione um Condomínio válido primeiro ou marque "Não cadastrado".');
        return;
    }
    
    const blocosLista = document.getElementById('blocos-lista-modal');
    blocosLista.innerHTML = '';
    document.getElementById('complemento-details').style.display = 'none';
    
    currentBlocks.forEach(block => {
        const btn = document.createElement('a');
        btn.className = 'list-group-item list-group-item-action';
        btn.textContent = (block.type === 'Casa' && block.name === 'Unico') ? 'Casas' : block.name;
        btn.onclick = () => selectBlockInModal(block);
        blocosLista.appendChild(btn);
    });
    complementoModal.show();
}

function selectBlockInModal(block) {
    selectedBlock = block;
    const details = document.getElementById('complemento-details');
    details.style.display = 'block';
    
    details.innerHTML = ''; 

    if (block.type === 'Casa' || block.floors === null) {
        details.innerHTML = `
            <h6>Informe o Complemento</h6>
            <input type="text" class="form-control" id="casa-complemento-input" placeholder="Ex: Casa 05">
        `;
        document.getElementById('btn-confirmar-complemento').style.display = 'block';
    } else {
        const title = document.createElement('h6');
        title.textContent = 'Selecione a Unidade';
        details.appendChild(title);

        const container = document.createElement('div');
        container.className = 'd-flex flex-wrap gap-2';
        
        for (let j = 0; j <= (block.floors - block.initialFloor); j++) {
            for (let k = 1; k <= block.units; k++) {
                const floor = parseInt(block.initialFloor) + j;
                const apt = `${floor}${k.toString().padStart(2, '0')}`;
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-primary btn-sm';
                btn.textContent = apt;
                btn.addEventListener('click', function() {
                    confirmComplemento(`Apto ${apt}`);
                });
                
                container.appendChild(btn);
            }
        }
        details.appendChild(container);
        document.getElementById('btn-confirmar-complemento').style.display = 'none';
    }
}

function confirmComplemento(compString) {
    let finalComp = compString;
    let bloco = (selectedBlock && selectedBlock.name !== 'Unico') ? selectedBlock.name : '';
    
    if (!finalComp) {
        finalComp = document.getElementById('casa-complemento-input').value;
    }
    
    const display = bloco ? `${bloco} - ${finalComp}` : finalComp;
    const apto = finalComp.replace('Apto ', '').trim();

    if (contextComplemento === 'rn') {
        $('#btn-complemento').text(display);
        $('#rn-complemento').val(finalComp);
        $('#hidden-bloco').val(bloco);
        $('#hidden-apartamento').val(apto);
    } else {
        $('#btn-edit-complemento').text(display);
        $('#edit-complemento-text').val(finalComp);
        $('#edit-hidden-bloco').val(bloco);
        $('#edit-hidden-apartamento').val(apto);
    }
    
    complementoModal.hide();
}

async function carregarParceiros() {
    const select = document.getElementById('select-parceiro');
    select.innerHTML = '<option value="" selected disabled>Selecione o Parceiro / Provedor</option>';
    
    // FAKE DATA
    const parceirosFalsos = [
        { id: 1, nome: "Comercial Telecom", ixc_contrato_id: 9999, valor_fixo: 0 },
        { id: 2, nome: "Parceiro Fixo", ixc_contrato_id: 8888, valor_fixo: 30.90 }
    ];

    parceirosFalsos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id; 
        option.textContent = `${p.nome} (Contrato: ${p.ixc_contrato_id})`;
        option.dataset.valorFixo = p.valor_fixo; 
        select.appendChild(option);
    });
}

async function abrirModalEditar(cliente) {
    document.getElementById('edit-id').value = cliente.id;
    document.getElementById('edit-token').value = cliente.token;
    document.getElementById('edit-login-id-ixc').value = cliente.ixc_login_id || '';
    document.getElementById('edit-mac-atual').value = cliente.onu_mac || '';

    const isCancelado = (cliente.descricao_produto && cliente.descricao_produto.includes('(C)'));
    
    const btnCancelar = document.getElementById('btn-cancelar-cliente');
    const badgeAviso = document.getElementById('badge-cancelado-aviso');
    const btnSalvar = document.getElementById('btn-salvar-edicao');

    if (isCancelado) {
        btnCancelar.style.display = 'none';
        badgeAviso.style.display = 'block';
        btnSalvar.disabled = true;
        
        const displayOnu = document.getElementById('display-status-onu');
        displayOnu.innerHTML = `<span class="badge badge-purple w-100 py-2"><i class="bi bi-x-octagon"></i> CLIENTE CANCELADO</span>`;
    } else {
        btnCancelar.style.display = 'block';
        badgeAviso.style.display = 'none';
        btnSalvar.disabled = false;
    }
    
    let token = cliente.token || '';
    let descricaoCompleta = cliente.descricao_produto || '';
    let descSemToken = descricaoCompleta;

    if (token && descricaoCompleta.startsWith(token + '-')) {
        descSemToken = descricaoCompleta.substring(token.length + 1); 
    } else if (token && descricaoCompleta.startsWith(token)) {
        descSemToken = descricaoCompleta.substring(token.length);
    }
    
    document.getElementById('edit-prefixo-token').textContent = token ? token + '-' : '';
    document.getElementById('edit-descricao').value = descSemToken;
    document.getElementById('edit-status').value = cliente.ativo || 'S';
    document.getElementById('edit-obs').value = cliente.obs || '';

    if (cliente.ixc_login_id) {
        const displayOnu = document.getElementById('display-status-onu');
        displayOnu.innerHTML = `<div class="d-flex align-items-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Carregando dados IXC...</div>`;
        
        setTimeout(() => {
            const dadosMocados = {
                cep: cliente.cep || '29000-000', endereco: cliente.endereco || '', numero: cliente.numero || '', bairro: cliente.bairro || '',
                online: cliente.is_online ? 'S' : 'N', mac: cliente.onu_mac, sinal_rx: cliente.sinal_rx, sinal_tx: cliente.sinal_tx,
                data_sinal: new Date().toLocaleTimeString(), id_transmissor: 'OLT-DEMO-01', onu_tipo: 'Huawei_Echolife', 
                ponid: '0/1/2', onu_numero: '15', temperatura: '45', voltagem: '3.2', user_vlan: '100'
            };

            document.getElementById('edit-cep').value = dadosMocados.cep;
            document.getElementById('edit-endereco').value = dadosMocados.endereco;
            document.getElementById('edit-numero').value = dadosMocados.numero;
            document.getElementById('edit-bairro').value = dadosMocados.bairro;
            
            document.getElementById('edit-sem-condominio').checked = true;
            document.getElementById('edit-condominio').value = "";
            $('#btn-edit-complemento').prop('disabled', true);

            atualizarInterfaceONU(dadosMocados, cliente.ixc_login_id);
        }, 600);
    }

    modalEditar.show();
}

async function cancelarCliente() {
    if (!confirm("ATENÇÃO: Você está prestes a CANCELAR este cliente.\n\nDeseja continuar?")) return;

    const btn = document.getElementById('btn-cancelar-cliente');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    showLoading("Cancelando cliente no IXC e OLT... Aguarde.");

    setTimeout(() => {
        hideLoading();
        alert("Cliente cancelado com sucesso!");
        modalEditar.hide();
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }, 1200);
}

async function carregarDetalhesONU(loginId) {
    const dadosMocados = {
        online: 'S', mac: 'AA:BB:CC:DD:EE:FF', sinal_rx: '-20.15', sinal_tx: '2.50',
        data_sinal: new Date().toLocaleTimeString(), id_transmissor: 'OLT-DEMO-01', 
        onu_tipo: 'Huawei_Echolife', ponid: '0/1/2', onu_numero: '15', 
        temperatura: '45', voltagem: '3.2', user_vlan: '100'
    };
    atualizarInterfaceONU(dadosMocados, loginId);
}

function atualizarInterfaceONU(dados, loginId) {
    document.getElementById('hidden-id-fibra-atual').value = dados.id_fibra || '';
    const displayOnu = document.getElementById('display-status-onu');
    let html = '';
    
    if (dados.mac && dados.mac.length > 5) {
        html += `<div class="mb-2 text-center"><span class="badge bg-success w-100 py-2 fs-6"><i class="bi bi-check-circle me-2"></i>AUTORIZADA</span></div>`;
    } else {
        html += `<div class="mb-2 text-center"><span class="badge bg-warning text-dark w-100 py-2 fs-6"><i class="bi bi-exclamation-triangle me-2"></i>PENDENTE</span></div>`;
    }

    const onlineBadge = dados.online === 'S' ? `<span class="badge bg-success rounded-pill">Online</span>` : `<span class="badge bg-danger rounded-pill">Offline</span>`;
    
    const getSinalProps = (val) => {
        const v = parseFloat(val);
        if (isNaN(v) || v === 0) return { cls: '', style: 'color: #47434e; font-weight: bold;' };
        if (v > -26) return { cls: 'text-success fw-bold', style: '' };
        if (v >= -29) return { cls: 'text-warning fw-bold', style: '' };
        return { cls: 'text-danger fw-bold', style: '' };
    };

    const rxProps = getSinalProps(dados.sinal_rx);
    const txProps = getSinalProps(dados.sinal_tx);

    html += `
    <div class="card mb-3 border-light bg-light">
        <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1">
                <strong>Status:</strong> ${onlineBadge}
            </div>
            <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1 mt-2">
                <span>Sinal RX:</span> <span class="${rxProps.cls}" style="${rxProps.style}" id="val-rx">${dados.sinal_rx || '-'} dBm</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span>Sinal TX:</span> <span class="${txProps.cls}" style="${txProps.style}" id="val-tx">${dados.sinal_tx || '-'} dBm</span>
            </div>
            <div class="text-end mt-1"><small class="text-muted" style="font-size: 0.9em">Ref: ${dados.data_sinal || 'Agora'}</small></div>
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

    html += `
    <button type="button" class="btn btn-outline-primary w-100 mt-3" id="btn-refresh-onu">
        <i class="bi bi-arrow-clockwise me-2"></i>Atualizar Sinal / ONU
    </button>
    `;

    displayOnu.innerHTML = html;

    document.getElementById('btn-refresh-onu').addEventListener('click', function(e) {
        e.preventDefault();
        const btn = this;
        const icon = btn.querySelector('i');
        
        icon.classList.add('spinner-border', 'spinner-border-sm');
        icon.classList.remove('bi', 'bi-arrow-clockwise');
        btn.disabled = true;

        setTimeout(() => {
            const variacaoRx = (Math.random() * 0.4 - 0.2);
            const novoRx = dados.sinal_rx && dados.sinal_rx !== '-' ? (parseFloat(dados.sinal_rx) + variacaoRx).toFixed(2) : '-21.05';
            
            const newData = { ...dados, sinal_rx: novoRx.toString(), data_sinal: new Date().toLocaleTimeString() };
            atualizarInterfaceONU(newData, loginId);
        }, 1200);
    });
}

async function salvarEdicaoCliente() {
    const btn = document.getElementById('btn-salvar-edicao');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Salvando...';

    setTimeout(() => {
        alert("Alterações salvas com sucesso!");
        modalEditar.hide();
        btn.disabled = false;
        btn.innerHTML = originalText;
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);
    }, 800);
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
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
    document.getElementById('btn-salvar-sem-onu').disabled = true;
    document.getElementById('btn-salvar-com-onu').disabled = true;

    try {
        const selectPlano = document.getElementById('rn-plano');
        if (selectPlano.selectedIndex < 0 || !selectPlano.value) throw new Error("Selecione um plano válido.");
        
        const planoOption = selectPlano.options[selectPlano.selectedIndex];
        
        const novoCliente = {
            id: Math.floor(Math.random() * 10000),
            parceiro_id: document.getElementById('select-parceiro').value,
            token: "DEMO" + Math.floor(Math.random() * 999),
            descricao_produto: "DEMO-" + document.getElementById('rn-cod-cliente-parceiro').value,
            login_pppoe: "demo.pppoe." + Math.floor(Math.random() * 999),
            valor: planoOption.dataset.valor,
            created_at: new Date().toISOString(),
            endereco: document.getElementById('rn-endereco').value,
            numero: document.getElementById('rn-numero').value,
            bairro: document.getElementById('rn-bairro').value,
            is_autorizado: false,
            is_online: false,
            sinal_rx: "-",
            sinal_tx: "-",
            ixc_login_id: Math.floor(Math.random() * 5000)
        };

        bancoDeDadosFalso.unshift(novoCliente);

        setTimeout(() => {
            modalCadastro.hide();
            carregarCarteiraClientes(novoCliente.parceiro_id);

            if (autorizarOnu) {
                abrirModalONU(novoCliente.ixc_login_id, novoCliente.login_pppoe, "Novo Contrato", "");
            } else {
                alert(`Cliente Demonstrativo Cadastrado!\nLogin: ${novoCliente.login_pppoe}`);
            }
        }, 1000);

    } catch (error) {
        console.error("Erro no cadastro:", error);
        alert('Erro: ' + error.message);
        
        if (!error.message.includes('selecione um plano válido')) {
            abrirChamadoSuporte(`Erro ao cadastrar novo cliente (Rede Neutra): ${error.message}`, 'Erro Automático - Cadastro');
        }
    } finally {
        document.getElementById('btn-salvar-sem-onu').disabled = false;
        document.getElementById('btn-salvar-com-onu').disabled = false;
        btn.innerHTML = originalText;
    }
}

async function abrirModalONU(loginId, loginName, actionType = 'Gerenciar', macAtual = '') {
    const elLoginId = document.getElementById('onu-login-id');
    const elMacAtual = document.getElementById('onu-mac-atual');
    const elNomeCliente = document.getElementById('onu-nome-cliente');

    if (elLoginId) elLoginId.value = loginId;
    if (elMacAtual) elMacAtual.value = macAtual;
    if (elNomeCliente) elNomeCliente.textContent = loginName;

    const btnDesautorizar = document.getElementById('btn-desautorizar-onu');
    const areaAutorizacao = document.getElementById('area-autorizacao');
    const areaDesvinculacao = document.getElementById('area-desvinculacao');
    const displayOnu = document.getElementById('display-status-onu');

    if (displayOnu) {
        displayOnu.innerHTML = '<div class="text-center p-3"><span class="spinner-border text-primary"></span><br>Buscando comunicação com a OLT...</div>';
    }

    if (modalONU) modalONU.show();

    setTimeout(() => {
        const mockMac = macAtual ? macAtual : ''; 

        const dadosMocados = {
            online: mockMac ? 'S' : 'N', 
            mac: mockMac, 
            sinal_rx: mockMac ? '-20.15' : '-', 
            sinal_tx: mockMac ? '2.50' : '-',
            data_sinal: mockMac ? new Date().toLocaleTimeString() : '-', 
            id_transmissor: mockMac ? 'OLT-DEMO-01' : '-', 
            onu_tipo: mockMac ? 'Huawei_Echolife' : '-', 
            ponid: mockMac ? '0/1/2' : '-', 
            onu_numero: mockMac ? '15' : '-', 
            temperatura: mockMac ? '45' : '-', 
            voltagem: mockMac ? '3.2' : '-', 
            user_vlan: mockMac ? '100' : '-'
        };
        atualizarInterfaceONU(dadosMocados, loginId);

        if (dadosMocados.mac && dadosMocados.mac.length > 5) {
            if (areaAutorizacao) areaAutorizacao.style.display = 'none';
            if (areaDesvinculacao) areaDesvinculacao.style.display = 'block';
            
            const dispMacAtual = document.getElementById('display-mac-atual');
            if (dispMacAtual) dispMacAtual.textContent = dadosMocados.mac;
        } else {
            if (areaAutorizacao) areaAutorizacao.style.display = 'block';
            if (areaDesvinculacao) areaDesvinculacao.style.display = 'none';
            
            carregarDadosModalONU();
        }
    }, 600);
}

async function carregarListasONU() {
    const selOnu = document.getElementById('select-onu-pendente');
    const selTransmissor = document.getElementById('onu-transmissor');
    const selPerfil = document.getElementById('onu-perfil');

    selOnu.innerHTML = '<option value="" selected disabled>Carregando lista...</option>';
    
    setTimeout(async () => {
        try {
            const [resTrans, resPerfil] = await Promise.all([
                fetch('/api/v5/rede_neutra/transmissores').catch(() => ({ ok: false })),
                fetch('/api/v5/rede_neutra/perfis-fibra').catch(() => ({ ok: false }))
            ]);

            const transmissores = resTrans.ok ? await resTrans.json() : [{id: 1, nome: 'OLT-DEMO-01'}];
            const perfis = resPerfil.ok ? await resPerfil.json() : [{id: 1, nome: 'Perfil Demo'}];

            const onus = [
                { id_hash: 'hash1', mac: "F4:8C:50:AA:BB:CC", modelo: "ZTE-F670L", olt_info: "OLT-DEMO-01" },
                { id_hash: 'hash2', mac: "A1:B2:C3:D4:E5:F6", modelo: "HUAWEI-EG8145", olt_info: "OLT-DEMO-02" },
                { id_hash: 'hash3', mac: "11:22:33:44:55:66", modelo: "NOKIA-G010G", olt_info: "OLT-DEMO-01" }
            ];

            selOnu.innerHTML = '<option value="" selected disabled>Selecione uma ONU...</option>';
            onus.forEach(o => {
                const text = `MAC: ${o.mac} | Modelo: ${o.modelo || '?'} | ${o.olt_info || ''}`;
                const option = new Option(text, o.id_hash);
                option.dataset.mac = o.mac;
                option.dataset.modelo = o.modelo;
                option.dataset.olt = o.olt_info;
                selOnu.add(option);
            });

            selTransmissor.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            transmissores.forEach(t => selTransmissor.add(new Option(t.nome, t.id)));

            selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            perfis.forEach(p => selPerfil.add(new Option(p.nome, p.id)));

        } catch (e) {
            console.error(e);
            selOnu.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }, 600);
}

async function carregarDadosModalONU() {
    const selTransmissor = document.getElementById('onu-transmissor');
    const selPerfil = document.getElementById('onu-perfil');

    if (selTransmissor && selTransmissor.options.length > 1 && selPerfil && selPerfil.options.length > 1) return;

    setTimeout(() => {
        const transmissores = [
            { id: 1, nome: "OLT-DEMO-01" },
            { id: 2, nome: "OLT-DEMO-02" }
        ];
        const perfis = [
            { id: 10, nome: "Perfil Demo 1000M" },
            { id: 11, nome: "Perfil Demo 500M" }
        ];

        if (selTransmissor) {
            selTransmissor.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            transmissores.forEach(t => selTransmissor.add(new Option(t.nome, t.id)));
        }

        if (selPerfil) {
            selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            perfis.forEach(p => selPerfil.add(new Option(p.nome, p.id)));
        }
    }, 300);
}

async function carregarDadosBasicosONU() {
    const selPerfil = document.getElementById('onu-perfil');
    
    if (listaTransmissoresCache.length === 0) {
        try {
            const resTrans = await fetch('/api/v5/rede_neutra/transmissores');
            listaTransmissoresCache = await resTrans.json();
        } catch (e) { console.error("Erro transmissores:", e); }
    }

    if (selPerfil.options.length <= 1) {
        try {
            const resPerfil = await fetch('/api/v5/rede_neutra/perfis-fibra');
            const perfis = await resPerfil.json();
            selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            perfis.forEach(p => selPerfil.add(new Option(p.nome, p.id)));
            
            travarPerfilParaParceiro();
        } catch (e) { console.error("Erro perfis:", e); }
    } else {
        travarPerfilParaParceiro();
    }
}

async function abrirListaONUs() {
    modalListaONUs.show();
    const tbody = document.getElementById('lista-onus-body');
    const loading = document.getElementById('loading-onus');
    
    document.getElementById('input-busca-onu-lista').value = "";
    tbody.innerHTML = '';
    loading.style.display = 'block';

    setTimeout(() => {
        listaOnusCache = [
            { id_hash: 'hash1', mac: "F4:8C:50:AA:BB:CC", modelo: "ZTE-F670L", pon: "0/1/1", slot: "1", olt_name: "OLT-DEMO-01" },
            { id_hash: 'hash2', mac: "A1:B2:C3:D4:E5:F6", modelo: "HUAWEI-EG8145", pon: "0/2/3", slot: "2", olt_name: "OLT-DEMO-02" }
        ];
        loading.style.display = 'none';
        renderizarLinhasONU(listaOnusCache);
    }, 800);
}

function selecionarOnuDaLista(mac, oltName, idHash, model) {
    document.getElementById('display-onu-selecionada').value = `${mac} (${model})`;
    document.getElementById('hidden-hash-onu').value = idHash;
    document.getElementById('hidden-mac-onu').value = mac;

    const displayTransmissor = document.getElementById('display-transmissor');
    if (displayTransmissor) {
        displayTransmissor.value = oltName || 'OLT-DEMO';
        displayTransmissor.classList.remove('is-invalid');
        displayTransmissor.classList.add('is-valid');
    }
    
    const hiddenTransmissor = document.getElementById('hidden-id-transmissor');
    if (hiddenTransmissor) {
        hiddenTransmissor.value = "1";
    }

    modalListaONUs.hide();
}

async function autorizarONU() {
    const macEl = document.getElementById('hidden-mac-onu');
    const mac = macEl ? macEl.value : 'AA:BB:CC:DD:EE:FF';
    const btn = document.getElementById('btn-autorizar-onu');
    
    if (btn) btn.disabled = true;
    showLoading("Simulando Autorização de ONU na OLT...");

    setTimeout(() => {
        const dispMacAtual = document.getElementById('display-mac-atual');
        if (dispMacAtual) dispMacAtual.textContent = mac;
        
        const areaAuth = document.getElementById('area-autorizacao');
        const areaDesv = document.getElementById('area-desvinculacao');
        if(areaAuth) areaAuth.style.display = 'none';
        if(areaDesv) areaDesv.style.display = 'block';

        const loginIdEl = document.getElementById('onu-login-id');
        const loginId = loginIdEl ? loginIdEl.value : '9999';
        
        let oltNome = 'OLT-DEMO-01';
        const displayTransmissor = document.getElementById('display-transmissor');
        const selectTransmissor = document.getElementById('onu-transmissor');
        
        if (displayTransmissor && displayTransmissor.value) {
            oltNome = displayTransmissor.value;
        } else if (selectTransmissor && selectTransmissor.selectedIndex >= 0) {
            oltNome = selectTransmissor.options[selectTransmissor.selectedIndex].text;
        }

        const dadosMocados = {
            online: 'S', 
            mac: mac, 
            sinal_rx: '-19.50', 
            sinal_tx: '2.10',
            data_sinal: new Date().toLocaleTimeString(), 
            id_transmissor: oltNome, 
            onu_tipo: 'Huawei_Echolife', 
            ponid: '0/1/2', 
            onu_numero: Math.floor(Math.random() * 50) + 1, 
            temperatura: '42', 
            voltagem: '3.3', 
            user_vlan: '100'
        };
        atualizarInterfaceONU(dadosMocados, loginId);

        hideLoading();
        alert('AÇÃO SIMULADA: ONU Autorizada com sucesso! Sinal verificado.');
        
        if(modalEditar && modalEditar._isShown) {
            const editMac = document.getElementById('edit-mac-atual');
            if (editMac) editMac.value = mac;
        }
        if (btn) btn.disabled = false;
    }, 1500);
}

async function desautorizarONU() {
    if (!confirm(`Tem certeza que deseja remover a ONU? O cliente ficará offline.`)) return;

    const btn = document.getElementById('btn-desautorizar-onu');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    showLoading("Removendo configuração da OLT...");

    setTimeout(() => {
        hideLoading();
        alert('ONU removida com sucesso.');
        document.getElementById('edit-mac-atual').value = "";
        
        const displayOnu = document.getElementById('display-status-onu');
        if(displayOnu) {
             displayOnu.innerHTML = `<span class="badge bg-warning text-dark p-2 w-100"><i class="bi bi-exclamation-triangle me-1"></i> Pendente</span>`;
        }
        modalONU.hide();
        
        btn.disabled = false;
        btn.innerHTML = originalText;
    }, 1000);
}

function renderizarLinhasONU(lista) {
    const tbody = document.getElementById('lista-onus-body');
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma ONU encontrada.</td></tr>';
        return;
    }

    lista.forEach(onu => {
        const tr = document.createElement('tr');
        const mac = onu.mac;
        const oltName = onu.olt_name || '-';
        const model = onu.model || '-';
        const info = `Slot: ${onu.slot} / Pon: ${onu.pon}`;
        const idHash = onu.id_hash;

        tr.innerHTML = `
            <td class="font-monospace fw-bold text-primary">${mac}</td>
            <td>${oltName}</td>
            <td>${model}</td>
            <td>${info}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-primary btn-selecionar-onu">
                    Selecionar
                </button>
            </td>
        `;
        
        tr.querySelector('.btn-selecionar-onu').addEventListener('click', () => {
            selecionarOnuDaLista(mac, oltName, idHash, model);
        });

        tbody.appendChild(tr);
    });
}

async function carregarPlanosRedeNeutra() {
    // FAKE DATA
    planosCache = [
        { id: "9091", nome_exibicao: "1000M - FTTP", nome_original: "REDE_NEUTRA_1000M_FTTP", preco: "40.00" },
        { id: "9092", nome_exibicao: "500M - FTTP", nome_original: "REDE_NEUTRA_500M_FTTP", preco: "30.00" }
    ];
    document.getElementById('rn-plano').innerHTML = '<option value="" selected disabled>Aguardando parceiro...</option>';
}

function resetFormCadastro() {
    const form = document.getElementById('form-cadastro-rn');
    form.reset();
    form.classList.remove('was-validated');
    
    document.getElementById('rn-endereco').readOnly = false;
    document.getElementById('rn-bairro').readOnly = false;
    
    document.getElementById('rn-cod-cliente-parceiro').readOnly = false;
    document.getElementById('rn-cod-cliente-parceiro').disabled = false;
    
    document.getElementById('rn-caixa-atendimento').readOnly = false;
    document.getElementById('rn-caixa-atendimento').disabled = false;
    
    document.getElementById('rn-porta').readOnly = false;
    document.getElementById('rn-porta').disabled = false;
    
    $('#rn-numero').prop('readonly', false);
    $('#btn-rn-sem-numero').removeClass('btn-secondary text-white').addClass('btn-outline-secondary');
}

async function buscarEnderecoPorCEP(prefixoId = 'rn') {
    const cepInput = document.getElementById(`${prefixoId}-cep`);
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) return;

    const elEndereco = document.getElementById(`${prefixoId}-endereco`);
    const elBairro = document.getElementById(`${prefixoId}-bairro`);
    const elNumero = document.getElementById(`${prefixoId}-numero`);
    const elCidade = document.getElementById(`${prefixoId}-cidade`);
    const elUF = document.getElementById(`${prefixoId}-uf`);

    elEndereco.value = "Buscando...";
    elBairro.value = "Buscando...";
    
    elEndereco.readOnly = true;
    elBairro.readOnly = true;

    try {
        const response = await fetch(`/api/v5/geo/cep-lookup?cep=${cep}`);
        if (response.ok) {
            const data = await response.json();
            if (data.rua && data.bairro) {
                preencherCamposEndereco(prefixoId, data.rua, data.bairro, data.cidade, data.uf, data.cidadeId);
                return;
            }
        }
    } catch (e) { console.warn("API Interna falhou, tentando ViaCEP..."); }

    try {
        const responseVia = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dataVia = await responseVia.json();
        if (!dataVia.erro) {
            preencherCamposEndereco(prefixoId, dataVia.logradouro, dataVia.bairro, dataVia.localidade, dataVia.uf);
            return;
        }
    } catch (e) { console.warn("ViaCEP falhou."); }

    elEndereco.value = "";
    elBairro.value = "";
    elEndereco.readOnly = false;
    elBairro.readOnly = false;
    if(elCidade) {
        elCidade.readOnly = false;
        elCidade.value = '';
    }
    if(elUF) {
        elUF.readOnly = false;
        elUF.value = '';
    }
    elEndereco.focus();
    alert("CEP não encontrado. Por favor, preencha o endereço manualmente.");
}

function preencherCamposEndereco(prefixoId, rua, bairro, cidade = null, uf = null, cidadeId = null) {
    const elEndereco = document.getElementById(`${prefixoId}-endereco`);
    const elBairro = document.getElementById(`${prefixoId}-bairro`);
    const elNumero = document.getElementById(`${prefixoId}-numero`);
    const elCidade = document.getElementById(`${prefixoId}-cidade`);
    const elUF = document.getElementById(`${prefixoId}-uf`);
    const elCidadeId = document.getElementById(`${prefixoId}-hidden-cidade-id`);

    elEndereco.value = rua || '';
    elBairro.value = bairro || '';
    if(elCidade) elCidade.value = cidade || '';
    if(elUF) elUF.value = uf || 'ES';
    if(elCidadeId && cidadeId) elCidadeId.value = cidadeId;

    elEndereco.readOnly = (rua && rua.trim() !== '');
    elBairro.readOnly = (bairro && bairro.trim() !== '');
    if(elCidade) elCidade.readOnly = (cidade && cidade.trim() !== '');
    if(elUF) elUF.readOnly = (uf && uf.trim() !== '');

    if (elNumero) {
        elNumero.readOnly = false;
        elNumero.focus();
    }
}

let mapCidades = {};
let mapCidadesReverse = {};
let mapUfs = {};
let mapUfsReverse = {};
let mapUfNomeParaSigla = {};

async function carregarLocalidades() {
    mapUfs = { 30: 'ES', 31: 'MG', 32: 'RJ' };
    mapUfsReverse = { 'ES': 30, 'MG': 31, 'RJ': 32 };
    mapUfNomeParaSigla = { 'ESPIRITO SANTO': 'ES', 'MINAS GERAIS': 'MG', 'RIO DE JANEIRO': 'RJ' };
    
    mapCidades = { 1: 'Vitória', 2: 'Vila Velha', 3: 'Serra', 4: 'Cariacica' };
    mapCidadesReverse = { 'VITORIA': 1, 'VILA VELHA': 2, 'SERRA': 3, 'CARIACICA': 4 };
}

function getCidadeNome(id) {
    return mapCidades[id] || 'Cidade Desconhecida';
}

function getCidadeIdPorNome(nome) {
    if (!nome) return null;
    const normalizedName = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    return mapCidadesReverse[normalizedName] || nome; 
}

function getUfSigla(id) {
    return mapUfs[id] || '';
}

function getUfIdPorSigla(valor) {
    if (!valor) return null;
    const normalized = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const siglaCorrigida = mapUfNomeParaSigla[normalized] || normalized;
    return mapUfsReverse[siglaCorrigida] || valor; 
}

function corrigirUfParaSigla(valor) {
    if (!valor) return '';
    const normalized = valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    return mapUfNomeParaSigla[normalized] || valor; 
}

function formatCondoName(name) {
    if (!name) return name;
    
    const prefixMap = {
        'SEA': 'Serra',
        'VTA': 'Vitória',
        'VVA': 'Vila Velha',
        'CCA': 'Cariacica',
        'GRI': 'Guarapari'
    };

    const match = name.match(/^(SEA|VTA|VVA|CCA|GRI)\s+(.*)/i);
    
    if (match) {
        const prefix = match[1].toUpperCase();
        const restOfName = match[2];
        return `${prefixMap[prefix]} - Bairro ${restOfName}`;
    }
    
    return name;
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
            userGroupGlobal = group;
            usernameGlobal = username;
            if (username === 'Visitante') {
                showModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                setTimeout(() => { window.location = "/"; }, 300);
                return;
            }
        document.querySelectorAll('.user-info span').forEach(el => {
            if (el.textContent.includes('{username}')) el.textContent = username;
            if (el.textContent.includes('{group}')) el.textContent = group;
        });

        travarParceiroNoLoad();

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
}

function travarParceiroNoLoad() {
    if (!userGroupGlobal) return;
    const configParceiro = MAPA_PARCEIROS[userGroupGlobal];
    if (!configParceiro) return;

    const selectParceiro = document.getElementById('select-parceiro');
    if (!selectParceiro || selectParceiro.options.length <= 1) return;

    const optionsParceiro = Array.from(selectParceiro.options);
    const optionParceiroEncontrada = optionsParceiro.find(opt => 
        opt.text.toUpperCase().includes(configParceiro.nome.toUpperCase())
    );

    if (optionParceiroEncontrada && selectParceiro.value !== optionParceiroEncontrada.value) {
        selectParceiro.value = optionParceiroEncontrada.value;
        selectParceiro.style.pointerEvents = 'none';
        selectParceiro.classList.add('bg-light');
        selectParceiro.dispatchEvent(new Event('change'));
    } else if (optionParceiroEncontrada) {
        selectParceiro.style.pointerEvents = 'none';
        selectParceiro.classList.add('bg-light');
    }
}

function travarPerfilParaParceiro() {
    if (!userGroupGlobal) return;
    const configParceiro = MAPA_PARCEIROS[userGroupGlobal];
    if (!configParceiro) return;

    const selectPerfil = document.getElementById('onu-perfil');
    if (!selectPerfil) return;

    const perfilAlvo = configParceiro.perfil.toUpperCase();
    const optionsPerfil = Array.from(selectPerfil.options);

    const optionPerfilEncontrada = optionsPerfil.find(opt => 
        opt.text.toUpperCase().trim() === perfilAlvo
    );

    if (optionPerfilEncontrada) {
        selectPerfil.value = optionPerfilEncontrada.value;
        optionsPerfil.forEach(opt => {
            if (opt.value !== optionPerfilEncontrada.value && opt.value !== "") {
                opt.remove();
            }
        });
        selectPerfil.style.pointerEvents = 'none';
        selectPerfil.classList.add('bg-light');
    }
}

function showLoading(texto) {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-overlay').style.display = 'flex';
}

async function abrirChamadoSuporte(mensagem, tipo = 'Erro Automático') {
    const usuarioLogado = $('.user-info span.fw-medium').eq(0).text() || 'Usuário';
    console.log(`Chamado com suporte enviado! Solicitante: ${usuarioLogado} - Tipo: ${tipo} - Mensagem: ${mensagem}`);
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}