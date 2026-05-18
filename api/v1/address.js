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
exports.postPostalCode = exports.postAddress = exports.getAddress = void 0;
const ViaCepErrors_1 = require("../../errors/ViaCepErrors");
const mysql_1 = require("mysql");
const axios_1 = require("axios");
function getAddress(MySQL, addressId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT * FROM saleAddress JOIN postalCode
        ON saleAddress.postalCodeId = postalCode.postalCodeId
        WHERE saleAddress.addressId = ${(0, mysql_1.escape)(addressId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response[0]);
            });
        });
    });
}
exports.getAddress = getAddress;
function postAddress(MySQL, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `INSERT INTO saleAddress (postalCodeId,
        number, complement) VALUES (${(0, mysql_1.escape)(address.postalCodeId)},
        ${(0, mysql_1.escape)(address.number)}, ${(0, mysql_1.escape)(address.complement)});`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postAddress = postAddress;
function postPostalCode(MySQL, postalCode) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `https://viacep.com.br/ws/${postalCode}/json/`;
            const response = yield axios_1.default.get(url);
            if (response.data.erro) {
                throw new ViaCepErrors_1.ViaCEPNotFoundError("CEP não encontrado");
            }
            const postalCodeData = response.data;
            const QUERY = `INSERT INTO postalCode (postalCodeId, address, neighbourhood, city, state) VALUES
            (${(0, mysql_1.escape)(postalCodeData.cep.slice(0, 5) + postalCodeData.cep.slice(6))}, ${(0, mysql_1.escape)(postalCodeData.logradouro)}, 
            ${(0, mysql_1.escape)(postalCodeData.bairro)}, ${(0, mysql_1.escape)(postalCodeData.localidade)}, ${(0, mysql_1.escape)(postalCodeData.uf)});`;
            return new Promise((resolve, reject) => {
                MySQL.query(QUERY, (error, dbResponse) => {
                    if (error)
                        return reject(error);
                    return resolve(dbResponse);
                });
            });
        }
        catch (error) {
            console.error("Erro ao processar o CEP:", error);
            throw error;
        }
    });
}
exports.postPostalCode = postPostalCode;
