import { Technology } from '../../types/technology';
import { Pool, escape } from 'mysql';

export async function getTechnologies(MySQL: Pool): Promise<Technology[]> {
    const QUERY = 'SELECT * FROM technology';

    return new Promise<Technology[]>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getTechnology(MySQL: Pool, technologyId: number): Promise<Technology> {
    const QUERY = `SELECT * FROM technology WHERE technologyId = ${escape(technologyId)};`;

    return new Promise<Technology>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response[0]);
        });
    });
}