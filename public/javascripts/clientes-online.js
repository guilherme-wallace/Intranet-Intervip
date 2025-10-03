$(document).ready(function () {
    configurarOrdenacaoTabela();
    configurarAutocompleteCondominio();
    configurarSelecaoBloco();
    configurarSelecaoTabela();

    $('#btnMostraCondominios').on('click', mostraCondominios);
    $('#bntMostraCasas').on('click', mostraCasas);
    //$('#btnReload').on('click', refresh);
    document.getElementById('btnReload').addEventListener('click', function() {
    this.disabled = true; 
    refresh();

    setTimeout(() => {
        this.disabled = false; 
    }, 20000);
    });
    //$('#input-condo').on('onkeyup', filtrarCondominios());
});

function configurarOrdenacaoTabela() {
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
        const table = th.closest('table');
        const columnIndex = Array.from(th.parentNode.children).indexOf(th);
        const asc = th.asc = !th.asc;
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        rows.sort(comparador(columnIndex, asc)).forEach(tr => table.querySelector('tbody').appendChild(tr));
    }));
}

function comparador(idx, asc) {
    return (a, b) => {
        const v1 = obterValorCelula(a, idx);
        const v2 = obterValorCelula(b, idx);
        return asc ? v1.localeCompare(v2) : v2.localeCompare(v1);
    };
}

function obterValorCelula(tr, idx) {
    return tr.children[idx].innerText.trim() || tr.children[idx].textContent.trim();
}

function configurarAutocompleteCondominio() {
    const input = document.getElementById('input-condo');
    const dropdown = document.getElementById('dropdown-condominios');
    
    input.addEventListener('keyup', filtrarCondominios);
    dropdown.addEventListener('mouseleave', () => dropdown.style.display = 'none');
    
    function filtrarCondominios() {
        const query = input.value.trim();
        
        if (query.length < 1) {
            dropdown.style.display = 'none';
            return;
        }

        fetch(`api/v4/condominio?query=${query}`)
            .then(response => response.json())
            .then(data => {
                dropdown.innerHTML = '';
                if (data.length === 0) {
                    dropdown.style.display = 'none';
                    return;
                }
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item');
                    li.textContent = item.text || 'Desconhecido';
                    li.dataset.value = item.value;
                    li.onclick = () => selecionarCondominio(item.value, item.text);
                    dropdown.appendChild(li);
                });
                dropdown.style.display = 'block';
            })
            .catch(error => {
                console.error('Erro no autocomplete:', error);
                dropdown.style.display = 'none';
            });
    }
}

selecionarCondominio = function(value, label) {
    const input = document.getElementById('input-condo');
    const dropdown = document.getElementById('dropdown-condominios');
    
    input.value = label;
    localStorage.setItem('condominioId', value);
    dropdown.style.display = 'none';
    verificarTipoTabela();
}


function atualizarClientesInfo(total) {
    const clientesInfo = document.getElementById('clientes-info');
    const clientesTotal = document.getElementById('clientes-total');
    if (total > 0) {
        clientesTotal.textContent = total;
        clientesInfo.style.display = 'block';
    } else {
        clientesTotal.textContent = 0;
        clientesInfo.style.display = 'none';
    }
}

function configurarSelecaoBloco() {
    $('.bloco-item').click(function () {
        $('#input-bloco-value').val($(this).data('id'));
        $('#main-form').submit();
    });
}

function configurarSelecaoTabela() {
    $('#tabelaTipo').on('change', verificarTipoTabela);
}

function verificarTipoTabela() {
    const tipoTabela = document.getElementById("tabelaTipo").innerHTML;
    if (tipoTabela.includes("Condomínio")) {
        listarClientes("condominios");
    } else if (tipoTabela.includes("Casas")) {
        listarClientes("casas");
    } else {
        mostraCondominios();
        listarClientes("condominios");
    }
}

const LOADING_TIMEOUT = 15000; // 15 segundos

function listarClientes(tipo) {
    if (!localStorage['condominioId']) {
        console.warn('Nenhum condomínio selecionado');
        $('#loading-spinner').hide();
        return;
    }

    const listaId = tipo === "casas" ? "#clientes-lista-casas" : "#clientes-lista-condominios";
    const listaElement = document.querySelector(listaId);
    
    $('#loading-spinner').show();
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Tempo de carregamento excedido'));
        }, LOADING_TIMEOUT);
    });

    const apiPromise = fetch(`api/v4/client/condominio/${localStorage['condominioId']}`)
        .then(response => {
            if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
            return response.json();
        });

    Promise.race([apiPromise, timeoutPromise])
        .then(clientes => {
            if (!Array.isArray(clientes)) {
                throw new Error('Resposta inválida da API');
            }
            
            if (clientes.length === 0) {
                listaElement.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Sem clientes na localidade</td></tr>';
                atualizarClientesInfo(0);
                return;
            }
            
            atualizarClientesInfo(clientes.length);
            return processarClientes(clientes, listaId, tipo);
        })
        .catch(error => {
            console.error('Erro:', error.message);
            listaElement.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger">
                        ${error.message.includes('Tempo de carregamento excedido') 
                            ? 'Sem clientes na localidade' 
                            : 'Erro ao carregar dados'}
                    </td>
                </tr>
            `;
            atualizarClientesInfo(0);
        })
        .finally(() => {
            $('#loading-spinner').hide();
        });
}

function processarClientes(clientes, listaId, tipo) {
    const listaElement = document.querySelector(listaId);
    listaElement.innerHTML = '';
    
    return Promise.all(clientes.map(cliente => {
        return fetch(`api/v4/radius/${cliente.Codigo}`)
            .then(response => {
                if (!response.ok) return null;
                return response.json();
            })
            .then(data => {
                inserirClienteNaTabela(cliente, data, listaId, tipo);
                return true;
            })
            .catch(error => {
                console.error(`Erro ao processar cliente ${cliente.Codigo}:`, error);
                return null;
            });
    }));
}

function atualizarTabelaClientes(clientes, tipo) {
    const listaId = tipo === "casas" ? "#clientes-lista-casas" : "#clientes-lista-condominios";
    const listaElement = document.querySelector(listaId);
    
    if (!listaElement) {
        console.error(`Elemento '${listaId}' não encontrado!`);
        return;
    }

    listaElement.innerHTML = '';

    if (!clientes || clientes.length === 0) {
        listaElement.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Sem clientes na localidade</td></tr>';
        atualizarClientesInfo(0);
        return;
    }

    atualizarClientesInfo(clientes.length);

    $('#loading-spinner').show();

    Promise.all(clientes.map(cliente => 
        buscarStatusCliente(cliente, listaId, tipo)
            .catch(error => {
                console.error(`Erro ao processar cliente ${cliente.Codigo}:`, error);
                return null;
            })
    ))
    .then(results => {
        const successCount = results.filter(r => r !== null).length;
        
        if (successCount === 0) {
            listaElement.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Erro ao carregar dados dos clientes</td></tr>';
            atualizarClientesInfo(0);
        }
    })
    .catch(error => {
        console.error('Erro ao processar clientes:', error);
        listaElement.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Erro ao carregar dados</td></tr>';
        atualizarClientesInfo(0);
    })
    .finally(() => {
        $('#loading-spinner').hide();
    });
}

function buscarStatusCliente(cliente, listaId, tipo) {
    return new Promise((resolve) => {
        fetch(`api/v4/radius/${cliente.Codigo}`)
            .then(response => {
                if (!response.ok) {
                    return resolve(null);
                }
                return response.json();
            })
            .then(data => {
                inserirClienteNaTabela(cliente, data, listaId, tipo);
                resolve(true);
            })
            .catch(error => {
                console.error(`Erro ao buscar status do cliente ${cliente.Codigo}:`, error);
                resolve(null);
            });
    });
}

function inserirClienteNaTabela(cliente, data, listaId, tipo) {
    const statusText = definirStatusCliente(data);
    const ipdata = verificarIP(data?.IP);
    
    let logoutText = data?.Logout ?? 'N/A';
    if (data?.Status === true && ipdata !== "OFFLINE" && !ipdata.includes("inadimplente")) {
        logoutText = 'N/A';
    }

    const row = document.createElement('tr');
    row.style.fontSize = 'small';
    
    if (tipo === "casas") {
        row.innerHTML = `
            <td>${statusText}</td>
            <td>${cliente.Codigo}</td>
            <td style="text-align: center;">${cliente.Endereco}</td>
            <td style="text-align: center;">${cliente.Numero}</td>
            <td style="text-align: center;">${ipdata}</td>
            <td>${data?.Login ?? 'N/A'}</td>
            <td>${logoutText}</td>
        `;
    } else {
        row.innerHTML = `
            <td>${statusText}</td>
            <td>${cliente.Codigo}</td>
            <td style="text-align: center;">${cliente.Bloco || 'N/A'}</td>
            <td style="text-align: center;">${cliente.Apartamento || 'N/A'}</td>
            <td style="text-align: center;">${cliente.Complemento || 'N/A'}</td>
            <td style="text-align: center;">${ipdata}</td>
            <td>${data?.Login ?? 'N/A'}</td>
            <td>${logoutText}</td>
        `;
    }
    
    document.querySelector(listaId).appendChild(row);
}

function definirStatusCliente(data) {
    if (!data || (data.Login === "0000-00-00 00:00:00" && data.Logout === "0000-00-00 00:00:00")) {
        return '<span class="badge bg-secondary">Pré-contrato</span>';
    }
    return data.Status 
        ? '<span class="badge bg-success">ONLINE</span>' 
        : '<span class="badge bg-danger">OFFLINE</span>';
}

function verificarIP(ip) {
    if (!ip) return "OFFLINE";
    return ip.startsWith("172.") 
        ? '<span class="badge bg-warning text-dark">inadimplente</span>' 
        : ip;
}

function mostraCondominios() {
    $('#sectionCondominios').attr('hidden', false);
    $('#sectionCasas').attr('hidden', true);
    document.getElementById("tabelaTipo").innerHTML = "Tipo de tabela: Condomínio";
    $('#btnMostraCondominios').removeClass('btn-primary').addClass('btn-warning');
    $('#bntMostraCasas').removeClass('btn-warning').addClass('btn-primary');
}

function mostraCasas() {
    $('#sectionCasas').attr('hidden', false);
    $('#sectionCondominios').attr('hidden', true);
    document.getElementById("tabelaTipo").innerHTML = "Tipo de tabela: Casas";
    $('#bntMostraCasas').removeClass('btn-primary').addClass('btn-warning');
    $('#btnMostraCondominios').removeClass('btn-warning').addClass('btn-primary');
}

function refresh() {
    if (!localStorage['condominioId']) {
        alert('Por favor, selecione um condomínio primeiro');
        return;
    }
    verificarTipoTabela();
}