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
const CONDOMINIO = Express.Router();
CONDOMINIO.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let response = yield api.v1.GetCondominios((_b = (_a = req.query.query) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : null);
        return res.json(response);
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
CONDOMINIO.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetCondominio(+req.params.id);
        return res.json(response);
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
CONDOMINIO.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.PostCondominio(req.body);
        return res.status(201).json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
exports.default = CONDOMINIO;
