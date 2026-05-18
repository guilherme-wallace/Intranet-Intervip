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
exports.postViabilitys = void 0;
const mysql_1 = require("mysql");
function postViabilitys(MySQL, viabilitys) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = 'INSERT INTO viability(clientName, cnpj, nomeFantaisa, phoneNumber, email, postalCodeId, city, neighborhood, state, address, number, complement, type, condominio, block, apartment, unionNumber, operador) VALUES';
        for (const viability of viabilitys) {
            query += `(${(0, mysql_1.escape)(viability.clientName)}, ${(0, mysql_1.escape)(viability.cnpj)}, ${(0, mysql_1.escape)(viability.nomeFantaisa)}, ${(0, mysql_1.escape)(viability.phoneNumber)}, 
            ${(0, mysql_1.escape)(viability.email)}, ${(0, mysql_1.escape)(viability.postalCodeId)}, ${(0, mysql_1.escape)(viability.city)}, 
            ${(0, mysql_1.escape)(viability.neighborhood)}, ${(0, mysql_1.escape)(viability.state)}, ${(0, mysql_1.escape)(viability.address)}, ${(0, mysql_1.escape)(viability.number)}, ${(0, mysql_1.escape)(viability.complement)},
            ${(0, mysql_1.escape)(viability.type)}, ${(0, mysql_1.escape)(viability.condominio)}, ${(0, mysql_1.escape)(viability.block)}, ${(0, mysql_1.escape)(viability.apartment)}, ${(0, mysql_1.escape)(viability.unionNumber)}, ${(0, mysql_1.escape)(viability.operador)}),`;
        }
        return new Promise((resolve, reject) => {
            MySQL.query(query.slice(0, -1).concat(';'), (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postViabilitys = postViabilitys;
