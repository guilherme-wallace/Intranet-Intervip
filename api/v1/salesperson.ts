import { Salesperson } from '../../types/salesperson';
import { Pool, escape } from 'mysql';

export async function getSalespeople(MySQL: Pool, queryString: string): Promise<Salesperson[]> {
    let query: string;

    if (queryString) {
        query = `SELECT * FROM saleSalesperson WHERE name LIKE ${escape(`%${queryString}%`)};`;
    }

    else {
        query = 'SELECT * FROM saleSalesperson ORDER BY name;';
    }

    return new Promise<Salesperson[]>((resolve, reject) => {
        MySQL.query(query, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getSalesperson(MySQL: Pool, salespersonId: number): Promise<Salesperson> {
    const QUERY = `SELECT * FROM saleSalesperson WHERE salespersonId = ${escape(salespersonId)};`;

    return new Promise<Salesperson>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response[0]);
        });
    });
}