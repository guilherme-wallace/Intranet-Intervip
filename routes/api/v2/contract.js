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
const api = require("../../../api/index");
const Express = require("express");
const CONTRACT = Express.Router();
CONTRACT.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let response = yield api.v2.GetContracts(+req.params.id);
        res.json(response);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error." });
    }
}));
exports.default = CONTRACT;
