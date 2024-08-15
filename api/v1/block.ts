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

export async function getBlocks(MySQL: Pool, groupId: number): Promise<string> {
    const QUERY = `SELECT block.blockId, block.groupId, technology.technology, block.name,
        blockType.type, block.floors, block.units, block.initialFloor FROM block
        JOIN blockType ON block.typeId = blockType.typeId
        JOIN technology ON block.technologyId = technology.technologyId
        WHERE block.groupId = ${escape(groupId)};`;

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
    let query = 'INSERT INTO block (groupId, technologyId, name, typeId, floors, units, initialFloor) VALUES';
        
    for (const block of blocks) {
        query += ` (${escape(block.group.groupId)}, ${escape(block.structureId)}, 
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
