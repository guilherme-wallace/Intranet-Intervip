/* javascripts/cadastro-redeNeutra.js */

const MAPA_PARCEIROS = {
    'villaggionet': { nome: 'RODRIGO GONCALVES DENICOLO', perfil: 'RN - VILLAGGIONET' },
    'ultracom': { nome: 'ULTRACOM TELECOMUNICACOES LTDA', perfil: 'RN - ULTRACOM' },
    'seliga': { nome: 'SELIGA TELECOMUNICACOES DO BRASIL EIRELI', perfil: 'RN - Seliga' },
    'nv7': { nome: 'NV7 TELECOM LTDA', perfil: 'RN - NV7' },
    'nwt': { nome: 'NETWORKS WIRELESS TELECOM - NWT LTDA', perfil: 'RN - NWT' },
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
        resetarEstadoPaginaCompleto();
        parceiroIdSelecionado = e.target.value;

        const wrapperContratos = document.getElementById('wrapper-exibir-contratos');
        const chkExibirContratos = document.getElementById('chk-exibir-contratos');
        const secaoContratos = document.getElementById('secao-contratos-parceiro');
        
        const isNOC = (userGroupGlobal && userGroupGlobal.toUpperCase() === 'NOC') || 
                      (usernameGlobal && usernameGlobal.toUpperCase().includes('NOC'));

        if (wrapperContratos) wrapperContratos.style.display = (parceiroIdSelecionado && isNOC) ? 'block' : 'none';
        if (chkExibirContratos) chkExibirContratos.checked = false;
        if (secaoContratos) secaoContratos.style.display = 'none';

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
            alert("Este cliente não possui um Login vinculado para gerenciar a ONU.");
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

        try {
            const responseSync = await fetch('/api/v5/rede_neutra/onus-pendentes/sync-olt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!responseSync.ok) {
                console.warn("Aviso: Houve uma falha ao forçar o sync nas OLTs. Tentando carregar a lista local...");
            }

            const responseList = await fetch('/api/v5/rede_neutra/onus-pendentes');
            listaOnusCache = await responseList.json();
            
            loading.style.display = 'none';
            renderizarLinhasONU(listaOnusCache);

        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar lista de ONUs.</td></tr>';
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    });

    document.getElementById('btn-reiniciar-onu').addEventListener('click', async function() {
        const idFibra = document.getElementById('hidden-id-fibra-atual').value;
        if (!idFibra) return alert('ID do Cliente Fibra não encontrado. Atualize a página e tente novamente.');
        if (!confirm('Deseja realmente enviar o comando para REINICIAR a ONU deste cliente?')) return;

        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

        try {
            const res = await fetch('/api/v5/rede_neutra/onu/reiniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_fibra: idFibra })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha na comunicação.');
            alert('Comando de REINÍCIO da ONU enviado com sucesso!');
        } catch (error) {
            alert('Erro: ' + error.message);
            abrirChamadoSuporte(`Erro ao reiniciar ONU (ID Fibra: ${idFibra}): ${error.message}`, 'Erro - Reiniciar ONU');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    document.getElementById('btn-liberar-web').addEventListener('click', async function() {
        const idFibra = document.getElementById('hidden-id-fibra-atual').value;
        if (!idFibra) return alert('ID do Cliente Fibra não encontrado. Atualize a página e tente novamente.');
        if (!confirm('Deseja tentar LIBERAR O ACESSO WEB remoto desta ONU?')) return;

        const btn = this;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';

        try {
            const res = await fetch('/api/v5/rede_neutra/onu/liberar-web', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_fibra: idFibra })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha na comunicação.');
            alert('Comando de Liberação WEB enviado com sucesso!');
        } catch (error) {
            alert('Erro: ' + error.message);
            abrirChamadoSuporte(`Erro ao liberar WEB da ONU (ID Fibra: ${idFibra}): ${error.message}`, 'Erro - Liberar WEB');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
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

async function carregarCarteiraClientes(parceiroId) {
    const painel = document.getElementById('painel-clientes');
    const loading = document.getElementById('loading-clientes');
    const tableContainer = document.querySelector('.table-responsive');
    const empty = document.getElementById('empty-clientes');

    painel.style.display = 'block';
    loading.style.display = 'block';
    tableContainer.style.display = 'none';
    empty.style.display = 'none';
    
    try {
        const response = await fetch(`/api/v5/rede_neutra/clientes/${parceiroId}`);
        const data = await response.json(); 
        
        loading.style.display = 'none';
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro interno no servidor ao sincronizar clientes.');
        }

        if (!Array.isArray(data)) {
            throw new Error('Formato de dados inválido retornado pelo servidor.');
        }

        todosClientesCache = data;
        
        if (todosClientesCache.length === 0) {
            empty.style.display = 'block';
        } else {
            tableContainer.style.display = 'block';
            paginaAtual = 1;
            renderizarTabela(); 
        }
    } catch (error) {
        console.error(error);
        loading.style.display = 'none';
        todosClientesCache = []; 
        renderizarTabela();
        alert('Erro ao carregar carteira de clientes:\n' + error.message);
    }
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
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        let filteredData = data;
                        
                        const isPartner = !!MAPA_PARCEIROS[userGroupGlobal];
                        
                        if (isPartner) {
                            filteredData = filteredData.filter(item => 
                                !item.text || !item.text.includes('(RDNT-')
                            );
                        }

                        filteredData = filteredData.map(item => ({
                            ...item,
                            text: formatCondoName(item.text)
                        }));

                        callback(filteredData);
                    })
                    .catch(err => console.error("Erro busca condomínios:", err));
            }
        }
    });

    $('#input-condominio-venda').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#hidden-condominio-id").val(item.value);
        
        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                $('#input-condominio-venda').val(formatCondoName(condo.condominio || item.text));

                $("#rn-cep").val(condo.cep || '');
                $('#rn-numero').val(condo.numero || ''); 
                $("#rn-endereco").val(condo.endereco || '');
                $("#rn-bairro").val(condo.bairro || '');
                $("#rn-cidade").val(getCidadeNome(condo.cidadeId) || '');
                $("#rn-uf").val('ES');
                $("#hidden-cidade-id").val(condo.cidadeId || '');
                
                return fetch(`api/v1/block/${item.value}`);
            })
            .then(response => response.ok ? response.json() : [])
            .then(blocks => { 
                currentBlocks = blocks;
                $('#btn-complemento').text('Selecione o complemento...').prop('disabled', false);
            });
    });
}

function setupCondoSearchEdit() {
    $('#edit-condominio').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json())
                    .then(data => {
                        let filteredData = data;
                        
                        const isPartner = !!MAPA_PARCEIROS[userGroupGlobal];
                        
                        if (isPartner) {
                            filteredData = filteredData.filter(item => 
                                !item.text || !item.text.includes('(RDNT-')
                            );
                        }

                        filteredData = filteredData.map(item => ({
                            ...item,
                            text: formatCondoName(item.text)
                        }));

                        callback(filteredData);
                    });
            }
        }
    });

    $('#edit-condominio').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#edit-hidden-condominio-id").val(item.value);
        
        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                $('#edit-condominio').val(formatCondoName(condo.condominio || item.text));

                $("#edit-cep").val(condo.cep || '');
                $('#edit-numero').val(condo.numero || ''); 
                $("#edit-endereco").val(condo.endereco || '');
                $("#edit-bairro").val(condo.bairro || '');
                $("#edit-cidade").val(getCidadeNome(condo.cidadeId) || '');
                $("#edit-uf").val('ES');
                $("#edit-hidden-cidade-id").val(condo.cidadeId || '');
                
                return fetch(`api/v1/block/${item.value}`);
            })
            .then(response => response.ok ? response.json() : [])
            .then(blocks => { 
                currentBlocks = blocks;
                $('#btn-edit-complemento').prop('disabled', false).text('Selecionar...');
                $('#edit-complemento-text').val('');
            });
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
            option.dataset.ixcClienteId = p.ixc_cliente_id || ''; 
            option.dataset.ixcContratoId = p.ixc_contrato_id || '';
            select.appendChild(option);
        });

        travarParceiroNoLoad();

    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Erro ao carregar parceiros</option>';
    }
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
    
    if (!descSemToken && descricaoCompleta.length > token.length) {
        descSemToken = descricaoCompleta;
    }

    document.getElementById('edit-prefixo-token').textContent = token + '-';
    document.getElementById('edit-descricao').value = descSemToken;
    
    document.getElementById('edit-status').value = cliente.ativo;
    document.getElementById('edit-obs').value = cliente.obs || '';

    document.getElementById('edit-condominio').value = "";
    document.getElementById('edit-condominio').placeholder = "Buscar condomínio...";

    if (cliente.ixc_login_id) {
        const displayOnu = document.getElementById('display-status-onu');
        displayOnu.innerHTML = `<div class="d-flex align-items-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Carregando dados...</div>`;
        
        try {
            const response = await fetch(`/api/v5/rede_neutra/onu-detalhes/${cliente.ixc_login_id}`);
            const dados = await response.json();
            
            document.getElementById('edit-cep').value = dados.cep || cliente.cep || '';
            document.getElementById('edit-endereco').value = dados.endereco || cliente.endereco || '';
            document.getElementById('edit-numero').value = dados.numero || cliente.numero || '';
            document.getElementById('edit-bairro').value = dados.bairro || cliente.bairro || '';
            
            document.getElementById('edit-hidden-cidade-id').value = dados.cidade || '';
            document.getElementById('edit-cidade').value = getCidadeNome(dados.cidade) || dados.cidade || ''; 
            
            document.getElementById('edit-referencia').value = dados.referencia || '';
            document.getElementById('edit-complemento-text').value = dados.complemento || '';
            
            if (dados.id_condominio && dados.id_condominio !== "0") {
                document.getElementById('edit-hidden-condominio-id').value = dados.id_condominio;
                document.getElementById('edit-sem-condominio').checked = false;
                document.getElementById('edit-condominio').value = "Carregando condomínio...";
                
                try {
                    const resCondo = await fetch(`api/v1/condominio/${dados.id_condominio}`);
                    if (resCondo.ok) {
                        const condo = await resCondo.json();
                        const nomeCondominio = condo.condominio || condo.nome || condo.descricao || condo.razao;
                        
                        if (nomeCondominio) {
                            document.getElementById('edit-condominio').value = nomeCondominio;
                        } else {
                            document.getElementById('edit-condominio').value = `Condomínio ID ${dados.id_condominio}`;
                        }
                    } else {
                        document.getElementById('edit-condominio').value = `Condomínio ID ${dados.id_condominio}`;
                    }
                    
                    const resBlocks = await fetch(`api/v1/block/${dados.id_condominio}`);
                    if (resBlocks.ok) {
                        currentBlocks = await resBlocks.json();
                        $('#btn-edit-complemento').prop('disabled', false);
                    }
                } catch(e) {
                    console.error("Erro ao buscar nome do condomínio:", e);
                    document.getElementById('edit-condominio').value = `Condomínio ID ${dados.id_condominio} (Erro)`;
                }

            } else {
                document.getElementById('edit-sem-condominio').checked = true;
                document.getElementById('edit-condominio').value = "";
                $('#btn-edit-complemento').prop('disabled', true);
            }

            atualizarInterfaceONU(dados, cliente.ixc_login_id);

        } catch (e) {
            console.error(e);
            displayOnu.innerHTML = `<div class="alert alert-warning small p-1">Erro ao carregar. Edição local permitida.</div>`;
        }
    }

    modalEditar.show();
}

async function cancelarCliente() {
    if (!confirm("ATENÇÃO: Você está prestes a CANCELAR este cliente.\n\nDeseja continuar?")) {
        return;
    }

    const id = document.getElementById('edit-id').value;
    const btn = document.getElementById('btn-cancelar-cliente');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    showLoading("Processando cancelamento no banco e OLT... Aguarde.");

    try {
        const response = await fetch('/api/v5/rede_neutra/cancelar-cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });

        const res = await response.json();
        hideLoading();

        if (!response.ok) throw new Error(res.error || 'Erro ao cancelar');

        alert("Cliente cancelado com sucesso!");
        modalEditar.hide();
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        hideLoading();
        alert('Erro ao cancelar: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
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

        atualizarInterfaceONU(dados, loginId);
        document.getElementById('edit-mac-atual').value = dados.mac || '';

    } catch (e) {
        console.error(e);
        displayOnu.innerHTML = `<div class="alert alert-danger small p-2">Erro ao carregar dados da ONU. <button class="btn btn-sm btn-link" onclick="carregarDetalhesONU(${loginId})">Tentar novamente</button></div>`;
    }
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

    const onlineBadge = dados.online === 'S' 
        ? `<span class="badge bg-success rounded-pill">Online</span>` 
        : `<span class="badge bg-danger rounded-pill">Offline</span>`;

    let infoQuedaHtml = '';
    if (dados.online !== 'S' && dados.causa_ultima_queda && dados.causa_ultima_queda !== '-' && dados.causa_ultima_queda !== '') {
        const mapCausas = {
            'dying-gasp': 'Falha Elétrica',
            'LOFi': 'Sinal degradado/instável',
            'LOSi/LOBi': 'Perda do sinal óptico',
            'LOS': 'Sinal degradado/instável',
            'reset': 'Onu Reiniciada',
        };
        const causaOriginal = dados.causa_ultima_queda;
        const causaTraduzida = mapCausas[causaOriginal] || 'Motivo desconhecido';
        
        infoQuedaHtml = `
            <div class="alert alert-danger p-2 mt-2 mb-0" style="font-size: 0.85rem;">
                <strong><i class="bi bi-lightning-slash-fill me-1"></i>Causa da queda:</strong><br>
                ${causaTraduzida} <span class="text-muted small">(${causaOriginal})</span>
            </div>
        `;
    }
    
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
            ${infoQuedaHtml}
            <div class="d-flex justify-content-between align-items-center mb-1 border-bottom pb-1 mt-2">
                <span>Sinal RX:</span> <span class="${rxProps.cls}" style="${rxProps.style}" id="val-rx">${dados.sinal_rx} dBm</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span>Sinal TX:</span> <span class="${txProps.cls}" style="${txProps.style}" id="val-tx">${dados.sinal_tx} dBm</span>
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
    btn.disabled = true;
    btn.innerHTML = 'Salvando...';

    try {
        const id = document.getElementById('edit-id').value;
        const token = document.getElementById('edit-token').value; 
        const descSemToken = document.getElementById('edit-descricao').value.trim();
        
        let identificadorCompleto = descSemToken;
        if (token) {
            identificadorCompleto = `${token}-${descSemToken}`;
        }
        
        let complementoFinal = document.getElementById('edit-complemento-text').value;

        const idCidadeFormatado = getCidadeIdPorNome(document.getElementById('edit-cidade').value) || document.getElementById('edit-hidden-cidade-id').value;
        const idUfFormatado = getUfIdPorSigla(document.getElementById('edit-uf').value) || document.getElementById('edit-uf').value;

        let numeroEditFormatado = document.getElementById('edit-numero').value.trim();
        if (numeroEditFormatado === '0') {
            numeroEditFormatado = 'SN';
        }

        const payload = {
            descricao_produto: identificadorCompleto,
            login_pppoe: identificadorCompleto,
            
            status_ativo: document.getElementById('edit-status').value,
            obs: document.getElementById('edit-obs').value,
            
            cep: document.getElementById('edit-cep').value,
            endereco: document.getElementById('edit-endereco').value,
            numero: numeroEditFormatado,
            bairro: document.getElementById('edit-bairro').value,
            
            id_condominio: document.getElementById('edit-hidden-condominio-id').value,
            complemento: complementoFinal,
            referencia: document.getElementById('edit-referencia').value,
            bloco: document.getElementById('edit-hidden-bloco').value,
            apartamento: document.getElementById('edit-hidden-apartamento').value,
            
            cidade: idCidadeFormatado,
            uf: idUfFormatado
        };

        const response = await fetch(`/api/v5/rede_neutra/cliente/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Erro ao atualizar');

        alert("Alterações salvas com sucesso!");
        modalEditar.hide();
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        console.error("Erro na edição:", error);
        alert('Erro ao editar: ' + error.message);
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
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
    document.getElementById('btn-salvar-sem-onu').disabled = true;
    document.getElementById('btn-salvar-com-onu').disabled = true;

    try {
        const selectPlano = document.getElementById('rn-plano');
        if (selectPlano.selectedIndex < 0 || !selectPlano.value) {
            throw new Error("Por favor, aguarde o carregamento e selecione um plano válido.");
        }
        const planoOption = selectPlano.options[selectPlano.selectedIndex];
        
        const semCondominio = $('#chk-sem-condominio').is(':checked');
        const nomeCondominio = $('#input-condominio-venda').val();

        let complementoFinal = $('#rn-complemento').val();
        if(semCondominio) complementoFinal = nomeCondominio;

        const idCidadeFormatado = getCidadeIdPorNome(document.getElementById('rn-cidade').value) || document.getElementById('hidden-cidade-id').value;
        const idUfFormatado = getUfIdPorSigla(document.getElementById('rn-uf').value) || document.getElementById('rn-uf').value;

        let numeroFormatado = document.getElementById('rn-numero').value.trim();
        if (numeroFormatado === '0') {
            numeroFormatado = 'SN';
        }

        const payload = {
            parceiro_id: document.getElementById('select-parceiro').value,
            cod_cliente_parceiro: document.getElementById('rn-cod-cliente-parceiro').value.trim(),
            caixa_atendimento: document.getElementById('rn-caixa-atendimento').value.trim(),
            porta: document.getElementById('rn-porta').value.trim(),
            
            cep: document.getElementById('rn-cep').value,
            endereco: document.getElementById('rn-endereco').value,
            numero: numeroFormatado,
            bairro: document.getElementById('rn-bairro').value,
            cidade: idCidadeFormatado,
            uf: idUfFormatado,
            referencia: document.getElementById('rn-referencia').value,
            
            id_condominio: semCondominio ? '' : document.getElementById('hidden-condominio-id').value,
            bloco: document.getElementById('hidden-bloco').value,
            apartamento: document.getElementById('hidden-apartamento').value,
            complemento: complementoFinal,

            plano_id: selectPlano.value,
            plano_nome: planoOption.dataset.nome,
            plano_nome_original: planoOption.dataset.originalName,
            plano_valor: planoOption.dataset.valor
        };

        const response = await fetch('/api/v5/rede_neutra/cliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro ao salvar cliente no banco.');

        modalCadastro.hide();
        carregarCarteiraClientes(payload.parceiro_id);

        if (autorizarOnu && result.ixc_login_id) {
            abrirModalONU(result.ixc_login_id, result.login, "Novo Contrato", "");
        } else {
            alert(`Cliente Cadastrado!\nLogin: ${result.login}`);
        }

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

async function abrirModalONU(idLoginIxc, nome, infoExtra, macAtual) {
    loginAtualId = idLoginIxc;
    
    document.getElementById('onu-cliente-nome').textContent = nome;
    document.getElementById('onu-contrato-id').textContent = infoExtra;
    
    document.getElementById('display-onu-selecionada').value = "";
    document.getElementById('display-transmissor').value = "";
    document.getElementById('hidden-hash-onu').value = "";
    document.getElementById('hidden-mac-onu').value = "";
    document.getElementById('hidden-id-transmissor').value = "";
    
    const statusAuth = document.getElementById('onu-status-auth');
    const statusConn = document.getElementById('onu-status-conn');
    const areaAutorizacao = document.getElementById('area-autorizacao');
    const areaDesvinculo = document.getElementById('area-desvinculacao');

    statusAuth.className = 'p-2 border rounded text-center fw-bold bg-light';
    statusAuth.textContent = 'Verificando...';
    
    await carregarDadosBasicosONU(); 

    try {
        const response = await fetch(`/api/v5/rede_neutra/onu-detalhes/${idLoginIxc}`);
        const dados = await response.json();
        
        const temMac = (dados.mac && dados.mac.length > 5);
        
        if (temMac) {
            statusAuth.classList.add('text-success', 'border-success', 'bg-success-subtle');
            statusAuth.innerHTML = '<i class="bi bi-check-circle-fill"></i> AUTORIZADA';
            document.getElementById('display-mac-atual').textContent = dados.mac;
            
            areaDesvinculo.style.display = 'block';
            areaAutorizacao.style.display = 'none';
        } else {
            statusAuth.classList.add('text-warning', 'border-warning', 'bg-warning-subtle');
            statusAuth.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> PENDENTE';
            
            areaDesvinculo.style.display = 'none';
            areaAutorizacao.style.display = 'block';
        }

        if (dados.online === 'S') {
            statusConn.className = 'p-2 border rounded text-center fw-bold bg-success text-white';
            statusConn.textContent = 'ONLINE';
        } else {
            statusConn.className = 'p-2 border rounded text-center fw-bold bg-light text-danger';
            statusConn.textContent = 'OFFLINE';
        }

    } catch (e) {
        console.error(e);
    }

    modalONU.show();
}

async function carregarListasONU() {
    const selOnu = document.getElementById('select-onu-pendente');
    const selTransmissor = document.getElementById('onu-transmissor');
    const selPerfil = document.getElementById('onu-perfil');

    selOnu.innerHTML = '<option value="" selected disabled>Carregando lista...</option>';
    
    try {
        const [resOnus, resTrans, resPerfil] = await Promise.all([
            fetch('/api/v5/rede_neutra/onus-pendentes'),
            fetch('/api/v5/rede_neutra/transmissores'),
            fetch('/api/v5/rede_neutra/perfis-fibra')
        ]);

        const onus = await resOnus.json();
        const transmissores = await resTrans.json();
        const perfis = await resPerfil.json();

        selOnu.innerHTML = '<option value="" selected disabled>Selecione uma ONU...</option>';
        if (onus.length === 0) {
            selOnu.add(new Option("Nenhuma ONU pendente encontrada", ""));
        } else {
            onus.forEach(o => {
                const text = `MAC: ${o.mac} | Modelo: ${o.modelo || '?'} | ${o.olt_info || ''}`;
                const option = new Option(text, o.id_hash);
                option.dataset.mac = o.mac;
                option.dataset.modelo = o.modelo;
                option.dataset.olt = o.olt_info;
                selOnu.add(option);
            });
        }

        selTransmissor.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        transmissores.forEach(t => selTransmissor.add(new Option(t.nome, t.id)));

        selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        perfis.forEach(p => selPerfil.add(new Option(p.nome, p.id)));

    } catch (e) {
        console.error(e);
        selOnu.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function carregarDadosModalONU() {
    const selTransmissor = document.getElementById('onu-transmissor');
    const selPerfil = document.getElementById('onu-perfil');

    if (selTransmissor.options.length > 1 && selPerfil.options.length > 1) return;

    try {
        const [resTrans, resPerfil] = await Promise.all([
            fetch('/api/v5/rede_neutra/transmissores'),
            fetch('/api/v5/rede_neutra/perfis-fibra')
        ]);

        const transmissores = await resTrans.json();
        const perfis = await resPerfil.json();

        selTransmissor.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        transmissores.forEach(t => {
            selTransmissor.add(new Option(t.nome, t.id));
        });

        selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        perfis.forEach(p => {
            selPerfil.add(new Option(p.nome, p.id));
        });

    } catch (e) {
        console.error("Erro ao carregar dados do modal ONU:", e);
        selTransmissor.innerHTML = '<option value="">Erro ao carregar</option>';
    }
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

    try {
        const response = await fetch('/api/v5/rede_neutra/onus-pendentes');
        listaOnusCache = await response.json();
        
        loading.style.display = 'none';
        renderizarLinhasONU(listaOnusCache);

    } catch (e) {
        console.error(e);
        loading.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar lista.</td></tr>';
    }
}

function selecionarOnuDaLista(mac, oltName, idHash, model) {
    document.getElementById('display-onu-selecionada').value = `${mac} (${model})`;
    document.getElementById('hidden-hash-onu').value = idHash;
    document.getElementById('hidden-mac-onu').value = mac;

    const transmissorEncontrado = listaTransmissoresCache.find(t => t.nome === oltName);
    
    if (transmissorEncontrado) {
        document.getElementById('display-transmissor').value = transmissorEncontrado.nome;
        document.getElementById('hidden-id-transmissor').value = transmissorEncontrado.id;
        document.getElementById('display-transmissor').classList.add('is-valid');
    } else {
        document.getElementById('display-transmissor').value = `Não encontrado: ${oltName}`;
        document.getElementById('hidden-id-transmissor').value = "";
        document.getElementById('display-transmissor').classList.add('is-invalid');
        alert(`Atenção: O transmissor "${oltName}" vindo da ONU não foi encontrado na lista de transmissores cadastrados no banco. Verifique o cadastro.`);
    }

    modalListaONUs.hide();
}

async function autorizarONU() {
    const idHash = document.getElementById('hidden-hash-onu').value;
    const mac = document.getElementById('hidden-mac-onu').value;
    const idTransmissor = document.getElementById('hidden-id-transmissor').value;
    const idPerfil = document.getElementById('onu-perfil').value;

    if (!idHash || !mac) { alert('Por favor, busque e selecione uma ONU da lista.'); return; }
    if (!idTransmissor) { alert('Erro: Transmissor não identificado.'); return; }
    if (!idPerfil) { alert('Por favor, selecione o Perfil de Fibra.'); return; }

    const btn = document.getElementById('btn-autorizar-onu');
    btn.disabled = true;
    showLoading("Autorizando ONU e Gravando na OLT...");

    try {
        const response = await fetch('/api/v5/rede_neutra/autorizar-onu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ixc_login_id: loginAtualId, 
                mac: mac,
                id_hash_onu: idHash,
                id_transmissor: idTransmissor,
                id_perfil: idPerfil
            })
        });
        
        const res = await response.json();
        
        if (!response.ok) throw new Error(res.error || 'Erro ao autorizar');

        document.getElementById('loading-text').textContent = "Verificando sinal óptico...";
        
        document.getElementById('display-mac-atual').textContent = mac;
        
        try {
            const refreshRes = await fetch('/api/v5/rede_neutra/refresh-onu', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id_login: loginAtualId })
            });
            await refreshRes.json();
        } catch(e) { console.warn("Falha no refresh automático"); }

        await carregarDetalhesONU(loginAtualId);

        const areaAuth = document.getElementById('area-autorizacao');
        const areaDesv = document.getElementById('area-desvinculacao');
        if(areaAuth) areaAuth.style.display = 'none';
        if(areaDesv) areaDesv.style.display = 'block';

        hideLoading();
        alert(res.message || 'ONU Autorizada com sucesso! Sinal verificado.');
        
        if(modalEditar._isShown) {
            document.getElementById('edit-mac-atual').value = mac;
        }

    } catch (error) {
        hideLoading();
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false;
    }
}

async function desautorizarONU() {
    if (!confirm(`Tem certeza que deseja remover a ONU? O cliente ficará offline.`)) return;

    const btn = document.getElementById('btn-desautorizar-onu');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    
    showLoading("Removendo configuração da ONU na OLT... Isso pode levar alguns segundos.");

    try {
        const response = await fetch('/api/v5/rede_neutra/desautorizar-onu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ixc_login_id: loginAtualId })
        });

        const res = await response.json();
        
        hideLoading();

        if (!response.ok) throw new Error(res.error || 'Erro ao desvincular');

        alert('ONU removida com sucesso.');
        
        document.getElementById('edit-mac-atual').value = "";
        
        carregarDetalhesONU(loginAtualId);
        
        const displayOnu = document.getElementById('display-status-onu');
        if(displayOnu) {
             displayOnu.innerHTML = `<span class="badge bg-warning text-dark p-2 w-100"><i class="bi bi-exclamation-triangle me-1"></i> Pendente</span>`;
        }

        modalONU.hide();
        
        if(parceiroIdSelecionado) carregarCarteiraClientes(parceiroIdSelecionado);

    } catch (error) {
        hideLoading();
        alert('Erro: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
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
    const select = document.getElementById('rn-plano');
    select.innerHTML = '<option value="" selected disabled>Carregando planos...</option>';

    try {
        const response = await fetch('/api/v5/rede_neutra/produtos');
        planosCache = await response.json();
        select.innerHTML = '<option value="" selected disabled>Aguardando parceiro...</option>';
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">Erro ao carregar planos</option>';
    }
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
    try {
        const resUfs = await fetch('/api/v5/ixc/ufs');
        if (resUfs.ok) {
            const ufs = await resUfs.json();
            ufs.forEach(u => {
                mapUfs[u.id] = u.sigla;
                if (u.sigla) mapUfsReverse[u.sigla.toUpperCase()] = u.id;
                if (u.nome) {
                    const nomeNorm = u.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                    mapUfNomeParaSigla[nomeNorm] = u.sigla;
                }
            });
        }

        const resCidades = await fetch('/api/v5/ixc/cidades');
        if (resCidades.ok) {
            const cidades = await resCidades.json();
            cidades.forEach(c => {
                mapCidades[c.id] = c.nome;
                if (c.nome) {
                    const normalizedName = c.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                    mapCidadesReverse[normalizedName] = c.id;
                }
            });
        }
    } catch (error) {
        console.error("Erro ao carregar listas de localidades:", error);
    }
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

document.addEventListener('change', async function(e) {
    if (e.target && e.target.id === 'select-parceiro') {
        parceiroIdSelecionado = e.target.value;

        const chkExibirContratos = document.getElementById('chk-exibir-contratos');
        const secaoContratos = document.getElementById('secao-contratos-parceiro');
        const accordionContratos = document.getElementById('accordionContratos');
        
        if (chkExibirContratos) chkExibirContratos.checked = false;
        if (secaoContratos) secaoContratos.style.display = 'none';
        if (accordionContratos) accordionContratos.innerHTML = '';

        const tabela = document.querySelector('.table-hover');
        const paginacao = document.getElementById('paginacao-container');
        if (tabela) tabela.style.display = 'table';
        if (paginacao) {
            const divPag = paginacao.closest('.d-flex');
            if (divPag) divPag.style.display = 'flex';
        }

        if (typeof todosClientesCache !== 'undefined') todosClientesCache = [];
        if (typeof dadosFiltrados !== 'undefined') dadosFiltrados = [];
        if (typeof paginaAtual !== 'undefined') paginaAtual = 1;

        const tbodyClientes = document.getElementById('lista-clientes-body');
        if (tbodyClientes) tbodyClientes.innerHTML = '';

        const inputBusca = document.getElementById('input-busca-cliente');
        if (inputBusca) inputBusca.value = '';
    }

    if (e.target && e.target.id === 'chk-exibir-contratos') {
        const isChecked = e.target.checked;
        const secaoContratos = document.getElementById('secao-contratos-parceiro');
        const painelVazio = document.getElementById('empty-clientes');
        
        const tbodyClientes = document.getElementById('lista-clientes-body');
        const tableContainer = tbodyClientes ? tbodyClientes.closest('.table-responsive') : null;

        if (isChecked) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (painelVazio) painelVazio.style.display = 'none';
            
            if (secaoContratos) {
                secaoContratos.style.display = 'block';
                await carregarContratosAdicionais();
            }
        } else {
            if (secaoContratos) secaoContratos.style.display = 'none';
            
            if (todosClientesCache && todosClientesCache.length > 0) {
                if (tableContainer) tableContainer.style.display = 'block';
            } else {
                if (painelVazio) painelVazio.style.display = 'block';
            }
        }
    }
});

async function carregarContratosAdicionais() {
    const accordion = document.getElementById('accordionContratos');
    if (!accordion) return;
    
    accordion.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted fw-medium">Cruzando dados no banco, aguarde...</div></div>';

    try {
        const selectParceiro = document.getElementById('select-parceiro');
        const option = selectParceiro.options[selectParceiro.selectedIndex];
        
        const idCliente = option.dataset.ixcClienteId || '';
        const idContratoPrincipal = option.dataset.ixcContratoId || '';
        const nomeParceiro = option.text.split('(')[0].trim();

        const response = await fetch(`/api/v5/rede_neutra/parceiro-contratos-ixc?id_cliente=${idCliente}&id_contrato_principal=${idContratoPrincipal}&nome=${encodeURIComponent(nomeParceiro)}`);
        const contratos = await response.json();

        if (!response.ok) throw new Error(contratos.error || "Erro ao buscar contratos.");

        if (contratos.length === 0) {
            accordion.innerHTML = '<div class="text-center text-muted p-5"><i class="bi bi-info-circle fs-2 d-block mb-2"></i>Nenhum contrato ativo encontrado para este parceiro.</div>';
            return;
        }

        accordion.innerHTML = '';
        contratos.forEach((contrato) => {
            const accItem = document.createElement('div');
            accItem.className = 'accordion-item border-bottom mb-2 bg-white shadow-sm';
            
            let loginsHtml = '';
            if (contrato.logins && contrato.logins.length > 0) {
                loginsHtml = `<div class="table-responsive m-3 border rounded shadow-sm">
                    <table class="table table-hover align-middle mb-0 bg-white">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3"><i class="bi bi-person-badge me-1"></i> Login PPPoE</th>
                                <th><i class="bi bi-router me-1"></i> MAC da ONU</th>
                                <th><i class="bi bi-activity me-1"></i> Sinal RX / TX</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${contrato.logins.map(l => {
                                let onuMac = '<span class="text-muted small">Sem ONU</span>';
                                let onuSinal = '<small class="text-muted">-</small>';
                                
                                if (l.onu) {
                                    onuMac = `<span class="font-monospace fw-bold">${l.onu.mac || l.onu.onu_mac || '-'}</span>`;
                                    const rx = l.onu.sinal_rx && l.onu.sinal_rx !== '-' ? `${l.onu.sinal_rx} dBm` : '-';
                                    const tx = l.onu.sinal_tx && l.onu.sinal_tx !== '-' ? `${l.onu.sinal_tx} dBm` : '-';
                                    
                                    const valRx = parseFloat(l.onu.sinal_rx);
                                    let rxClass = 'text-success';
                                    if (!isNaN(valRx) && (valRx < -26 || valRx === 0)) {
                                        rxClass = 'text-danger';
                                    } else if (!isNaN(valRx) && valRx < -24) {
                                        rxClass = 'text-warning';
                                    }
                                    
                                    onuSinal = `<div style="font-size: 0.85rem; line-height: 1.2;">
                                        <span class="${rxClass} fw-bold">RX: ${rx}</span><br>
                                        <span class="text-secondary fw-medium">TX: ${tx}</span>
                                    </div>`;
                                } else if (l.mac) {
                                    onuMac = `<span class="font-monospace">${l.mac}</span>`;
                                }

                                return `<tr>
                                    <td class="ps-3 fw-medium text-primary">${l.login}</td>
                                    <td>${onuMac}</td>
                                    <td>${onuSinal}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
            } else {
                loginsHtml = '<div class="alert alert-light m-3 border text-muted"><i class="bi bi-exclamation-circle me-2"></i>Nenhum login (PPPoE) vinculado a este contrato.</div>';
            }

            accItem.innerHTML = `
                <h2 class="accordion-header" id="headingC${contrato.id}">
                    <button class="accordion-button collapsed py-3" type="button" aria-expanded="false" aria-controls="collapseC${contrato.id}">
                        <div class="d-flex w-100 justify-content-between align-items-center me-3">
                            <div>
                                <span class="badge bg-success me-2">Ativo</span>
                                <span class="fw-bold me-2">ID: ${contrato.id}</span> 
                                <span class="text-muted border-start ps-2 border-2">${contrato.contrato || 'Contrato'}</span>
                            </div>
                            <div class="small text-muted text-truncate d-none d-md-block" style="max-width: 400px;">
                                <i class="bi bi-geo-alt-fill me-1 text-primary"></i>${contrato.endereco || ''}, ${contrato.numero || ''} - ${contrato.bairro || ''}
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapseC${contrato.id}" class="accordion-collapse collapse" aria-labelledby="headingC${contrato.id}" data-bs-parent="#accordionContratos">
                    <div class="accordion-body p-0 bg-light">
                        ${loginsHtml}
                    </div>
                </div>`;
            
            const btn = accItem.querySelector('.accordion-button');
            const collapseTarget = accItem.querySelector('.accordion-collapse');
            
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const isExpanded = collapseTarget.classList.contains('show');
                
                document.querySelectorAll('#accordionContratos .accordion-collapse.show').forEach(el => {
                    el.classList.remove('show');
                    const relatedBtn = el.parentElement.querySelector('.accordion-button');
                    if(relatedBtn) {
                        relatedBtn.classList.add('collapsed');
                        relatedBtn.setAttribute('aria-expanded', 'false');
                    }
                });

                if (!isExpanded) {
                    collapseTarget.classList.add('show');
                    btn.classList.remove('collapsed');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });

            accordion.appendChild(accItem);
        });
    } catch (error) {
        accordion.innerHTML = `<div class="text-center text-danger p-4"><i class="bi bi-x-circle fs-3 d-block mb-2"></i>${error.message}</div>`;
    }
}

function resetarEstadoPaginaCompleto() {
    todosClientesCache = [];
    dadosFiltrados = [];
    paginaAtual = 1;
    parceiroIdSelecionado = document.getElementById('select-parceiro').value;

    const tbody = document.getElementById('lista-clientes-body');
    if (tbody) tbody.innerHTML = '';
    
    const totalClientes = document.getElementById('stats-total-clientes');
    if (totalClientes) totalClientes.textContent = '0'; 
    
    const inputBusca = document.getElementById('input-busca-cliente');
    if (inputBusca) inputBusca.value = '';

    const paginacao = document.getElementById('paginacao-container');
    if (paginacao) paginacao.innerHTML = '';

    const chkExibirContratos = document.getElementById('chk-exibir-contratos');
    if (chkExibirContratos) chkExibirContratos.checked = false;

    const secaoContratos = document.getElementById('secao-contratos-parceiro');
    if (secaoContratos) secaoContratos.style.display = 'none';

    const accordion = document.getElementById('accordionContratos');
    if (accordion) accordion.innerHTML = '';

    const painelVazio = document.getElementById('empty-clientes');
    if (painelVazio) painelVazio.style.display = 'none';
    
    const loadingContainer = document.getElementById('loading-clientes');
    if (loadingContainer) loadingContainer.style.display = 'none';
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
    const setorLogado = $('.user-info span.fw-medium').eq(1).text() || 'Desconhecido';
    
    console.log(`[Suporte] Abrindo chamado por ${usuarioLogado} (${setorLogado}) - Tipo: ${tipo}`);
    
    try {
        await fetch('/api/v5/ixc/abrir-chamado-suporte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo: `[RN - ${setorLogado}] ${tipo}`, 
                mensagem: `Solicitante: ${usuarioLogado}\nSetor: ${setorLogado}\n\nDescrição:\n${mensagem}`,
                setor: 'NOC'
            })
        });
        console.log("Chamado enviado ao NOC.");
    } catch (e) {
        console.error("ERRO CRÍTICO: Não foi possível abrir o chamado de suporte.", e);
    }
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}