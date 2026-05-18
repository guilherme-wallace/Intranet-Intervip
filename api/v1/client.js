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
exports.getClientAuth = exports.getClient = exports.getClients = void 0;
const MySQLErrors_1 = require("../../errors/MySQLErrors");
const mysql_1 = require("mysql");
function getClients(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT Clientes.Codigo, Clientes.Complemento, ClientesUsuarios.Usuario
        FROM isupergaus.Clientes INNER JOIN isupergaus.Contratos
        ON Clientes.Codigo = Contratos.Cliente AND Contratos.Situacao = 'A'
        LEFT JOIN isupergaus.ClientesUsuarios ON ClientesUsuarios.Cliente = Clientes.Codigo
        AND ClientesUsuarios.Situacao = 'A' AND ClientesUsuarios.NAS != -2
        WHERE Clientes.Grupo = ${(0, mysql_1.escape)(condominioId)} GROUP BY Clientes.Codigo;`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getClients = getClients;
function getClient(MySQL, clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT Clientes.Nome, Clientes.Nascimento, Clientes.Email, Clientes.TelCelular,
        Clientes.Grupo, Clientes.Endereco, Clientes.Numero, Clientes.Complemento, Clientes.Bairro,
        Clientes.Cidade, Clientes.CEP, Clientes.UF FROM isupergaus.Clientes WHERE Clientes.Codigo = ${(0, mysql_1.escape)(clientId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                if (!response[0]) {
                    return reject(new MySQLErrors_1.MySQLReturnNullError());
                }
                return resolve(response[0]);
            });
        });
    });
}
exports.getClient = getClient;
function getClientAuth(MySQL, clientId, login) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT radacct.cliente, radacct.framedipaddress, radacct.acctstarttime, radacct.acctstoptime
        FROM isupergaus.radacct WHERE radacct.cliente = ${(0, mysql_1.escape)(clientId)} AND radacct.username = ${(0, mysql_1.escape)(login)}
        ORDER BY radacct.acctstoptime LIMIT 1;`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                if (!response[0]) {
                    return reject(new MySQLErrors_1.MySQLReturnNullError());
                }
                return resolve(response[0]);
            });
        });
    });
}
exports.getClientAuth = getClientAuth;
