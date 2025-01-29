$(document).ready(function () {
    configurarOrdenacaoTabela();
    configurarAutocompleteCondominio();
    configurarSelecaoBloco();
    configurarSelecaoTabela();
});

function configurarOrdenacaoTabela() {
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
        const table = th.closest('table');
        const columnIndex = Array.from(th.parentNode.children).indexOf(th);
        const asc = th.asc = !th.asc;

        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparador(columnIndex, asc))
            .forEach(tr => $(table).append(tr));
    }));
}

function comparador(idx, asc) {
    return (a, b) => {
        const v1 = obterValorCelula(asc ? a : b, idx);
        const v2 = obterValorCelula(asc ? b : a, idx);
        return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
    };
}

function obterValorCelula(tr, idx) {
    return tr.children[idx].innerText || tr.children[idx].textContent;
}

function configurarAutocompleteCondominio() {
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json())
                    .then(data => callback(data));
            }
        }
    });
    $('#input-condo').on('autocomplete.select', function (e, item) {
        localStorage['condominioId'] = item.value;
        verificarTipoTabela();
    });
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

function listarClientes(tipo) {
    const url = `api/v4/client/condominio/${localStorage['condominioId']}`;
    fetch(url)
        .then(response => response.json())
        .then(clientes => atualizarTabelaClientes(clientes, tipo));
}

function atualizarTabelaClientes(clientes, tipo) {
    const listaId = tipo === "casas" ? "#clientes-lista-casas" : "#clientes-lista-condominios";
    $(listaId).empty().append('<tr></tr>');
    clientes.forEach(cliente => buscarStatusCliente(cliente, listaId, tipo));
}

function buscarStatusCliente(cliente, listaId, tipo) {
    fetch(`api/v4/radius/${cliente.Codigo}`)
        .then(response => response.status === 200 ? response.json() : null)
        .then(data => inserirClienteNaTabela(cliente, data, listaId, tipo));
}

function inserirClienteNaTabela(cliente, data, listaId, tipo) {
    const statusText = definirStatusCliente(data);
    const ipdata = verificarIP(data?.IP);
    let html;
    
    if (tipo === "casas") {
        html = `<tr style="font-size: small;">
                    <td>${statusText}</td>
                    <td>${cliente.Codigo}</td>
                    <td>${cliente.Endereco}</td>
                    <td>${cliente.Numero}</td>
                    <td>${ipdata}</td>
                    <td>${data?.Login ?? 'N/A'}</td>
                    <td>${data?.Logout ?? 'N/A'}</td>
                </tr>`;
    } else {
        html = `<tr style="font-size: small;">
                    <td>${statusText}</td>
                    <td>${cliente.Codigo}</td>
                    <td>${cliente.Bloco || 'N/A'}</td>
                    <td>${cliente.Apartamento || 'N/A'}</td>
                    <td>${cliente.Complemento || 'N/A'}</td>
                    <td>${ipdata}</td>
                    <td>${data?.Login ?? 'N/A'}</td>
                    <td>${data?.Logout ?? 'N/A'}</td>
                </tr>`;
    }
    $(listaId).append(html);
}

function definirStatusCliente(data) {
    if (!data || (data.Login === "0000-00-00 00:00:00" && data.Logout === "0000-00-00 00:00:00")) {
        return "Pré-contrato";
    }
    return data.Status ? "ONLINE" : "OFFLINE";
}

function verificarIP(ip) {
    if (!ip) return "OFFLINE";
    return ip.startsWith("172.") ? "inadimplente" : ip;
}

function mostraCondominios() {
    $('#sectionCondominios').attr('hidden', false);
    $('#sectionCasas').attr('hidden', true);
    document.getElementById("tabelaTipo").innerHTML = "Tipo de tabela: Condomínio";
    $('#btnMostraCondominios').removeClass('btn-primary');
    $('#btnMostraCondominios').addClass('btn-warning');
    $('#bntMostraCasas').addClass('btn-primary');
    $('#bntMostraCasas').removeClass('btn-warning');
}

function mostraCasas() {
    $('#sectionCasas').attr('hidden', false);
    $('#sectionCondominios').attr('hidden', true);
    document.getElementById("tabelaTipo").innerHTML = "Tipo de tabela: Casas";
    $('#bntMostraCasas').removeClass('btn-primary');
    $('#bntMostraCasas').addClass('btn-warning');
    $('#btnMostraCondominios').addClass('btn-primary');
    $('#btnMostraCondominios').removeClass('btn-warning');
}

function refresh() {
    verificarTipoTabela();
}
