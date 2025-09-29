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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.putBlock = exports.getStructures = exports.deleteBlocks = exports.postBlocks = exports.getBlocks = exports.getTypes = void 0;
// Intranet-Intervip/api/v1/block.ts
var MySQLErrors_1 = require("../../errors/MySQLErrors");
var mysql_1 = require("mysql");
function getTypes(MySQL) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = 'SELECT typeId, type FROM blockType;';
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.getTypes = getTypes;
function getBlocks(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT block.blockId, block.condominioId, technology.technology, block.name,\n        blockType.type, block.floors, block.units, block.initialFloor FROM block\n        JOIN blockType ON block.typeId = blockType.typeId\n        JOIN technology ON block.technologyId = technology.technologyId\n        WHERE block.condominioId = ".concat((0, mysql_1.escape)(condominioId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        if (!response || response.length == 0) {
                            return reject(new MySQLErrors_1.MySQLReturnNullError());
                        }
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.getBlocks = getBlocks;
function postBlocks(MySQL, blocks) {
    return __awaiter(this, void 0, void 0, function () {
        var query, _i, blocks_1, block;
        return __generator(this, function (_a) {
            query = 'INSERT INTO block (condominioId, technologyId, name, typeId, floors, units, initialFloor) VALUES';
            for (_i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
                block = blocks_1[_i];
                query += " (".concat((0, mysql_1.escape)(block.condominio.condominioId), ", ").concat((0, mysql_1.escape)(block.structureId), ", \n            ").concat((0, mysql_1.escape)(block.name), ", ").concat((0, mysql_1.escape)(block.typeId), ", ").concat((0, mysql_1.escape)(block.floors), ", \n            ").concat((0, mysql_1.escape)(block.units), ", ").concat((0, mysql_1.escape)(block.initialFloor), "),");
            }
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(query.slice(0, -1).concat(';'), function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.postBlocks = postBlocks;
function deleteBlocks(MySQL, blockId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "DELETE FROM block WHERE blockId = ".concat((0, mysql_1.escape)(blockId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.deleteBlocks = deleteBlocks;
function getStructures(MySQL) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT technologyId, technology FROM technology;";
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.getStructures = getStructures;
function putBlock(MySQL, block) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "UPDATE block SET \n        technologyId = ".concat((0, mysql_1.escape)(block.structureId), ", \n        name = ").concat((0, mysql_1.escape)(block.name), ", \n        typeId = ").concat((0, mysql_1.escape)(block.typeId), ", \n        floors = ").concat((0, mysql_1.escape)(block.floors), ", \n        units = ").concat((0, mysql_1.escape)(block.units), ", \n        initialFloor = ").concat((0, mysql_1.escape)(block.initialFloor), "\n        WHERE blockId = ").concat((0, mysql_1.escape)(block.blockId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        return resolve(response);
                    });
                })];
        });
    });
}
exports.putBlock = putBlock;
