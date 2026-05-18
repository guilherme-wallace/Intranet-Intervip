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
exports.postSale = exports.getSalesByContract = exports.getSalesByClient = void 0;
const MySQLErrors_1 = require("../../errors/MySQLErrors");
const contract_1 = require("./contract");
const address_1 = require("./address");
const research_1 = require("./research");
const salesperson_1 = require("./salesperson");
const technology_1 = require("./technology");
const mysql_1 = require("mysql");
const condominio_1 = require("./condominio");
function getSalesByClient(MySQL, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = `SELECT * FROM sale WHERE clientId = ${(0, mysql_1.escape)(clientId)};`;
        return getSales(MySQL, query);
    });
}
exports.getSalesByClient = getSalesByClient;
function getSalesByContract(MySQL, contractId, limit) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = `SELECT * FROM sale WHERE contractId = ${(0, mysql_1.escape)(contractId)}`;
        if (limit && limit > 0) {
            query += ` LIMIT ${(0, mysql_1.escape)(limit)}`;
        }
        else if (limit && limit < 0) {
            query += ` ORDER BY saleId DESC LIMIT ${(0, mysql_1.escape)(limit * -1)}`;
        }
        query += ';';
        return getSales(MySQL, query);
    });
}
exports.getSalesByContract = getSalesByContract;
function getSales(MySQL, query) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield new Promise((resolve, reject) => {
            MySQL.query(query, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
        if (!result || result.length == 0) {
            throw new MySQLErrors_1.MySQLReturnNullError();
        }
        let sales = [];
        for (var obj of result) {
            let salesperson = yield (0, salesperson_1.getSalesperson)(MySQL, obj.salespersonId);
            let technology = yield (0, technology_1.getTechnology)(MySQL, obj.technologyId);
            let contract = yield (0, contract_1.getContract)(MySQL, obj.contractId);
            let research = yield (0, research_1.getResearch)(MySQL, obj.researchId);
            let address = yield (0, address_1.getAddress)(MySQL, obj.addressId);
            let condominio = yield (0, condominio_1.getCondominio)(MySQL, obj.condominioId);
            delete obj.salespersonId;
            delete obj.technologyId;
            delete obj.researchId;
            delete obj.contractId;
            delete obj.addressId;
            delete obj.condominioId;
            let sale = Object.assign({}, obj);
            sale.contract = contract;
            sale.condominio = condominio;
            sale.address = address;
            sale.technology = technology;
            sale.research = research;
            sale.salesperson = salesperson;
            sale.datetime = new Date(sale.datetime).toISOString();
            sales.push(sale);
        }
        return sales;
    });
}
function postSale(MySQL, sale) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            switch ((yield getSalesByContract(MySQL, sale.contract.contractId, -1)).pop().operation) {
                case 'V':
                    if (['V', 'R', 'T'].includes(sale.operation)) {
                        throw new MySQLErrors_1.MySQLInvalidError();
                    }
                    break;
                case 'R':
                    if (['V', 'R', 'T'].includes(sale.operation)) {
                        throw new MySQLErrors_1.MySQLInvalidError();
                    }
                    break;
                case 'C':
                    if (['V', 'C', 'S'].includes(sale.operation)) {
                        throw new MySQLErrors_1.MySQLInvalidError();
                    }
                    break;
                case 'S':
                    if (['V', 'S'].includes(sale.operation)) {
                        throw new MySQLErrors_1.MySQLInvalidError();
                    }
                    break;
                case 'T':
                    if (['V', 'R', 'T'].includes(sale.operation)) {
                        throw new MySQLErrors_1.MySQLInvalidError();
                    }
                    break;
            }
        }
        catch (error) {
            if (!(error instanceof MySQLErrors_1.MySQLReturnNullError)) {
                throw error;
            }
        }
        if (sale.operation == 'C' || sale.operation == 'S') {
            sale.contract.endDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        try {
            yield (0, contract_1.postContract)(MySQL, sale.contract);
        }
        catch (error) {
            if (error.code == 'ER_BAD_NULL_ERROR' || error.code == 'ER_DUP_ENTRY') {
                yield (0, contract_1.updateContract)(MySQL, sale.contract);
            }
            else {
                throw error;
            }
        }
        let addressId;
        try {
            addressId = (yield (0, address_1.postAddress)(MySQL, sale.address)).insertId;
        }
        catch (error) {
            if (error.code.startsWith('ER_NO_REFERENCED_ROW')) {
                try {
                    yield (0, address_1.postPostalCode)(MySQL, sale.address.postalCodeId);
                    addressId = (yield (0, address_1.postAddress)(MySQL, sale.address)).insertId;
                }
                catch (error) {
                    throw error;
                }
            }
            else
                throw error;
        }
        let researchId = (sale.research) ? (yield (0, research_1.postResearch)(MySQL, sale.research)).insertId : null;
        sale.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const QUERY = `INSERT INTO sale (clientId, operation, contractId, condominioId, addressId, technologyId,
        researchId, datetime, salespersonId, observation) VALUES (${(0, mysql_1.escape)(sale.clientId)},
        ${(0, mysql_1.escape)(sale.operation)}, ${(0, mysql_1.escape)(sale.contract.contractId)}, ${(0, mysql_1.escape)(sale.condominio.condominioId)},
        ${(0, mysql_1.escape)(addressId)}, ${(0, mysql_1.escape)(sale.technology.technologyId)}, ${(0, mysql_1.escape)(researchId)},
        ${(0, mysql_1.escape)(sale.datetime)}, ${(0, mysql_1.escape)(sale.salesperson.salespersonId)}, ${(0, mysql_1.escape)(sale.observation)});`;
        return yield new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postSale = postSale;
