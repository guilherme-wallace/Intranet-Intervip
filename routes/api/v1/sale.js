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
const MySQLErrors_1 = require("../../../errors/MySQLErrors");
const ViaCepErrors_1 = require("../../../errors/ViaCepErrors");
const api = require("../../../api/index");
const Express = require("express");
const SALE = Express.Router();
SALE.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        var clientId = +req.params.id;
        var contractId = String(req.params.id);
        if (clientId && clientId < 999999) {
            let response = yield api.v1.GetSalesByClient(clientId);
            return res.json(response);
        }
        else if (contractId) {
            let response = yield api.v1.GetSalesByContract(contractId);
            return res.json(response);
        }
        else {
            throw new MySQLErrors_1.MySQLInvalidError();
        }
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }
        else if (error instanceof MySQLErrors_1.MySQLInvalidError) {
            return res.status(400).json({ error: "Invalid client ID." });
        }
        else {
            console.log(error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}));
SALE.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.PostSale(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLInvalidError) {
            return res.status(400).json({ error: "Invalid entry." });
        }
        else if (error instanceof ViaCepErrors_1.ViaCEPNotFoundError) {
            return res.status(401).json({ error: "Invalid CEP." });
        }
        else {
            console.log(error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}));
exports.default = SALE;
