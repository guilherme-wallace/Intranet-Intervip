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
exports.getContracts = void 0;
var mysql_1 = require("mysql");
function getContracts(MySQL, clientId, status) {
    return __awaiter(this, void 0, void 0, function () {
        var query;
        return __generator(this, function (_a) {
            if (status) {
                query = "SELECT Contratos.PacoteID as Pacote, Contratos.Cliente, group_concat(Contratos.Numero) as Planos,\n                PlanosPacotes.Descricao, Contratos.Assinatura, Contratos.Inicio, Contratos.Fim, Contratos.Situacao,\n                sum(Contratos.ValorPlano) as Valor, Contratos.Vendedor FROM isupergaus.Contratos\n                JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote\n                WHERE Contratos.Cliente = ".concat((0, mysql_1.escape)(clientId), " AND Contratos.Situacao\n                ").concat(status == 'r' ? "!= ".concat((0, mysql_1.escape)('c')) : "= ".concat((0, mysql_1.escape)(status)), " GROUP BY Contratos.PacoteID;");
            }
            else {
                query = "SELECT PacoteID AS contractId, Cliente AS clientId, GROUP_CONCAT(Numero) AS plans, Descricao AS name,\n                Inicio AS startDate, Fim AS endDate, Contracts.Situacao AS status, SUM(ValorPlano) AS cost,\n                TransferidoPara AS transferedTo FROM\n                (SELECT IF(Contratos.PacoteID='', RAND(), Contratos.PacoteID) AS PacoteID, Contratos.Cliente,\n                Contratos.Numero, PlanosPacotes.Descricao, Contratos.Inicio, Contratos.Fim,\n                Contratos.Situacao, Contratos.ValorPlano, Contratos.TransferidoPara FROM isupergaus.Contratos\n                LEFT JOIN isupergaus.PlanosPacotes ON PlanosPacotes.Codigo = Contratos.Pacote\n                WHERE Contratos.Cliente = ".concat((0, mysql_1.escape)(clientId), ") AS Contracts\n                GROUP BY contractId ORDER BY startDate DESC;");
            }
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    MySQL.query(query, function (error, response) {
                        if (error)
                            return reject(error);
                        for (var _i = 0, response_1 = response; _i < response_1.length; _i++) {
                            var contract = response_1[_i];
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
                })];
        });
    });
}
exports.getContracts = getContracts;
