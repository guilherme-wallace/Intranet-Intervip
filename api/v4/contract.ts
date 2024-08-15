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

export async function getContracts(clientId: string): Promise<string> {
    options.body = JSON.stringify({
	qtype: 'cliente_contrato.id_cliente',
        query: clientId
    });

    return await fetch('https://ixc.intervip.net.br/webservice/v1/cliente_contrato', options)
    .then(response => response.json()).then(async (response) => {
	if (response.registros != undefined) {
	    let contracts = [];

	    for (let contract of response.registros) {
		options.body = JSON.stringify({
		    qtype: 'vd_contratos.id',
		    query: contract.id_vd_contrato
		});
		
		const price: number = await fetch('https://ixc.intervip.net.br/webservice/v1/vd_contratos', options)
		.then(response => response.json()).then(response => {
		    if (response.total == 1) {
		    	return +response.registros[0].valor_contrato;
		    }
		});

		contracts.push({
		    Contrato: contract.id,
		    Cliente: contract.id_cliente,
		    Descricao: contract.contrato,
		    Assinatura: new Date(`${contract.data}T00:00:00.000-03:00`),
		    Inicio: new Date(`${contract.data_ativacao}T00:00:00.000-03:00`),
		    Fim: contract.data_cancelamento == '0000-00-00' ? null : contract.data_cancelamento,
		    Situacao: contract.status,
		    Valor: price
		});
	    }

	    return contracts;
	}
    }) as string;
}
