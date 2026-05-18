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
exports.getContracts = void 0;
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
            query = `SELECT PacoteID AS contractId, Cliente AS clientId, GROUP_CONCAT(Numero) AS plans, Descricao AS name,
                Inicio AS startDate, Fim AS endDate, Contracts.Situacao AS status, SUM(ValorPlano) AS cost,
                TransferidoPara AS transferedTo FROM
                (SELECT IF(Contratos.PacoteID='', RAND(), Contratos.PacoteID) AS PacoteID, Contratos.Cliente,
                Contratos.Numero, PlanosPacotes.Descricao, Contratos.Inicio, Contratos.Fim,
                Contratos.Situacao, Contratos.ValorPlano, Contratos.TransferidoPara FROM isupergaus.Contratos
                LEFT JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote
                WHERE Contratos.Cliente = ${(0, mysql_1.escape)(clientId)}) AS Contracts
                GROUP BY contractId ORDER BY startDate DESC;`;
        }
        return new Promise((resolve, reject) => {
            MySQL.query(query, (error, response) => {
                if (error)
                    return reject(error);
                for (const contract of response) {
                    contract.plans = contract.plans.split(',').map(Number);
                    if (!isNaN(contract.contractId)) {
                        if (!contract.contractId.includes('E')) {
                            if (contract.contractId % 1 != 0) {
                                contract.contractId = null;
                            }
                        }
                    }
                    try {
                        contract.name = parseInt(contract.name.match(/\d{1,4}M/g)[0].slice(0, -1)) + ' Mbps';
                    }
                    catch (error) {
                        if (!(error instanceof TypeError)) {
                            throw error;
                        }
                    }
                }
                return resolve(response);
            });
        });
    });
}
exports.getContracts = getContracts;
