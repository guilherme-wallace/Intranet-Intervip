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
exports.getCondominioAddress = exports.getPlans = exports.postCondominio = exports.getCondominio = exports.getCondominios = void 0;
const MySQLErrors_1 = require("../../errors/MySQLErrors");
const database_1 = require("../database");
const mysql_1 = require("mysql");
function getCondominios(MySQL, queryString) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT ClienteGrupo.Codigo as value, ClienteGrupo.Nome as text FROM isupergaus.ClienteGrupo
        WHERE ClienteGrupo.nome LIKE ${(0, mysql_1.escape)(`%${queryString}%`)} LIMIT 25;`;
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
exports.getCondominios = getCondominios;
function getCondominio(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = `SELECT * FROM condominio WHERE condominioId = ${(0, mysql_1.escape)(condominioId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(query, (error, response) => {
                if (error)
                    return reject(error);
                if (!response || response.length == 0) {
                    query = `SELECT Codigo as condominioId, Nome as name FROM ClienteGrupo WHERE Codigo = ${(0, mysql_1.escape)(condominioId)};`;
                    database_1.ROUTERBOX.query(query, (error, response) => {
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
        });
    });
}
exports.getCondominio = getCondominio;
function postCondominio(MySQL, condominio) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `INSERT INTO condominio (condominioId, condominio) VALUES (${(0, mysql_1.escape)(condominio.condominioId)}, ${(0, mysql_1.escape)(condominio.condominio)});`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postCondominio = postCondominio;
function getPlans(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT PlanosRegrasComerciais.Codigo, PlanosPacotes.Descricao, Planos.Valor
        FROM isupergaus.PlanosRegrasComerciais LEFT JOIN isupergaus.PlanosPacotes
        ON PlanosRegrasComerciais.Codigo = PlanosPacotes.Codigo AND PlanosPacotes.Situacao = 'A'
        RIGHT JOIN isupergaus.PlanosPacotesItens ON PlanosPacotes.Codigo = PlanosPacotesItens.Pacote
        INNER JOIN isupergaus.Planos ON PlanosPacotesItens.Plano = Planos.Codigo
        WHERE find_in_set(${(0, mysql_1.escape)(condominioId)}, PlanosRegrasComerciais.Filtro) AND PlanosRegrasComerciais.Situacao = 'A'
        ORDER BY Descricao DESC;`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getPlans = getPlans;
function getCondominioAddress(MySQL, condominioId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT Clientes.CEP, Clientes.Endereco, Clientes.Numero, Clientes.Cidade, Clientes.Bairro,
        count(*) AS Quantidade FROM isupergaus.Clientes WHERE Clientes.Grupo = ${(0, mysql_1.escape)(condominioId)} GROUP BY Clientes.Endereco
        ORDER BY Quantidade DESC LIMIT 1;`;
        let result = yield new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response[0]);
            });
        });
        if (result.length == 2) {
            const QUERY = `SELECT ClienteGrupo.Descricao AS Endereco FROM isupergaus.ClienteGrupo
        WHERE ClienteGrupo.Codigo = ${(0, mysql_1.escape)(condominioId)};`;
            return new Promise((resolve, reject) => {
                MySQL.query(QUERY, (error, response) => {
                    if (error)
                        return reject(error);
                    return resolve(response);
                });
            });
        }
        return result;
    });
}
exports.getCondominioAddress = getCondominioAddress;
