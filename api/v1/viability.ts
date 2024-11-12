import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { Viability } from '../../types/viability';
import { Pool, escape } from 'mysql';

export async function postViabilitys(MySQL: Pool, viabilitys: Viability[]): Promise<MySQLResponse> {
    let query = 'INSERT INTO viability(clientName, cnpj, nomeFantaisa, phoneNumber, email, postalCodeId, city, neighborhood, state, address, number, complement, type, condominio, block, apartment, unionNumber, operador) VALUES';
        
    for (const viability of viabilitys) { 
        query += `(${escape(viability.clientName)}, ${escape(viability.cnpj)}, ${escape(viability.nomeFantaisa)}, ${escape(viability.phoneNumber)}, 
            ${escape(viability.email)}, ${escape(viability.postalCodeId)}, ${escape(viability.city)}, 
            ${escape(viability.neighborhood)}, ${escape(viability.state)}, ${escape(viability.address)}, ${escape(viability.number)}, ${escape(viability.complement)},
            ${escape(viability.type)}, ${escape(viability.condominio)}, ${escape(viability.block)}, ${escape(viability.apartment)}, ${escape(viability.unionNumber)}, ${escape(viability.operador)}),`;
    }

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(query.slice(0, -1).concat(';'), (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}