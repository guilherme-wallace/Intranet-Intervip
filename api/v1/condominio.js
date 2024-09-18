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
exports.getCondominioAddress = exports.getPlans = exports.postCondominio = exports.getCondominio = exports.getCondominios = void 0;
var MySQLErrors_1 = require("../../errors/MySQLErrors");
var database_1 = require("../database");
var mysql_1 = require("mysql");
function getCondominios(MySQL, queryString) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT ClienteGrupo.Codigo as value, ClienteGrupo.Nome as text FROM isupergaus.ClienteGrupo\n        WHERE ClienteGrupo.nome LIKE ".concat((0, mysql_1.escape)("%".concat(queryString, "%")), " LIMIT 25;");
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
exports.getCondominios = getCondominios;
function getCondominio(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            query = "SELECT * FROM condominio WHERE condominioId = ".concat((0, mysql_1.escape)(condominioId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(query, function (error, response) {
                        if (error)
                            return reject(error);
                        if (!response || response.length == 0) {
                            query = "SELECT Codigo as condominioId, Nome as name FROM ClienteGrupo WHERE Codigo = ".concat((0, mysql_1.escape)(condominioId), ";");
                            database_1.ROUTERBOX.query(query, function (error, response) {
                                if (error)
                                    return reject(error);
                                if (!response || response.length == 0) {
                                    return reject(new MySQLErrors_1.MySQLReturnNullError());
                                }
                                postCondominio(MySQL, response[0]);
                                return resolve(response[0]);
                            });
                        }
                        else {
                            return resolve(response[0]);
                        }
                    });
                })];
        });
    });
}
exports.getCondominio = getCondominio;
function postCondominio(MySQL, condominio) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "INSERT INTO condominio (condominioId, condominio) VALUES (".concat((0, mysql_1.escape)(condominio.condominioId), ", ").concat((0, mysql_1.escape)(condominio.condominio), ");");
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
exports.postCondominio = postCondominio;
function getPlans(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT PlanosRegrasComerciais.Codigo, PlanosPacotes.Descricao, Planos.Valor\n        FROM isupergaus.PlanosRegrasComerciais LEFT JOIN isupergaus.PlanosPacotes\n        ON PlanosRegrasComerciais.Codigo = PlanosPacotes.Codigo AND PlanosPacotes.Situacao = 'A'\n        RIGHT JOIN isupergaus.PlanosPacotesItens ON PlanosPacotes.Codigo = PlanosPacotesItens.Pacote\n        INNER JOIN isupergaus.Planos ON PlanosPacotesItens.Plano = Planos.Codigo\n        WHERE find_in_set(".concat((0, mysql_1.escape)(condominioId), ", PlanosRegrasComerciais.Filtro) AND PlanosRegrasComerciais.Situacao = 'A'\n        ORDER BY Descricao DESC;");
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
exports.getPlans = getPlans;
function getCondominioAddress(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY, result, QUERY_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    QUERY = "SELECT Clientes.CEP, Clientes.Endereco, Clientes.Numero, Clientes.Cidade, Clientes.Bairro,\n        count(*) AS Quantidade FROM isupergaus.Clientes WHERE Clientes.Grupo = ".concat((0, mysql_1.escape)(condominioId), " GROUP BY Clientes.Endereco\n        ORDER BY Quantidade DESC LIMIT 1;");
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            MySQL.query(QUERY, function (error, response) {
                                if (error)
                                    return reject(error);
                                return resolve(response[0]);
                            });
                        })];
                case 1:
                    result = _a.sent();
                    if (result.length == 2) {
                        QUERY_1 = "SELECT ClienteGrupo.Descricao AS Endereco FROM isupergaus.ClienteGrupo\n        WHERE ClienteGrupo.Codigo = ".concat((0, mysql_1.escape)(condominioId), ";");
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                MySQL.query(QUERY_1, function (error, response) {
                                    if (error)
                                        return reject(error);
                                    return resolve(response);
                                });
                            })];
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.getCondominioAddress = getCondominioAddress;
