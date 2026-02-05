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

document.addEventListener('DOMContentLoaded', function() {
    modalCadastro = new bootstrap.Modal(document.getElementById('modalCadastroCliente'));
    modalONU = new bootstrap.Modal(document.getElementById('modalGerenciarONU'));
    modalListaONUs = new bootstrap.Modal(document.getElementById('modalListaONUs'));
    modalEditar = new bootstrap.Modal(document.getElementById('modalEditarCliente'));
    
    const complementoModalEl = document.getElementById('complementoModal');
    if(complementoModalEl) complementoModal = new bootstrap.Modal(complementoModalEl);

    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            const modalEl = btn.closest('.modal');
            if (modalEl) {
                let modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (!modalInstance) {
                    modalInstance = new bootstrap.Modal(modalEl);
                }
                modalInstance.hide();
            }
        });
    });

    $('#rn-cep').inputmask('99999-999');
    $('#edit-cep').inputmask('99999-999');
    $('#onu-mac').on('input', function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    document.getElementById('btn-edit-complemento').addEventListener('click', function() {
        contextComplemento = 'edit';
        openComplementoModal();
    });

    document.getElementById('btn-complemento').addEventListener('click', function() {
        contextComplemento = 'rn';
        openComplementoModal();
    });

    // LISTENER PARA ATUALIZAR TABELA AO FECHAR O MODAL DE EDIÇÃO
    // Como agora o fechamento é forçado via .hide(), este evento será disparado corretamente.
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
});

// ... (Restante do arquivo permanece inalterado) ...
function setupListeners() {
    document.getElementById('select-parceiro').addEventListener('change', function(e) {
        parceiroIdSelecionado = e.target.value;
        const btnNovo = document.getElementById('btn-novo-cliente');
        const option = e.target.options[e.target.selectedIndex];
        
        const valorFixo = parseFloat(option.dataset.valorFixo);
        document.getElementById('stats-valor-fixo').textContent = (valorFixo > 0) ? `R$ ${valorFixo.toFixed(2)}` : 'N/A';

        const selectPlanos = document.getElementById('rn-plano');
        selectPlanos.querySelectorAll('option').forEach(opt => {
            if (opt.value === "") return;
            const preco = (valorFixo > 0) ? valorFixo : parseFloat(opt.dataset.precoOriginal);
            opt.textContent = `${opt.dataset.nome} (R$ ${preco.toFixed(2)})`;
            opt.dataset.valor = preco;
        });

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
            abrirModalONU(loginId, nomeDesc, "Edição", mac);
        } else {
            alert("Este cliente não possui um Login IXC vinculado para gerenciar a ONU.");
        }
    });
    
    document.getElementById('btn-abrir-lista-onus').addEventListener('click', abrirListaONUs);
    document.getElementById('btn-autorizar-onu').addEventListener('click', autorizarONU);
    document.getElementById('btn-desautorizar-onu').addEventListener('click', desautorizarONU);

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
        
        todosClientesCache = await response.json(); 
        
        loading.style.display = 'none';
        
        if (!todosClientesCache || todosClientesCache.length === 0) {
            empty.style.display = 'block';
        } else {
            tableContainer.style.display = 'block';
            paginaAtual = 1;
            renderizarTabela(); 
        }
    } catch (error) {
        console.error(error);
        loading.style.display = 'none';
        alert('Erro ao carregar carteira de clientes.');
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

        tr.innerHTML = `
            <td>
                <div class="fw-bold text-primary">${descricaoVisual}</div>
                <small class="text-muted">${item.login_pppoe || ''}</small>
            </td>
            <td>${dataCriacao}</td>
            <td>R$ ${valor}</td>
            <td>${authBadge} ${onlineBadge}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1 btn-editar-cliente" data-cliente="${dadosJson}">
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
                    .then(response => response.json()).then(data => callback(data))
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
                    .then(response => response.json()).then(data => callback(data));
            }
        }
    });

    $('#edit-condominio').on('autocomplete.select', function (e, item) {
        if (!item?.value) return;
        $("#edit-hidden-condominio-id").val(item.value);
        
        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
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
            select.appendChild(option);
        });

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
        displayOnu.innerHTML = `<div class="d-flex align-items-center text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Carregando dados IXC...</div>`;
        
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
            displayOnu.innerHTML = `<div class="alert alert-warning small p-1">Erro ao carregar IXC. Edição local permitida.</div>`;
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
    showLoading("Processando cancelamento no IXC e OLT... Aguarde.");

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
    btn.disabled = true;
    btn.innerHTML = 'Salvando...';

    const id = document.getElementById('edit-id').value;
    const token = document.getElementById('edit-token').value; 
    const descSemToken = document.getElementById('edit-descricao').value.trim();
    
    let identificadorCompleto = descSemToken;
    if (token) {
        identificadorCompleto = `${token}-${descSemToken}`;
    }
    
    let complementoFinal = document.getElementById('edit-complemento-text').value;

    const payload = {
        descricao_produto: identificadorCompleto,
        login_pppoe: identificadorCompleto,
        
        status_ativo: document.getElementById('edit-status').value,
        obs: document.getElementById('edit-obs').value,
        
        cep: document.getElementById('edit-cep').value,
        endereco: document.getElementById('edit-endereco').value,
        numero: document.getElementById('edit-numero').value,
        bairro: document.getElementById('edit-bairro').value,
        
        id_condominio: document.getElementById('edit-hidden-condominio-id').value,
        complemento: complementoFinal,
        referencia: document.getElementById('edit-referencia').value,
        bloco: document.getElementById('edit-hidden-bloco').value,
        apartamento: document.getElementById('edit-hidden-apartamento').value,
        cidade: document.getElementById('edit-hidden-cidade-id').value,
        uf: document.getElementById('edit-uf').value
    };

    console.log("Payload Edição Unificada:", payload);

    try {
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

    const selectPlano = document.getElementById('rn-plano');
    const planoOption = selectPlano.options[selectPlano.selectedIndex];
    
    const semCondominio = $('#chk-sem-condominio').is(':checked');
    const nomeCondominio = $('#input-condominio-venda').val();

    let complementoFinal = $('#rn-complemento').val();
    if(semCondominio) complementoFinal = nomeCondominio;

    const payload = {
        parceiro_id: document.getElementById('select-parceiro').value,
        cod_cliente_parceiro: document.getElementById('rn-cod-cliente-parceiro').value.trim(),
        caixa_atendimento: document.getElementById('rn-caixa-atendimento').value.trim(),
        porta: document.getElementById('rn-porta').value.trim(),
        
        cep: document.getElementById('rn-cep').value,
        endereco: document.getElementById('rn-endereco').value,
        numero: document.getElementById('rn-numero').value,
        bairro: document.getElementById('rn-bairro').value,
        cidade: document.getElementById('hidden-cidade-id').value,
        uf: document.getElementById('rn-uf').value,
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
            alert(`Cliente Cadastrado!\nLogin: ${result.login}`);
        }

    } catch (error) {
        alert('Erro: ' + error.message);
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

    selOnu.innerHTML = '<option value="" selected disabled>Carregando lista do IXC...</option>';
    
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

    try {
        const resPerfil = await fetch('/api/v5/rede_neutra/perfis-fibra');
        const perfis = await resPerfil.json();
        selPerfil.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        perfis.forEach(p => selPerfil.add(new Option(p.nome, p.id)));

        const userGroup = document.querySelector('.user-info span.fw-medium:last-child').textContent;
        const config = MAPA_PARCEIROS[userGroup];
        
        if (config) {
            const perfilOpcao = Array.from(selPerfil.options).find(opt => 
                opt.text.includes(config.perfil)
            );
            if (perfilOpcao) {
                selPerfil.value = perfilOpcao.value;
            }
        }
    } catch (e) { console.error("Erro perfis:", e); }
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
        alert(`Atenção: O transmissor "${oltName}" vindo da ONU não foi encontrado na lista de transmissores cadastrados no IXC. Verifique o cadastro.`);
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
    
    document.getElementById('rn-endereco').readOnly = false;
    document.getElementById('rn-bairro').readOnly = false;
    
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

function getCidadeNome(id) {
    const map = { "3173": "Vitória", "3172": "Vila Velha", "3169": "Viana", "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica", "3124": "Guarapari" };
    return map[id] || 'Cidade Desconhecida';
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
            if (el.textContent.includes('{username}')) el.textContent = username;
            if (el.textContent.includes('{group}')) el.textContent = group;
        });

        aplicarRestricoesParceiro(group);

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
}

async function aplicarRestricoesParceiro(setorUsuario) {
    const configParceiro = MAPA_PARCEIROS[setorUsuario];
    
    if (!configParceiro) return;

    console.log(`[Acesso Parceiro] Aplicando restrições para: ${setorUsuario}`);

    let tentativa = 0;
    const interval = setInterval(() => {
        const selectParceiro = document.getElementById('select-parceiro');
        const selectPerfil = document.getElementById('select-perfil');

        const optionsParceiro = Array.from(selectParceiro.options);
        const optionParceiroEncontrada = optionsParceiro.find(opt => 
            opt.text.toUpperCase().includes(configParceiro.nome.toUpperCase())
        );

        if (optionParceiroEncontrada) {
            selectParceiro.value = optionParceiroEncontrada.value;
            selectParceiro.disabled = true;
        }

        if (selectPerfil && selectPerfil.options.length > 1) {
            const optionsPerfil = Array.from(selectPerfil.options);
            const perfilAlvo = configParceiro.perfil.toUpperCase();

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

                selectPerfil.disabled = true;
                
                clearInterval(interval);
                console.log(`Perfil ${perfilAlvo} aplicado e travado.`);
            }
        }

        if (tentativa++ > 50) clearInterval(interval);
    }, 100);
}

function showLoading(texto) {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}