$(document).ready(function () {

    // Função auxiliar para obter o valor de uma célula (coluna de uma linha)
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

    // Comparador para ordenar colunas; verifica se os valores são números ou strings
    const comparer = (idx, asc) => (a, b) => {
        const v1 = getCellValue(asc ? a : b, idx); // Valor da célula da linha a
        const v2 = getCellValue(asc ? b : a, idx); // Valor da célula da linha b
        return v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2);
    };

    // Ativa a ordenação ao clicar nos cabeçalhos das colunas
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
        const table = th.closest('table'); // Obtém a tabela onde o cabeçalho foi clicado
        // Ordena as linhas da tabela, exceto a primeira (cabeçalho)
        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
            .forEach(tr => $('#clientes-lista').append(tr)); // Reorganiza as linhas na tabela
    }));

    // Autocomplete para o campo de entrada 'input-condo' com busca personalizada
    $('#input-condo').autoComplete({
        minLength: 1, // Mínimo de 1 caractere para ativar o autocomplete
        resolver: 'custom', // Tipo de resolução personalizada para o autocomplete
        events: {
            // Busca na API conforme o query digitado
            search: function (query, callback) {
                fetch(`api/v4/group?query=${query}`).then(response => response.json()).then(data => {
                    callback(data); // Chama o callback com os dados recebidos
                });
            }
        }
    });

    // Ao clicar em um item do bloco, insere o valor do bloco e envia o formulário
    $('.bloco-item').click(function () {
        let val = $(this).data('id'); // Pega o ID do bloco (via atributo data)
        $('#input-bloco-value').val(val); // Define o valor no input oculto
        $('#main-form').submit(); // Envia o formulário
    });

    // Quando o usuário seleciona um item no autocomplete
    $('#input-condo').on('autocomplete.select', function (e, item) {
        localStorage['groupId'] = item.value; // Armazena o groupId no localStorage
        listaClientes(); // Chama a função para listar clientes
    });
});

// Função para listar clientes com base no 'groupId' selecionado
function listaClientes() {
    fetch(`api/v4/client/group/${localStorage['groupId']}`).then(response => response.json()).then(clients => {
        
        // Template de uma linha de cliente a ser preenchida
        let html = template`<tr style="font-size: small;">
                                <td>${'status'}</td>
                                <td>${'codigo'}</td> 
                                <td>${'complemento'}</td> 
                                <td>${'ip'}</td> 
                                <td>${'uptime'}</td> 
                                <td>${'downtime'}</td> 
                            </tr>`;

        // Limpa a lista de clientes antes de inserir os novos
        $('#clientes-lista').empty();
        $('#clientes-lista').append('<tr></tr>'); // Adiciona uma linha vazia (opcional)

        // Para cada cliente na lista recebida
        for (const client of clients) {
            // Faz uma requisição para obter detalhes do cliente (status do Radius)
            fetch(`api/v4/radius/${client.Codigo}`).then(function(response) {
                switch (response.status) {
                    case 200:
                        return response.json(); // Se o status for 200 (OK), retorna os dados em JSON
                    case 404:
                        return null; // Se o cliente não for encontrado, retorna null
                }
            }).then(data => {
                // Verifica se o login e logout são "0000-00-00 00:00:00"
                let statusText = data.Status ? 'ONLINE' : 'OFFLINE';
                let loginText = data.Login;
                let logoutText = data.Logout;
                let complementoText = client.Complemento;
                let ipdata =data.IP;
                let ipTextRegex = ipdata.search(/172/i);
                

                if (data.Login === "0000-00-00 00:00:00" && data.Logout === "0000-00-00 00:00:00") {
                    statusText = "Pré-contrato";
                    loginText = "Aguardando instalação";
                    logoutText = "Aguardando instalação";
                    ipdata = "Pré-contrato";
                }

                if (client.Complemento === "") {
                    complementoText = "N/A";
                }
          
                if (ipdata === "") {
                    ipdata = "OFFLINE";
                }
                if (ipTextRegex == "0") {
                    ipdata = "inadimplente"
                }
                console.log(ipTextRegex, ipdata)

                $('#clientes-lista').append(html({
                    status: statusText,
                    codigo: client.Codigo,
                    complemento: complementoText ?? 'N/A',
                    ip: ipdata ?? 'N/A',
                    uptime: loginText ?? 'N/A',
                    downtime: logoutText ?? 'N/A'
                }));
            });
        }
    });
}

/*
fetch(`api/v4/radius/${client.Codigo}`).then(function(response) {
    switch (response.status) {
        case 200:
            return response.json();
        case 404:
            return null;
    }
}).then(data => {
    // Verifica se o login e logout são "0000-00-00 00:00:00"
    let statusText = data.Status ? 'ONLINE' : 'OFFLINE';
    let loginText = data.Login;
    let logoutText = data.Logout;
    
    if (data.Login === "0000-00-00 00:00:00" && data.Logout === "0000-00-00 00:00:00") {
        statusText = "Pré-contrato";
        loginText = "Aguardando assinatura";
        logoutText = "Aguardando assinatura";
    }

    $('#clientes-lista').append(html({
        status: statusText,
        codigo: client.Codigo,
        complemento: client.Complemento,
        ip: data.IP ?? 'N/A',
        uptime: loginText,
        downtime: logoutText
    }));
});


// Função para listar clientes com base no 'groupId' selecionado
function listaClientes() {
    fetch(`api/v4/client/group/${localStorage['groupId']}`).then(response => response.json()).then(clients => {
        
        // Template de uma linha de cliente a ser preenchida
        let html = template`<tr style="font-size: small;">
                                <td>${'status'}</td>
                                <td>${'codigo'}</td> 
                                <td>${'complemento'}</td> 
                                <td>${'ip'}</td> 
                                <td>${'uptime'}</td> 
                                <td>${'downtime'}</td> 
                            </tr>`;

        // Limpa a lista de clientes antes de inserir os novos
        $('#clientes-lista').empty();
        $('#clientes-lista').append('<tr></tr>'); // Adiciona uma linha vazia (opcional)

        // Para cada cliente na lista recebida
        for (const client of clients) {
            // Faz uma requisição para obter detalhes do cliente (status do Radius)
            fetch(`api/v4/radius/${client.Codigo}`).then(function(response) {
                switch (response.status) {
                    case 200:
                        return response.json(); // Se o status for 200 (OK), retorna os dados em JSON
                    case 404:
                        return null; // Se o cliente não for encontrado, retorna null
                }
            }).then(data => {
                // Preenche e adiciona a linha na tabela de clientes com os dados retornados
                $('#clientes-lista').append(html({
                    status: data?.Status ? 'ONLINE' : 'OFFLINE', // Se Status for true, mostra ONLINE, caso contrário OFFLINE
                    codigo: client.Codigo, // Código do cliente
                    complemento: client.Complemento, // Complemento do cliente
                    ip: data?.IP ?? 'N/A', // Se houver IP, mostra, senão N/A
                    uptime: data?.Login ?? 'N/A', // Tempo de login, ou N/A se não houver
                    downtime: data?.Logout ?? 'N/A' // Tempo de logout, ou N/A se não houver
                }));
            });
        }
    });
}
*/