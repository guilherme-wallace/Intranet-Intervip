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

export async function getGroups(query: string): Promise<string> {
    options.body = JSON.stringify({
	qtype: 'cliente_condominio.condominio',
        query: query
    });

    return await fetch('https://ixc.intervip.net.br/webservice/v1/cliente_condominio', options)
    .then(response => response.json()).then(response => {
	if (response.registros != undefined) {
	    let groups = [];

	    for (let group of response.registros) {
		groups.push({
		    value: group.id,
		    text: group.condominio
		});
	    }

	    return groups;
	}
    }) as string;
}
