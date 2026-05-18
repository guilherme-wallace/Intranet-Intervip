"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.putBlock = exports.getStructures = exports.deleteBlocks = exports.postBlocks = exports.getBlocks = exports.getTypes = void 0;
// Intranet-Intervip/api/v1/block.ts
const MySQLErrors_1 = require("../../errors/MySQLErrors");
const mysql_1 = require("mysql");
function getTypes(MySQL) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = 'SELECT typeId, type FROM blockType;';
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getTypes = getTypes;
function getBlocks(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT block.blockId, block.condominioId, technology.technology, block.name,
        blockType.type, block.floors, block.units, block.initialFloor FROM block
        JOIN blockType ON block.typeId = blockType.typeId
        JOIN technology ON block.technologyId = technology.technologyId
        WHERE block.condominioId = ${(0, mysql_1.escape)(condominioId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                if (!response || response.length == 0) {
                    return reject(new MySQLErrors_1.MySQLReturnNullError());
                }
                return resolve(response);
            });
        });
    });
}
exports.getBlocks = getBlocks;
function postBlocks(MySQL, blocks) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = 'INSERT INTO block (condominioId, technologyId, name, typeId, floors, units, initialFloor) VALUES';
        for (const block of blocks) {
            query += ` (${(0, mysql_1.escape)(block.condominio.condominioId)}, ${(0, mysql_1.escape)(block.structureId)}, 
            ${(0, mysql_1.escape)(block.name)}, ${(0, mysql_1.escape)(block.typeId)}, ${(0, mysql_1.escape)(block.floors)}, 
            ${(0, mysql_1.escape)(block.units)}, ${(0, mysql_1.escape)(block.initialFloor)}),`;
        }
        return new Promise((resolve, reject) => {
            MySQL.query(query.slice(0, -1).concat(';'), (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postBlocks = postBlocks;
function deleteBlocks(MySQL, blockId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `DELETE FROM block WHERE blockId = ${(0, mysql_1.escape)(blockId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.deleteBlocks = deleteBlocks;
function getStructures(MySQL) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT technologyId, technology FROM technology;`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getStructures = getStructures;
function putBlock(MySQL, block) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `UPDATE block SET 
        technologyId = ${(0, mysql_1.escape)(block.structureId)}, 
        name = ${(0, mysql_1.escape)(block.name)}, 
        typeId = ${(0, mysql_1.escape)(block.typeId)}, 
        floors = ${(0, mysql_1.escape)(block.floors)}, 
        units = ${(0, mysql_1.escape)(block.units)}, 
        initialFloor = ${(0, mysql_1.escape)(block.initialFloor)}
        WHERE blockId = ${(0, mysql_1.escape)(block.blockId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.putBlock = putBlock;
