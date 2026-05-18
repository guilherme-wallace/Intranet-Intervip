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
const CLIENT = Express.Router();
CLIENT.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        var id = parseInt(req.params.id);
        if (id) {
            let response = yield api.v1.GetClient(id);
            return res.json(response);
        }
        else {
            throw new MySQLErrors_1.MySQLInvalidError();
        }
    }
    catch (e) {
        if (e instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: "Not found." });
        }
        else if (e instanceof MySQLErrors_1.MySQLInvalidError) {
            return res.status(400).json({ error: "Invalid client ID." });
        }
        else {
            console.log(e);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}));
CLIENT.get('/condominio/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetClients(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
CLIENT.get('/authentication/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v1.GetClientAuth(+req.params.id, String(req.query.username));
        return res.json(response);
    }
    catch (error) {
        if (error instanceof MySQLErrors_1.MySQLReturnNullError) {
            return res.status(404).json({ error: 'Not found.' });
        }
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
exports.default = CLIENT;
