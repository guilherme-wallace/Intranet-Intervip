import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { Group } from '../../types/group';
import { ROUTERBOX } from '../database';
import { Pool, escape } from 'mysql';

export async function getGroups(MySQL: Pool, queryString?: string): Promise<Group[]> {
    const QUERY = `SELECT ClienteGrupo.Codigo as value, ClienteGrupo.Nome as text FROM isupergaus.ClienteGrupo
        WHERE ClienteGrupo.nome LIKE ${escape(`%${queryString}%`)} LIMIT 25;`;

    return new Promise<Group[]>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);

            if (!response || response.length == 0) {
                return reject(new MySQLReturnNullError());
            }
            
            return resolve(response);
        });
    });
}

export async function getGroup(MySQL: Pool, groupId: number): Promise<Group> {
    let query = `SELECT * FROM \`group\` WHERE groupId = ${escape(groupId)};`;

    return new Promise<Group>((resolve, reject) => {
        MySQL.query(query, (error, response) => {
            if (error) return reject(error);

            if (!response || response.length == 0) {
                query = `SELECT Codigo as groupId, Nome as name FROM ClienteGrupo WHERE Codigo = ${escape(groupId)};`;
		ROUTERBOX.query(query, (error, response) => {
                    if (error) return reject(error);

                    if (!response || response.length == 0) {
                        return reject(new MySQLReturnNullError());
                    }
                    
		    postGroup(MySQL, response[0]);
                    return resolve(response[0]);
                });
            }

	    else {
                return resolve(response[0]);
	    }
        });
    });
}

export async function postGroup(MySQL: Pool, group: Group): Promise<MySQLResponse> {
    const QUERY = `INSERT INTO \`group\` (groupId, name) VALUES (${escape(group.groupId)}, ${escape(group.name)});`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getPlans(MySQL: Pool, groupId: number): Promise<string> {
    const QUERY = `SELECT PlanosRegrasComerciais.Codigo, PlanosPacotes.Descricao, Planos.Valor
        FROM isupergaus.PlanosRegrasComerciais LEFT JOIN isupergaus.PlanosPacotes
        ON PlanosRegrasComerciais.Codigo = PlanosPacotes.Codigo AND PlanosPacotes.Situacao = 'A'
        RIGHT JOIN isupergaus.PlanosPacotesItens ON PlanosPacotes.Codigo = PlanosPacotesItens.Pacote
        INNER JOIN isupergaus.Planos ON PlanosPacotesItens.Plano = Planos.Codigo
        WHERE find_in_set(${escape(groupId)}, PlanosRegrasComerciais.Filtro) AND PlanosRegrasComerciais.Situacao = 'A'
        ORDER BY Descricao DESC;`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getGroupAddress(MySQL: Pool, groupId: number): Promise<string> {
    const QUERY = `SELECT Clientes.CEP, Clientes.Endereco, Clientes.Numero, Clientes.Cidade, Clientes.Bairro,
        count(*) AS Quantidade FROM isupergaus.Clientes WHERE Clientes.Grupo = ${escape(groupId)} GROUP BY Clientes.Endereco
        ORDER BY Quantidade DESC LIMIT 1;`;

    let result = await new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response[0]);
        });
    });

    if (result.length == 2) {
        const QUERY = `SELECT ClienteGrupo.Descricao AS Endereco FROM isupergaus.ClienteGrupo
        WHERE ClienteGrupo.Codigo = ${escape(groupId)};`;

        return new Promise<string>((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error) return reject(error);
                return resolve(response);
            });
        });
    }

    return result;
}
