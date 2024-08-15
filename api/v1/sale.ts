import { MySQLInvalidError, MySQLReturnNullError } from '../../errors/MySQLErrors';
import { getContract, postContract, updateContract } from './contract';
import { getAddress, postAddress, postPostalCode } from './address';
import { MySQLResponse } from '../../types/mysql-response';
import { getResearch, postResearch } from './research';
import { Salesperson } from '../../types/salesperson';
import { Technology } from '../../types/technology';
import { Contract } from '../../types/contract';
import { Research } from '../../types/research';
import { getSalesperson } from './salesperson';
import { Address } from '../../types/address';
import { getTechnology } from './technology';
import { Group } from '../../types/group';
import { Sale } from '../../types/sale';
import { Pool, escape } from 'mysql';
import { getGroup } from './group';
import { GetContracts } from '../v2';

export async function getSalesByClient(MySQL: Pool, clientId: number): Promise<Sale[]> {
    let query = `SELECT * FROM sale WHERE clientId = ${escape(clientId)};`;
    return getSales(MySQL, query);
}

export async function getSalesByContract(MySQL: Pool, contractId: string, limit?: number): Promise<Sale[]> {
    let query = `SELECT * FROM sale WHERE contractId = ${escape(contractId)}`;

    if (limit && limit > 0) {
        query += ` LIMIT ${escape(limit)}`;
    }

    else if (limit && limit < 0) {
        query += ` ORDER BY saleId DESC LIMIT ${escape(limit * -1)}`;
    }
    
    query += ';';
    return getSales(MySQL, query);
}

async function getSales(MySQL: Pool, query: string): Promise<Sale[]> {
    let result = await new Promise<any[]>((resolve, reject) => {
        MySQL.query(query, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });

    if (!result || result.length == 0) {
        throw new MySQLReturnNullError();
    }

    let sales: Sale[] = [];

    for (var obj of result) {
        let salesperson: Salesperson = await getSalesperson(MySQL, obj.salespersonId);
        let technology: Technology = await getTechnology(MySQL, obj.technologyId);
        let contract: Contract = await getContract(MySQL, obj.contractId);
        let research: Research | null = await getResearch(MySQL, obj.researchId);
        let address: Address = await getAddress(MySQL, obj.addressId);
        let group: Group = await getGroup(MySQL, obj.groupId);
    
        delete obj.salespersonId;
        delete obj.technologyId;
        delete obj.researchId;
        delete obj.contractId;
        delete obj.addressId;
        delete obj.groupId;
    
        let sale: Sale = Object.assign({}, obj);
        sale.contract = contract;
        sale.group = group;
        sale.address = address;
        sale.technology = technology;
        sale.research = research;
        sale.salesperson = salesperson;
        sale.datetime = new Date(sale.datetime).toISOString();
        sales.push(sale);
    }

    return sales;
}

export async function postSale(MySQL: Pool, sale: Sale): Promise<MySQLResponse> {
    try {
        switch ((await getSalesByContract(MySQL, sale.contract.contractId, -1)).pop().operation) {
            case 'V':
                if (['V', 'R', 'T'].includes(sale.operation)) {
                    throw new MySQLInvalidError();
                }
                break;
            case 'R':
                if (['V', 'R', 'T'].includes(sale.operation)) {
                    throw new MySQLInvalidError();
                }
                break;
            case 'C':
                if (['V', 'C', 'S'].includes(sale.operation)) {
                    throw new MySQLInvalidError();
                }
                break;
            case 'S':
                if (['V', 'S'].includes(sale.operation)) {
                    throw new MySQLInvalidError();
                }
                break;
            case 'T':
                if (['V', 'R', 'T'].includes(sale.operation)) {
                    throw new MySQLInvalidError();
                }
                break;
        }
    }

    catch (error) {
        if (!(error instanceof MySQLReturnNullError)) {
            throw error;
        }
    }

    if (sale.operation == 'C' || sale.operation == 'S') {
        sale.contract.endDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
    
    try {
        await postContract(MySQL, sale.contract);
    }

    catch (error) {
        if (error.code == 'ER_BAD_NULL_ERROR' || error.code == 'ER_DUP_ENTRY') {
            await updateContract(MySQL, sale.contract);
        }

        else {
            throw error;
        }
    }

    let addressId: number;

    try {
        addressId = (await postAddress(MySQL, sale.address)).insertId;
    }

    catch (error) {
        if (error.code.startsWith('ER_NO_REFERENCED_ROW')) {
            try {
                await postPostalCode(MySQL, sale.address.postalCodeId);
                addressId = (await postAddress(MySQL, sale.address)).insertId;
            }

            catch (error) {
                throw error;
            }
        }

        else throw error;
    }

    let researchId: number | null = (sale.research) ? (await postResearch(MySQL, sale.research)).insertId : null;
    sale.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
     
    const QUERY = `INSERT INTO sale (clientId, operation, contractId, groupId, addressId, technologyId,
        researchId, datetime, salespersonId, observation) VALUES (${escape(sale.clientId)},
        ${escape(sale.operation)}, ${escape(sale.contract.contractId)}, ${escape(sale.group.groupId)},
        ${escape(addressId)}, ${escape(sale.technology.technologyId)}, ${escape(researchId)},
        ${escape(sale.datetime)}, ${escape(sale.salesperson.salespersonId)}, ${escape(sale.observation)});`;

    return await new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}
