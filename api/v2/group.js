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
exports.getPlans = void 0;
const mysql_1 = require("mysql");
function getPlans(MySQL, groupId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT PlanosRegrasComerciais.Codigo, PlanosPacotes.Descricao, Planos.Valor, PlanosPacotesItens.Desconto
        FROM isupergaus.PlanosRegrasComerciais LEFT JOIN isupergaus.PlanosPacotes
        ON PlanosRegrasComerciais.Codigo = PlanosPacotes.Codigo AND PlanosPacotes.Situacao = 'A'
        RIGHT JOIN isupergaus.PlanosPacotesItens ON PlanosPacotes.Codigo = PlanosPacotesItens.Pacote
        INNER JOIN isupergaus.Planos ON PlanosPacotesItens.Plano = Planos.Codigo
        WHERE find_in_set(${(0, mysql_1.escape)(groupId)}, PlanosRegrasComerciais.Filtro) AND PlanosRegrasComerciais.Situacao = 'A'
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
