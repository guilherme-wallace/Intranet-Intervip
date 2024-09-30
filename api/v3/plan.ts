import { Plan } from '../../types/plan';
import { Pool, escape } from 'mysql';

export async function getPlans(MySQL: Pool, queryString: string): Promise<Plan[]> {
    const QUERY = `SELECT * FROM plan WHERE active = 1;`;

    return new Promise<Plan[]>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}
