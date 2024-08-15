import fetch from "node-fetch";

const options = {
    method: 'POST',
    headers: {
        'Authorization': 'Basic NjE6N2NlMTljZjIzMDdkMmY3OTkyM2EwMjgwMjgxZGM5NmQyN2ZhYmNkMDViMGQxYjU1MTM2YWE4OTlmMjE3YjQ3Yg==',
        'Accept': 'application/json',
        'ixcsoft': 'listar'
        },
    body: undefined
};

export async function getClient(id: string): Promise<string> {
    options.body = JSON.stringify({
	qtype: 'cliente.id',
	query: id,
	oper: '='
    });

    return await fetch('https://ixc.intervip.net.br/webservice/v1/cliente', options)
    .then(response => response.json()).then(async (response) => {
	if (response.total == 1) {
	    let client = response.registros[0];
	    options.body = JSON.stringify({
                qtype: 'cidade.id',
                query: client.cidade
            });

	    let city: string = await fetch('https://ixc.intervip.net.br/webservice/v1/cidade', options)
    	    .then(response => response.json()).then(response => {
	    	if (response.total == 1) {
		    return response.registros[0].nome;
		}
	    });

	    options.body = JSON.stringify({
                qtype: 'uf.id',
            	query: client.uf
            });

	    let state: string = await fetch('https://ixc.intervip.net.br/webservice/v1/uf', options)
            .then(response => response.json()).then(response => {
                if (response.total == 1) {
                    return response.registros[0].sigla;
                }
            });

	    return {
		Nome: client.razao,
                Nascimento: client.data_nascimento,
                Email: client.email,
                TelCelular: client.telefone_celular,
                Grupo: +client.id_condominio,
                Endereco: client.endereco,
                Numero: +client.numero,
                Complemento: client.complemento,
                Bairro: client.bairro,
                Cidade: city,
                CEP: client.cep.replace("-", ""),
                UF: state
	    };
	}
    }) as string;
}

export async function getClientsByGroup(groupId: string): Promise<string> {
    let result: string[] = [];
    let pageIndex: number = 1;

    while (true) {
	options.body = JSON.stringify({
            qtype: 'cliente.id_condominio',
            query: groupId,
	    page: pageIndex,
	    oper: '=',
	    rp: 500,
	    grid_param: JSON.stringify([
	        {
		    TB: 'cliente.ativo',
		    OP: '=',
		    P: 'S'
		}
	    ])
    	});

	result.push(...await fetch('https://ixc.intervip.net.br/webservice/v1/cliente', options)
    	.then(response => response.json()).then(response => {
	    let clients = [];

	    if (response.total > 0 && response.registros?.length > 0) {
	    	for (let client of response.registros) {
		    if (client.ativo == 'S') {
		    	clients.push({
		            Codigo: client.id,
		            Complemento: client.complemento
		    	});
		    }
	    	}
	    }

	    return clients;
    	}));

	if (result.length > 0 && result.length < 500) {
	    break;
	}

	pageIndex++;
    }

    return (result as unknown) as string;
}
