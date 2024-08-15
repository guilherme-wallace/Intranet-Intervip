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
exports.getClientAuth = exports.getClient = exports.getClients = void 0;
var MySQLErrors_1 = require("../../errors/MySQLErrors");
var mysql_1 = require("mysql");
function getClients(MySQL, groupId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT Clientes.Codigo, Clientes.Complemento, ClientesUsuarios.Usuario\n        FROM isupergaus.Clientes INNER JOIN isupergaus.Contratos\n        ON Clientes.Codigo = Contratos.Cliente AND Contratos.Situacao = 'A'\n        LEFT JOIN isupergaus.ClientesUsuarios ON ClientesUsuarios.Cliente = Clientes.Codigo\n        AND ClientesUsuarios.Situacao = 'A' AND ClientesUsuarios.NAS != -2\n        WHERE Clientes.Grupo = ".concat((0, mysql_1.escape)(groupId), " GROUP BY Clientes.Codigo;");
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
exports.getClients = getClients;
function getClient(MySQL, clientId) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT Clientes.Nome, Clientes.Nascimento, Clientes.Email, Clientes.TelCelular,\n        Clientes.Grupo, Clientes.Endereco, Clientes.Numero, Clientes.Complemento, Clientes.Bairro,\n        Clientes.Cidade, Clientes.CEP, Clientes.UF FROM isupergaus.Clientes WHERE Clientes.Codigo = ".concat((0, mysql_1.escape)(clientId), ";");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        if (!response[0]) {
                            return reject(new MySQLErrors_1.MySQLReturnNullError());
                        }
                        return resolve(response[0]);
                    });
                })];
        });
    });
}
exports.getClient = getClient;
function getClientAuth(MySQL, clientId, login) {
    return __awaiter(this, void 0, void 0, function () {
        var QUERY;
        return __generator(this, function (_a) {
            QUERY = "SELECT radacct.cliente, radacct.framedipaddress, radacct.acctstarttime, radacct.acctstoptime\n        FROM isupergaus.radacct WHERE radacct.cliente = ".concat((0, mysql_1.escape)(clientId), " AND radacct.username = ").concat((0, mysql_1.escape)(login), "\n        ORDER BY radacct.acctstoptime LIMIT 1;");
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(QUERY, function (error, response) {
                        if (error)
                            return reject(error);
                        if (!response[0]) {
                            return reject(new MySQLErrors_1.MySQLReturnNullError());
                        }
                        return resolve(response[0]);
                    });
                })];
        });
    });
}
exports.getClientAuth = getClientAuth;
