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
const ViaCepErrors_1 = require("../../../errors/ViaCepErrors");
const api = require("../../../api/index");
const Express = require("express");
const ADDRESS = Express.Router();
ADDRESS.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 1; i <= 3; i++) {
        try {
            let response = yield api.v1.PostAddress(req.body);
            return res.json(response);
        }
        catch (error) {
            if (error.code == 'ER_NO_REFERENCED_ROW') {
                try {
                    yield api.v1.PostPostalCode(req.body.postalCodeId);
                    let response = yield api.v1.PostAddress(req.body);
                    return res.json(response);
                }
                catch (error) {
                    if (error instanceof ViaCepErrors_1.ViaCEPNotFoundError) {
                        return res.status(400).json({ error: "Invalid CEP." });
                    }
                }
            }
            console.log(error);
            return res.status(500).json({ error: "Internal server error." });
        }
    }
}));
exports.default = ADDRESS;
