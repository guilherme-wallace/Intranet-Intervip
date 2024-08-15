import { MySQLResponse } from '../../types/mysql-response';
import { Contract } from '../../types/contract';
import { Pool, escape } from 'mysql';

export async function getContracts(MySQL: Pool, clientId: number, status?: string): Promise<string> {
    let query: string;

    if (status) {
        query = `SELECT Contratos.PacoteID as Pacote, Contratos.Cliente, group_concat(Contratos.Numero) as Planos,
                PlanosPacotes.Descricao, Contratos.Assinatura, Contratos.Inicio, Contratos.Fim, Contratos.Situacao,
                sum(Contratos.ValorPlano) as Valor, Contratos.Vendedor FROM isupergaus.Contratos
                JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote
                WHERE Contratos.Cliente = ${escape(clientId)} AND Contratos.Situacao
                ${status == 'r' ? `!= ${escape('c')}` : `= ${escape(status)}`} GROUP BY Contratos.PacoteID;`;
    }

    else {
        query = `SELECT Contratos.PacoteID as Pacote, Contratos.Cliente, group_concat(Contratos.Numero) as Planos,
                PlanosPacotes.Descricao, Contratos.Assinatura, Contratos.Inicio, Contratos.Fim, Contratos.Situacao,
                sum(Contratos.ValorPlano) as Valor, Contratos.Vendedor FROM isupergaus.Contratos
                JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote
                WHERE Contratos.Cliente = ${escape(clientId)} GROUP BY Contratos.PacoteID;`;
    }

    return new Promise<string>((resolve, reject) => {
        MySQL.query(query, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getContract(MySQL: Pool, contractId: string): Promise<Contract> {
    const QUERY = `SELECT * FROM saleContract WHERE contractId = ${escape(contractId)};`;

    return new Promise<Contract>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response[0]);
        });
    });
}

export async function postContract(MySQL: Pool, contract: Contract): Promise<MySQLResponse> {
    const QUERY = `INSERT INTO saleContract (contractId, name, bandwidth, cost, startDate, endDate)
        VALUES (${escape(contract.contractId)}, ${escape(contract.name)}, ${escape(contract.bandwidth)},
        ${escape(contract.cost)}, ${escape(contract.startDate)}, ${escape(contract.endDate)});`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function updateContract(MySQL: Pool, contract: Contract): Promise<MySQLResponse> {
    const QUERY = `UPDATE saleContract SET startDate = ${escape(contract.startDate)},
        endDate = ${escape(contract.endDate)} WHERE contractId = ${escape(contract.contractId)};`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}