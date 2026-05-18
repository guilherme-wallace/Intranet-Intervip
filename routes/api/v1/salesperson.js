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
const api = require("../../../api/index");
const Express = require("express");
const SALESPERSON = Express.Router();
SALESPERSON.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let response = yield api.v1.GetSalespeople((_b = (_a = req.query.query) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : null);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
SALESPERSON.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        var salespersonId = parseInt(req.params.id);
        if (salespersonId) {
            let response = yield api.v1.GetSalesperson(salespersonId);
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
exports.default = SALESPERSON;
