import { MySQLResponse } from '../../types/mysql-response';
import { Research } from '../../types/research';
import { Pool, escape } from 'mysql';

export async function getResearch(MySQL: Pool, researchId: number): Promise<Research | null> {
    const QUERY = `SELECT * FROM saleResearch WHERE researchId = ${escape(researchId)};`;

    return new Promise<Research | null>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);

            if (!response || response.length == 0) {
                return resolve(null);
            }

            return resolve(response[0]);
        });
    });
}

export async function postResearch(MySQL: Pool, research: Research): Promise<MySQLResponse> {
    const QUERY = `INSERT INTO saleResearch (howMetId, reasonId,
        serviceProviderId, satisfactionId, handout, facebook, instagram)
        VALUES (${escape(research.howMetId)}, ${escape(research.reasonId)},
        ${escape(research.serviceProviderId)}, ${escape(research.satisfactionId)},
        ${escape(research.handout)}, ${escape(research.facebook)}, ${escape(research.instagram)});`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getResearchAnswers(MySQL: Pool, questionId: number): Promise<string> {
    const QUERY = `SELECT * FROM saleResearchAnswer WHERE questionId = ${escape(questionId)};`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}