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
exports.postSale = exports.getSalesByContract = exports.getSalesByClient = void 0;
var MySQLErrors_1 = require("../../errors/MySQLErrors");
var contract_1 = require("./contract");
var address_1 = require("./address");
var research_1 = require("./research");
var salesperson_1 = require("./salesperson");
var technology_1 = require("./technology");
var mysql_1 = require("mysql");
var group_1 = require("./group");
function getSalesByClient(MySQL, clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            query = "SELECT * FROM sale WHERE clientId = ".concat((0, mysql_1.escape)(clientId), ";");
            return [2 /*return*/, getSales(MySQL, query)];
        });
    });
}
exports.getSalesByClient = getSalesByClient;
function getSalesByContract(MySQL, contractId, limit) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            query = "SELECT * FROM sale WHERE contractId = ".concat((0, mysql_1.escape)(contractId));
            if (limit && limit > 0) {
                query += " LIMIT ".concat((0, mysql_1.escape)(limit));
            }
            else if (limit && limit < 0) {
                query += " ORDER BY saleId DESC LIMIT ".concat((0, mysql_1.escape)(limit * -1));
            }
            query += ';';
            return [2 /*return*/, getSales(MySQL, query)];
        });
    });
}
exports.getSalesByContract = getSalesByContract;
function getSales(MySQL, query) {
    return __awaiter(this, void 0, void 0, function () {
        var result, sales, _i, result_1, obj, salesperson, technology, contract, research, address, group, sale;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, new Promise(function (resolve, reject) {
                        MySQL.query(query, function (error, response) {
                            if (error)
                                return reject(error);
                            return resolve(response);
                        });
                    })];
                case 1:
                    result = _a.sent();
                    if (!result || result.length == 0) {
                        throw new MySQLErrors_1.MySQLReturnNullError();
                    }
                    sales = [];
                    _i = 0, result_1 = result;
                    _a.label = 2;
                case 2:
                    if (!(_i < result_1.length)) return [3 /*break*/, 10];
                    obj = result_1[_i];
                    return [4 /*yield*/, (0, salesperson_1.getSalesperson)(MySQL, obj.salespersonId)];
                case 3:
                    salesperson = _a.sent();
                    return [4 /*yield*/, (0, technology_1.getTechnology)(MySQL, obj.technologyId)];
                case 4:
                    technology = _a.sent();
                    return [4 /*yield*/, (0, contract_1.getContract)(MySQL, obj.contractId)];
                case 5:
                    contract = _a.sent();
                    return [4 /*yield*/, (0, research_1.getResearch)(MySQL, obj.researchId)];
                case 6:
                    research = _a.sent();
                    return [4 /*yield*/, (0, address_1.getAddress)(MySQL, obj.addressId)];
                case 7:
                    address = _a.sent();
                    return [4 /*yield*/, (0, group_1.getGroup)(MySQL, obj.groupId)];
                case 8:
                    group = _a.sent();
                    delete obj.salespersonId;
                    delete obj.technologyId;
                    delete obj.researchId;
                    delete obj.contractId;
                    delete obj.addressId;
                    delete obj.groupId;
                    sale = Object.assign({}, obj);
                    sale.contract = contract;
                    sale.group = group;
                    sale.address = address;
                    sale.technology = technology;
                    sale.research = research;
                    sale.salesperson = salesperson;
                    sale.datetime = new Date(sale.datetime).toISOString();
                    sales.push(sale);
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 2];
                case 10: return [2 /*return*/, sales];
            }
        });
    });
}
function postSale(MySQL, sale) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, error_2, addressId, error_3, error_4, researchId, _a, QUERY;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getSalesByContract(MySQL, sale.contract.contractId, -1)];
                case 1:
                    switch ((_b.sent()).pop().operation) {
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
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    if (!(error_1 instanceof MySQLErrors_1.MySQLReturnNullError)) {
                        throw error_1;
                    }
                    return [3 /*break*/, 3];
                case 3:
                    if (sale.operation == 'C' || sale.operation == 'S') {
                        sale.contract.endDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    }
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 10]);
                    return [4 /*yield*/, (0, contract_1.postContract)(MySQL, sale.contract)];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 10];
                case 6:
                    error_2 = _b.sent();
                    if (!(error_2.code == 'ER_BAD_NULL_ERROR' || error_2.code == 'ER_DUP_ENTRY')) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, contract_1.updateContract)(MySQL, sale.contract)];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 9];
                case 8: throw error_2;
                case 9: return [3 /*break*/, 10];
                case 10:
                    _b.trys.push([10, 12, , 20]);
                    return [4 /*yield*/, (0, address_1.postAddress)(MySQL, sale.address)];
                case 11:
                    addressId = (_b.sent()).insertId;
                    return [3 /*break*/, 20];
                case 12:
                    error_3 = _b.sent();
                    if (!error_3.code.startsWith('ER_NO_REFERENCED_ROW')) return [3 /*break*/, 18];
                    _b.label = 13;
                case 13:
                    _b.trys.push([13, 16, , 17]);
                    return [4 /*yield*/, (0, address_1.postPostalCode)(MySQL, sale.address.postalCodeId)];
                case 14:
                    _b.sent();
                    return [4 /*yield*/, (0, address_1.postAddress)(MySQL, sale.address)];
                case 15:
                    addressId = (_b.sent()).insertId;
                    return [3 /*break*/, 17];
                case 16:
                    error_4 = _b.sent();
                    throw error_4;
                case 17: return [3 /*break*/, 19];
                case 18: throw error_3;
                case 19: return [3 /*break*/, 20];
                case 20:
                    if (!(sale.research)) return [3 /*break*/, 22];
                    return [4 /*yield*/, (0, research_1.postResearch)(MySQL, sale.research)];
                case 21:
                    _a = (_b.sent()).insertId;
                    return [3 /*break*/, 23];
                case 22:
                    _a = null;
                    _b.label = 23;
                case 23:
                    researchId = _a;
                    sale.datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                    QUERY = "INSERT INTO sale (clientId, operation, contractId, groupId, addressId, technologyId,\n        researchId, datetime, salespersonId, observation) VALUES (".concat((0, mysql_1.escape)(sale.clientId), ",\n        ").concat((0, mysql_1.escape)(sale.operation), ", ").concat((0, mysql_1.escape)(sale.contract.contractId), ", ").concat((0, mysql_1.escape)(sale.group.groupId), ",\n        ").concat((0, mysql_1.escape)(addressId), ", ").concat((0, mysql_1.escape)(sale.technology.technologyId), ", ").concat((0, mysql_1.escape)(researchId), ",\n        ").concat((0, mysql_1.escape)(sale.datetime), ", ").concat((0, mysql_1.escape)(sale.salesperson.salespersonId), ", ").concat((0, mysql_1.escape)(sale.observation), ");");
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            MySQL.query(QUERY, function (error, response) {
                                if (error)
                                    return reject(error);
                                return resolve(response);
                            });
                        })];
                case 24: return [2 /*return*/, _b.sent()];
            }
        });
    });
}
exports.postSale = postSale;
