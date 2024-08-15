import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { Viability } from '../../types/viability';
import { Pool, escape } from 'mysql';

export async function postViabilitys(MySQL: Pool, viabilitys: Viability[]): Promise<MySQLResponse> {
    let query = 'INSERT INTO viability (clientName, phoneNumber, email, postalCodeId, city, neighborhood, state, address, number, complement) VALUES';
        
    for (const viability of viabilitys) {
        query += ` (${escape(viability.clientName)}, ${escape(viability.phoneNumber)}, 
            ${escape(viability.email)}, ${escape(viability.postalCodeId)}, ${escape(viability.city)}, 
            ${escape(viability.neighborhood)}, ${escape(viability.state)}), ${escape(viability.address)}, ${escape(viability.number)}, ${escape(viability.complement)}`;
    }

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(query.slice(0, -1).concat(';'), (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}