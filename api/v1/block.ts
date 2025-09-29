// Intranet-Intervip/api/v1/block.ts
import { MySQLReturnNullError } from '../../errors/MySQLErrors';
import { MySQLResponse } from '../../types/mysql-response';
import { Block } from '../../types/block';
import { Pool, escape } from 'mysql';

export async function getTypes(MySQL: Pool): Promise<string> {
    const QUERY = 'SELECT typeId, type FROM blockType;';

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getBlocks(MySQL: Pool, condominioId: number): Promise<string> {
    const QUERY = `SELECT block.blockId, block.condominioId, technology.technology, block.name,
        blockType.type, block.floors, block.units, block.initialFloor FROM block
        JOIN blockType ON block.typeId = blockType.typeId
        JOIN technology ON block.technologyId = technology.technologyId
        WHERE block.condominioId = ${escape(condominioId)};`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);

            if (!response || response.length == 0) {
                return reject(new MySQLReturnNullError());
            }

            return resolve(response);
        });
    });
}

export async function postBlocks(MySQL: Pool, blocks: Block[]): Promise<MySQLResponse> {
    let query = 'INSERT INTO block (condominioId, technologyId, name, typeId, floors, units, initialFloor) VALUES';
        
    for (const block of blocks) {
        query += ` (${escape(block.condominio.condominioId)}, ${escape(block.structureId)}, 
            ${escape(block.name)}, ${escape(block.typeId)}, ${escape(block.floors)}, 
            ${escape(block.units)}, ${escape(block.initialFloor)}),`;
    }

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(query.slice(0, -1).concat(';'), (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function deleteBlocks(MySQL: Pool, blockId: number): Promise<string> {
    const QUERY = `DELETE FROM block WHERE blockId = ${escape(blockId)};`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function getStructures(MySQL: Pool): Promise<string> {
    const QUERY = `SELECT technologyId, technology FROM technology;`;

    return new Promise<string>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

export async function putBlock(MySQL: Pool, block: Block): Promise<MySQLResponse> {
    const QUERY = `UPDATE block SET 
        technologyId = ${escape(block.structureId)}, 
        name = ${escape(block.name)}, 
        typeId = ${escape(block.typeId)}, 
        floors = ${escape(block.floors)}, 
        units = ${escape(block.units)}, 
        initialFloor = ${escape(block.initialFloor)}
        WHERE blockId = ${escape(block.blockId)};`;

    return new Promise<MySQLResponse>((resolve, reject) => {
        MySQL.query(QUERY, (error, response) => {
            if (error) return reject(error);
            return resolve(response);
        });
    });
}

