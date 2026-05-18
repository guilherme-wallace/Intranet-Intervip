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
exports.updateContract = exports.postContract = exports.getContract = exports.getContracts = void 0;
const mysql_1 = require("mysql");
function getContracts(MySQL, clientId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        let query;
        if (status) {
            query = `SELECT Contratos.PacoteID as Pacote, Contratos.Cliente, group_concat(Contratos.Numero) as Planos,
                PlanosPacotes.Descricao, Contratos.Assinatura, Contratos.Inicio, Contratos.Fim, Contratos.Situacao,
                sum(Contratos.ValorPlano) as Valor, Contratos.Vendedor FROM isupergaus.Contratos
                JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote
                WHERE Contratos.Cliente = ${(0, mysql_1.escape)(clientId)} AND Contratos.Situacao
                ${status == 'r' ? `!= ${(0, mysql_1.escape)('c')}` : `= ${(0, mysql_1.escape)(status)}`} GROUP BY Contratos.PacoteID;`;
        }
        else {
            query = `SELECT Contratos.PacoteID as Pacote, Contratos.Cliente, group_concat(Contratos.Numero) as Planos,
                PlanosPacotes.Descricao, Contratos.Assinatura, Contratos.Inicio, Contratos.Fim, Contratos.Situacao,
                sum(Contratos.ValorPlano) as Valor, Contratos.Vendedor FROM isupergaus.Contratos
                JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote
                WHERE Contratos.Cliente = ${(0, mysql_1.escape)(clientId)} GROUP BY Contratos.PacoteID;`;
        }
        return new Promise((resolve, reject) => {
            MySQL.query(query, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getContracts = getContracts;
function getContract(MySQL, contractId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT * FROM saleContract WHERE contractId = ${(0, mysql_1.escape)(contractId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response[0]);
            });
        });
    });
}
exports.getContract = getContract;
function postContract(MySQL, contract) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `INSERT INTO saleContract (contractId, name, bandwidth, cost, startDate, endDate)
        VALUES (${(0, mysql_1.escape)(contract.contractId)}, ${(0, mysql_1.escape)(contract.name)}, ${(0, mysql_1.escape)(contract.bandwidth)},
        ${(0, mysql_1.escape)(contract.cost)}, ${(0, mysql_1.escape)(contract.startDate)}, ${(0, mysql_1.escape)(contract.endDate)});`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postContract = postContract;
function updateContract(MySQL, contract) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `UPDATE saleContract SET startDate = ${(0, mysql_1.escape)(contract.startDate)},
        endDate = ${(0, mysql_1.escape)(contract.endDate)} WHERE contractId = ${(0, mysql_1.escape)(contract.contractId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.updateContract = updateContract;
